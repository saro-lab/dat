# エラーコード

DAT が公式にサポートするサービスライブラリ共通のエラーコードです。

各コードには **影響**・**リトライ** の 2 つの値が付き、一部にはさらに **疑い** のタグが付きます。

## 影響 — サービスが受ける打撃

アラートを設定する基準です。「いまサービスが止まっているか」だけを見ます。

| 影響 | 意味 | 例 |
| --- | --- | --- |
| <span class="lg lg-critical">致命的</span> | サービスまたは特定機能が**停止します。** 発行不可、同期の恒久的な失敗、初期化の失敗 | 発行サーバーに使える証明書が 1 枚もない |
| <span class="lg lg-partial">部分的</span> | 一部のリクエストやサイクルは失敗しますが、サービスは動き続けます。多くは自力で回復します | CMS の 1 サイクルが失敗。既存の証明書で動作継続 |
| <span class="lg lg-none">影響なし</span> | リクエストを 1 件拒否して終わりです | 改ざんされたトークンが届いた。弾けばそれで済む |

**影響なし** はアラートの対象ではありません。不正な入力が 1 件来ただけで担当者全員が確認しなければならないなら、アラートは意味を失います。

## 疑い — 続くようなら調査

<span class="lg lg-suspect">疑い</span> タグが付いたコードは、**1 件だけなら通常運用の一部**です。クライアントはいつでも不正な値を送ってくる可能性があり、それを弾くのがライブラリ本来の役目です。

ただしこうしたエラーが**継続的に、あるいは特定の発信元からまとまって**発生する場合は、次の 2 つのどちらかです。

- **設定の異常** — デプロイが誤っている、旧バージョンのクライアントが残っている、証明書が食い違っている。
- **攻撃の試み** — トークンや鍵を改ざんして検証を通そうとしている、あるいは有効な値を探る探索行為。

そのためこれらのコードは **件数をメトリクスとして取っておく**のが正解です。しきい値を超えたときだけ通知すれば十分です。

## リトライ

| リトライ | 意味 |
| --- | --- |
| <span class="lg lg-transient">一時的</span> | バックオフしてリトライすれば解消します |
| <span class="lg">恒久的</span> | リトライ禁止。設定や入力を直す必要があります |
| <span class="lg">状態</span> | エラーではなくシグナルです |

---

## トークン

受け取ったトークン文字列そのものの問題です。

<ErrorCode code="DAT_TOKEN_MALFORMED" impact="none" suspect retry="permanent" action="リクエストを拒否">
ドット区切りのパートが 5 個でない、<code>expire</code> が純粋な 10 進数でない、<code>cid</code> が純粋な 16 進数でない、<code>plain</code>・<code>secure</code> が base64url でない、数値フィールドが整数の表現範囲を超えた、のいずれかです。
</ErrorCode>

<ErrorCode code="DAT_TOKEN_EXPIRED" impact="none" retry="permanent" action="トークンの再発行を促す">
<code>expire &lt;= now</code>。<strong>同時刻でも期限切れ</strong>です — <code>expire == now</code> はすでに期限切れとみなします。
</ErrorCode>

<ErrorCode code="DAT_TOKEN_UNKNOWN" impact="partial" retry="permanent" action="ログを確認">
上のいずれにも分類されないトークンエラーです。
</ErrorCode>

::: tip 期限切れと形式エラーは必ず区別します
対応が正反対です — 期限切れは正常な寿命の終わりなのでトークンを更新させればよく、形式エラーのトークンはそもそも発行されたものではないため、拒否すべきです。

パースは**まず構造を確定してから**値を見ます。`"1.2.3"` のようにパートが足りない文字列は、期限切れのトークンではなくそもそもトークンではないため `DAT_TOKEN_MALFORMED` です。

`expire` フィールドが `+100` のように符号付きの場合も、期限切れではなく形式エラーです。純粋な ASCII 数字だけを受け付けます。
:::

---

## 証明書

証明書文字列の形式、およびその証明書がいま使えるかどうかの問題です。

<ErrorCode code="DAT_CERT_MALFORMED" impact="critical" retry="permanent" action="証明書を再配布">
ドット区切りのパートが 8 個でない、<code>cid</code>・<code>start</code>・<code>duration</code>・<code>ttl</code> のパースに失敗した、鍵フィールドが base64url でない、<code>start + duration + ttl</code> が u64 を超えた、のいずれかです。
</ErrorCode>

