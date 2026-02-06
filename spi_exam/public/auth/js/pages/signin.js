import { api } from "../firebase.js";
import { bindForm, showToast } from "../common.js";

document.addEventListener("DOMContentLoaded", () => {
  const signinForm = document.querySelector("#signin-form");
  bindForm(signinForm, async (fd) => {
    const email = String(fd.get("email") || "");
    const password = String(fd.get("password") || "");
    const u = await api.signIn(email, password);
    if (u.emailVerified) location.href = "my_page.html";
    else location.href = "verify_email.html";
  });

  const signupForm = document.querySelector("#signup-form");
  if (!signupForm) return;

  bindForm(signupForm, async (fd) => {
    const email = String(fd.get("signup_email") || "");
    const password = String(fd.get("signup_password") || "");
    const confirm = String(fd.get("signup_confirm") || "");
    if (password.length < 6) throw new Error("パスワードは6文字以上にしてください");
    if (password !== confirm) throw new Error("パスワード（確認）が一致しません");
    await api.signUp(email, password);
    showToast("確認メールを送信しました。メール内のリンクをクリックしてください。");
    location.href = "verify_email.html";
  });
});
