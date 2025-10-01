(function () {
  const GAS_URL = "https://script.google.com/macros/s/AKfycbzJZdmfsPzYeDkkAUBVdS0694mLUe7fXJLB7QZ_TLUh9yu2WwRB3pVAQLrW4AtNjfX9Og/exec";
  const nativeSubmit = HTMLFormElement.prototype.submit;

  function triggerGas(recipients) {
    const url = new URL(GAS_URL);
    if (Array.isArray(recipients) && recipients.length > 0) {
      url.searchParams.set("recipient", recipients.join(","));
    }

    return fetch(url.toString(), {
      method: "GET",
      mode: "no-cors",
    }).catch((error) => {
      console.error("Failed to trigger GAS", error);
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
        recipients.add(email);
      }
    });

    if (!hasRecipientCheckboxes && form.dataset.recipient) {
      form.dataset.recipient
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean)
        .forEach((email) => recipients.add(email));
    }

    return Array.from(recipients);
  }

  document.addEventListener("DOMContentLoaded", () => {
    document.querySelectorAll("form[data-recipient]").forEach((form) => {
      form.addEventListener("submit", (event) => {
        event.preventDefault();
        const recipients = collectRecipients(form);

        triggerGas(recipients).finally(() => {
          nativeSubmit.call(form);
        });
      });
    });
  });
})();
