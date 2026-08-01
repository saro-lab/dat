# Коды ошибок

Общие коды ошибок для официально поддерживаемых DAT клиентских библиотек.

Каждому коду присвоены два значения — **влияние** и **повтор**, а некоторым дополнительно ставится метка **подозрение**.

## Влияние — урон для сервиса

Это критерий для алертов. Смотрим только на одно: «сервис сейчас стоит или нет».

| Влияние | Значение | Пример |
| --- | --- | --- |
| <span class="lg lg-critical">Критично</span> | Сервис или отдельная функция **останавливается.** Выдача невозможна, синхронизация окончательно провалена, инициализация не прошла | На сервере выдачи нет ни одного пригодного сертификата |
| <span class="lg lg-partial">Частично</span> | Часть запросов или циклов падает, но сервис продолжает работать. Обычно восстанавливается сам | Один цикл CMS провалился. Работа продолжается на прежних сертификатах |
| <span class="lg lg-none">Без влияния</span> | Один запрос отклонён — и на этом всё | Пришёл подделанный токен. Отфильтровали и забыли |

**Без влияния** — не повод для алерта. Если каждый неверный ввод обязана проверять вся дежурная смена, алерты теряют смысл.

## Подозрение — расследуйте, если повторяется

Коды с меткой <span class="lg lg-suspect">Подозрение</span> **в единичном случае являются частью нормальной эксплуатации**. Клиент в любой момент может прислать неверное значение, и отфильтровать его — прямая обязанность библиотеки.

Но если такие ошибки идут **постоянно или лавиной из одного источника**, причина одна из двух.

- **Ошибка конфигурации** — неверный деплой, остался клиент старой версии, сертификаты разошлись.
- **Попытка взлома** — подмена токена или ключа ради прохождения проверки, либо перебор в поисках валидного значения.

Поэтому такие коды правильно **вести как метрику по количеству**. Оповещать имеет смысл только при превышении порога.

## Повтор

| Повтор | Значение |
| --- | --- |
| <span class="lg lg-transient">Временно</span> | Повтор после backoff решает проблему |
| <span class="lg">Постоянно</span> | Повторять запрещено. Нужно исправить конфигурацию или ввод |
| <span class="lg">Состояние</span> | Это сигнал, а не ошибка |

---

## Токен

Проблемы самой строки полученного токена.

<ErrorCode code="DAT_TOKEN_MALFORMED" impact="none" suspect retry="permanent" action="Отклонить запрос">
Частей, разделённых точкой, не пять; либо <code>expire</code> не чисто десятичное; либо <code>cid</code> не чисто шестнадцатеричное; либо <code>plain</code> или <code>secure</code> не base64url; либо числовое поле вышло за диапазон целого.
</ErrorCode>

<ErrorCode code="DAT_TOKEN_EXPIRED" impact="none" retry="permanent" action="Инициировать перевыпуск токена">
<code>expire &lt;= now</code>. <strong>Ровно в срок — уже истёк</strong>: при <code>expire == now</code> токен считается просроченным.
</ErrorCode>

<ErrorCode code="DAT_TOKEN_UNKNOWN" impact="partial" retry="permanent" action="Проверить логи">
Ошибка токена, не попавшая ни в одну из категорий выше.
</ErrorCode>

::: tip Истечение и ошибка формата — обязательно разные вещи
Реакции прямо противоположны: истечение — это нормальное завершение срока жизни, достаточно обновить токен; ошибка формата означает, что токен изначально не наш, и его нужно отклонить.

Разбор **сначала фиксирует структуру**, и только потом смотрит значения. Строка вроде `"1.2.3"` с нехваткой частей — это не просроченный токен, а вообще не токен, поэтому `DAT_TOKEN_MALFORMED`.

Знак в поле `expire`, например `+100`, — тоже ошибка формата, а не истечение. Допускаются только чистые ASCII-цифры.
:::

---

## Сертификат

Проблемы формата строки сертификата и того, можно ли использовать этот сертификат прямо сейчас.

