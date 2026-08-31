#include "../include/dat/dat_cms.h"
#include "../include/dat/dat.h"
#include "dat_util.h"
#include "dat_cms_internal.h"
#include <stdlib.h>
#include <string.h>
#include <stdio.h>
#include <stdint.h>
#include <inttypes.h>
#include <limits.h>

dat_error_t dat_cms_apply_response(dat_manager_t* manager,
                                   uint64_t current_version,
                                   const unsigned char* body,
                                   size_t body_len,
                                   uint64_t* version_out,
                                   bool* version_changed,
                                   bool* version_reset) {
    if (!manager || !version_out || !version_changed || !version_reset ||
        (!body && body_len != 0)) return DAT_CONFIG_ARGUMENT_INVALID;

    *version_out = current_version;
    *version_changed = false;
    *version_reset = false;
    if (body_len == 0) return DAT_CMS_MALFORMED;

    size_t version_len = body_len;
    size_t cert_start = body_len;
    for (size_t i = 0; i < body_len; i++) {
        if (body[i] > 0x7f || body[i] == '\0') return DAT_CMS_MALFORMED;
        if (body[i] == '\n' && version_len == body_len) {
            version_len = i;
            cert_start = i + 1;
        }
    }
    if (version_len == 0) return DAT_CMS_MALFORMED;

    uint64_t parsed_version = 0;
    for (size_t i = 0; i < version_len; i++) {
        unsigned char c = body[i];
        if (c < '0' || c > '9') return DAT_CMS_MALFORMED;
        unsigned digit = (unsigned)(c - '0');
        if (parsed_version > (UINT64_MAX - digit) / 10) return DAT_CMS_MALFORMED;
        parsed_version = parsed_version * 10 + digit;
    }

    while (cert_start < body_len &&
           (body[cert_start] == ' ' || body[cert_start] == '\t' ||
            body[cert_start] == '\r' || body[cert_start] == '\n')) cert_start++;
    size_t cert_end = body_len;
    while (cert_end > cert_start &&
           (body[cert_end - 1] == ' ' || body[cert_end - 1] == '\t' ||
            body[cert_end - 1] == '\r' || body[cert_end - 1] == '\n')) cert_end--;
    if (cert_start == cert_end) return DAT_SUCCESS;

    size_t cert_len = cert_end - cert_start;
    if (cert_len == SIZE_MAX) return DAT_INTERNAL_UNKNOWN;
    char* certs = malloc(cert_len + 1);
    if (!certs) return DAT_INTERNAL_UNKNOWN;
    memcpy(certs, body + cert_start, cert_len);
    certs[cert_len] = '\0';

    size_t renew_count = 0;
    dat_error_t err = dat_manager_import(manager, certs, false, &renew_count);
    free(certs);
    if (err != DAT_SUCCESS) return DAT_CMS_IMPORT_FAILED;

    *version_out = parsed_version;
    *version_changed = true;
    *version_reset = parsed_version < current_version;
    return DAT_SUCCESS;
}

dat_error_t dat_cms_http_status_error(long http_code) {
    switch (http_code) {
        case 401: return DAT_CMS_UNAUTHORIZED;
        case 403: return DAT_CMS_FORBIDDEN;
        case 404: return DAT_CMS_ENDPOINT_NOT_FOUND;
        default: break;
    }
    if (http_code >= 500 && http_code <= 599) return DAT_CMS_SERVER_ERROR;
    return DAT_CMS_HTTP_STATUS;
}

#ifdef DAT_CMS_CURL
#include <curl/curl.h>
#include <pthread.h>
#include <time.h>

struct dat_cms_manager {
    char*              url;
    char*              token;
    pthread_mutex_t    state_lock;
    pthread_mutex_t    sync_lock;
    pthread_cond_t     wake_cond;
    uint64_t           version;
    dat_manager_t*     manager;
    pthread_t          thread;
    int                thread_started;
    int                stopping;
    uint64_t           interval_seconds;
    dat_log_fn_t       log_fn;
    void*              log_userdata;
    int                needs_immediate_retry;
    dat_error_t        last_error;
    uint64_t           connect_timeout_seconds;
    uint64_t           total_timeout_seconds;
};

typedef struct {
    char*  data;
    size_t len;
    size_t cap;
    int    allocation_failed;
} curl_buf_t;

