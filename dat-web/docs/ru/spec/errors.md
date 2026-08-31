# Коды ошибок

Реализации DAT предоставляют стабильные коды ошибок отдельно от читаемых сообщений. Программы должны принимать решения по коду и классификации повторной попытки, а не сравнивать строки сообщений.

## Формат кода

```text
DAT_<AREA>_<CAUSE>
```

| Префикс | Область |
| --- | --- |
| `DAT_TOKEN_` | Строки DAT и истечение срока |
| `DAT_CERT_` | Строки и состояние сертификатов |
| `DAT_SIG_` | Подписи и проверка |
| `DAT_CRYPTO_` | Шифрование и расшифровка |
| `DAT_KEY_` | Форматы ключей и полномочия |
| `DAT_MANAGER_` | Менеджеры сертификатов |
| `DAT_CONFIG_` | Аргументы вызовов и конфигурация |
| `DAT_INTERNAL_` | Внутренние компоненты runtime |
| `DAT_CMS_` | Синхронизация клиента CMS |
| `DAT_AUTH_`, `DAT_REQ_`, `DAT_STORE_` | Сервер CMS |

`_UNKNOWN` используется только тогда, когда ошибку нельзя отнести к другому коду в её области. Одинаковая причина имеет одинаковое имя во всех областях.

## Классификации повторных попыток

| Классификация | Значение | Обработка |
| --- | --- | --- |
| Transient | Может пройти после восстановления внешнего условия | Повторить ограниченное число раз с backoff |
| State | Может пройти после синхронизации сертификатов или изменения времени | Обновить нужное состояние и повторить |
| Permanent | С тем же input снова завершится ошибкой | Исправить input, конфигурацию или код |

## Токены и сертификаты

<ErrorCode code="DAT_TOKEN_MALFORMED" impact="none" retry="permanent">
У DAT неверное число полей, числовое значение или представление Base64Url. Отбросьте input.
</ErrorCode>

<ErrorCode code="DAT_TOKEN_EXPIRED" impact="none" retry="permanent">
Время истечения DAT равно текущему времени или прошло. Получите новый DAT.
</ErrorCode>

<ErrorCode code="DAT_CERT_MALFORMED" impact="none" retry="permanent">
Строка сертификата имеет неверную структуру или представление поля.
</ErrorCode>

<ErrorCode code="DAT_CERT_NOT_FOUND" impact="none" retry="state">
Нет сертификата, соответствующего `cid` DAT. Проверьте состояние синхронизации сертификатов.
</ErrorCode>

<ErrorCode code="DAT_CERT_NOT_SYNCED" impact="none" retry="state">
Нужный сертификат мог ещё не дойти до сервиса. Немедленно синхронизируйте и повторите оценку.
</ErrorCode>

<ErrorCode code="DAT_CERT_NOT_YET_VALID" impact="none" retry="state">
Время начала действия сертификата ещё не наступило. Проверьте системные часы и сроки распространения.
</ErrorCode>

<ErrorCode code="DAT_CERT_EXPIRED" impact="none" retry="permanent">
Период проверки сертификата закончился.
</ErrorCode>

<ErrorCode code="DAT_CERT_DUPLICATE" impact="partial" retry="permanent">
Один `cid` встречается в одном списке импорта несколько раз. Отклоните весь импорт.
</ErrorCode>

## Подписи, шифрование и ключи

<ErrorCode code="DAT_SIG_MISMATCH" impact="none" suspect retry="permanent">
Подпись не совпадает с телом. DAT изменён или подписан другим ключом.
</ErrorCode>

<ErrorCode code="DAT_CRYPTO_TAG_MISMATCH" impact="none" suspect retry="permanent">
Тег аутентификации AES-GCM не совпадает. Проверьте изменение ciphertext или несоответствие сертификата.
</ErrorCode>

<ErrorCode code="DAT_KEY_INVALID" impact="none" retry="permanent">
Неверная длина, формат ключа или комбинация алгоритмов.
</ErrorCode>

<ErrorCode code="DAT_SIG_KEY_MISSING" impact="none" retry="permanent">
Предпринята попытка выпустить DAT сертификатом verify-only. Сервису выпуска нужен полный сертификат.
</ErrorCode>

`DAT_SIG_MISMATCH` и `DAT_CRYPTO_TAG_MISMATCH` — ошибки, для которых public security-event API возвращает true. Один неверный input не означает сбой сервиса, но повторения следует считать наблюдаемым событием безопасности.