<ErrorCode code="DAT_CERT_MALFORMED" impact="critical" retry="permanent" action="Переразвернуть сертификат">
Частей, разделённых точкой, не восемь; либо не удалось разобрать <code>cid</code>, <code>start</code>, <code>duration</code>, <code>ttl</code>; либо поле ключа не base64url; либо <code>start + duration + ttl</code> вышло за u64.
</ErrorCode>

<ErrorCode code="DAT_CERT_EXPIRED" impact="critical" retry="permanent" action="Обновить сертификат">
<code>start + duration + ttl &lt; now</code>. Полностью истёкшее состояние: невозможны ни выдача, ни проверка.
</ErrorCode>

<ErrorCode code="DAT_CERT_NOT_YET_ISSUABLE" impact="critical" retry="transient" action="Подождать">
<code>now &lt; start</code>. Окно выдачи ещё не открылось.
</ErrorCode>

<ErrorCode code="DAT_CERT_ISSUANCE_ENDED" impact="critical" retry="permanent" action="Развернуть новый сертификат">
<code>now &gt; start + duration</code>, но ttl ещё остался. Выдача невозможна, доступна только проверка.
</ErrorCode>

<ErrorCode code="DAT_CERT_VERIFY_ONLY" impact="critical" retry="permanent" action="Проверить настройки деплоя">
Сертификат содержит только открытый ключ, без приватного ключа подписи. Проверка работает, выдача невозможна.
</ErrorCode>

<ErrorCode code="DAT_CERT_NOT_FOUND" impact="none" suspect retry="permanent" action="Отклонить запрос">
Сертификата, соответствующего <code>cid</code> из токена, нет в наличии. Это подделанный токен либо неверный деплой.
</ErrorCode>

<ErrorCode code="DAT_CERT_NOT_SYNCED" impact="partial" retry="transient" action="Повторить после синхронизации">
Этот <code>cid</code> ещё не получен из CMS. Возникает ненадолго сразу после развёртывания нового сертификата.
</ErrorCode>

<ErrorCode code="DAT_CERT_DUPLICATE_CID" impact="critical" retry="permanent" action="Проверить ответ сервера">
В импортируемом списке один и тот же <code>cid</code> встречается дважды или более.
</ErrorCode>

<ErrorCode code="DAT_CERT_UNKNOWN" impact="partial" retry="permanent" action="Проверить логи">
Ошибка сертификата, не попавшая ни в одну из категорий выше.
</ErrorCode>

`DAT_CERT_NOT_FOUND` и `DAT_CERT_NOT_SYNCED` внешне выглядят одинаково, но реакции разные. В первом случае это `cid`, который мы никогда не выпускали, — ожидание не поможет; во втором достаточно дождаться синхронизации.

Единичный `DAT_CERT_NOT_FOUND` достаточно просто отфильтровать, но резкий рост означает, что деплой разошёлся либо ходят поддельные токены.

---

## Подпись

<ErrorCode code="DAT_SIG_MISMATCH" impact="none" suspect retry="permanent" action="Заблокировать сессию, записать в security-лог">
Проверка подписи завершилась <strong>несовпадением</strong>. Значение HMAC отличается либо ECDSA verify вернул false.
</ErrorCode>

<ErrorCode code="DAT_SIG_MALFORMED" impact="none" suspect retry="permanent" action="Отклонить запрос">
Часть с подписью пуста; либо не base64url; либо длина ECDSA <code>r‖s</code> не соответствует кривой; либо не удалось преобразование в DER.
</ErrorCode>

<ErrorCode code="DAT_SIG_KEY_MISSING" impact="critical" retry="permanent" action="Проверить настройки сервера выдачи">
Попытка подписать ключом verify-only. В рантайме приватного ключа нет.
</ErrorCode>

<ErrorCode code="DAT_SIG_BACKEND" impact="partial" retry="permanent" action="Проверить тип ключа и библиотеку">
<strong>Сама операция подписи или проверки не смогла выполниться.</strong> Неверный тип ключа, освобождённый handle, внутренняя ошибка криптобиблиотеки.
</ErrorCode>