<ErrorCode code="DAT_CERT_EXPIRED" impact="critical" retry="permanent" action="証明書を更新">
<code>start + duration + ttl &lt; now</code>。発行も検証もできない完全な期限切れ状態です。
</ErrorCode>

<ErrorCode code="DAT_CERT_NOT_YET_ISSUABLE" impact="critical" retry="transient" action="待機">
<code>now &lt; start</code>。発行ウィンドウがまだ開いていません。
</ErrorCode>

<ErrorCode code="DAT_CERT_ISSUANCE_ENDED" impact="critical" retry="permanent" action="新しい証明書を配布">
<code>now &gt; start + duration</code> ですが ttl は残っています。発行はできず、検証のみ可能です。
</ErrorCode>

<ErrorCode code="DAT_CERT_VERIFY_ONLY" impact="critical" retry="permanent" action="配布設定を確認">
署名用秘密鍵を持たず、公開鍵だけが入った証明書です。検証はできますが発行はできません。
</ErrorCode>

<ErrorCode code="DAT_CERT_NOT_FOUND" impact="none" suspect retry="permanent" action="リクエストを拒否">
トークンの <code>cid</code> に対応する証明書を保有していません。偽造トークンか、配布ミスです。
</ErrorCode>

<ErrorCode code="DAT_CERT_NOT_SYNCED" impact="partial" retry="transient" action="同期後にリトライ">
その <code>cid</code> をまだ CMS から受け取っていません。新しい証明書を配布した直後に短時間だけ発生します。
</ErrorCode>

<ErrorCode code="DAT_CERT_DUPLICATE_CID" impact="critical" retry="permanent" action="サーバーのレスポンスを確認">
import するリストの中に同じ <code>cid</code> が 2 回以上入っています。
</ErrorCode>

<ErrorCode code="DAT_CERT_UNKNOWN" impact="partial" retry="permanent" action="ログを確認">
上のいずれにも分類されない証明書エラーです。
</ErrorCode>

`DAT_CERT_NOT_FOUND` と `DAT_CERT_NOT_SYNCED` は外から見た症状は同じですが、対応が異なります。前者はそもそも発行されていない `cid` なので待っても現れず、後者は同期さえ済めば解消します。

`DAT_CERT_NOT_FOUND` は 1 件なら弾くだけで済みますが、急に増えた場合は配布が食い違っているか、偽造トークンが出回っているという意味です。

---

## 署名

<ErrorCode code="DAT_SIG_MISMATCH" impact="none" suspect retry="permanent" action="セッションを遮断、セキュリティログへ">
署名検証が<strong>不一致</strong>で終わりました。HMAC の値が異なるか、ECDSA verify が false です。
</ErrorCode>

<ErrorCode code="DAT_SIG_MALFORMED" impact="none" suspect retry="permanent" action="リクエストを拒否">
署名パートが空、base64url でない、ECDSA の <code>r‖s</code> 長が曲線と合わない、DER 変換に失敗した、のいずれかです。
</ErrorCode>

<ErrorCode code="DAT_SIG_KEY_MISSING" impact="critical" retry="permanent" action="発行サーバーの設定を確認">
verify-only の鍵で署名しようとしました。実行時に秘密鍵が存在しない状態です。
</ErrorCode>

<ErrorCode code="DAT_SIG_BACKEND" impact="partial" retry="permanent" action="鍵の型とライブラリを確認">
署名・検証の<strong>演算そのものが実行できませんでした。</strong>誤った鍵の型、解放済みのハンドル、暗号ライブラリの内部エラーです。
</ErrorCode>

<ErrorCode code="DAT_SIG_UNKNOWN" impact="partial" retry="permanent" action="ログを確認">
上のいずれにも分類されない署名エラーです。
</ErrorCode>

::: warning 不一致とバックエンド障害を混ぜないでください
2 つのコードは軸が正反対です。

- `DAT_SIG_MISMATCH` — 届いた署名が合わなかっただけなので**サービスへの影響はなく**、代わりに続くようなら **疑い** の対象です。
- `DAT_SIG_BACKEND` — 検証の演算自体が回らなかったので**実装側の問題**であり、疑いの対象ではありません。

