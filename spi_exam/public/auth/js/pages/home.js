import { api, auth, helpers } from "../firebase.js";

document.addEventListener("DOMContentLoaded", async () => {
  const user = await helpers.requireVerified("verify_email.html");
  if (!user) return;
  const span = document.getElementById("current-email");
  if (span) span.textContent = user.email || "";
  // sign out link if exists
  const signout = document.getElementById("signout-link");
  if (signout) signout.addEventListener("click", async (e) => {
    e.preventDefault();
    await api.signOut();
    location.href = "signin.html";
  });
});