static size_t curl_write_cb(char* ptr, size_t size, size_t nmemb, void* userdata) {
    curl_buf_t* buf = (curl_buf_t*)userdata;
    if (size != 0 && nmemb > SIZE_MAX / size) {
        buf->allocation_failed = 1;
        return 0;
    }
    size_t n = size * nmemb;
    if (n > SIZE_MAX - buf->len - 1) {
        buf->allocation_failed = 1;
        return 0;
    }
    size_t new_len = buf->len + n;
    if (new_len + 1 > buf->cap) {
        size_t needed = new_len + 1;
        size_t new_cap = buf->cap;
        while (new_cap < needed) {
            if (new_cap > SIZE_MAX / 2) {
                new_cap = needed;
                break;
            }
            new_cap *= 2;
        }
        char* tmp = realloc(buf->data, new_cap);
        if (!tmp) {
            buf->allocation_failed = 1;
            return 0;
        }
        buf->data = tmp;
        buf->cap  = new_cap;
    }
    memcpy(buf->data + buf->len, ptr, n);
    buf->len = new_len;
    buf->data[buf->len] = '\0';
    return n;
}

static void cms_log(dat_cms_manager_t* cms, dat_log_level_t level, const char* msg) {
    if (cms->log_fn) cms->log_fn(level, msg, cms->log_userdata);
}

static dat_error_t cms_record(dat_cms_manager_t* cms, dat_error_t e) {
    if (dat_error_retry(e) != DAT_RETRY_STATE) {
        pthread_mutex_lock(&cms->state_lock);
        cms->last_error = e;
        pthread_mutex_unlock(&cms->state_lock);
    }
    return e;
}

static dat_error_t cms_record_and_unlock(dat_cms_manager_t* cms, dat_error_t e) {
    dat_error_t result = cms_record(cms, e);
    pthread_mutex_unlock(&cms->sync_lock);
    return result;
}

dat_error_t dat_cms_manager_last_error(dat_cms_manager_t* cms) {
    if (!cms) return DAT_CONFIG_ARGUMENT_INVALID;
    pthread_mutex_lock(&cms->state_lock);
    dat_error_t result = cms->last_error;
    pthread_mutex_unlock(&cms->state_lock);
    return result;
}

static int cms_transfer_progress(void* userdata,
                                 curl_off_t download_total, curl_off_t download_now,
                                 curl_off_t upload_total, curl_off_t upload_now) {
    (void)download_total;
    (void)download_now;
    (void)upload_total;
    (void)upload_now;
    dat_cms_manager_t* cms = (dat_cms_manager_t*)userdata;
    pthread_mutex_lock(&cms->state_lock);
    int stopping = cms->stopping;
    pthread_mutex_unlock(&cms->state_lock);
    return stopping;
}

static long timeout_milliseconds(uint64_t seconds) {
    if (seconds == 0) return 0;
    if (seconds > (uint64_t)LONG_MAX / 1000) return LONG_MAX;
    return (long)(seconds * 1000);
}

static dat_error_t build_request_strings(dat_cms_manager_t* cms,
                                         uint64_t version,
                                         char** url_out,
                                         char** auth_out) {
    size_t url_len = strlen(cms->url);
    if (url_len > SIZE_MAX - 30) return DAT_INTERNAL_UNKNOWN;
    char* request_url = malloc(url_len + 30);
    if (!request_url) return DAT_INTERNAL_UNKNOWN;
    int written = snprintf(request_url, url_len + 30, "%s?version=%" PRIu64,
                           cms->url, version);
    if (written < 0 || (size_t)written >= url_len + 30) {
        free(request_url);
        return DAT_INTERNAL_UNKNOWN;
    }

    size_t token_len = strlen(cms->token);
    static const char prefix[] = "Authorization: ";
    if (token_len > SIZE_MAX - sizeof(prefix)) {
        free(request_url);
        return DAT_INTERNAL_UNKNOWN;
    }
    char* authorization = malloc(sizeof(prefix) + token_len);
    if (!authorization) {
        free(request_url);
        return DAT_INTERNAL_UNKNOWN;
    }
    memcpy(authorization, prefix, sizeof(prefix) - 1);
    memcpy(authorization + sizeof(prefix) - 1, cms->token, token_len + 1);
    *url_out = request_url;
    *auth_out = authorization;
    return DAT_SUCCESS;
}

