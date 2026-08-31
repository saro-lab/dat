#include "dat_cms_internal.h"
#include "../include/dat/dat_cms.h"
#include <assert.h>
#include <ctype.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <time.h>

#ifndef DAT_CMS_FIXTURE_PATH
#define DAT_CMS_FIXTURE_PATH "fixtures/cms_v1_state_transitions.json"
#endif

typedef struct {
    const char* begin;
    const char* end;
} json_span_t;

typedef struct {
    unsigned char* data;
    size_t len;
    size_t cap;
} byte_buf_t;

static char* read_fixture(void) {
    FILE* file = fopen(DAT_CMS_FIXTURE_PATH, "rb");
    assert(file != NULL);
    assert(fseek(file, 0, SEEK_END) == 0);
    long length = ftell(file);
    assert(length > 0);
    rewind(file);
    char* json = malloc((size_t)length + 1);
    assert(json != NULL);
    assert(fread(json, 1, (size_t)length, file) == (size_t)length);
    json[length] = '\0';
    fclose(file);
    return json;
}

static const char* skip_space(const char* p, const char* end) {
    while (p < end && isspace((unsigned char)*p)) p++;
    return p;
}

static const char* skip_json_string(const char* p, const char* end) {
    assert(p < end && *p == '"');
    p++;
    while (p < end) {
        if (*p == '\\') {
            p += 2;
        } else if (*p++ == '"') {
            return p;
        }
    }
    assert(0);
    return end;
}

static char* parse_json_string(const char** cursor, const char* end) {
    const char* p = skip_space(*cursor, end);
    assert(p < end && *p == '"');
    p++;
    size_t cap = (size_t)(end - p) + 1;
    char* value = malloc(cap);
    assert(value != NULL);
    size_t len = 0;
    while (p < end && *p != '"') {
        unsigned char c = (unsigned char)*p++;
        if (c == '\\') {
            assert(p < end);
            char escaped = *p++;
            switch (escaped) {
                case 'n': c = '\n'; break;
                case 'r': c = '\r'; break;
                case 't': c = '\t'; break;
                case 'b': c = '\b'; break;
                case 'f': c = '\f'; break;
                case '\\': c = '\\'; break;
                case '/': c = '/'; break;
                case '"': c = '"'; break;
                default: assert(0);
            }
        }
        value[len++] = (char)c;
    }
    assert(p < end && *p == '"');
    value[len] = '\0';
    *cursor = p + 1;
    return value;
}

static const char* find_key(json_span_t span, const char* key) {
    size_t key_len = strlen(key);
    const char* p = span.begin;
    while (p < span.end) {
        if (*p != '"') {
            p++;
            continue;
        }
        const char* string_end = skip_json_string(p, span.end);
        size_t value_len = (size_t)(string_end - p - 2);
        if (value_len == key_len && memcmp(p + 1, key, key_len) == 0) {
            const char* colon = skip_space(string_end, span.end);
            if (colon < span.end && *colon == ':') return skip_space(colon + 1, span.end);
        }
        p = string_end;
    }
    return NULL;
}

static json_span_t compound_at(const char* p, const char* end, char open, char close) {
    p = skip_space(p, end);
    assert(p < end && *p == open);
    const char* begin = p;
    int depth = 0;
    while (p < end) {
        if (*p == '"') {
            p = skip_json_string(p, end);
            continue;
        }
        if (*p == open) depth++;
        if (*p == close && --depth == 0) return (json_span_t){ begin, p + 1 };
        p++;
    }
    assert(0);
    return (json_span_t){ NULL, NULL };
}

static json_span_t object_for_key(json_span_t span, const char* key) {
    const char* value = find_key(span, key);
    assert(value != NULL);
    return compound_at(value, span.end, '{', '}');
}

static json_span_t array_for_key(json_span_t span, const char* key) {
    const char* value = find_key(span, key);
    assert(value != NULL);
    return compound_at(value, span.end, '[', ']');
}

static char* string_for_key(json_span_t span, const char* key) {
    const char* value = find_key(span, key);
    assert(value != NULL);
    return parse_json_string(&value, span.end);
}

