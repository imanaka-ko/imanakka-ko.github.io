import { api } from "../firebase.js";
import { bindForm } from "../common.js";

document.addEventListener("DOMContentLoaded", () => {
  const signinForm = document.querySelector("#signin-form");
  bindForm(signinForm, async (fd) => {
    const email = String(fd.get("email") || "");
    const password = String(fd.get("password") || "");
    const u = await api.signIn(email, password);
    if (u.emailVerified) location.href = "my_page.html";
    else location.href = "verify_email.html";
  });

  const signupButton = document.querySelector("#signup-guide-button");
  if (!signupButton) return;

  signupButton.addEventListener("click", () => {
    location.href = "../submission_form.html";
  });
});
