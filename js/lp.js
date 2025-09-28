import { auth } from "../auth/js/firebase.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

const SIGNED_OUT_URL = "./auth/signup.html";
const SIGNED_IN_URL = "terms.html";
const CTA_SELECTOR = ".cta-button";

let currentUser = null;
const authReady = new Promise((resolve) => {
  onAuthStateChanged(auth, (user) => {
    currentUser = user;
    resolve();
  });
});

function registerCtaHandlers() {
  const buttons = document.querySelectorAll(CTA_SELECTOR);
  buttons.forEach((button) => {
    button.addEventListener("click", async (event) => {
      event.preventDefault();
      await authReady;
      const destination = currentUser ? SIGNED_IN_URL : SIGNED_OUT_URL;
      window.location.href = destination;
    });
  });
}

document.addEventListener("DOMContentLoaded", registerCtaHandlers);
