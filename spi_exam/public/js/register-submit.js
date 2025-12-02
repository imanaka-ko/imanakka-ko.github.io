(function () {
  const GAS_URL = "https://script.google.com/macros/s/AKfycbxY-yB7QNr3S0AtpmiVPVezGlTBfuZEWdmGSjcYVTR5dTAYfwITV2z9bWxQk7JVg9-6/exec";
  const KOKOSHIRO_GAS_URL =
    "https://script.google.com/macros/s/AKfycbzDJK72ykr5Wk42jqh2wiFu8NM_XPLki6xOK-NEz-0MI0IoXKH9Mb2N6QHp4BpyT3If/exec";
  const nativeSubmit = HTMLFormElement.prototype.submit;
  const SUBMISSION_STORAGE_KEY = "registerSubmissionData";

  function readSubmissionData() {
    try {
      if (typeof window === "undefined" || !window.sessionStorage) {
        return null;
      }
      const raw = sessionStorage.getItem(SUBMISSION_STORAGE_KEY);
      if (!raw) {
        return null;
      }
      return JSON.parse(raw);
    } catch (error) {
      console.warn("Failed to read stored submission data", error);
      return null;
    }
  }

  function clearSubmissionData() {
    try {
      if (typeof window !== "undefined" && window.sessionStorage) {
        sessionStorage.removeItem(SUBMISSION_STORAGE_KEY);
      }
    } catch (error) {
      console.warn("Failed to clear stored submission data", error);
    }

    try {
      if (typeof window !== "undefined" && "registerSubmissionData" in window) {
        delete window.registerSubmissionData;
      }
    } catch (error) {
      if (typeof window !== "undefined") {
        window.registerSubmissionData = undefined;
      }
    }

    submissionDataCache = null;
  }

  let submissionDataCache = readSubmissionData();

  if (submissionDataCache) {
    window.registerSubmissionData = submissionDataCache;
    try {
      document.dispatchEvent(
        new CustomEvent("register:submission-data", { detail: submissionDataCache })
      );
    } catch (error) {
      console.warn("Failed to dispatch submission data event", error);
    }
  }

  function getSubmissionData() {
    if (!submissionDataCache) {
      submissionDataCache = readSubmissionData();
      if (submissionDataCache) {
        window.registerSubmissionData = submissionDataCache;
      }
    }
    return submissionDataCache;
  }

  function triggerGas(recipients, submissionData) {
    // ① まず配列からココシロのアドレスを取り除く
    if (Array.isArray(recipients)) {
      recipients = recipients.filter(
        (email) => email !== "kr.matsui@kokoshiro.co.jp"
      );
    }

    // ② フィルタ後に 1 件も残っていなければ、メインGASは呼ばない
    if (!Array.isArray(recipients) || recipients.length === 0) {
      return Promise.resolve();
    }

    // ③ ここから先は「共通の外部サービスが1つ以上ある場合のみ」
    const payload = { recipients };

    if (submissionData && typeof submissionData === "object") {
      payload.registration = submissionData;
    }

    return fetch(GAS_URL, {
      method: "POST",
      mode: "no-cors",
      body: JSON.stringify(payload),
    }).catch((error) => {
      console.error("Failed to trigger GAS", error);
    });
  }

  function triggerKokoshiroGasIfNeeded(form, submissionData) {
    const scope = form.closest(".wrapper") || document;
    const kokoshiroCheckbox = scope.querySelector(
      "input[type=\"checkbox\"][data-kokoshiro]"
    );
    if (!kokoshiroCheckbox || !kokoshiroCheckbox.checked) {
      return Promise.resolve();
    }

    const url = form.dataset.kokoshiroGasUrl || KOKOSHIRO_GAS_URL;
    if (!url) {
      return Promise.resolve();
    }

    const payload = submissionData && typeof submissionData === "object"
      ? { registration: submissionData }
      : undefined;

    return fetch(url, {
      method: "POST",
      mode: "no-cors",
      body: payload ? JSON.stringify(payload) : undefined,
    }).catch((error) => {
      console.error("Failed to trigger Kokoshiro GAS", error);
    });
  }

  function collectRecipients(form) {
    const scope = form.closest(".wrapper") || document;
    const checkboxes = scope.querySelectorAll(
      "input[type=\"checkbox\"][data-recipient-email]"
    );
    const hasRecipientCheckboxes = checkboxes.length > 0;
    const recipients = new Set();

    checkboxes.forEach((checkbox) => {
      if (!checkbox.checked) {
        return;
      }
      const email = checkbox.dataset.recipientEmail;
      if (email) {
        email
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean)
          .forEach((address) => recipients.add(address));
      }
    });

    if (!hasRecipientCheckboxes && form.dataset.recipient) {
      form.dataset.recipient
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean)
        .forEach((email) => recipients.add(email));
    }

    return {
      recipients: Array.from(recipients),
      hasRecipientCheckboxes,
    };
  }

  document.addEventListener("DOMContentLoaded", () => {
    document.querySelectorAll("form[data-recipient]").forEach((form) => {
      form.addEventListener("submit", (event) => {
        event.preventDefault();
        const { recipients, hasRecipientCheckboxes } = collectRecipients(form);

        if (hasRecipientCheckboxes && recipients.length === 0) {
          clearSubmissionData();
          nativeSubmit.call(form);
          return;
        }

        const submissionData = getSubmissionData();
        if (!submissionData) {
          console.warn("No submission data found for register page.");
        }

        const submitButton = form.querySelector(
          "button[type=\"submit\"], input[type=\"submit\"]"
        );
        let originalLabel;
        if (submitButton) {
          if (submitButton.tagName === "BUTTON") {
            originalLabel = submitButton.textContent;
            submitButton.textContent = "送信中…";
          } else {
            originalLabel = submitButton.value;
            submitButton.value = "送信中…";
          }
          submitButton.disabled = true;
        }

        Promise.all([
          triggerGas(recipients, submissionData),
          triggerKokoshiroGasIfNeeded(form, submissionData),
        ]).finally(() => {
          clearSubmissionData();
          if (submitButton) {
            if (submitButton.tagName === "BUTTON") {
              submitButton.textContent = originalLabel || "";
            } else {
              submitButton.value = originalLabel || "";
            }
            submitButton.disabled = false;
          }
          nativeSubmit.call(form);
        });
      });
    });
  });
})();