<ErrorCode code="DAT_SIG_UNKNOWN" impact="partial" retry="permanent" action="Проверить логи">
Ошибка подписи, не попавшая ни в одну из категорий выше.
</ErrorCode>

::: warning Не смешивайте несовпадение и отказ бэкенда
У этих двух кодов оси прямо противоположны.

- `DAT_SIG_MISMATCH` — пришедшая подпись просто не совпала, поэтому **влияния на сервис нет**, зато при повторении это повод для **подозрения**.
- `DAT_SIG_BACKEND` — сама операция проверки не отработала, то есть это **наша проблема**, и к подозрениям она не относится.

Если сообщать о неверном типе ключа или баге библиотеки как о «несовпадении подписи», то ситуация со сломанным собственным кодом попадёт в метрики атак. И наоборот: если настоящая подделка классифицируется как ошибка бэкенда, она целиком выпадет из метрик подозрений.
:::

---

## Шифрование

Проблемы шифрования и расшифровки полезной нагрузки secure.

<ErrorCode code="DAT_CRYPTO_TAG_MISMATCH" impact="none" suspect retry="permanent" action="Заблокировать сессию, записать в security-лог">
Тег аутентификации AES-GCM не совпадает. Либо secure был изменён, либо ключ сертификата другой.
</ErrorCode>

<ErrorCode code="DAT_CRYPTO_DATA_INVALID" impact="none" suspect retry="permanent" action="Отклонить запрос">
Шифротекст не пуст, но короче или равен IV (12 байт); либо вход превысил предел реализации (<code>INT_MAX</code> и т. п.).
</ErrorCode>

<ErrorCode code="DAT_CRYPTO_BACKEND" impact="partial" retry="permanent" action="Проверить поддержку платформы">
Операция шифрования или расшифровки не смогла выполниться. Платформа без поддержки GCM либо сбой инициализации контекста.
</ErrorCode>

<ErrorCode code="DAT_CRYPTO_UNKNOWN" impact="partial" retry="permanent" action="Проверить логи">
Ошибка шифрования или расшифровки, не попавшая ни в одну из категорий выше.
</ErrorCode>

**Пустая полезная нагрузка secure не является ошибкой.** Пустой вход даёт пустой выход и не порождает никакого кода.

На пути, где проверка подписи пропускается, тег GCM — **единственная проверка целостности**. Поэтому `DAT_CRYPTO_TAG_MISMATCH` не объединяется одним кодом с остальными сбоями расшифровки.

---

## Ключ

<ErrorCode code="DAT_KEY_INVALID" impact="none" suspect retry="permanent" action="Заменить ключ">
Длина ключа не соответствует заявленному алгоритму (HMAC 32/48/64, AES 16/32); либо точка не лежит на кривой; либо <code>d ∉ [1,n-1]</code>; либо формат не несжатый (0x04); либо приватный и открытый ключи не являются парой.
</ErrorCode>

<ErrorCode code="DAT_KEY_VERIFY_ONLY_UNSUPPORTED" impact="critical" retry="permanent" action="Сменить алгоритм">
Запрошен экспорт verify-only для семейства HMAC.
</ErrorCode>

<ErrorCode code="DAT_KEY_UNKNOWN" impact="partial" retry="permanent" action="Проверить логи">
Ошибка ключа, не попавшая ни в одну из категорий выше.
</ErrorCode>

**Три похожих, но разных случая:**

| Код | Значение |
| --- | --- |
| `DAT_KEY_VERIFY_ONLY_UNSUPPORTED` | **Структурное ограничение алгоритма.** HMAC симметричен, понятия открытого ключа у него нет |
| `DAT_SIG_KEY_MISSING` | **Состояние в рантайме.** В этом ключе прямо сейчас нет приватной части |
| `DAT_CERT_VERIFY_ONLY` | **Форма развёртывания.** Этот сертификат развёрнут только для проверки |

---

