(function () {
  const GAS_URL = "https://script.google.com/macros/s/AKfycbzJZdmfsPzYeDkkAUBVdS0694mLUe7fXJLB7QZ_TLUh9yu2WwRB3pVAQLrW4AtNjfX9Og/exec";
  const nativeSubmit = HTMLFormElement.prototype.submit;

  function triggerGas(recipient) {
    if (!recipient) {
      return Promise.resolve();
    }

    const url = new URL(GAS_URL);
    url.searchParams.set("recipient", recipient);

    return fetch(url.toString(), {
      method: "GET",
      mode: "no-cors",
    }).catch((error) => {
      console.error("Failed to trigger GAS", error);
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    document.querySelectorAll("form[data-recipient]").forEach((form) => {
      form.addEventListener("submit", (event) => {
        event.preventDefault();
        const recipient = form.dataset.recipient || "";

        triggerGas(recipient).finally(() => {
          nativeSubmit.call(form);
        });
      });
    });
  });
})();
