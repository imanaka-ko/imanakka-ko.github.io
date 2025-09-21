// spi_exam/js/exam.js
const qs   = new URLSearchParams(location.search);
const slug = qs.get("question_set_id");
const app  = document.getElementById("app");
const INDEX_URL = app.dataset.index || "../data/exams/index.json";
const STATE_KEY = "spi_exam_state_v1";

let exam = null;         // JSON 本体
let meta = null;         // index.json の項目
let timer = null;        // setInterval のハンドル
let timerStart = 0;      // この問題のカウントダウン基準時刻
let state = null;        // { slug, currentIndex, answers[], timePerQuestionSec }

main().catch(err => {
  console.error(err);
  renderError("問題データの読み込みに失敗しました。");
});

async function main() {
  if (!slug) return renderError("無効な問題セットです。");
  const index = await fetchJSON(INDEX_URL);
  meta = index?.[slug];
  if (!meta || !meta.path) return renderError("無効な問題セットです。");

  // exam JSON をロード（exam.html から data/exams/ への相対）
  exam = await fetchJSON(`../data/exams/${meta.path}`);
  if (!validateExam(exam, slug)) return renderError("問題データが不正です。");

  // セッション相当（前回の続きがあれば再開）
  state = restoreState(slug, exam.time_per_question_sec);
  renderQuestion();
}

function restoreState(slug, timePerQ) {
  const raw = sessionStorage.getItem(STATE_KEY);
  if (raw) {
    try {
      const s = JSON.parse(raw);
      if (s.slug === slug && Array.isArray(s.answers)) return s;
    } catch(_) {}
  }
  const fresh = {
    slug, currentIndex: 0, answers: [],
    timePerQuestionSec: timePerQ
  };
  sessionStorage.setItem(STATE_KEY, JSON.stringify(fresh));
  return fresh;
}

function saveState() {
  sessionStorage.setItem(STATE_KEY, JSON.stringify(state));
}

function renderError(msg) {
  app.innerHTML = `
    <div class="error">${escapeHTML(msg)}</div>
    <p style="margin-top:1rem"><a href="./select-mode.html">選択画面へ戻る</a></p>
  `;
}

function renderQuestion() {
  clearTimer();

  if (state.currentIndex >= exam.questions.length) {
    return renderResult();
  }

  const total = exam.questions.length;
  const q = exam.questions[state.currentIndex];

  const bars = Array.from({length: total}, (_, i) =>
    `<div class="bar${i < state.currentIndex ? " done" : (i === state.currentIndex ? " current" : " pending")}"></div>`
  ).join("");

  const options = q.options.map((opt, i) => `
    <label class="option-item">
      <input type="radio" name="option" value="${i}">
      <span>${escapeHTML(String(opt))}</span>
    </label>
  `).join("");

  app.innerHTML = `
    <div class="exam-header">
      <div class="subject">${escapeHTML(exam.title || meta.title || "")}</div>
      <a class="close-btn" href="./select-mode.html" aria-label="close">&times;</a>
    </div>

    <div class="timer-wrap" style="justify-content:space-between;margin:.5rem 0 1rem">
      <div>
        <div class="label" style="font-size:.8rem;color:#6b7280">回答時間</div>
        <div class="progress-bars">${bars}</div>
      </div>

      <svg class="timer-svg" width="80" height="80" viewBox="0 0 80 80" role="img" aria-label="残り時間">
        <circle class="timer-bg" cx="40" cy="40" r="36"></circle>
        <circle class="timer-progress" id="timerProgress" cx="40" cy="40" r="36"></circle>
        <text class="timer-text" id="timerText" x="40" y="43" text-anchor="middle">${state.timePerQuestionSec}</text>
      </svg>
    </div>

    <div class="question-block">
      <p class="question-title">問題 ${state.currentIndex + 1}/${total}</p>
      <div class="question-text" id="prompt"></div>
    </div>

    <form id="question-form">
      <div class="options-list">${options}</div>
      <button type="submit" class="next-button" id="nextButton" disabled>次へ進む</button>
    </form>
  `;

  // prompt_html は既存データを想定（信頼済みソース）。必要なら sanitize を追加。
  document.getElementById("prompt").innerHTML = q.prompt_html;

  const form = document.getElementById("question-form");
  const nextBtn = document.getElementById("nextButton");
  let chosen = null;

  form.querySelectorAll('input[type="radio"]').forEach(r => {
    r.addEventListener("change", () => {
      chosen = Number(r.value);
      nextBtn.disabled = false;
      form.querySelectorAll(".option-item").forEach(el => el.classList.remove("selected"));
      r.closest(".option-item").classList.add("selected");
    });
  });

  form.addEventListener("submit", e => {
    e.preventDefault();
    state.answers[state.currentIndex] = chosen ?? null;
    state.currentIndex += 1;
    saveState();
    renderQuestion();
  });

  // カウントダウン
  startTimer(state.timePerQuestionSec, () => {
    // 時間切れ：未選択なら null のまま記録
    if (state.answers[state.currentIndex] == null) {
      state.answers[state.currentIndex] = null;
    }
    state.currentIndex += 1;
    saveState();
    renderQuestion();
  });
}