## Менеджер

Состояние объекта, который хранит сертификаты и использует их для выдачи и проверки.

<ErrorCode code="DAT_MANAGER_NO_CERTIFICATE" impact="critical" retry="transient" action="Проверить подключение к CMS">
Нет ни одного сертификата. Либо импорт ещё не выполнялся, либо первая синхронизация с CMS не удалась.
</ErrorCode>

<ErrorCode code="DAT_MANAGER_NO_ISSUABLE_CERTIFICATE" impact="critical" retry="permanent" action="Решать по причине (cause) — таблица ниже">
Сертификаты есть, но ни один из них сейчас не пригоден для выдачи. <strong>Причина передаётся вместе с ошибкой.</strong>
</ErrorCode>

<ErrorCode code="DAT_MANAGER_DISPOSED" impact="critical" retry="permanent" action="Исправить вызывающий код">
Использован уже освобождённый менеджер или сертификат.
</ErrorCode>

<ErrorCode code="DAT_MANAGER_UNKNOWN" impact="partial" retry="permanent" action="Проверить логи">
Ошибка менеджера, не попавшая ни в одну из категорий выше.
</ErrorCode>

Причина (`cause`) у `DAT_MANAGER_NO_ISSUABLE_CERTIFICATE` — одна из четырёх. **Для каждой причины нужны совершенно разные действия.**

| Причина | Значение | Повтор | Что делать |
| --- | --- | --- | --- |
| `DAT_CERT_NOT_YET_ISSUABLE` | До начала окна выдачи | **Временно** | Разрешится само, если подождать |
| `DAT_CERT_ISSUANCE_ENDED` | Окно выдачи закрыто, доступна только проверка | Постоянно | Нужно развернуть новый сертификат |
| `DAT_CERT_EXPIRED` | Все имеющиеся истекли | Постоянно | Нужно обновить сертификаты |
| `DAT_CERT_VERIFY_ONLY` | Все имеющиеся — только для проверки | Постоянно | **Ошибка настроек деплоя** |

Если сервер выдачи настроен получать только сертификаты для проверки, будет `DAT_CERT_VERIFY_ONLY`. Ожидание не поможет никогда, поэтому повторять не нужно.

---

## Конфигурация

Проблемы значений, переданных вызывающей стороной. Все коды семейства `CONFIG` — **ошибки, требующие правки кода**; если они возникают в проде, значит деплой сделан неверно.

<ErrorCode code="DAT_CONFIG_ALG_UNSUPPORTED" impact="critical" retry="permanent" action="Проверить имя алгоритма">
Неизвестное имя алгоритма. Должно точно совпадать с записью в формате протокола (<code>ECDSA-P256</code>, <code>IV-AES256-GCM</code>).
</ErrorCode>

<ErrorCode code="DAT_CONFIG_ARGUMENT_INVALID" impact="critical" retry="permanent" action="Исправить вызывающий код">
Обязательный аргумент равен null; либо вне допустимого диапазона (отрицательное время, <code>interval &lt;= 0</code>); либо неподдерживаемый тип (в языках с динамической типизацией в payload передано число или булево); либо подписываемое тело пусто.
</ErrorCode>

<ErrorCode code="DAT_CONFIG_URI_INVALID" impact="critical" retry="permanent" action="Исправить URI">
URI сервера CMS не соответствует спецификации: не разбирается, схема не http/https, либо присутствуют путь или query.
</ErrorCode>

<ErrorCode code="DAT_CONFIG_UNKNOWN" impact="critical" retry="permanent" action="Проверить логи">
Ошибка конфигурации, не попавшая ни в одну из категорий выше.
</ErrorCode>

---

## Внутренние

Проблемы среды исполнения и рантайма.

<ErrorCode code="DAT_INTERNAL_UNAVAILABLE" impact="critical" retry="permanent" action="Проверить деплой и платформу">
Криптографического бэкенда или API рантайма нет вовсе. Отсутствует <code>crypto.subtle</code>, платформа без поддержки AES-GCM, версия рантайма ниже требуемой.
</ErrorCode>

