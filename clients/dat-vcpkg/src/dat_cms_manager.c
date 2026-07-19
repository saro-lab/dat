#include "../include/dat/dat_cms.h"
#include "../include/dat/dat.h"
#include <stdlib.h>
#include <string.h>
#include <stdio.h>
#include <stdint.h>
#include <inttypes.h>

#ifdef DAT_CMS_CURL
#include <curl/curl.h>
#include <pthread.h>
#ifdef _WIN32
#include <windows.h>
#define cms_sleep_seconds(s) Sleep((DWORD)((s) * 1000))
#else
#include <time.h>
static void cms_sleep_seconds(uint64_t s) {
    struct timespec ts = { (time_t)s, 0 };
    nanosleep(&ts, NULL);
}
#endif

/* ── Internal struct ─────────────────────────────────────────────────────── */

struct dat_cms_manager {
    char*              url;
    char*              token;
    pthread_rwlock_t   version_lock;
    uint64_t           version;
    dat_manager_t*     manager;
    pthread_t          thread;
    int                thread_running;
    uint64_t           interval_seconds;
    dat_log_fn_t       log_fn;
    void*              log_userdata;
    int                needs_immediate_retry;
};

/* ── CURL response buffer ─────────────────────────────────────────────────── */

typedef struct {
    char*  data;
    size_t len;
    size_t cap;
} curl_buf_t;

static size_t curl_write_cb(char* ptr, size_t size, size_t nmemb, void* userdata) {
    curl_buf_t* buf = (curl_buf_t*)userdata;
    size_t n = size * nmemb;
    size_t new_len = buf->len + n;
    if (new_len + 1 > buf->cap) {
        size_t new_cap = (new_len + 1) * 2;
        char* tmp = realloc(buf->data, new_cap);
        if (!tmp) return 0;
        buf->data = tmp;
        buf->cap  = new_cap;
    }
    memcpy(buf->data + buf->len, ptr, n);
    buf->len = new_len;
    buf->data[buf->len] = '\0';
    return n;
}

/* ── dat_cms_manager_sync ────────────────────────────────────────────────── */

static void cms_log(dat_cms_manager_t* cms, dat_log_level_t level, const char* msg) {
    if (cms->log_fn) cms->log_fn(level, msg, cms->log_userdata);
}

