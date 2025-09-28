import { api, helpers, auth } from "../firebase.js";
import { bindForm } from "../common.js";

function resolveRedirect() {
  try {
    const params = new URLSearchParams(window.location.search);
    const redirect = params.get("redirect");
    if (!redirect) return null;
    const url = new URL(redirect, window.location.href);
    if (url.origin !== window.location.origin) return null;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch (error) {
    console.error("Failed to resolve redirect target", error);
    return null;
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const redirectTo = resolveRedirect();
  const form = document.querySelector("form");
  bindForm(form, async (fd) => {
    const email = String(fd.get("email") || "");
    const password = String(fd.get("password") || "");
    const u = await api.signIn(email, password);
    if (u.emailVerified) location.href = redirectTo || "home.html";
    else location.href = "verify_email.html";
  });
});