<ErrorCode code="DAT_INTERNAL_UNKNOWN" impact="critical" retry="permanent" action="Проверить логи">
Сбой выделения памяти, сбой генерации случайных чисел, сбой захвата блокировки, попадание в ветку, спроектированную как недостижимая.
</ErrorCode>

`DAT_INTERNAL_UNAVAILABLE` решается исправлением среды развёртывания, а `DAT_INTERNAL_UNKNOWN` — обычно сбой рантайма либо баг библиотеки.

---

## Синхронизация CMS

Если синхронизация CMS не используется, эти коды не появляются.

<ErrorCode code="DAT_CMS_UNREACHABLE" impact="partial" retry="transient" action="Повторить после backoff">
Сбой DNS, отказ в соединении, сбой TLS, <strong>таймаут</strong>. Таймаут не имеет отдельного кода и включён сюда — потому что реакция та же самая.
</ErrorCode>

<ErrorCode code="DAT_CMS_UNAUTHORIZED" impact="critical" retry="permanent" http="401" action="Проверить настройку токена">
Сервер ответил 401. Токена нет либо он неверный.
</ErrorCode>

<ErrorCode code="DAT_CMS_FORBIDDEN" impact="critical" retry="permanent" http="403" action="Проверить уровень токена">
Сервер ответил 403. Токен валиден, но прав на этот эндпоинт нет.
</ErrorCode>

<ErrorCode code="DAT_CMS_ENDPOINT_NOT_FOUND" impact="critical" retry="permanent" http="404" action="Проверить настройку URL">
Сервер ответил 404. URL неверный.
</ErrorCode>

<ErrorCode code="DAT_CMS_SERVER_ERROR" impact="partial" retry="transient" http="5xx" action="Повторить после backoff">
Сервер ответил 5xx.
</ErrorCode>

<ErrorCode code="DAT_CMS_HTTP_STATUS" impact="critical" retry="permanent" action="Проверить код состояния">
Ответ не 2xx и не подходит ни под один из случаев выше.
</ErrorCode>

<ErrorCode code="DAT_CMS_MALFORMED" impact="critical" retry="permanent" action="Проверить версию сервера">
В ответе нет строки версии; либо строка версии не чисто десятичная; либо она вышла за диапазон.
</ErrorCode>

<ErrorCode code="DAT_CMS_IMPORT_FAILED" impact="critical" retry="permanent" action="Проверить CERT_* / KEY_* в cause">
Ответ получен, но применить сертификаты не удалось. <strong>Причина содержится в <code>cause</code>.</strong>
</ErrorCode>

<ErrorCode code="DAT_CMS_VERSION_RESET" impact="none" retry="state" http="200" action="Обрабатывается автоматически">
Сервер вернул версию более раннюю, чем наша. Это указание на полную повторную синхронизацию.
</ErrorCode>

<ErrorCode code="DAT_CMS_NOT_SYNCED" impact="critical" retry="transient" action="Дождаться первой синхронизации">
Состояние, в котором синхронизация ещё ни разу не прошла успешно.
</ErrorCode>

<ErrorCode code="DAT_CMS_SYNC_IN_PROGRESS" impact="none" retry="state">
Предыдущая синхронизация ещё выполняется, поэтому текущий цикл пропущен. Это не ошибка.
</ErrorCode>

<ErrorCode code="DAT_CMS_NOT_SUPPORTED" impact="critical" retry="permanent" action="Проверить опции сборки">
Функциональность CMS не включена в сборку. Не активирован feature либо не подключён CURL.
</ErrorCode>

<ErrorCode code="DAT_CMS_UNKNOWN" impact="partial" retry="permanent" action="Проверить логи">
Ошибка CMS, не попавшая ни в одну из категорий выше.
</ErrorCode>