dat_error_t dat_cms_manager_sync(dat_cms_manager_t* cms) {
    if (!cms) return DAT_ERROR_MANAGER_ERROR;

    /* Try-wrlock version: if can't acquire, another sync is in progress → skip */
    int locked = pthread_rwlock_trywrlock(&cms->version_lock);
    if (locked != 0) {
        cms_log(cms, DAT_LOG_WARN, "Last request ignored (Duplicate request)");
        return DAT_SUCCESS;
    }
    uint64_t current_version = cms->version;

    /* Build URL with version query param */
    char url_buf[2048];
    snprintf(url_buf, sizeof(url_buf), "%s?version=%" PRIu64, cms->url, current_version);

    /* Build Authorization header */
    char auth_buf[512];
    snprintf(auth_buf, sizeof(auth_buf), "Authorization: %s", cms->token);

    curl_buf_t body = { NULL, 0, 0 };
    body.data = malloc(1024);
    if (!body.data) { pthread_rwlock_unlock(&cms->version_lock); return DAT_ERROR_MALLOC_FAILED; }
    body.cap  = 1024;
    body.data[0] = '\0';

    CURL* curl = curl_easy_init();
    struct curl_slist* headers = NULL;
    headers = curl_slist_append(headers, auth_buf);

    curl_easy_setopt(curl, CURLOPT_URL, url_buf);
    curl_easy_setopt(curl, CURLOPT_HTTPHEADER, headers);
    curl_easy_setopt(curl, CURLOPT_WRITEFUNCTION, curl_write_cb);
    curl_easy_setopt(curl, CURLOPT_WRITEDATA, &body);

    CURLcode res = curl_easy_perform(curl);
    long http_code = 0;
    curl_easy_getinfo(curl, CURLINFO_RESPONSE_CODE, &http_code);
    curl_slist_free_all(headers);
    curl_easy_cleanup(curl);

    dat_error_t err = DAT_SUCCESS;
    if (res != CURLE_OK) {
        char msg[256];
        snprintf(msg, sizeof(msg), "DAT CMS SYNC Exception: %s",
                 curl_easy_strerror(res));
        cms_log(cms, DAT_LOG_ERROR, msg);
        pthread_rwlock_unlock(&cms->version_lock);
        free(body.data);
        return DAT_ERROR_MANAGER_ERROR;
    }
    if (http_code < 200 || http_code >= 300) {
        char msg[256];
        snprintf(msg, sizeof(msg), "DAT CMS SYNC HTTP error: %ld", http_code);
        cms_log(cms, DAT_LOG_ERROR, msg);
        pthread_rwlock_unlock(&cms->version_lock);
        free(body.data);
        return DAT_ERROR_MANAGER_ERROR;
    }

    /* Parse response: first line = version, rest = cert lines */
    char* nl = strchr(body.data, '\n');
    if (!nl) {
        cms_log(cms, DAT_LOG_WARN, "Empty response from CMS server");
        pthread_rwlock_unlock(&cms->version_lock);
        free(body.data);
        return DAT_SUCCESS;
    }
    *nl = '\0';
    const char* ver_str = body.data;
    const char* certs_str = nl + 1;

    /* Trim certs */
    while (*certs_str == '\r' || *certs_str == '\n' || *certs_str == ' ')
        certs_str++;
    if (*certs_str == '\0') {
        cms_log(cms, DAT_LOG_DEBUG, "No new certificates in response");
        *nl = '\n'; /* restore */
        pthread_rwlock_unlock(&cms->version_lock);
        free(body.data);
        return DAT_SUCCESS;
    }

    char* endptr;
    uint64_t new_version = (uint64_t)strtoull(ver_str, &endptr, 10);
    if (*endptr != '\0' && *endptr != '\r') {
        char msg[256];
        snprintf(msg, sizeof(msg), "invalid version in response: %s", ver_str);
        cms_log(cms, DAT_LOG_ERROR, msg);
        pthread_rwlock_unlock(&cms->version_lock);
        free(body.data);
        return DAT_ERROR_MANAGER_ERROR;
    }

    size_t renew_count = 0;
    err = dat_manager_import(cms->manager, certs_str, true, &renew_count);
    if (err != DAT_SUCCESS) {
        char msg[128];
        snprintf(msg, sizeof(msg), "DAT CMS SYNC import error: %d", (int)err);
        cms_log(cms, DAT_LOG_ERROR, msg);
        pthread_rwlock_unlock(&cms->version_lock);
        free(body.data);
        return err;
    }

    cms->version = new_version;
    pthread_rwlock_unlock(&cms->version_lock);
    free(body.data);

    char ok_msg[128];
    snprintf(ok_msg, sizeof(ok_msg), "Sync OK: Renew %zu DAT certificates.", renew_count);
    cms_log(cms, DAT_LOG_INFO, ok_msg);
    return DAT_SUCCESS;
}

/* ── background thread ───────────────────────────────────────────────────── */

static void* cms_thread_fn(void* arg) {
    dat_cms_manager_t* cms = (dat_cms_manager_t*)arg;
    while (cms->thread_running) {
        if (cms->needs_immediate_retry) {
            cms->needs_immediate_retry = 0;
        } else {
            cms_sleep_seconds(cms->interval_seconds);
        }
        if (!cms->thread_running) break;
        dat_cms_manager_sync(cms);
    }
    return NULL;
}

/* ── create / free ───────────────────────────────────────────────────────── */

/* Validate URL: must be http(s)://host[:port] with no path beyond "/" and no query */
static dat_error_t validate_url(const char* url, char** clean_url_out) {
    if (!url) return DAT_ERROR_MANAGER_ERROR;
    /* Must start with http:// or https:// */
    const char* after_scheme = NULL;
    if (strncmp(url, "http://",  7) == 0)  after_scheme = url + 7;
    else if (strncmp(url, "https://", 8) == 0) after_scheme = url + 8;
    else return DAT_ERROR_MANAGER_ERROR;

    /* No query */
    if (strchr(url, '?') != NULL) return DAT_ERROR_MANAGER_ERROR;

    /* Path must be absent or just "/" */
    const char* path = strchr(after_scheme, '/');
    if (path && strlen(path) > 1) return DAT_ERROR_MANAGER_ERROR;

    /* Return clean URL (trim trailing slash) */
    size_t len = strlen(url);
    while (len > 0 && url[len-1] == '/') len--;
    *clean_url_out = malloc(len + 1);
    if (!*clean_url_out) return DAT_ERROR_MALLOC_FAILED;
    memcpy(*clean_url_out, url, len);
    (*clean_url_out)[len] = '\0';
    return DAT_SUCCESS;
}