dat_error_t dat_cms_manager_sync(dat_cms_manager_t* cms) {
    if (!cms) return DAT_CONFIG_ARGUMENT_INVALID;

    int locked = pthread_mutex_trylock(&cms->sync_lock);
    if (locked != 0) {
        cms_log(cms, DAT_LOG_DEBUG, "cms sync skipped, previous sync still running");
        return DAT_CMS_SYNC_IN_PROGRESS;
    }

    pthread_mutex_lock(&cms->state_lock);
    if (cms->stopping) {
        pthread_mutex_unlock(&cms->state_lock);
        return cms_record_and_unlock(cms, DAT_CMS_UNREACHABLE);
    }
    uint64_t current_version = cms->version;
    pthread_mutex_unlock(&cms->state_lock);

    char* request_url = NULL;
    char* authorization = NULL;
    dat_error_t err = build_request_strings(cms, current_version,
                                            &request_url, &authorization);
    if (err != DAT_SUCCESS) {
        return cms_record_and_unlock(cms, err);
    }

    curl_buf_t body = { NULL, 0, 0, 0 };
    body.data = malloc(1024);
    if (!body.data) {
        free(request_url);
        free(authorization);
        return cms_record_and_unlock(cms, DAT_INTERNAL_UNKNOWN);
    }
    body.cap  = 1024;
    body.data[0] = '\0';

    CURL* curl = curl_easy_init();
    if (!curl) {
        free(body.data);
        free(request_url);
        free(authorization);
        return cms_record_and_unlock(cms, DAT_INTERNAL_UNKNOWN);
    }
    struct curl_slist* headers = NULL;
    headers = curl_slist_append(headers, authorization);
    if (!headers) {
        curl_easy_cleanup(curl);
        free(body.data);
        free(request_url);
        free(authorization);
        return cms_record_and_unlock(cms, DAT_INTERNAL_UNKNOWN);
    }

    CURLcode setup = curl_easy_setopt(curl, CURLOPT_URL, request_url);
    if (setup == CURLE_OK) setup = curl_easy_setopt(curl, CURLOPT_HTTPHEADER, headers);
    if (setup == CURLE_OK) setup = curl_easy_setopt(curl, CURLOPT_WRITEFUNCTION, curl_write_cb);
    if (setup == CURLE_OK) setup = curl_easy_setopt(curl, CURLOPT_WRITEDATA, &body);
    if (setup == CURLE_OK) setup = curl_easy_setopt(
        curl, CURLOPT_CONNECTTIMEOUT_MS,
        timeout_milliseconds(cms->connect_timeout_seconds));
    if (setup == CURLE_OK) setup = curl_easy_setopt(
        curl, CURLOPT_TIMEOUT_MS,
        timeout_milliseconds(cms->total_timeout_seconds));
    if (setup == CURLE_OK) setup = curl_easy_setopt(curl, CURLOPT_FOLLOWLOCATION, 0L);
    if (setup == CURLE_OK) setup = curl_easy_setopt(curl, CURLOPT_NOPROGRESS, 0L);
    if (setup == CURLE_OK) setup = curl_easy_setopt(curl, CURLOPT_XFERINFOFUNCTION,
                                                    cms_transfer_progress);
    if (setup == CURLE_OK) setup = curl_easy_setopt(curl, CURLOPT_XFERINFODATA, cms);
    if (setup != CURLE_OK) {
        curl_slist_free_all(headers);
        curl_easy_cleanup(curl);
        free(body.data);
        free(request_url);
        free(authorization);
        return cms_record_and_unlock(cms, DAT_INTERNAL_UNKNOWN);
    }

    CURLcode res = curl_easy_perform(curl);
    long http_code = 0;
    curl_easy_getinfo(curl, CURLINFO_RESPONSE_CODE, &http_code);
    curl_slist_free_all(headers);
    curl_easy_cleanup(curl);
    free(request_url);
    free(authorization);

    if (res != CURLE_OK) {
        if (body.allocation_failed) {
            free(body.data);
            return cms_record_and_unlock(cms, DAT_INTERNAL_UNKNOWN);
        }
        char msg[256];
        snprintf(msg, sizeof(msg), "[%s] DAT CMS SYNC: %s",
                 dat_error_code(DAT_CMS_UNREACHABLE), curl_easy_strerror(res));
        cms_log(cms, DAT_LOG_ERROR, msg);
        free(body.data);
        return cms_record_and_unlock(cms, DAT_CMS_UNREACHABLE);
    }
    if (http_code < 200 || http_code >= 300) {
        dat_error_t http_err = dat_cms_http_status_error(http_code);
        char msg[256];
        snprintf(msg, sizeof(msg), "[%s] DAT CMS SYNC HTTP error: %ld",
                 dat_error_code(http_err), http_code);
        cms_log(cms, DAT_LOG_ERROR, msg);
        free(body.data);
        return cms_record_and_unlock(cms, http_err);
    }

    uint64_t new_version;
    bool version_changed;
    bool version_reset;
    err = dat_cms_apply_response(cms->manager, current_version,
                                 (const unsigned char*)body.data, body.len,
                                 &new_version, &version_changed, &version_reset);
    free(body.data);
    if (err != DAT_SUCCESS) {
        char msg[160];
        snprintf(msg, sizeof(msg), "[%s] DAT CMS SYNC response rejected",
                 dat_error_code(err));
        cms_log(cms, DAT_LOG_ERROR, msg);
        return cms_record_and_unlock(cms, err);
    }

    if (version_reset) {
        char msg[160];
        snprintf(msg, sizeof(msg), "[%s] server rolled version back %" PRIu64 " -> %" PRIu64,
                 dat_error_code(DAT_CMS_VERSION_RESET), current_version, new_version);
        cms_log(cms, DAT_LOG_WARN, msg);
    }

    pthread_mutex_lock(&cms->state_lock);
    if (version_changed) cms->version = new_version;
    cms->last_error = DAT_SUCCESS;
    pthread_mutex_unlock(&cms->state_lock);

    if (version_changed) cms_log(cms, DAT_LOG_INFO, "Sync OK: Renew DAT certificates.");
    else cms_log(cms, DAT_LOG_DEBUG, "No new certificates in response");
    pthread_mutex_unlock(&cms->sync_lock);
    return DAT_SUCCESS;
}

