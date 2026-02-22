import { auth, applyActionCode } from "../firebase.js";
import { reload } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

const params = new URLSearchParams(location.search);
const mode = params.get("mode");
const oobCode = params.get("oobCode");

const titleEl = document.getElementById("action-title");
const messageEl = document.getElementById("action-message");
const linkEl = document.getElementById("action-link");

function showError(msg) {
  titleEl.textContent = "リンクが無効です";
  messageEl.textContent = msg;
  linkEl.style.display = "block";
  linkEl.textContent = "ログインページへ";
  linkEl.href = "signin.html";
}

async function handleVerifyEmail() {
  if (!oobCode) {
    showError("確認コードが見つかりません。メール内のリンクを再度クリックしてください。");
    return;
  }

  try {
    await applyActionCode(auth, oobCode);

    // Firebase が初期認証状態を解決するまで待つ
    await auth.authStateReady();

    if (auth.currentUser) {
      await reload(auth.currentUser);
      location.href = "my_page.html";
    } else {
      // セッションなし（別ブラウザで開いた場合など）
      titleEl.textContent = "メールアドレスを確認しました";
      messageEl.textContent = "認証が完了しました。ログインしてご利用ください。";
      linkEl.style.display = "block";
      linkEl.textContent = "ログインページへ";
      linkEl.href = "signin.html";
    }
  } catch (err) {
    if (err.code === "auth/invalid-action-code" || err.code === "auth/expired-action-code") {
      showError("リンクの有効期限が切れているか、すでに使用済みです。メールを再送してください。");
    } else {
      showError("メールアドレスの確認中にエラーが発生しました。しばらく経ってから再度お試しください。");
    }
  }
}

if (mode === "verifyEmail") {
  handleVerifyEmail();
} else {
  showError("このURLは対応していません。");
}
