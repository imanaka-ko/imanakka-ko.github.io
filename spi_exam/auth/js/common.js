export function $(selector, root=document){ return root.querySelector(selector); }
export function val(input){ return (input?.value || "").trim(); }
export function showToast(message){ alert(message); } // simple placeholder
export function bindForm(form, handler){
  form?.addEventListener("submit", async (e) => {
    e.preventDefault();
    try { await handler(new FormData(form)); }
    catch (err){ console.error(err); showToast(err.message || String(err)); }
  });
}