static void* cms_thread_fn(void* arg) {
    dat_cms_manager_t* cms = (dat_cms_manager_t*)arg;
    pthread_mutex_lock(&cms->state_lock);
    while (!cms->stopping) {
        if (cms->needs_immediate_retry) {
            cms->needs_immediate_retry = 0;
        } else {
            struct timespec deadline;
            timespec_get(&deadline, TIME_UTC);
            uint64_t seconds = cms->interval_seconds;
            if (seconds > (uint64_t)INT_MAX) seconds = INT_MAX;
            deadline.tv_sec += (time_t)seconds;
            while (!cms->stopping) {
                int wait_result = pthread_cond_timedwait(&cms->wake_cond,
                                                        &cms->state_lock,
                                                        &deadline);
                if (wait_result != 0) break;
            }
        }
        if (cms->stopping) break;
        pthread_mutex_unlock(&cms->state_lock);
        dat_cms_manager_sync(cms);
        pthread_mutex_lock(&cms->state_lock);
    }
    pthread_mutex_unlock(&cms->state_lock);
    return NULL;
}

static dat_error_t validate_url(const char* url, char** clean_url_out) {
    if (!url) return DAT_CONFIG_ARGUMENT_INVALID;
    const char* after_scheme = NULL;
    if (strncmp(url, "http://",  7) == 0)  after_scheme = url + 7;
    else if (strncmp(url, "https://", 8) == 0) after_scheme = url + 8;
    else return DAT_CONFIG_URI_INVALID;

    if (strchr(url, '?') != NULL) return DAT_CONFIG_URI_INVALID;

    const char* path = strchr(after_scheme, '/');
    if (path && strlen(path) > 1) return DAT_CONFIG_URI_INVALID;

    size_t len = strlen(url);
    while (len > 0 && url[len-1] == '/') len--;
    *clean_url_out = malloc(len + 1);
    if (!*clean_url_out) return DAT_INTERNAL_UNKNOWN;
    memcpy(*clean_url_out, url, len);
    (*clean_url_out)[len] = '\0';
    return DAT_SUCCESS;
}