誤った鍵の型やライブラリのバグを「署名不一致」として報告すると、実際には実装側が壊れている状況が攻撃指標に混ざり込みます。逆に本物の偽造がバックエンドエラーに分類されると、疑いの指標から丸ごと抜け落ちます。
:::

---

## 暗号化

secure ペイロードの暗号化・復号の問題です。

<ErrorCode code="DAT_CRYPTO_TAG_MISMATCH" impact="none" suspect retry="permanent" action="セッションを遮断、セキュリティログへ">
AES-GCM の認証タグが一致しません。secure が改ざんされたか、証明書の鍵が異なります。
</ErrorCode>

<ErrorCode code="DAT_CRYPTO_DATA_INVALID" impact="none" suspect retry="permanent" action="リクエストを拒否">
暗号文が空ではないのに IV (12 バイト) 以下であるか、入力が実装上の限界 (<code>INT_MAX</code> など) を超えました。
</ErrorCode>

<ErrorCode code="DAT_CRYPTO_BACKEND" impact="partial" retry="permanent" action="プラットフォームの対応状況を確認">
暗号化・復号の演算が実行できませんでした。GCM 非対応のプラットフォームか、コンテキストの初期化失敗です。
</ErrorCode>

<ErrorCode code="DAT_CRYPTO_UNKNOWN" impact="partial" retry="permanent" action="ログを確認">
上のいずれにも分類されない暗号化・復号エラーです。
</ErrorCode>

**空の secure ペイロードはエラーではありません。** 空の入力は空の出力になり、コードは一切出ません。

署名検証をスキップする経路では、GCM タグが**唯一の完全性チェック**です。そのため `DAT_CRYPTO_TAG_MISMATCH` を他の復号失敗と同じコードにまとめていません。

---

## 鍵

<ErrorCode code="DAT_KEY_INVALID" impact="none" suspect retry="permanent" action="鍵を交換">
宣言したアルゴリズムと鍵長が一致しない (HMAC 32/48/64、AES 16/32)、曲線上にない点である、<code>d ∉ [1,n-1]</code> である、非圧縮 (0x04) 形式でない、秘密鍵と公開鍵が対になっていない、のいずれかです。
</ErrorCode>

<ErrorCode code="DAT_KEY_VERIFY_ONLY_UNSUPPORTED" impact="critical" retry="permanent" action="アルゴリズムを変更">
HMAC 系に対して verify-only のエクスポートを要求しました。
</ErrorCode>

<ErrorCode code="DAT_KEY_UNKNOWN" impact="partial" retry="permanent" action="ログを確認">
上のいずれにも分類されない鍵エラーです。
</ErrorCode>

**似て見えるが別物の 3 つ:**

| コード | 意味 |
| --- | --- |
| `DAT_KEY_VERIFY_ONLY_UNSUPPORTED` | **アルゴリズムの構造的な限界。** HMAC は共通鍵なので公開鍵という概念がありません |
| `DAT_SIG_KEY_MISSING` | **実行時の状態。** いまこの鍵に秘密鍵が入っていません |
| `DAT_CERT_VERIFY_ONLY` | **配布の形。** この証明書が検証専用として配布されました |

---

## マネージャー

証明書を保持し、発行・検証に使うオブジェクトの状態です。

<ErrorCode code="DAT_MANAGER_NO_CERTIFICATE" impact="critical" retry="transient" action="CMS 接続を確認">
証明書を 1 枚も保有していません。import 前か、CMS の初回同期に失敗した状態です。
</ErrorCode>

<ErrorCode code="DAT_MANAGER_NO_ISSUABLE_CERTIFICATE" impact="critical" retry="permanent" action="理由 (cause) を見て判断 — 下の表">
証明書はありますが、いま発行に使えるものがありません。<strong>理由が一緒に渡されます。</strong>
</ErrorCode>

<ErrorCode code="DAT_MANAGER_DISPOSED" impact="critical" retry="permanent" action="呼び出しコードを修正">
すでに解放されたマネージャーまたは証明書を使用しました。
</ErrorCode>

<ErrorCode code="DAT_MANAGER_UNKNOWN" impact="partial" retry="permanent" action="ログを確認">
上のいずれにも分類されないマネージャーエラーです。
</ErrorCode>

`DAT_MANAGER_NO_ISSUABLE_CERTIFICATE` の理由 (`cause`) は 4 つのうちのいずれかです。**原因ごとにやるべきことがまったく異なります。**

