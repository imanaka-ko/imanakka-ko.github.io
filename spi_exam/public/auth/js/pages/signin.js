import { api, helpers, auth } from "../firebase.js";
import { bindForm } from "../common.js";

document.addEventListener("DOMContentLoaded", () => {
  const form = document.querySelector("form");
  bindForm(form, async (fd) => {
    const email = String(fd.get("email") || "");
    const password = String(fd.get("password") || "");
    const u = await api.signIn(email, password);
    if (u.emailVerified) location.href = "my_page.html";
    else location.href = "verify_email.html";
  });
});
