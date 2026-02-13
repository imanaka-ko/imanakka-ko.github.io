import { api, auth, helpers } from "../firebase.js";
import { $, showToast } from "../common.js";

document.addEventListener("DOMContentLoaded", async () => {
  // ensure signed in
  const user = await helpers.requireAuth("signin.html");
  await helpers.ensureFreshUser();
  // set up the resend link if present
  const resend = document.getElementById("resend-link") || document.querySelector('a[href="#"]');
  if (resend) {
    resend.addEventListener("click", async (e) => {
      e.preventDefault();
      await api.resendVerification();
      showToast("確認メールを再送しました");
    });
  }
  // polling style small refresh button is not in HTML; users can revisit or reload page.
  // Try auto-redirect if already verified.
  if (auth.currentUser) {
    await helpers.ensureFreshUser();
    if (auth.currentUser.emailVerified) location.href = "my_page.html";
  }
});