static char* optional_string_for_key(json_span_t span, const char* key) {
    const char* value = find_key(span, key);
    assert(value != NULL);
    if ((size_t)(span.end - value) >= 4 && memcmp(value, "null", 4) == 0) return NULL;
    return parse_json_string(&value, span.end);
}

static long integer_for_key(json_span_t span, const char* key) {
    const char* value = find_key(span, key);
    assert(value != NULL);
    return strtol(value, NULL, 10);
}

static char* fixture_certificate(json_span_t root, const char* name) {
    json_span_t certificates = object_for_key(root, "certificates");
    json_span_t certificate = object_for_key(certificates, name);
    return string_for_key(certificate, "wire_ascii");
}

static void byte_buf_append(byte_buf_t* buf, const unsigned char* data, size_t len) {
    if (len > SIZE_MAX - buf->len) assert(0);
    size_t needed = buf->len + len;
    if (needed > buf->cap) {
        size_t cap = buf->cap ? buf->cap : 64;
        while (cap < needed) {
            if (cap > SIZE_MAX / 2) {
                cap = needed;
                break;
            }
            cap *= 2;
        }
        unsigned char* resized = realloc(buf->data, cap);
        assert(resized != NULL);
        buf->data = resized;
        buf->cap = cap;
    }
    memcpy(buf->data + buf->len, data, len);
    buf->len += len;
}

static unsigned hex_value(char c) {
    if (c >= '0' && c <= '9') return (unsigned)(c - '0');
    if (c >= 'a' && c <= 'f') return (unsigned)(c - 'a' + 10);
    assert(0);
    return 0;
}

static byte_buf_t case_body(json_span_t root, json_span_t input) {
    byte_buf_t body = { NULL, 0, 0 };
    const char* body_value = find_key(input, "body");
    if (!body_value) return body;
    json_span_t segments = compound_at(body_value, input.end, '[', ']');
    const char* p = segments.begin + 1;
    while (p < segments.end - 1) {
        p = skip_space(p, segments.end - 1);
        if (*p == ',') {
            p++;
            continue;
        }
        if (*p != '[') break;
        json_span_t segment = compound_at(p, segments.end, '[', ']');
        const char* item = segment.begin + 1;
        char* kind = parse_json_string(&item, segment.end);
        item = skip_space(item, segment.end);
        assert(*item++ == ',');
        char* value = parse_json_string(&item, segment.end);
        if (strcmp(kind, "ascii") == 0) {
            byte_buf_append(&body, (const unsigned char*)value, strlen(value));
        } else if (strcmp(kind, "hex") == 0) {
            size_t length = strlen(value);
            assert(length % 2 == 0);
            for (size_t i = 0; i < length; i += 2) {
                unsigned char byte = (unsigned char)((hex_value(value[i]) << 4) |
                                                      hex_value(value[i + 1]));
                byte_buf_append(&body, &byte, 1);
            }
        } else {
            assert(strcmp(kind, "certificate") == 0);
            char* certificate = fixture_certificate(root, value);
            byte_buf_append(&body, (const unsigned char*)certificate, strlen(certificate));
            free(certificate);
        }
        free(value);
        free(kind);
        p = segment.end;
    }
    return body;
}

static size_t array_strings(json_span_t array, char*** values_out) {
    char** values = NULL;
    size_t count = 0;
    const char* p = array.begin + 1;
    while (p < array.end - 1) {
        p = skip_space(p, array.end - 1);
        if (*p == ',') {
            p++;
            continue;
        }
        if (*p != '"') break;
        char* value = parse_json_string(&p, array.end);
        char** resized = realloc(values, (count + 1) * sizeof(char*));
        assert(resized != NULL);
        values = resized;
        values[count++] = value;
    }
    *values_out = values;
    return count;
}

static uint64_t decimal_u64(const char* value) {
    uint64_t result = 0;
    assert(*value != '\0');
    for (const char* p = value; *p; p++) {
        assert(*p >= '0' && *p <= '9');
        unsigned digit = (unsigned)(*p - '0');
        assert(result <= (UINT64_MAX - digit) / 10);
        result = result * 10 + digit;
    }
    return result;
}

