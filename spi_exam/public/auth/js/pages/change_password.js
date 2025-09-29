import { api, helpers } from "../firebase.js";
import { bindForm, showToast } from "../common.js";

document.addEventListener("DOMContentLoaded", async () => {
  await helpers.requireVerified("verify_email.html");
  const form = document.querySelector("form");
  bindForm(form, async (fd) => {
    const current = String(fd.get("current-password") || "");
    const newp = String(fd.get("new-password") || "");
    const confirm = String(fd.get("confirm-password") || "");
    if (newp.length < 6) throw new Error("新しいパスワードは6文字以上にしてください");
    if (newp != confirm) throw new Error("確認用パスワードが一致しません");
    await api.updatePasswordWithReauth(current, newp);
    showToast("パスワードを更新しました");
    location.href = "my_page.html";
  });
});
