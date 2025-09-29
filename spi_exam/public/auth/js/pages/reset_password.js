import { api } from "../firebase.js";
import { bindForm, showToast } from "../common.js";

document.addEventListener("DOMContentLoaded", () => {
  const form = document.querySelector("form");
  bindForm(form, async (fd) => {
    const email = String(fd.get("email") || "").trim();
    if (!email) throw new Error("メールアドレスを入力してください。");
    await api.sendReset(email);
    showToast("パスワード再設定メールを送信しました。");
  });
});