| 理由 | 意味 | リトライ | 対応 |
| --- | --- | --- | --- |
| `DAT_CERT_NOT_YET_ISSUABLE` | 発行ウィンドウの開始前 | **一時的** | 待てば解消します |
| `DAT_CERT_ISSUANCE_ENDED` | 発行ウィンドウ終了、検証のみ可能 | 恒久的 | 新しい証明書を配布する必要があります |
| `DAT_CERT_EXPIRED` | 保有分がすべて期限切れ | 恒久的 | 証明書の更新が必要です |
| `DAT_CERT_VERIFY_ONLY` | 保有分がすべて検証専用 | 恒久的 | **配布設定のミスです** |

発行サーバーが検証専用の証明書だけを受け取るよう設定されていると `DAT_CERT_VERIFY_ONLY` が出ます。待っても決して解消しないので、リトライの対象ではありません。

---

## 設定

呼び出し側が渡した値の問題です。`CONFIG` 系はすべて**コードを直す必要のあるエラー**であり、運用中に出た場合はデプロイが誤っています。

<ErrorCode code="DAT_CONFIG_ALG_UNSUPPORTED" impact="critical" retry="permanent" action="アルゴリズム名を確認">
未知のアルゴリズム名です。ワイヤ表記 (<code>ECDSA-P256</code>、<code>IV-AES256-GCM</code>) と正確に一致する必要があります。
</ErrorCode>

<ErrorCode code="DAT_CONFIG_ARGUMENT_INVALID" impact="critical" retry="permanent" action="呼び出しコードを修正">
必須の引数が null、許容範囲外 (負の時間値、<code>interval &lt;= 0</code>)、サポートされない型 (動的型付け言語で payload に数値やブール値を渡した)、署名対象の body が空、のいずれかです。
</ErrorCode>

<ErrorCode code="DAT_CONFIG_URI_INVALID" impact="critical" retry="permanent" action="URI を修正">
CMS サーバーの URI が仕様外です。パース不可、スキームが http/https でない、パスやクエリが付いている場合です。
</ErrorCode>

<ErrorCode code="DAT_CONFIG_UNKNOWN" impact="critical" retry="permanent" action="ログを確認">
上のいずれにも分類されない設定エラーです。
</ErrorCode>

---

## 内部

実行環境とランタイムの問題です。

<ErrorCode code="DAT_INTERNAL_UNAVAILABLE" impact="critical" retry="permanent" action="デプロイとプラットフォームを確認">
暗号バックエンドやランタイム API がまったくありません。<code>crypto.subtle</code> の不在、AES-GCM 非対応のプラットフォーム、ランタイムのバージョン不足です。
</ErrorCode>

<ErrorCode code="DAT_INTERNAL_UNKNOWN" impact="critical" retry="permanent" action="ログを確認">
メモリ確保の失敗、乱数生成の失敗、ロック取得の失敗、到達不能として設計された分岐への到達です。
</ErrorCode>

`DAT_INTERNAL_UNAVAILABLE` はデプロイ環境を直せば解決し、`DAT_INTERNAL_UNKNOWN` はたいていランタイム障害かライブラリのバグです。

---

## CMS 同期

CMS 同期を使わなければこれらのコードは出ません。

<ErrorCode code="DAT_CMS_UNREACHABLE" impact="partial" retry="transient" action="バックオフ後にリトライ">
DNS 失敗、接続拒否、TLS 失敗、<strong>タイムアウト</strong>です。タイムアウトは別コードではなくここに含まれます — 対応が同じだからです。
</ErrorCode>

<ErrorCode code="DAT_CMS_UNAUTHORIZED" impact="critical" retry="permanent" http="401" action="トークン設定を確認">
サーバーが 401 で応答しました。トークンがないか誤っています。
</ErrorCode>

<ErrorCode code="DAT_CMS_FORBIDDEN" impact="critical" retry="permanent" http="403" action="トークンの等級を確認">
サーバーが 403 で応答しました。トークンは有効ですが、このエンドポイントの権限がありません。
</ErrorCode>

<ErrorCode code="DAT_CMS_ENDPOINT_NOT_FOUND" impact="critical" retry="permanent" http="404" action="URL 設定を確認">
サーバーが 404 で応答しました。URL が誤っています。
</ErrorCode>