static dat_manager_t* manager_for_state(json_span_t root, const char* state_name,
                                        uint64_t* version_out) {
    json_span_t states = object_for_key(root, "states");
    json_span_t state = object_for_key(states, state_name);
    char* version = string_for_key(state, "version");
    *version_out = decimal_u64(version);
    free(version);
    char** names = NULL;
    size_t count = array_strings(array_for_key(state, "certificates"), &names);
    dat_manager_t* manager = dat_manager_new();
    assert(manager != NULL);
    for (size_t i = 0; i < count; i++) {
        char* certificate = fixture_certificate(root, names[i]);
        size_t imported = 0;
        assert(dat_manager_import(manager, certificate, false, &imported) == DAT_SUCCESS);
        assert(imported == 1);
        free(certificate);
        free(names[i]);
    }
    free(names);
    return manager;
}

static uint64_t certificate_cid(json_span_t root, const char* name) {
    char* wire = fixture_certificate(root, name);
    dat_certificate_t* certificate = NULL;
    assert(dat_certificate_parse(wire, &certificate) == DAT_SUCCESS);
    uint64_t cid = dat_certificate_cid(certificate);
    dat_certificate_free(certificate);
    free(wire);
    return cid;
}

static uint64_t issued_cid(const char* token) {
    const char* first = strchr(token, '.');
    assert(first != NULL);
    const char* second = strchr(first + 1, '.');
    assert(second != NULL && second > first + 1);
    uint64_t cid = 0;
    for (const char* p = first + 1; p < second; p++) {
        unsigned digit;
        if (*p >= '0' && *p <= '9') digit = (unsigned)(*p - '0');
        else if (*p >= 'a' && *p <= 'f') digit = (unsigned)(*p - 'a' + 10);
        else assert(0);
        assert(cid <= (UINT64_MAX - digit) / 16);
        cid = cid * 16 + digit;
    }
    return cid;
}

static void assert_state(json_span_t root, dat_manager_t* manager,
                         uint64_t version, const char* state_name) {
    json_span_t states = object_for_key(root, "states");
    json_span_t state = object_for_key(states, state_name);
    char* expected_version_string = string_for_key(state, "version");
    assert(version == decimal_u64(expected_version_string));
    free(expected_version_string);

    char** expected_names = NULL;
    size_t expected_count = array_strings(array_for_key(state, "certificates"),
                                          &expected_names);
    uint64_t* actual_cids = NULL;
    size_t actual_count = 0;
    assert(dat_manager_export_cids(manager, &actual_cids, &actual_count) == DAT_SUCCESS);
    assert(actual_count == expected_count);
    for (size_t i = 0; i < expected_count; i++) {
        assert(actual_cids[i] == certificate_cid(root, expected_names[i]));
        free(expected_names[i]);
    }
    free(expected_names);
    free(actual_cids);

    char* issuer_name = optional_string_for_key(state, "issuer");
    char* token = NULL;
    dat_error_t issue_error = dat_manager_issue(manager, "", "", &token);
    if (!issuer_name) {
        assert(issue_error != DAT_SUCCESS);
    } else {
        assert(issue_error == DAT_SUCCESS);
        assert(issued_cid(token) == certificate_cid(root, issuer_name));
    }
    free(token);
    free(issuer_name);
}

static dat_retry_t retry_from_string(const char* retry) {
    if (strcmp(retry, "transient") == 0) return DAT_RETRY_TRANSIENT;
    if (strcmp(retry, "permanent") == 0) return DAT_RETRY_PERMANENT;
    assert(0);
    return DAT_RETRY_PERMANENT;
}

static void assert_error(dat_error_t actual, json_span_t expectation) {
    char* expected = optional_string_for_key(expectation, "error");
    if (!expected) {
        assert(actual == DAT_SUCCESS);
        return;
    }
    char* parameter = strchr(expected, '(');
    if (parameter) *parameter = '\0';
    assert(strcmp(dat_error_code(actual), expected) == 0);
    char* retry = string_for_key(expectation, "retry");
    assert(dat_error_retry(actual) == retry_from_string(retry));
    free(retry);
    free(expected);
}

static json_span_t expectation_for_case(json_span_t case_object) {
    const char* by_profile = find_key(case_object, "expect_by_profile");
    if (!by_profile) return object_for_key(case_object, "expect");
    json_span_t profiles = compound_at(by_profile, case_object.end, '{', '}');
    return object_for_key(profiles, "unsigned_u64");
}