dat_cms_manager_options_t dat_cms_manager_default_options(void) {
    dat_cms_manager_options_t options = { 5, 15 };
    return options;
}

dat_error_t dat_cms_manager_create_with_options(
                                    const char* url, const char* token,
                                    bool verify_only, uint64_t interval_seconds,
                                    dat_log_fn_t log_fn, void* log_userdata,
                                    const dat_cms_manager_options_t* options,
                                    dat_cms_manager_t** out) {
    if (!out) return DAT_CONFIG_ARGUMENT_INVALID;

    char* clean_url = NULL;
    dat_error_t err = validate_url(url, &clean_url);
    if (err != DAT_SUCCESS) return err;

    const char* suffix = verify_only
        ? "/" DAT_CMS_API_VERSION "/certs/verify-only"
        : "/" DAT_CMS_API_VERSION "/certs";
    size_t clean_len = strlen(clean_url);
    size_t suffix_len = strlen(suffix);
    if (clean_len > SIZE_MAX - suffix_len - 1) {
        free(clean_url);
        return DAT_INTERNAL_UNKNOWN;
    }
    size_t full_len = clean_len + suffix_len + 1;
    char* full_url = malloc(full_len);
    if (!full_url) { free(clean_url); return DAT_INTERNAL_UNKNOWN; }
    snprintf(full_url, full_len, "%s%s", clean_url, suffix);
    free(clean_url);

    dat_cms_manager_t* cms = calloc(1, sizeof(struct dat_cms_manager));
    if (!cms) { free(full_url); return DAT_INTERNAL_UNKNOWN; }

    cms->url              = full_url;
    cms->token            = strdup(token ? token : "");
    cms->manager          = dat_manager_new();
    cms->interval_seconds = interval_seconds;
    cms->log_fn           = log_fn;
    cms->log_userdata     = log_userdata;
    dat_cms_manager_options_t effective = options
        ? *options : dat_cms_manager_default_options();
    cms->connect_timeout_seconds = effective.connect_timeout_seconds;
    cms->total_timeout_seconds = effective.total_timeout_seconds;

    if (pthread_mutex_init(&cms->state_lock, NULL) != 0) {
        dat_manager_free(cms->manager);
        free(cms->token);
        free(cms->url);
        free(cms);
        return DAT_INTERNAL_UNKNOWN;
    }
    if (pthread_mutex_init(&cms->sync_lock, NULL) != 0) {
        pthread_mutex_destroy(&cms->state_lock);
        dat_manager_free(cms->manager);
        free(cms->token);
        free(cms->url);
        free(cms);
        return DAT_INTERNAL_UNKNOWN;
    }
    if (pthread_cond_init(&cms->wake_cond, NULL) != 0) {
        pthread_mutex_destroy(&cms->sync_lock);
        pthread_mutex_destroy(&cms->state_lock);
        dat_manager_free(cms->manager);
        free(cms->token);
        free(cms->url);
        free(cms);
        return DAT_INTERNAL_UNKNOWN;
    }

    if (!cms->manager || !cms->token) {
        dat_cms_manager_free(cms);
        return DAT_INTERNAL_UNKNOWN;
    }

    cms->last_error = DAT_CMS_NOT_SYNCED;

    dat_error_t sync_err = dat_cms_manager_sync(cms);
    cms->needs_immediate_retry = (sync_err != DAT_SUCCESS) ? 1 : 0;

    if (interval_seconds > 0) {
        if (pthread_create(&cms->thread, NULL, cms_thread_fn, cms) != 0) {
            cms_log(cms, DAT_LOG_WARN, "cms background sync thread could not start");
        } else {
            cms->thread_started = 1;
        }
    }

    *out = cms;
    return DAT_SUCCESS;
}

dat_error_t dat_cms_manager_create(const char* url, const char* token,
                                    bool verify_only, uint64_t interval_seconds,
                                    dat_log_fn_t log_fn, void* log_userdata,
                                    dat_cms_manager_t** out) {
    dat_cms_manager_options_t options = dat_cms_manager_default_options();
    return dat_cms_manager_create_with_options(url, token, verify_only,
                                                interval_seconds, log_fn,
                                                log_userdata, &options, out);
}