<ErrorCode code="DAT_CMS_SERVER_ERROR" impact="partial" retry="transient" http="5xx" action="バックオフ後にリトライ">
サーバーが 5xx で応答しました。
</ErrorCode>

<ErrorCode code="DAT_CMS_HTTP_STATUS" impact="critical" retry="permanent" action="ステータスコードを確認">
上に該当しない非 2xx の応答です。
</ErrorCode>

<ErrorCode code="DAT_CMS_MALFORMED" impact="critical" retry="permanent" action="サーバーのバージョンを確認">
レスポンスに version 行がない、version 行が純粋な 10 進数でない、範囲を超えた、のいずれかです。
</ErrorCode>

<ErrorCode code="DAT_CMS_IMPORT_FAILED" impact="critical" retry="permanent" action="cause の CERT_* / KEY_* を確認">
レスポンスは受け取りましたが、証明書を適用できませんでした。<strong>原因は <code>cause</code> に入っています。</strong>
</ErrorCode>

<ErrorCode code="DAT_CMS_VERSION_RESET" impact="none" retry="state" http="200" action="自動的に処理されます">
サーバーがクライアントより古い version を返しました。全体の再同期の指示です。
</ErrorCode>

<ErrorCode code="DAT_CMS_NOT_SYNCED" impact="critical" retry="transient" action="初回同期を待つ">
まだ一度も同期に成功していない状態です。
</ErrorCode>

<ErrorCode code="DAT_CMS_SYNC_IN_PROGRESS" impact="none" retry="state">
前回の同期がまだ動いているため、今回のサイクルをスキップしました。エラーではありません。
</ErrorCode>

<ErrorCode code="DAT_CMS_NOT_SUPPORTED" impact="critical" retry="permanent" action="ビルドオプションを確認">
CMS 機能がビルドに含まれていません。feature が無効か、CURL が同梱されていません。
</ErrorCode>

<ErrorCode code="DAT_CMS_UNKNOWN" impact="partial" retry="permanent" action="ログを確認">
上のいずれにも分類されない CMS エラーです。
</ErrorCode>

同期が**恒久的な失敗**と判定されるコード (`UNAUTHORIZED`・`FORBIDDEN`・`ENDPOINT_NOT_FOUND`・`MALFORMED`・`IMPORT_FAILED`) はすべて致命的です。リトライしても解消しないまま証明書は期限切れになり続けるため、放置すればサービスは必ず止まります。

逆に `UNREACHABLE`・`SERVER_ERROR` は部分的です。既存の証明書で動作を続け、次のサイクルで自力回復します — **ただし失敗し続ければ最終的には致命に移ります。** 連続失敗回数を基準にアラートを設定してください。

::: tip 同期の失敗は例外として投げられません
初回の同期に失敗してもマネージャーは正常に返されます — 遅れてでも同期されるほうがよいからです。代わりに失敗は**参照可能な状態**として残ります。

| クライアント | 参照方法 |
| --- | --- |
| Rust | `manager.last_error().await` |
| Go | `manager.LastError()` |
| JavaScript | `manager.lastError()` |
| Python | `manager.last_error()` |
| Ruby | `manager.last_error` |
| Java/Kotlin | `manager.lastError` |
| C# | `manager.LastError` |
| C/C++ | `dat_cms_manager_last_error(m)` |

一度も成功していなければ `DAT_CMS_NOT_SYNCED`、正常なら空です。
:::

---

## サーバー

CMS サーバーが出すコードです。クライアントはこれらのコードを**生成せず、受け取るだけ**です。

<ErrorCode code="DAT_AUTH_UNAUTHORIZED" impact="none" suspect retry="permanent" http="401">
<code>Authorization</code> ヘッダがないか、トークンがどの等級にも登録されていません。
</ErrorCode>

<ErrorCode code="DAT_AUTH_FORBIDDEN" impact="none" suspect retry="permanent" http="403">
トークンは登録されていますが、このエンドポイントが要求する等級ではありません。
</ErrorCode>

<ErrorCode code="DAT_AUTH_DISABLED" impact="critical" retry="state" action="ただちにトークンを設定">
トークンが 1 つも設定されておらず、認証が丸ごと無効です。<strong>証明書発行 API まで認証なしで開いています。</strong>レスポンスとしては返らず、起動ログにのみ出力されます。
</ErrorCode>

