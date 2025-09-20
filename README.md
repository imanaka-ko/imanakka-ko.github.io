# teraz
AIを使った便利な総合的なルール群

## Initial Environment Setup (macOS)

The following steps prepare a Mac that does not have Git or Python installed.

1. **Install pyenv**
   Install `pyenv` with Homebrew:
   ```bash
   brew install pyenv
   ```

2. **Install Python 3.13 with pyenv**
   ```bash
   pyenv install 3.13.5
   pyenv global 3.13.5
   ```
   This also installs `pip`.

3. **Verify the installation**
   ```bash
   python3 --version
   pip3 --version
   ```

Once these tools are installed, proceed to the Setup section below.

## Setup

1. **Install Python 3.13.5**
   Ensure Python and `pip` are available on your system.
2. **Clone this repository**
   Run the following command:
   ```bash
   git clone git@github.com:valencia-jp/AI-tools.git
   ```
3. **Navigate into the project directory**
   ```bash
   cd AI-tools/AI-tools
   ```
4. **Create a virtual environment**
   ```bash
   python3 -m venv .venv
   ```
5. **Activate the virtual environment**
   ```bash
   source .venv/bin/activate
   ```
6. **Upgrade pip**
   ```bash
   pip install --upgrade pip
   ```
7. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```
8. **Set environment variables**
   The translation feature uses the OpenAI Agents SDK, which requires an OpenAI API key. Set it as `OPENAI_API_KEY`:
   ```bash
   export OPENAI_API_KEY=your-api-key
   ```
9. **Run the application**
   Execute the package as a module so that relative imports work correctly.
   ```bash
   python3 -m app
   ```
   The server runs on 
   `http://127.0.0.1:5050`
   `http://172.16.1.83:5050`
   by default.

   # FirebaseAuthSample Web版

このプロジェクトは、メール/パスワードによる Firebase Authentication を Flask から利用するサンプルアプリです。バックエンドは Firebase の Identity Toolkit REST API と Firebase Admin SDK を組み合わせて構築しており、Android/iOS 版と同様のフローを Web で実現します。

## 主な機能

- **会員登録** – `/signup` では `accounts:signUp` API を呼び出して新しいアカウントを作成し、直後に検証用メールを送信します。
- **メールアドレス検証** – Firebase が送信するメール内のリンクをクリックして検証します。未検証の場合は `/unverified` へリダイレクトされます。再送も `/resend` から可能です。
- **サインイン/サインアウト** – `/signin` で `accounts:signInWithPassword` によりログインし、取得した ID トークンをセッションに保持します。サインアウトは `/signout`。トークン検証には Admin SDK を使用します。
- **メールアドレス変更** – `/change_email` では現在のパスワードで再認証してから `accounts:update` API でメールアドレスを更新し、再度確認メールを送ります【872928145847261†L1549-L1567】。
- **パスワード変更** – `/change_password` では再認証後に `accounts:update` API でパスワードを更新します【872928145847261†L1609-L1627】。

## セットアップ手順

1. **Firebase プロジェクトの準備**
   - Firebase コンソールで新規プロジェクトを作成し、Authentication > Sign‑in method で Email/Password を有効にします。
   - プロジェクト設定の「サービスアカウント」タブから秘密鍵 (JSON) を生成してダウンロードします。
   - 設定の「一般」タブで Web API キーを確認します。

2. **環境変数の設定**
   - `FIREBASE_API_KEY` に Web API キーを設定します。
   - `GOOGLE_APPLICATION_CREDENTIALS` にサービスアカウント JSON のパスを設定します。
   例（bash）：
   ```bash
   export FIREBASE_API_KEY="your-web-api-key"
   export GOOGLE_APPLICATION_CREDENTIALS="/absolute/path/to/serviceAccount.json"
   ```

3. **依存関係のインストール**
   - `requirements.txt` に必要なパッケージが記載されています。仮想環境を用いてインストールします：
   ```bash
   python -m venv venv
   source venv/bin/activate
   pip install -r requirements.txt
   ```

4. **アプリの起動**
   ```bash
   export FLASK_APP=app.py
   flask run
   ```
   ブラウザで `http://localhost:5000/` にアクセスし、会員登録から試してみてください。確認メール内のリンクは Firebase のデフォルト URL になります。確認後に再度サインインするとホーム画面に進めます。

## 注意事項

- このサンプルでは ID トークンをサーバー側のセッションに保存してログイン状態を管理しています。実運用では `firebase_admin.auth.create_session_cookie()` で生成したセッションCookieを用いることが推奨されます。
- メール検証のリンク先は Firebase が提供するデフォルトページです。独自の確認ページを実装する場合は Admin SDK でメールアクションリンクを生成し、自サイトの URL を `actionCodeSettings` に指定します。
- API キーやサービスアカウントキーは秘密情報です。リポジトリに含めないよう注意してください。