void dat_cms_manager_free(dat_cms_manager_t* cms) {
    if (!cms) return;
    pthread_mutex_lock(&cms->state_lock);
    cms->stopping = 1;
    pthread_cond_broadcast(&cms->wake_cond);
    pthread_mutex_unlock(&cms->state_lock);
    if (cms->thread_started) {
        pthread_join(cms->thread, NULL);
    }
    pthread_mutex_lock(&cms->sync_lock);
    pthread_mutex_unlock(&cms->sync_lock);
    pthread_cond_destroy(&cms->wake_cond);
    pthread_mutex_destroy(&cms->sync_lock);
    pthread_mutex_destroy(&cms->state_lock);
    dat_manager_free(cms->manager);
    free(cms->url);
    free(cms->token);
    free(cms);
}

dat_error_t dat_cms_manager_issue(dat_cms_manager_t* cms,
                                   const char* plain, const char* secure,
                                   char** out) {
    return dat_manager_issue(cms->manager, plain, secure, out);
}

dat_error_t dat_cms_manager_parse(dat_cms_manager_t* cms,
                                   const char* dat_str, dat_payload_t** out) {
    return dat_manager_parse(cms->manager, dat_str, out);
}

dat_error_t dat_cms_manager_parse_without_verify(dat_cms_manager_t* cms,
                                                   const char* dat_str,
                                                   dat_payload_t** out) {
    return dat_manager_parse_without_verify(cms->manager, dat_str, out);
}

uint64_t dat_cms_manager_get_version(dat_cms_manager_t* cms) {
    if (!cms) return 0;
    pthread_mutex_lock(&cms->state_lock);
    uint64_t v = cms->version;
    pthread_mutex_unlock(&cms->state_lock);
    return v;
}

dat_manager_t* dat_cms_manager_get_manager(dat_cms_manager_t* cms) {
    return cms ? cms->manager : NULL;
}

#else

dat_cms_manager_options_t dat_cms_manager_default_options(void) {
    dat_cms_manager_options_t options = { 5, 15 };
    return options;
}

dat_error_t dat_cms_manager_create_with_options(
                                    const char* url, const char* token,
                                    bool verify_only, uint64_t interval_seconds,
                                    dat_log_fn_t log_fn, void* log_userdata,
                                    const dat_cms_manager_options_t* options,
                                    dat_cms_manager_t** out) {
    (void)url; (void)token; (void)verify_only; (void)interval_seconds;
    (void)log_fn; (void)log_userdata; (void)options; (void)out;
    return DAT_CMS_NOT_SUPPORTED;
}

dat_error_t dat_cms_manager_create(const char* url, const char* token,
                                    bool verify_only, uint64_t interval_seconds,
                                    dat_log_fn_t log_fn, void* log_userdata,
                                    dat_cms_manager_t** out) {
    (void)url; (void)token; (void)verify_only; (void)interval_seconds;
    (void)log_fn; (void)log_userdata; (void)out;
    return DAT_CMS_NOT_SUPPORTED;
}
void dat_cms_manager_free(dat_cms_manager_t* cms) { (void)cms; }
dat_error_t dat_cms_manager_sync(dat_cms_manager_t* cms) { (void)cms; return DAT_CMS_NOT_SUPPORTED; }
dat_error_t dat_cms_manager_last_error(dat_cms_manager_t* cms) { (void)cms; return DAT_CMS_NOT_SUPPORTED; }
dat_error_t dat_cms_manager_issue(dat_cms_manager_t* cms, const char* p, const char* s, char** o)
    { (void)cms;(void)p;(void)s;(void)o; return DAT_CMS_NOT_SUPPORTED; }
dat_error_t dat_cms_manager_parse(dat_cms_manager_t* cms, const char* d, dat_payload_t** o)
    { (void)cms;(void)d;(void)o; return DAT_CMS_NOT_SUPPORTED; }
dat_error_t dat_cms_manager_parse_without_verify(dat_cms_manager_t* cms, const char* d, dat_payload_t** o)
    { (void)cms;(void)d;(void)o; return DAT_CMS_NOT_SUPPORTED; }
uint64_t dat_cms_manager_get_version(dat_cms_manager_t* cms) { (void)cms; return 0; }
dat_manager_t* dat_cms_manager_get_manager(dat_cms_manager_t* cms) { (void)cms; return NULL; }

#endif
