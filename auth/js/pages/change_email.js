import { api, helpers } from "../firebase.js";
import { bindForm, showToast } from "../common.js";

document.addEventListener("DOMContentLoaded", async () => {
  await helpers.requireVerified("verify_email.html"); // must be signed in & verified to change email
  const form = document.querySelector("form");
  bindForm(form, async (fd) => {
    const password = String(fd.get("current-password") || "");
    const newEmail = String(fd.get("new-email") || "");
    await api.updateEmailWithReauth(password, newEmail);
    showToast("新しいメールアドレスに確認メールを送信しました。検証後に再ログインしてください。");
    location.href = "verify_email.html";
  });
});