dat_error_t dat_cms_manager_create(const char* url, const char* token,
                                    bool verify_only, uint64_t interval_seconds,
                                    dat_log_fn_t log_fn, void* log_userdata,
                                    dat_cms_manager_t** out) {
    if (!out) return DAT_ERROR_MANAGER_ERROR;

    char* clean_url = NULL;
    dat_error_t err = validate_url(url, &clean_url);
    if (err != DAT_SUCCESS) return err;

    /* Build full API URL */
    const char* suffix = verify_only
        ? "/" DAT_CMS_API_VERSION "/certs/verify-only"
        : "/" DAT_CMS_API_VERSION "/certs";
    size_t full_len = strlen(clean_url) + strlen(suffix) + 1;
    char* full_url = malloc(full_len);
    if (!full_url) { free(clean_url); return DAT_ERROR_MALLOC_FAILED; }
    snprintf(full_url, full_len, "%s%s", clean_url, suffix);
    free(clean_url);

    dat_cms_manager_t* cms = calloc(1, sizeof(struct dat_cms_manager));
    if (!cms) { free(full_url); return DAT_ERROR_MALLOC_FAILED; }

    cms->url              = full_url;
    cms->token            = strdup(token ? token : "");
    cms->manager          = dat_manager_new();
    cms->interval_seconds = interval_seconds;
    cms->log_fn           = log_fn;
    cms->log_userdata     = log_userdata;
    pthread_rwlock_init(&cms->version_lock, NULL);

    if (!cms->manager || !cms->token) {
        dat_cms_manager_free(cms);
        return DAT_ERROR_MALLOC_FAILED;
    }

    /* First sync — failure is non-fatal; object is still usable once network recovers */
    dat_error_t sync_err = dat_cms_manager_sync(cms);
    cms->needs_immediate_retry = (sync_err != DAT_SUCCESS) ? 1 : 0;

    /* Start background thread if interval > 0 */
    if (interval_seconds > 0) {
        cms->thread_running = 1;
        if (pthread_create(&cms->thread, NULL, cms_thread_fn, cms) != 0) {
            cms->thread_running = 0;
        }
    }

    *out = cms;
    return (sync_err != DAT_SUCCESS)
        ? DAT_SUCCESS_CMS_MANAGER_BUT_NETWORK_FAIL
        : DAT_SUCCESS;
}

void dat_cms_manager_free(dat_cms_manager_t* cms) {
    if (!cms) return;
    if (cms->thread_running) {
        cms->thread_running = 0;
        pthread_join(cms->thread, NULL);
    }
    pthread_rwlock_destroy(&cms->version_lock);
    dat_manager_free(cms->manager);
    free(cms->url);
    free(cms->token);
    free(cms);
}

/* ── delegating API ──────────────────────────────────────────────────────── */

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
    pthread_rwlock_rdlock(&cms->version_lock);
    uint64_t v = cms->version;
    pthread_rwlock_unlock(&cms->version_lock);
    return v;
}

dat_manager_t* dat_cms_manager_get_manager(dat_cms_manager_t* cms) {
    return cms ? cms->manager : NULL;
}

#else /* DAT_CMS_CURL not defined */

dat_error_t dat_cms_manager_create(const char* url, const char* token,
                                    bool verify_only, uint64_t interval_seconds,
                                    dat_log_fn_t log_fn, void* log_userdata,
                                    dat_cms_manager_t** out) {
    (void)url; (void)token; (void)verify_only; (void)interval_seconds;
    (void)log_fn; (void)log_userdata; (void)out;
    return DAT_ERROR_MANAGER_ERROR;
}
void dat_cms_manager_free(dat_cms_manager_t* cms) { (void)cms; }
dat_error_t dat_cms_manager_sync(dat_cms_manager_t* cms) { (void)cms; return DAT_ERROR_MANAGER_ERROR; }
dat_error_t dat_cms_manager_issue(dat_cms_manager_t* cms, const char* p, const char* s, char** o)
    { (void)cms;(void)p;(void)s;(void)o; return DAT_ERROR_MANAGER_ERROR; }
dat_error_t dat_cms_manager_parse(dat_cms_manager_t* cms, const char* d, dat_payload_t** o)
    { (void)cms;(void)d;(void)o; return DAT_ERROR_MANAGER_ERROR; }
dat_error_t dat_cms_manager_parse_without_verify(dat_cms_manager_t* cms, const char* d, dat_payload_t** o)
    { (void)cms;(void)d;(void)o; return DAT_ERROR_MANAGER_ERROR; }
uint64_t dat_cms_manager_get_version(dat_cms_manager_t* cms) { (void)cms; return 0; }
dat_manager_t* dat_cms_manager_get_manager(dat_cms_manager_t* cms) { (void)cms; return NULL; }

#endif /* DAT_CMS_CURL */