// spi_exam/js/exam.js の renderResult() を丸ごと置き換え
function renderResult() {
  const total = exam.questions.length;
  let correct = 0;
  for (let i = 0; i < total; i++) {
    if (state.answers[i] === exam.questions[i].answer_index) correct++;
  }

  const result = {
    slug: state.slug,
    title: exam.title || meta?.title || "",
    score: correct,
    total,
    finishedAt: new Date().toISOString()
  };

  // 結果を保存して受験状態はクリア
  sessionStorage.setItem("spi_exam_result_v1", JSON.stringify(result));
  sessionStorage.removeItem("spi_exam_state_v1");

  // 結果ページへ
  location.assign("./results.html");
}

function startTimer(seconds, onExpire) {
  const text = document.getElementById("timerText");
  const circle = document.getElementById("timerProgress");
  const r = 36;
  const C = 2 * Math.PI * r;
  circle.style.strokeDasharray = `${C}`;
  let remaining = seconds;
  timerStart = Date.now();

  function tick() {
    const elapsed = Math.floor((Date.now() - timerStart) / 1000);
    remaining = Math.max(0, seconds - elapsed);
    text.textContent = String(remaining);
    const ratio = 1 - (remaining / seconds);
    circle.style.strokeDashoffset = String(C * ratio);
    if (remaining <= 0) {
      clearTimer();
      onExpire();
    }
  }
  tick();
  timer = setInterval(tick, 250); // 見た目なめらかに 250ms
}

function clearTimer() {
  if (timer) clearInterval(timer);
  timer = null;
}

async function fetchJSON(url) {
  const res = await fetch(url, {cache: "no-store"});
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.json();
}

function validateExam(data, slug) {
  // Python版の _validate_exam の要点だけチェック
  if (data?.version !== 1) return false;
  if (data?.slug !== slug) return false;
  if (!data?.title || typeof data.title !== "string") return false;
  if (typeof data.time_per_question_sec !== "number" || data.time_per_question_sec < 1 || data.time_per_question_sec > 600) return false;
  if (!Array.isArray(data.questions) || data.questions.length === 0) return false;
  for (const q of data.questions) {
    if (!q || !Array.isArray(q.options) || q.options.length < 2) return false;
    if (typeof q.answer_index !== "number" || q.answer_index < 0 || q.answer_index >= q.options.length) return false;
    if (typeof q.prompt_html !== "string") return false;
  }
  return true;
}

function escapeHTML(s) {
  return s.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

// 離脱注意（従来の注意書き相当）
window.addEventListener("beforeunload", (e) => {
  // 受験中のみ警告
  if (exam && state && state.currentIndex < exam.questions.length) {
    e.preventDefault();
    e.returnValue = "";
  }
});
