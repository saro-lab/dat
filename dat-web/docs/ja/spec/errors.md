# エラーコード

DAT 実装は、人間が読めるメッセージとは別に安定したエラーコードを提供します。プログラムはメッセージ文字列を比較せず、コードと再試行分類に基づいて判断してください。

## コード形式

```text
DAT_<AREA>_<CAUSE>
```

| 接頭辞 | 領域 |
| --- | --- |
| `DAT_TOKEN_` | DAT 文字列と有効期限 |
| `DAT_CERT_` | 証明書文字列と状態 |
| `DAT_SIG_` | 署名と検証 |
| `DAT_CRYPTO_` | 暗号化と復号 |
| `DAT_KEY_` | 鍵の形式と権限 |
| `DAT_MANAGER_` | 証明書マネージャー |
| `DAT_CONFIG_` | 呼び出し引数と設定 |
| `DAT_INTERNAL_` | ランタイム内部 |
| `DAT_CMS_` | CMS クライアントの同期 |
| `DAT_AUTH_`, `DAT_REQ_`, `DAT_STORE_` | CMS サーバー |

`_UNKNOWN` は、その領域の他のコードに分類できない場合にのみ使用します。同じ原因には領域をまたいで同じ名前を使います。

## 再試行分類

| 分類 | 意味 | 対処 |
| --- | --- | --- |
| 一時的 | 外部条件が回復すれば成功する可能性がある | バックオフを使って限定回数再試行 |
| 状態 | 証明書の同期や時間変化後に成功する可能性がある | 必要な状態を更新して再試行 |
| 永続的 | 同じ入力では再び失敗する | 入力、設定、コードを修正 |

## トークンと証明書

<ErrorCode code="DAT_TOKEN_MALFORMED" impact="none" retry="permanent">
DAT のフィールド数、数値、または Base64Url 表現が無効です。入力を破棄してください。
</ErrorCode>

<ErrorCode code="DAT_TOKEN_EXPIRED" impact="none" retry="permanent">
DAT の有効期限が現在時刻以下です。新しい DAT を取得してください。
</ErrorCode>

<ErrorCode code="DAT_CERT_MALFORMED" impact="none" retry="permanent">
証明書文字列の構造またはフィールド表現が無効です。
</ErrorCode>

<ErrorCode code="DAT_CERT_NOT_FOUND" impact="none" retry="state">
DAT の `cid` に対応する証明書がありません。証明書の同期状態を確認してください。
</ErrorCode>

<ErrorCode code="DAT_CERT_NOT_SYNCED" impact="none" retry="state">
必要な証明書がまだサービスに届いていない可能性があります。すぐに同期し、再評価してください。
</ErrorCode>

<ErrorCode code="DAT_CERT_NOT_YET_VALID" impact="none" retry="state">
証明書の開始時刻に達していません。システム時計と証明書の配布タイミングを確認してください。
</ErrorCode>

<ErrorCode code="DAT_CERT_EXPIRED" impact="none" retry="permanent">
証明書の検証期間が終了しました。
</ErrorCode>

<ErrorCode code="DAT_CERT_DUPLICATE" impact="partial" retry="permanent">
同じ `cid` が 1 つのインポートリストに複数回現れます。インポート全体を拒否してください。
</ErrorCode>

## 署名、暗号化、鍵

<ErrorCode code="DAT_SIG_MISMATCH" impact="none" suspect retry="permanent">
署名が本文と一致しません。DAT が改ざんされたか、異なる鍵で署名されています。
</ErrorCode>

<ErrorCode code="DAT_CRYPTO_TAG_MISMATCH" impact="none" suspect retry="permanent">
AES-GCM 認証タグが一致しません。暗号文の改ざんまたは証明書の不一致を確認してください。
</ErrorCode>

<ErrorCode code="DAT_KEY_INVALID" impact="none" retry="permanent">
鍵の長さ、形式、またはアルゴリズムの組み合わせが無効です。
</ErrorCode>

<ErrorCode code="DAT_SIG_KEY_MISSING" impact="none" retry="permanent">
検証専用証明書で DAT を発行しようとしました。発行サービスには完全な証明書が必要です。
</ErrorCode>

`DAT_SIG_MISMATCH` と `DAT_CRYPTO_TAG_MISMATCH` は、公開セキュリティイベント API が true と分類するエラーです。1 件の無効な入力はサービス障害ではありませんが、繰り返し発生する場合はセキュリティ上の観測対象として扱ってください。