static void run_case(json_span_t root, json_span_t case_object) {
    char* id = string_for_key(case_object, "id");
    char* initial = string_for_key(case_object, "initial");
    json_span_t input = object_for_key(case_object, "input");
    json_span_t expectation = expectation_for_case(case_object);
    char* kind = string_for_key(input, "kind");
    char* expected_state = string_for_key(expectation, "state");
    uint64_t current_version = 0;
    dat_manager_t* manager = manager_for_state(root, initial, &current_version);
    uint64_t next_version = current_version;
    bool changed = false;
    bool reset = false;
    dat_error_t actual;

    if (strcmp(kind, "transport") == 0) {
        actual = DAT_CMS_UNREACHABLE;
    } else {
        assert(strcmp(kind, "http") == 0);
        long status = integer_for_key(input, "status");
        byte_buf_t body = case_body(root, input);
        if (status < 200 || status >= 300) {
            actual = dat_cms_http_status_error(status);
        } else {
            actual = dat_cms_apply_response(manager, current_version,
                                            body.data, body.len,
                                            &next_version, &changed, &reset);
        }
        free(body.data);
    }

    assert_error(actual, expectation);
    assert_state(root, manager, next_version, expected_state);
    char* observation = optional_string_for_key(expectation, "observation");
    assert(reset == (observation && strcmp(observation, "DAT_CMS_VERSION_RESET") == 0));
    free(observation);
    dat_manager_free(manager);
    free(expected_state);
    free(kind);
    free(initial);
    free(id);
}

static size_t run_all_cases(json_span_t root) {
    json_span_t cases = array_for_key(root, "cases");
    const char* p = cases.begin + 1;
    size_t count = 0;
    while (p < cases.end - 1) {
        p = skip_space(p, cases.end - 1);
        if (*p == ',') {
            p++;
            continue;
        }
        if (*p != '{') break;
        json_span_t case_object = compound_at(p, cases.end, '{', '}');
        run_case(root, case_object);
        count++;
        p = case_object.end;
    }
    return count;
}

static void test_dynamic_transport_and_shutdown(void) {
#ifdef DAT_CMS_CURL
    char* long_token = malloc(4097);
    assert(long_token != NULL);
    memset(long_token, 'x', 4096);
    long_token[4096] = '\0';
    dat_cms_manager_options_t options = dat_cms_manager_default_options();
    assert(options.connect_timeout_seconds == 5);
    assert(options.total_timeout_seconds == 15);
    options.connect_timeout_seconds = 1;
    options.total_timeout_seconds = 1;
    dat_cms_manager_t* cms = NULL;
    assert(dat_cms_manager_create_with_options(
               "http://127.0.0.1:1", long_token, false, 3600,
               NULL, NULL, &options, &cms) == DAT_SUCCESS);
    struct timespec started;
    struct timespec finished;
    timespec_get(&started, TIME_UTC);
    dat_cms_manager_free(cms);
    timespec_get(&finished, TIME_UTC);
    double elapsed = (double)(finished.tv_sec - started.tv_sec) +
                     (double)(finished.tv_nsec - started.tv_nsec) / 1000000000.0;
    assert(elapsed < 2.0);
    free(long_token);

    size_t user_len = 3072;
    const char* url_prefix = "http://";
    const char* url_suffix = "@127.0.0.1:1";
    size_t long_url_len = strlen(url_prefix) + user_len + strlen(url_suffix);
    char* long_url = malloc(long_url_len + 1);
    assert(long_url != NULL);
    memcpy(long_url, url_prefix, strlen(url_prefix));
    memset(long_url + strlen(url_prefix), 'u', user_len);
    memcpy(long_url + strlen(url_prefix) + user_len, url_suffix, strlen(url_suffix) + 1);
    cms = NULL;
    assert(dat_cms_manager_create_with_options(
               long_url, "", false, 0, NULL, NULL, &options, &cms) == DAT_SUCCESS);
    dat_cms_manager_free(cms);
    free(long_url);
#endif
}

int main(void) {
    char* fixture = read_fixture();
    json_span_t root = { fixture, fixture + strlen(fixture) };
    assert(run_all_cases(root) == 42);
    test_dynamic_transport_and_shutdown();
    free(fixture);
    return 0;
}
