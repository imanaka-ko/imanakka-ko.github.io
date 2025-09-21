// spi_exam/js/results.js
const el = document.getElementById("content");
const raw = sessionStorage.getItem("spi_exam_result_v1");

if (!raw) {
  el.innerHTML = `
    <div class="error">結果データが見つかりませんでした。</div>
    <p style="margin-top:1rem">
      <a class="btn gray" href="./select-mode.html">受験メニューへ</a>
    </p>`;
} else {
  try {
    const r = JSON.parse(raw);
    el.innerHTML = `
      <div class="result-box">
        <p style="margin:.25rem 0 .75rem">${escapeHTML(r.title || "模擬試験")}</p>
        <p>正解数: <strong>${r.score}</strong> / ${r.total} 問</p>
      </div>
      <div style="display:flex;gap:.75rem;flex-wrap:wrap">
        <a class="btn" href="./select-mode.html">もう一度受験する</a>
        <a class="btn gray" href="../index.html">TOPへ</a>
      </div>
    `;
    // 必要ならここで sessionStorage から結果を削除
    // sessionStorage.removeItem("spi_exam_result_v1");
  } catch (e) {
    el.innerHTML = `
      <div class="error">結果データの読み込みに失敗しました。</div>
      <p style="margin-top:1rem">
        <a class="btn gray" href="./select-mode.html">受験メニューへ</a>
      </p>`;
  }
}

function escapeHTML(s) {
  return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