## マネージャーと設定

<ErrorCode code="DAT_MANAGER_NO_CERTIFICATE" impact="partial" retry="state">
マネージャーに証明書がありません。証明書をインポートするか、CMS の同期を完了してください。
</ErrorCode>

<ErrorCode code="DAT_MANAGER_NO_ISSUABLE_CERTIFICATE" impact="partial" retry="state">
マネージャーに証明書はありますが、現在発行可能な完全な証明書がありません。有効期限、開始時刻、検証専用状態について cause chain を調べてください。
</ErrorCode>

<ErrorCode code="DAT_CONFIG_ARGUMENT_INVALID" impact="none" retry="permanent">
呼び出し引数または設定値が許容範囲外です。
</ErrorCode>

<ErrorCode code="DAT_INTERNAL_UNAVAILABLE" impact="critical" retry="permanent">
現在のプラットフォームに必要な暗号機能またはネットワーク機能が利用できません。
</ErrorCode>

## CMS クライアント

| コード | 意味 | 一般的な対処 |
| --- | --- | --- |
| `DAT_CMS_URI_INVALID` | CMS URI が無効 | 設定を修正 |
| `DAT_CMS_UNAUTHORIZED` | 認証失敗 | トークンを修正 |
| `DAT_CMS_FORBIDDEN` | トークンロールに権限がない | トークンロールを確認 |
| `DAT_CMS_ENDPOINT_NOT_FOUND` | パスがないか異なる | CMS URL とパスを確認 |
| `DAT_CMS_NETWORK` | 接続または転送に失敗 | ネットワークを確認してバックオフ |
| `DAT_CMS_TIMEOUT` | 制限時間を超過 | ネットワークとタイムアウト設定を調整 |
| `DAT_CMS_SERVER_ERROR` | CMS サーバーエラー | サーバー状態を確認してバックオフ |
| `DAT_CMS_RESPONSE_INVALID` | 成功応答の形式が無効 | サーバーとクライアントの契約を確認 |
| `DAT_CMS_VERSION_RESET` | サーバーのバージョンが後退 | CMS データとデプロイ状態を確認 |
| `DAT_CMS_IMPORT_FAILED` | 受信した証明書を適用できない | cause chain を調査 |
| `DAT_CMS_STOPPED` | 停止済みマネージャーを使用 | 新しいマネージャーを作成または呼び出し順序を修正 |

初回同期がベストエフォートのライブラリは、エラーを last-error フィールドに保存します。起動を失敗させる必要がある場合は、エラーを直接返すか throw する即時同期 API を使用します。

## CMS サーバー

| コード | HTTP | 意味 |
| --- | --- | --- |
| `DAT_AUTH_UNAUTHORIZED` | 401 | トークンがないか無効 |
| `DAT_AUTH_FORBIDDEN` | 403 | トークンロールがリクエストを許可しない |
| `DAT_REQ_ALG_UNSUPPORTED` | 400 | 未対応のアルゴリズム名 |
| `DAT_REQ_NOT_FOUND` | 404·405 | パスまたはメソッドの不一致 |
| `DAT_REQ_TOO_LARGE` | 413 | 大きすぎるリクエスト本文用の予約コード |
| `DAT_STORE_UNAVAILABLE` | 503 | ストレージが一時的に利用不可 |
| `DAT_STORE_UNKNOWN` | 500 | 分類不能なストレージ処理エラー |

現在のクライアントは non-2xx JSON 応答のサーバーコードを直接公開せず、HTTP ステータスを `DAT_CMS_*` コードに変換します。そのためサーバーログとクライアントエラーコードは異なる場合があります。

## 言語別のアクセス

| 環境 | エラーコード | 再試行分類 |
| --- | --- | --- |
| Rust | `err.code()` | `err.retry()` |
| Go | `dat.Code(err)` | `dat.Retry(err)` |
| JavaScript / TypeScript | `error.code` | `error.retry` |
| Python | `error.code` | `error.retry` |
| Ruby | `error.code` | `error.retry` |
| Java / Kotlin | `error.code` | `error.retry` |
| C# | `error.Code` | `error.Retry` |
| C / C++ | `dat_error_code(error)` | `dat_error_retry(error)` |

下位の cause を持つエラーは、各言語の例外チェーンまたは cause 参照 API で確認してください。

<script setup lang="ts">
import ErrorCode from '../../.vitepress/ui/ErrorCode.vue';
</script>
