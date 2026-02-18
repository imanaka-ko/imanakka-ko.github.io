import { api } from "../firebase.js";
import { bindForm, showToast } from "../common.js";

document.addEventListener("DOMContentLoaded", () => {
  const form = document.querySelector("form");
  bindForm(form, async (fd) => {
    const email = String(fd.get("email") || "");
    const password = String(fd.get("password") || "");
    const confirm = String(fd.get("confirm") || "");
    if (password.length < 6) throw new Error("パスワードは6文字以上にしてください");
    if (password !== confirm) throw new Error("パスワード（確認）が一致しません");
    await api.signUp(email, password);
    showToast("確認メールを送信しました。メール内のリンクをクリックしてください。");
    location.href = "verify_email.html";
  });
});