<ErrorCode code="DAT_REQ_MALFORMED" impact="none" suspect retry="permanent" http="400">
パスやクエリのパラメータを解釈できないか、引数が許容範囲外 (負の delay、10 年超など) です。
</ErrorCode>

<ErrorCode code="DAT_REQ_ALG_UNSUPPORTED" impact="none" retry="permanent" http="400">
リクエストパスのアルゴリズム名が未知です。
</ErrorCode>

<ErrorCode code="DAT_REQ_NOT_FOUND" impact="none" suspect retry="permanent" http="404·405">
そのようなルートがないか、メソッドが異なります。
</ErrorCode>

<ErrorCode code="DAT_REQ_TOO_LARGE" impact="none" suspect retry="permanent" http="413">
リクエストボディのサイズが上限を超えました。
</ErrorCode>

<ErrorCode code="DAT_REQ_UNKNOWN" impact="none" retry="permanent" http="400">
上のいずれにも分類されないリクエストエラーです。
</ErrorCode>

<ErrorCode code="DAT_STORE_UNAVAILABLE" impact="partial" retry="transient" http="503" action="バックオフ後にリトライ">
DB 接続の切断、コネクションプールの枯渇、ロック競合、タイムアウトです。<strong>503 を使う唯一のコード</strong>であり、クライアントが「これは待てば直る」と判断できる唯一のシグナルです。
</ErrorCode>

<ErrorCode code="DAT_STORE_UNKNOWN" impact="critical" retry="permanent" http="500" action="DB の状態を確認">
参照・書き込みの失敗、テーブルの不在、スキーマの不一致、保存された証明書行の破損です。
</ErrorCode>

レスポンスのエンベロープ:

```json
{
  "code": "DAT_REQ_ALG_UNSUPPORTED",
  "details": { "algorithm": "BOGUS-ALG" }
}
```

証明書を生成・処理する過程で出るエラーは、サーバーも上記の共通コード (`DAT_CERT_*`、`DAT_KEY_*`、`DAT_CONFIG_*`) をそのまま使います。

### サーバーのコードを受け取ったら

クライアントはサーバーのコードを自身の `CMS` コードで包み、元のコードは `cause` に保存します。

| 受け取ったもの | HTTP | クライアントが出すコード |
| --- | --- | --- |
| `DAT_AUTH_UNAUTHORIZED` | 401 | `DAT_CMS_UNAUTHORIZED` |
| `DAT_AUTH_FORBIDDEN` | 403 | `DAT_CMS_FORBIDDEN` |
| `DAT_REQ_NOT_FOUND` | 404 | `DAT_CMS_ENDPOINT_NOT_FOUND` |
| `DAT_REQ_*` (その他) | 400·405·413 | `DAT_CMS_HTTP_STATUS` |
| `DAT_STORE_UNAVAILABLE` | 503 | `DAT_CMS_SERVER_ERROR` |
| `DAT_STORE_UNKNOWN` | 500 | `DAT_CMS_SERVER_ERROR` |
| (version の巻き戻し) | 200 | `DAT_CMS_VERSION_RESET` |

---

## 症状から探す

| 症状 | コード |
| --- | --- |
| ログイン直後は通るのに、しばらくすると拒否される | `DAT_TOKEN_EXPIRED` — トークンの寿命が尽きました。再発行すれば済みます |
| 特定のサーバーだけ検証に失敗する | `DAT_CERT_NOT_SYNCED` — そのサーバーがまだ新しい CID を受け取っていません |
| すべてのサーバーで同じトークンが拒否される | `DAT_CERT_NOT_FOUND` — 発行された記録のない CID です |
| 発行サーバーがトークンを作れない | `DAT_MANAGER_NO_ISSUABLE_CERTIFICATE` + `DAT_CERT_VERIFY_ONLY` — **verify-only で配布されています** |
| 起動直後だけ発行に失敗する | `DAT_MANAGER_NO_CERTIFICATE` — 初回同期の前です。しばらくすると解消します |
| CMS 同期が失敗し続ける | `DAT_CMS_UNAUTHORIZED` — トークンが誤っています。リトライしても解消しません |
| 証明書が 1 枚も来ない | `DAT_CMS_ENDPOINT_NOT_FOUND` — URL の誤記です |
| 特定のプラットフォームだけ失敗する | `DAT_INTERNAL_UNAVAILABLE` — 暗号バックエンドがありません |
| 検証失敗が急に増えた | `DAT_SIG_MISMATCH` — 1 件なら無害ですが、**まとまって出るなら偽造の試み**です |
| secure の復号が急に失敗する | `DAT_CRYPTO_TAG_MISMATCH` — 証明書が食い違っているか、**改ざん**です |
| CMS の起動ログに警告が出る | `DAT_AUTH_DISABLED` — **認証が切れています。** 発行 API が開いています |

