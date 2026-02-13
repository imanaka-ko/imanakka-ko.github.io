(function () {
  const INDEX_URL = "../data/index.json";
  const DATA_ROOT = "../data/";
  const STORAGE_KEY = "spiExamState";
  const RESULTS_KEY = "spiExamResults";
  let examIndex = null;

  async function loadExamIndex() {
    if (examIndex) {
      return examIndex;
    }
    const response = await fetch(INDEX_URL, { cache: "no-store" });
    if (!response.ok) {
      throw new Error("index load failed");
    }
    examIndex = await response.json();
    return examIndex;
  }

  async function loadExamData(path) {
    const response = await fetch(DATA_ROOT + path, { cache: "no-store" });
    if (!response.ok) {
      throw new Error("exam load failed");
    }
    return await response.json();
  }

  function validateExamData(data, slug) {
    if (!data || typeof data !== "object") {
      return false;
    }
    if (data.slug !== slug || data.version !== 1) {
      return false;
    }
    if (!Array.isArray(data.questions) || data.questions.length === 0) {
      return false;
    }
    if (typeof data.time_per_question_sec !== "number" || data.time_per_question_sec <= 0) {
      return false;
    }
    return true;
  }

  function showErrorAndRedirect(message) {
    window.alert(message);
    window.location.href = "../select-mode.html";
  }

  async function handleStart(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const submitButton = form.querySelector("button[type='submit']");
    const slugInput = form.querySelector('input[name="question_set_id"]');
    const slug = slugInput ? slugInput.value.trim() : "";
    if (!slug) {
      showErrorAndRedirect("無効な問題セットです。");
      return;
    }
    if (submitButton) {
      submitButton.disabled = true;
    }
    try {
      const index = await loadExamIndex();
      const meta = index[slug];
      if (!meta) {
        showErrorAndRedirect("無効な問題セットです。");
        return;
      }
      const data = await loadExamData(meta.path);
      if (!validateExamData(data, slug)) {
        showErrorAndRedirect("問題データの読み込みに失敗しました。");
        return;
      }
      const state = {
        questionSetId: slug,
        currentIndex: 0,
        answers: [],
        timePerQuestionSec: data.time_per_question_sec,
        questions: data.questions,
        title: data.title,
        description: data.description,
        mode: data.mode,
        category: data.category,
        startedAt: Date.now()
      };
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      sessionStorage.removeItem(RESULTS_KEY);
      window.location.href = "../exam.html";
    } catch (error) {
      console.error(error);
      showErrorAndRedirect("問題データの読み込みに失敗しました。");
    } finally {
      if (submitButton) {
        submitButton.disabled = false;
      }
    }
  }

  document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("start-exam-form");
    if (!form) {
      return;
    }
    form.addEventListener("submit", handleStart);
  });
})();
