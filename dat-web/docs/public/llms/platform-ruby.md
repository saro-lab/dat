# DAT for Ruby

Gem: `saro-dat` | `require 'saro-dat'` | Ruby >= 2.7 | source: `dat-ruby/`

Depends on the `openssl`, `base64` and `logger` gems.

## Install

```sh
gem install saro-dat --version "~> 4.6.1"
```

```ruby
# Gemfile
gem 'saro-dat', '~> 4.6.1'
```

Everything lives under `Saro::Dat`. Alias it once if you use it a lot:

```ruby
require 'saro-dat'
D = Saro::Dat
```

## With a CMS (production)

```ruby
manager = Saro::Dat::DatCmsManager.builder
  .uri("http://localhost:8088")
  .token("12345678901b")
  .verify_only(false)      # true only when a separate service does the issuing
  # .interval_off          # no background timer; call sync yourself
  .interval_seconds(60)
  .build

# A failed first sync never raises - the manager is returned so it can recover on a
# later cycle. Anything other than nil means certificates are no longer refreshed.
if (err = manager.last_error)
  # DAT_CMS_NOT_SYNCED until the first sync succeeds.
  # :permanent means retrying will not help - a token or URL is wrong.
  alert_operations(err.code) if err.retry == :permanent
end
```

The URI must be scheme + host + port - no path, no query. `manager.sync` forces a cycle,
`manager.version` reports the synced version, `manager.stop` cancels the background thread
(`manager.stopped?` reports it), `manager.get_manager` reaches the inner `DatManager`.

Sync runs on a background thread, so under a forking server (Puma in clustered mode, Unicorn)
build the manager in an `on_worker_boot` hook rather than at boot in the parent.

## Issue and parse

```ruby
plain = "42|acme|admin"
secure = "42|s-91af|billing:rw"

dat = manager.issue(plain, secure)

payload = manager.parse(dat)
payload.plain    # "42|acme|admin"
payload.secure   # "42|s-91af|billing:rw"
```

## Without a CMS

```ruby
require 'saro-dat'

manager = Saro::Dat::DatManager.new

# (cid, issuance_start, issuance_duration, dat_ttl, signature, crypto)
cert = [Saro::Dat::DatCertificate.new(
  1,
  Time.now.to_i - 10,
  3600,
  1800,
  Saro::Dat::DatSignature.generate(Saro::Dat::DatSignatureAlgorithm::HMAC_SHA512_MFS),
  Saro::Dat::DatCrypto.generate(Saro::Dat::DatCryptoAlgorithm::IV_AES128_GCM)
)]
manager.import_certificates(cert)

dat = manager.issue(plain, secure)
payload = manager.parse(dat)
```

`Time.now.to_i` - **seconds**. The third argument is a duration, not an end time.

Constants: `DatSignatureAlgorithm::{ECDSA_P256, ECDSA_P384, ECDSA_P521, HMAC_SHA256_MFS,
HMAC_SHA384_MFS, HMAC_SHA512_MFS}`, `DatCryptoAlgorithm::{IV_AES128_GCM, IV_AES256_GCM}`.

## `DatManager` surface

| Method | Returns |
| --- | --- |
| `DatManager.new` | manager |
| `issue(plain, secure)` | `String` |
| `parse(dat)` | `DatPayload` |
| `import_certificates(certs, clear: false)` | `Integer` |
| `imports(format_str, clear: false)` | `Integer` - text format |
| `exports(verify_only = false)` | `String` |

`DatCmsManager` adds `sync`, `last_error`, `version`, `stop`, `stopped?`, `get_manager` and forwards
`issue` / `parse`.

`clear` is a keyword argument on the import methods and a positional one on `exports`.

## Crypto and signature directly

Base64 input and raw binary input are **separate methods** - the encoding is never guessed from the
string's encoding tag.

```ruby
crypto = Saro::Dat::DatCrypto.generate(Saro::Dat::DatCryptoAlgorithm::IV_AES256_GCM)

encrypted = crypto.encrypt("secret")   # raw bytes (BINARY)
crypto.decrypt(encrypted)              # raw bytes in
crypto.decrypt_base64(base64_str)      # Base64Url text in

signature = Saro::Dat::DatSignature.generate(Saro::Dat::DatSignatureAlgorithm::ECDSA_P256)
signature.verify(data, raw_sig_bytes)
signature.verify_base64(data, base64_sig)
```

## Error handling

Every failure raises `Saro::Dat::Error`, carrying a `code` identical across all official clients.
Rescue that class rather than `StandardError` - the code is what tells you which of three
situations you are in.

```ruby
EC = Saro::Dat::ErrorCode

begin
  payload = manager.parse(dat)
rescue Saro::Dat::Error => e
  case e.code
  when EC::TOKEN_EXPIRED
    # Normal end of life. Ask the client to get a fresh token.
    redirect_to_login
  when EC::SIG_MISMATCH
    # Forgery: the signature does not belong to this certificate.
    # e.security_event? is true here.
    security_log.warn("forged dat", code: e.code)
    terminate_session
  else
    # Anything else is a bad request. Reject it.
    render_400(e.code)
  end
end
```

`#retry` collapses every code into one of three decisions, so callers never keep their own list.
Only `:transient` is worth retrying.

```ruby
begin
  dat = manager.issue(plain, secure)
rescue Saro::Dat::Error => e
  case e.retry
  when :transient then schedule_retry_with_backoff  # e.g. sync has not finished yet
  when :permanent then alert_operations(e.code)     # config or deployment is wrong
  when :state     then nil                          # not an error, just a signal
  end
end
```

`retry` is a **symbol** here, not an enum. Full code table:
[errors.md](https://dat.saro.me/llms/errors.md).

## Rack middleware

```ruby
class DatAuth
  def initialize(app, manager)
    @app = app
    @manager = manager
  end

  def call(env)
    token = env['HTTP_AUTHORIZATION'].to_s.delete_prefix('Bearer ')
    return [401, {}, []] if token.empty?

    begin
      env['dat.payload'] = @manager.parse(token)
    rescue Saro::Dat::Error => e
      security_log.warn("forged dat", code: e.code) if e.security_event?
      return [401, {}, []]
    end

    @app.call(env)
  end
end
```

## Notes

- One manager per process (per worker under a forking server).
- Test code worth reading: `dat-ruby/test/test_cms_manager.rb`, `test_hard.rb`,
  `test_manager_example.rb`, `test_error_code.rb`.