---

## 付録

### コードの文法

```
DAT_<領域>_<原因>
```

- 同じ原因が異なる領域で出る場合、**原因名は同じ**です。`DAT_TOKEN_MALFORMED` と `DAT_CERT_MALFORMED` は対象が違うだけで意味は同じです。
- `_UNKNOWN` は各領域の**フォールバック専用**です。「未知のアルゴリズム」のような別の意味では使いません (それは `_UNSUPPORTED` です)。
- コード文字列は公開された契約です。メッセージは自由に変えてよいですが、コードは変えません。

| 分類 | コードの接頭辞 |
| --- | --- |
| トークン | `DAT_TOKEN_` |
| 証明書 | `DAT_CERT_` |
| 署名 | `DAT_SIG_` |
| 暗号化 | `DAT_CRYPTO_` |
| 鍵 | `DAT_KEY_` |
| マネージャー | `DAT_MANAGER_` |
| 設定 | `DAT_CONFIG_` |
| 内部 | `DAT_INTERNAL_` |
| CMS 同期 | `DAT_CMS_` |
| サーバー | `DAT_AUTH_` · `DAT_REQ_` · `DAT_STORE_` |

### クライアント別のアクセス方法

| クライアント | エラー型 | コード | リトライ分類 | セキュリティイベント |
| --- | --- | --- | --- | --- |
| Rust | `DatError` enum | `err.code()` | `err.retry()` | `err.security_event()` |
| Go | `*dat.Error` | `err.Code` | `dat.Retry(err)` | `dat.SecurityEvent(err)` |
| JavaScript | `DatError extends Error` | `e.code` | `e.retry` | `e.securityEvent` |
| Python | `DatError(ValueError, RuntimeError)` | `e.code` | `e.retry` | `e.security_event` |
| Ruby | `Saro::Dat::Error` | `e.code` | `e.retry` | `e.security_event?` |
| Java/Kotlin | `DatException` | `e.code` | `e.retry` | `e.securityEvent` |
| C# | `DatException` | `e.Code` | `e.Retry` | `e.SecurityEvent` |
| C/C++ | `dat_error_t` | `dat_error_code(e)` | `dat_error_retry(e)` | `dat_error_is_security_event(e)` |
| CMS サーバー | JSON エンベロープ | `code` フィールド | — | — |

`セキュリティイベント` は偽造・改ざんが確定的な 2 件 (`DAT_SIG_MISMATCH`、`DAT_CRYPTO_TAG_MISMATCH`) だけが `true` を返します。本ドキュメントの **疑い** タグはそれより広い範囲 (改ざんされたトークン・鍵・リクエストまで) を指し、いまのところドキュメント上の分類であってクライアント API としては公開していません。

**影響** の等級も同様にドキュメント上の分類です。同じコードでもどこで発生したかによって打撃が変わるためです — 例えば `DAT_KEY_INVALID` は届いたトークンを弾く場面では影響がありませんが、CMS 同期の途中で証明書を読んでいて出た場合は同期が丸ごと失敗します。

**下位の原因は捨てられません。** `DAT_MANAGER_NO_ISSUABLE_CERTIFICATE` と `DAT_CMS_IMPORT_FAILED` は、各言語の例外チェーン (`cause` / `__cause__` / `InnerException` / `Unwrap()`) で理由を伝えます。

::: warning C/C++ は整数値も維持します
`dat_error_t` の既存の整数値は ABI 互換のためそのまま残しますが、**文字コードが正本**です。ライブラリはもう以前の値を返さないため、`err == DAT_ERROR_INVALID_DAT` のような比較は一致しません。`dat_error_code(e)` で照合してください。

C には例外チェーンがないため、理由は `dat_manager_issuable_cause()` で別途取得します。
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