## Менеджеры и конфигурация

<ErrorCode code="DAT_MANAGER_NO_CERTIFICATE" impact="partial" retry="state">
У менеджера нет сертификатов. Импортируйте их или завершите синхронизацию CMS.
</ErrorCode>

<ErrorCode code="DAT_MANAGER_NO_ISSUABLE_CERTIFICATE" impact="partial" retry="state">
У менеджера есть сертификаты, но сейчас нет полного сертификата для выпуска. Изучите cause chain: срок действия, время начала или состояние verify-only.
</ErrorCode>

<ErrorCode code="DAT_CONFIG_ARGUMENT_INVALID" impact="none" retry="permanent">
Аргумент вызова или значение конфигурации находится вне допустимого диапазона.
</ErrorCode>

<ErrorCode code="DAT_INTERNAL_UNAVAILABLE" impact="critical" retry="permanent">
На текущей платформе недоступна необходимая криптографическая или сетевая возможность.
</ErrorCode>

## Клиенты CMS

| Код | Значение | Обычная обработка |
| --- | --- | --- |
| `DAT_CMS_URI_INVALID` | Неверный URI CMS | Исправить конфигурацию |
| `DAT_CMS_UNAUTHORIZED` | Сбой аутентификации | Исправить токен |
| `DAT_CMS_FORBIDDEN` | Роли токена не хватает разрешения | Проверить роль токена |
| `DAT_CMS_ENDPOINT_NOT_FOUND` | Путь отсутствует или отличается | Проверить URL и путь CMS |
| `DAT_CMS_NETWORK` | Ошибка соединения или передачи | Проверить сеть, затем выполнить backoff |
| `DAT_CMS_TIMEOUT` | Превышен лимит времени | Изменить настройки сети и timeout |
| `DAT_CMS_SERVER_ERROR` | Ошибка сервера CMS | Проверить сервер, затем выполнить backoff |
| `DAT_CMS_RESPONSE_INVALID` | Неверный формат успешного ответа | Проверить контракт сервера и клиента |
| `DAT_CMS_VERSION_RESET` | Версия сервера откатилась | Проверить данные CMS и deployment |
| `DAT_CMS_IMPORT_FAILED` | Полученные сертификаты не применены | Изучить cause chain |
| `DAT_CMS_STOPPED` | Использован остановленный менеджер | Создать новый менеджер или исправить порядок вызовов |

Библиотеки с начальной синхронизацией best-effort сохраняют ошибку в поле last-error. Чтобы прервать запуск, используйте API немедленной синхронизации, который возвращает или выбрасывает ошибку напрямую.

## Сервер CMS

| Код | HTTP | Значение |
| --- | --- | --- |
| `DAT_AUTH_UNAUTHORIZED` | 401 | Токен отсутствует или недействителен |
| `DAT_AUTH_FORBIDDEN` | 403 | Роль токена не разрешает запрос |
| `DAT_REQ_ALG_UNSUPPORTED` | 400 | Неподдерживаемое имя алгоритма |
| `DAT_REQ_NOT_FOUND` | 404·405 | Несоответствие пути или метода |
| `DAT_REQ_TOO_LARGE` | 413 | Зарезервированный код для слишком большого тела запроса |
| `DAT_STORE_UNAVAILABLE` | 503 | Storage временно недоступен |
| `DAT_STORE_UNKNOWN` | 500 | Неклассифицированная ошибка обработки storage |

Текущие клиенты не раскрывают напрямую код сервера из JSON-ответов не 2xx, а преобразуют HTTP status в код `DAT_CMS_*`. Поэтому логи сервера и коды клиента могут отличаться.

## Доступ по языкам

| Среда | Код ошибки | Классификация retry |
| --- | --- | --- |
| Rust | `err.code()` | `err.retry()` |
| Go | `dat.Code(err)` | `dat.Retry(err)` |
| JavaScript / TypeScript | `error.code` | `error.retry` |
| Python | `error.code` | `error.retry` |
| Ruby | `error.code` | `error.retry` |
| Java / Kotlin | `error.code` | `error.retry` |
| C# | `error.Code` | `error.Retry` |
| C / C++ | `dat_error_code(error)` | `dat_error_retry(error)` |

Для ошибок с причиной нижнего уровня изучите exception chain языка или API доступа к причине.

<script setup lang="ts">
import ErrorCode from '../../.vitepress/ui/ErrorCode.vue';
</script>
