import type { SharedGuideLocale } from './types'

export const jaGuideLocale: SharedGuideLocale = {
  libraryIndex: {
    title: 'ライブラリ',
    intro: 'アプリケーションの言語に合わせて DAT クライアントを選びます。すべてのクライアントは同じ DAT と証明書の仕様を使い、ローカルの証明書管理と DAT CMS 同期を提供します。',
    criteriaTitle: '選び方',
    criteriaBody: 'DAT を発行するサービスは完全な証明書を使用できる必要があります。検証と復号のみを行うサービスは、ECDSA 検証専用証明書と CMS の検証専用ロールを使用してください。',
    flowTitle: 'ガイドの構成',
    flowBody: '各ライブラリガイドでは、インストール、最も簡単な発行と検証のフロー、DAT CMS 接続、同期ポリシー、終了、エラー処理を説明します。',
  },
  library: {
    titleSuffix: 'ライブラリ', install: 'インストール', quickTitle: 'クイックスタート',
    quickIntro: 'この完全なフローでは、CMS から証明書を取得し、JSON データを含む DAT を作成して検証します。',
    stepTitle: '手順', connectTitle: '1. CMS に接続',
    connectBody: '発行サービスは完全な証明書用のトークンを使います。起動時にすぐ同期することで、証明書を利用できる前の発行を防ぎます。',
    issueTitle: '2. DAT を発行', issueBody: 'この例では公開 JSON を `plain` に、保護されたユーザー情報を JSON で `secure` に格納します。',
    parseTitle: '3. DAT を検証', parseBody: '`parse` は有効期限と署名を確認し、`secure` を復号します。検証に成功した後に返されたペイロードのみを使用してください。',
    functionsTitle: '主要関数', functionHeader: '関数', purposeHeader: '用途', dataTitle: 'データ領域',
    plainBody: '署名されるが暗号化されないバイト。', secureBody: '暗号化されたバイト。', payloadBody: '`parse` の成功後にのみ信頼してください。',
    optionsTitle: 'JSON 以外の選択肢', optionsBody: '例では一般的な JSON を使います。より高速に処理するには、バイナリデータを使うと JSON の直列化と解析を省き、データサイズも削減できます。',
    formatsBody: '単純な値はテキストで保存するか、Protobuf や MessagePack などのバイナリ形式の構造化データを `plain` と `secure` に格納します。',
    verifyTitle: '検証専用サービス', verifyBody: 'DAT を発行しないサービスは、検証専用オプションと検証専用トークンを使い、`parse` だけを呼び出します。',
    lifecycleTitle: '終了とエラー', errorsBefore: '', errorsLink: 'エラーコードと再試行分類', errorsAfter: 'をエラーメッセージの代わりに使用します。',
  },
  guides: {
    rust: { binaryNote: '`issue` は現在文字列を受け取るため、任意のバイトを Base64Url または Hex でエンコードし、検証後に再度デコードします。', lifecycle: '最後の `Arc<DatCmsManager>` が drop されると自動同期タスクは終了します。', apiPurposes: ['証明書をすぐに同期します。', '現在の発行証明書で DAT を作成します。', 'DAT を検証してペイロードを返します。', '最後の同期エラーを返します。'] },
    java: { binaryNote: '`ByteArray` オーバーロードは追加形式なしでバイトを直接保存・取得します。', lifecycle: '`DatCmsManager` は `AutoCloseable` です。`use` または `close()` で閉じます。', apiPurposes: ['証明書をすぐに同期し、失敗を報告します。', 'DAT を作成して DatResult を返します。', 'DAT を検証して Payload を返します。', '最後のバックグラウンド同期エラーを返します。'] },
    javascript: { binaryNote: '`Uint8Array` または `ArrayBuffer` を渡し、`plainBytes` と `secureBytes` から元のバイトを取得します。', lifecycle: '終了時に `stop()` を呼び出し、タイマーと進行中のリクエストをクリーンアップします。', apiPurposes: ['証明書をすぐに同期します。', 'DAT 文字列を非同期で作成します。', 'DAT を検証して DatPayload を返します。', '最後の同期エラーを返します。'] },
    python: { binaryNote: '`bytes` を直接渡し、`plain_bytes` と `secure_bytes` から取得します。', lifecycle: '自動同期が有効な場合は、終了時に `stop()` を呼び出します。', apiPurposes: ['証明書をすぐに同期します。', 'DAT 文字列を作成します。', 'DAT を検証して DatPayload を返します。', '最後の同期エラーを返します。'] },
    csharp: { binaryNote: '`byte[]` オーバーロードと `PlainBytes`、`SecureBytes` を使用します。', lifecycle: '`await using` でマネージャーとバックグラウンド同期をクリーンアップします。', apiPurposes: ['証明書をすぐに同期します。', 'DAT 文字列を作成します。', 'DAT を検証して Payload を返します。', '最後の同期エラーを返します。'] },
    go: { binaryNote: 'Go の文字列はバイトを含めます。バイトスライスを `string` として渡し、結果を `[]byte` に戻します。', lifecycle: '自動同期が有効な場合は、`defer cms.Close()` でクリーンアップを保証します。', apiPurposes: ['証明書をすぐに同期します。', 'DAT 文字列とエラーを返します。', '検証済み Payload とエラーを返します。', '最後の同期エラーを返します。'] },
    ruby: { binaryNote: 'バイナリ文字列を渡し、`plain_bytes` と `secure_bytes` から取得します。', lifecycle: '自動同期が有効な場合は、`stop` でバックグラウンドスレッドを終了します。', apiPurposes: ['証明書をすぐに同期します。', 'DAT 文字列を作成します。', 'DAT を検証して DatPayload を返します。', '最後の同期エラーを返します。'] },
    c: {
      binaryNote: '現在の C 発行 API は NUL 終端文字列を受け取ります。任意のバイトを Base64Url または Hex でエンコードし、ペイロードの長さを使って結果を読み取ります。',
      lifecycle: '`dat`、`payload`、`cms` をそれぞれのクリーンアップ関数で解放します。',
      apiPurposes: ['証明書をすぐに同期します。', 'DAT 文字列を割り当てて返します。', '検証済みペイロードを割り当てて返します。', '最後の同期エラーを返します。'],
      parse: `dat_payload_t *payload = NULL;
err = dat_cms_manager_parse(cms, dat, &payload);
/* plain_bytes と secure_bytes をそれぞれの長さとともに使用する。 */`,
      binary: `/* issue は C 文字列を受け取るため、NUL を含むデータは先にエンコードする。 */
const char *secure_hex = "00ff1080";
char *dat = NULL;
err = dat_cms_manager_issue(cms, "01", secure_hex, &dat);

dat_payload_t *payload = NULL;
err = dat_cms_manager_parse(cms, dat, &payload);`,
    },
  },
  cms: {
    introBefore: 'DAT CMS は証明書を作成し、データベースに保存し、発行・検証サービスに適切な証明書を配信します。プロトコルの動作は ', specLink: 'DAT CMS 仕様', introAfter: 'で説明します。',
    configTitle: 'ランタイム設定の作成', dockerTitle: 'Docker で実行',
    dockerBody: 'コンテナーは non-root ユーザーで実行します。SQLite を使う場合は書き込み可能なデータディレクトリをマウントします。トークンとデータベースパスワードはコマンド履歴ではなく Secret 注入機構で渡します。',
    databaseTitle: 'データベース', databaseBody1: '`DB_URI` で SQLite、PostgreSQL、MySQL 接続を設定します。MariaDB は MySQL プロトコルで接続します。CMS は証明書クエリ結果をスナップショットとしてキャッシュし、ストレージ更新が一時的に失敗しても最後の成功スナップショットを提供し続けます。',
    databaseBody2: '`DB_CACHE_SECS` はスナップショットの更新間隔、`DB_QUERY_TIMEOUT_SECS` は更新クエリの制限時間を設定します。成功スナップショットがなくストレージを読み取れない場合、サービスは `DAT_STORE_UNAVAILABLE` を返します。',
    rolesTitle: 'アクセスロール', roleHeaders: ['環境変数', '権限', '使用者'],
    roleRows: [['証明書を登録し、保護されたバージョンを取得', '運用'], ['完全な証明書を取得', 'DAT 発行サービス'], ['検証専用証明書を取得', '検証・復号サービス']],
    rolesNote: '各変数は、カンマ区切りの英数字トークンを受け付けます。ロールのトークンリストが空の場合、そのロールのエンドポイントは公開され、警告がログに記録されます。',
    certificateTitle: '証明書の生成', certificateBody: 'master ロールは、署名アルゴリズム、暗号化アルゴリズム、伝播遅延、発行期間、TTL を指定して証明書を登録します。伝播遅延中に、発行可能になる前の新しい証明書をサービスが同期します。',
    clientTitle: 'クライアント統合', clientSteps: ['発行サービスには full トークンと完全証明書エンドポイントを使用します。', '検証サービスには verify トークンと検証専用オプションを使用します。', '初回同期の結果を確認し、起動を失敗させる必要がある場合は即時同期 API を呼び出します。', '自動同期が有効な場合は、アプリケーション終了時にマネージャーを閉じます。'],
    libraryBefore: '各言語の builder と終了動作については ', libraryLink: 'ライブラリガイド', libraryAfter: 'を参照してください。',
    operationsTitle: '運用チェック', operationsItems: ['`/health` と `/version/api` は認証なしで状態を報告します。', '`/version` は、そのロールが設定されている場合に master トークンを必要とします。', '標準出力と標準エラーからログを収集します。', '終了シグナルを転送し、データベースとスケジューラーが閉じる時間を確保します。'],
    kubernetesTitle: 'Kubernetes', kubernetesBody: 'コンテナーポートと probe をサービスポートに合わせ、non-root ユーザーが書き込めるようデータディレクトリをマウントします。トークンとデータベース接続情報は Secrets で注入します。',
  },
}
