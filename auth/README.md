# Web Auth (Firebase Authentication, ESM, no build tools)

## セットアップ
1. `auth/js/firebase-config.sample.js` を `auth/js/firebase-config.js` に **リネーム**し、Firebase コンソールの Web アプリ設定から値を埋めてください（apiKey / authDomain / projectId / appId など）。
2. ファイルを任意の静的HTTPサーバで配信してください（例: `python3 -m http.server` をサイトルートで実行、`/auth/signin.html` にアクセス）。
   - ローカルファイル (`file://`) 直読みはブラウザのモジュール制約で動作しません。必ずHTTPで配信してください。

## 画面と対応スクリプト
- `auth/signin.html` → `auth/js/pages/signin.js`（ログイン＋新規登録）
- `auth/verify_email.html` → `auth/js/pages/verify_email.js`
- `auth/my_page.html` → `auth/js/pages/home.js`
- `auth/change_email.html` → `auth/js/pages/change_email.js`
- `auth/change_password.html` → `auth/js/pages/change_password.js`

## フロー
- **新規登録**: メール/パスワード作成 → 確認メール送信 → `verify_email.html` へ遷移  
- **サインイン**: 検証済みなら `my_page.html`、未検証なら `verify_email.html`
- **メール変更**: 現在のパスワードで再認証 → `updateEmail` → 新メール宛へ確認メール送信 → `verify_email.html`  
- **パスワード変更**: 現在のパスワードで再認証 → `updatePassword` → `my_page.html`

## 注意
- CDN の Firebase ESM を利用しています。社内CDNやバンドルが必要な場合は `firebase.js` を適宜変えてください。
- セキュリティルールやバックエンドAPIと連携する際は、IDトークン (`getIdToken()`) を使って Bearer で送信し、サーバ側で検証してください。