Коды, при которых синхронизация признаётся **окончательно провалившейся** (`UNAUTHORIZED`, `FORBIDDEN`, `ENDPOINT_NOT_FOUND`, `MALFORMED`, `IMPORT_FAILED`), все критичны. Повтор их не решает, а сертификаты продолжают истекать, поэтому без вмешательства сервис неизбежно остановится.

Напротив, `UNREACHABLE` и `SERVER_ERROR` — частичные. Работа продолжается на прежних сертификатах, и в следующем цикле всё восстанавливается само. **Но при непрерывных сбоях это в итоге переходит в критичное.** Настраивайте алерт по числу подряд идущих неудач.

::: tip Сбой синхронизации не выбрасывается исключением
Даже если первая синхронизация провалилась, менеджер возвращается штатно — потому что лучше синхронизироваться позже, чем никогда. Вместо этого сбой остаётся **доступным для запроса состоянием**.

| Клиент | Как получить |
| --- | --- |
| Rust | `manager.last_error().await` |
| Go | `manager.LastError()` |
| JavaScript | `manager.lastError()` |
| Python | `manager.last_error()` |
| Ruby | `manager.last_error` |
| Java/Kotlin | `manager.lastError` |
| C# | `manager.LastError` |
| C/C++ | `dat_cms_manager_last_error(m)` |

Если успеха не было ни разу — `DAT_CMS_NOT_SYNCED`, при нормальной работе — пусто.
:::

---

## Сервер

Коды, которые выдаёт сервер CMS. Клиент эти коды **не создаёт, а только принимает**.

<ErrorCode code="DAT_AUTH_UNAUTHORIZED" impact="none" suspect retry="permanent" http="401">
Отсутствует заголовок <code>Authorization</code>, либо токен не зарегистрирован ни на одном уровне.
</ErrorCode>

<ErrorCode code="DAT_AUTH_FORBIDDEN" impact="none" suspect retry="permanent" http="403">
Токен зарегистрирован, но его уровень не соответствует требуемому для этого эндпоинта.
</ErrorCode>

<ErrorCode code="DAT_AUTH_DISABLED" impact="critical" retry="state" action="Немедленно настроить токен">
Не настроен ни один токен, поэтому аутентификация отключена целиком. <strong>Открытым без аутентификации оказывается даже API выдачи сертификатов.</strong> В ответах не появляется, пишется только в лог запуска.
</ErrorCode>

<ErrorCode code="DAT_REQ_MALFORMED" impact="none" suspect retry="permanent" http="400">
Не удаётся разобрать параметры пути или query, либо аргумент вне допустимого диапазона (отрицательный delay, срок более 10 лет и т. п.).
</ErrorCode>

<ErrorCode code="DAT_REQ_ALG_UNSUPPORTED" impact="none" retry="permanent" http="400">
Имя алгоритма в пути запроса неизвестно.
</ErrorCode>

<ErrorCode code="DAT_REQ_NOT_FOUND" impact="none" suspect retry="permanent" http="404·405">
Такого маршрута нет либо метод не тот.
</ErrorCode>

<ErrorCode code="DAT_REQ_TOO_LARGE" impact="none" suspect retry="permanent" http="413">
Превышен размер тела запроса.
</ErrorCode>

<ErrorCode code="DAT_REQ_UNKNOWN" impact="none" retry="permanent" http="400">
Ошибка запроса, не попавшая ни в одну из категорий выше.
</ErrorCode>

<ErrorCode code="DAT_STORE_UNAVAILABLE" impact="partial" retry="transient" http="503" action="Повторить после backoff">
Обрыв соединения с БД, исчерпание пула соединений, конкуренция за блокировку, таймаут. <strong>Единственный код, использующий 503</strong> — это сигнал, по которому клиент понимает: «здесь достаточно подождать».
</ErrorCode>

<ErrorCode code="DAT_STORE_UNKNOWN" impact="critical" retry="permanent" http="500" action="Проверить состояние БД">
Сбой чтения или записи, отсутствие таблицы, несоответствие схемы, повреждение сохранённой строки сертификата.
</ErrorCode>

Конверт ответа:

```json
{
  "code": "DAT_REQ_ALG_UNSUPPORTED",
  "details": { "algorithm": "BOGUS-ALG" }
}
```

Ошибки, возникающие при создании и обработке сертификатов, сервер отдаёт теми же общими кодами, что описаны выше (`DAT_CERT_*`, `DAT_KEY_*`, `DAT_CONFIG_*`).

### Когда приходит код сервера

Клиент оборачивает код сервера в собственный код `CMS`, а оригинал сохраняет в `cause`.

| Что получено | HTTP | Код, который выдаёт клиент |
| --- | --- | --- |
| `DAT_AUTH_UNAUTHORIZED` | 401 | `DAT_CMS_UNAUTHORIZED` |
| `DAT_AUTH_FORBIDDEN` | 403 | `DAT_CMS_FORBIDDEN` |
| `DAT_REQ_NOT_FOUND` | 404 | `DAT_CMS_ENDPOINT_NOT_FOUND` |
| `DAT_REQ_*` (остальные) | 400·405·413 | `DAT_CMS_HTTP_STATUS` |
| `DAT_STORE_UNAVAILABLE` | 503 | `DAT_CMS_SERVER_ERROR` |
| `DAT_STORE_UNKNOWN` | 500 | `DAT_CMS_SERVER_ERROR` |
| (понижение версии) | 200 | `DAT_CMS_VERSION_RESET` |

---

## Поиск по симптомам

| Симптом | Код |
| --- | --- |
| Сразу после входа работает, а через некоторое время отказ | `DAT_TOKEN_EXPIRED` — срок жизни токена истёк. Достаточно перевыпустить |
| Проверка падает только на отдельных серверах | `DAT_CERT_NOT_SYNCED` — этот сервер ещё не получил новый CID |
| Один и тот же токен отвергают все серверы | `DAT_CERT_NOT_FOUND` — это CID, который мы никогда не выпускали |
| Сервер выдачи не может создать токен | `DAT_MANAGER_NO_ISSUABLE_CERTIFICATE` + `DAT_CERT_VERIFY_ONLY` — **развёрнут вариант verify-only** |
| Выдача падает только сразу после запуска | `DAT_MANAGER_NO_CERTIFICATE` — это до первой синхронизации. Скоро разрешится |
| Синхронизация CMS постоянно падает | `DAT_CMS_UNAUTHORIZED` — токен неверный. Повторы не помогут |
| Не приходит ни одного сертификата | `DAT_CMS_ENDPOINT_NOT_FOUND` — опечатка в URL |
| Падает только на конкретной платформе | `DAT_INTERNAL_UNAVAILABLE` — нет криптографического бэкенда |
| Резко выросло число неудачных проверок | `DAT_SIG_MISMATCH` — единичный случай безвреден, но **лавина означает попытку подделки** |
| Расшифровка secure внезапно перестала работать | `DAT_CRYPTO_TAG_MISMATCH` — разошлись сертификаты либо **попытка подмены** |
| Предупреждение в логе запуска CMS | `DAT_AUTH_DISABLED` — **аутентификация выключена.** API выдачи открыт |

---

## Приложение

### Синтаксис кода

```
DAT_<область>_<причина>
```

- Если одна и та же причина возникает в разных областях, **имя причины совпадает.** `DAT_TOKEN_MALFORMED` и `DAT_CERT_MALFORMED` отличаются только объектом, смысл у них один.
- `_UNKNOWN` — **только запасной вариант** для своей области. Он не используется в значении «неизвестный алгоритм» (для этого есть `_UNSUPPORTED`).
- Строка кода — это публичный контракт. Сообщение можно менять свободно, код — нет.

| Категория | Префикс кода |
| --- | --- |
| Токен | `DAT_TOKEN_` |
| Сертификат | `DAT_CERT_` |
| Подпись | `DAT_SIG_` |
| Шифрование | `DAT_CRYPTO_` |
| Ключ | `DAT_KEY_` |
| Менеджер | `DAT_MANAGER_` |
| Конфигурация | `DAT_CONFIG_` |
| Внутренние | `DAT_INTERNAL_` |
| Синхронизация CMS | `DAT_CMS_` |
| Сервер | `DAT_AUTH_` · `DAT_REQ_` · `DAT_STORE_` |

### Доступ по клиентам

| Клиент | Тип ошибки | Код | Класс повтора | Событие безопасности |
| --- | --- | --- | --- | --- |
| Rust | `DatError` enum | `err.code()` | `err.retry()` | `err.security_event()` |
| Go | `*dat.Error` | `err.Code` | `dat.Retry(err)` | `dat.SecurityEvent(err)` |
| JavaScript | `DatError extends Error` | `e.code` | `e.retry` | `e.securityEvent` |
| Python | `DatError(ValueError, RuntimeError)` | `e.code` | `e.retry` | `e.security_event` |
| Ruby | `Saro::Dat::Error` | `e.code` | `e.retry` | `e.security_event?` |
| Java/Kotlin | `DatException` | `e.code` | `e.retry` | `e.securityEvent` |
| C# | `DatException` | `e.Code` | `e.Retry` | `e.SecurityEvent` |
| C/C++ | `dat_error_t` | `dat_error_code(e)` | `dat_error_retry(e)` | `dat_error_is_security_event(e)` |
| Сервер CMS | JSON-конверт | поле `code` | — | — |

`Событие безопасности` возвращает `true` только для двух кодов, где подделка или подмена установлены точно (`DAT_SIG_MISMATCH`, `DAT_CRYPTO_TAG_MISMATCH`). Метка **подозрение** в этом документе охватывает более широкий круг (включая подделанные токены, ключи и запросы) и пока является лишь документной классификацией, не выведенной в API клиентов.

Класс **влияния** — тоже документная классификация. Один и тот же код бьёт по-разному в зависимости от места возникновения: например, `DAT_KEY_INVALID` не влияет ни на что при фильтрации входящего токена, но при чтении сертификата во время синхронизации CMS обрушивает всю синхронизацию.

**Первопричина не теряется.** `DAT_MANAGER_NO_ISSUABLE_CERTIFICATE` и `DAT_CMS_IMPORT_FAILED` передают причину через цепочку исключений соответствующего языка (`cause` / `__cause__` / `InnerException` / `Unwrap()`).

::: warning В C/C++ сохраняются и числовые значения
Прежние числовые значения `dat_error_t` оставлены ради совместимости ABI, но **эталоном является строковый код**. Библиотека больше не возвращает старые значения, поэтому сравнение вида `err == DAT_ERROR_INVALID_DAT` не сработает. Сверяйтесь через `dat_error_code(e)`.

В C нет цепочек исключений, поэтому причина запрашивается отдельно через `dat_manager_issuable_cause()`.
:::

<script setup lang="ts">
import ErrorCode from '../../.vitepress/ui/ErrorCode.vue';
</script>

<style scoped>
/* 범례 배지 — ErrorCode 컴포넌트의 배지와 같은 모양이라 눈으로 바로 이어진다. */
.lg {
    padding: 2px 6px;
    border-radius: 4px;
    font-size: 0.85em;
    font-weight: 500;
    white-space: nowrap;
}
.lg          { background: color-mix(in srgb, currentColor 8%, transparent); opacity: 0.7; }
.lg-critical { background: color-mix(in srgb, #dc2626 16%, transparent); color: #dc2626; opacity: 1; }
.lg-partial  { background: color-mix(in srgb, #ea580c 16%, transparent); color: #ea580c; opacity: 1; }
.lg-none     { background: color-mix(in srgb, currentColor 8%, transparent); color: var(--c-muted); opacity: 1; }
.lg-suspect  { background: none; border: 1px solid color-mix(in srgb, var(--c-accent-2) 55%, transparent); color: var(--c-accent-2); opacity: 1; }
.lg-transient { background: color-mix(in srgb, var(--c-link-1) 16%, transparent); color: var(--c-link-1); opacity: 1; }
</style>
