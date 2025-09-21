(function () {
  const RESULTS_KEY = "spiExamResults";
  const REDIRECT_PATH = "select-mode.html";

  const titleEl = document.getElementById("resultTitle");
  const metaEl = document.getElementById("resultMeta");
  const correctEl = document.getElementById("correctCount");
  const totalEl = document.getElementById("totalCount");
  const accuracyEl = document.getElementById("accuracy");
  const answersBodyEl = document.getElementById("answersBody");

  function redirectToStart(message) {
    if (message) {
      window.alert(message);
    }
    window.location.href = REDIRECT_PATH;
  }

  function formatTime(seconds) {
    if (typeof seconds !== "number" || Number.isNaN(seconds)) {
      return "-";
    }
    return `${seconds}秒`;
  }

  function getOptionText(question, index) {
    if (!question || !Array.isArray(question.options)) {
      return "-";
    }
    if (typeof index !== "number" || index < 0 || index >= question.options.length) {
      return "-";
    }
    return question.options[index];
  }

  function createBadge(status) {
    const span = document.createElement("span");
    span.classList.add("answer-badge");
    if (status === "correct") {
      span.classList.add("correct");
      span.textContent = "正解";
    } else if (status === "incorrect") {
      span.classList.add("incorrect");
      span.textContent = "不正解";
    } else {
      span.classList.add("unanswered");
      span.textContent = "未回答";
    }
    return span;
  }

  function renderAnswers(result) {
    const answers = Array.isArray(result.answers) ? result.answers : [];
    const questions = Array.isArray(result.questions) ? result.questions : [];
    answersBodyEl.innerHTML = "";
    if (answers.length === 0) {
      const row = document.createElement("tr");
      const cell = document.createElement("td");
      cell.colSpan = 5;
      cell.textContent = "受験結果が見つかりませんでした。";
      row.appendChild(cell);
      answersBodyEl.appendChild(row);
      return;
    }

    answers.forEach((answer, index) => {
      const question = questions[index] || null;
      const row = document.createElement("tr");
      let status = "unanswered";
      if (answer && answer.isCorrect === true) {
        status = "correct";
      } else if (answer && typeof answer.selectedIndex === "number") {
        status = "incorrect";
      }
      row.classList.add(status);

      const numberCell = document.createElement("td");
      numberCell.textContent = `Q${index + 1}`;
      row.appendChild(numberCell);

      const userCell = document.createElement("td");
      userCell.innerHTML = getOptionText(question, answer ? answer.selectedIndex : null);
      row.appendChild(userCell);

      const correctCell = document.createElement("td");
      correctCell.innerHTML = getOptionText(question, answer ? answer.correctIndex : null);
      row.appendChild(correctCell);

      const timeCell = document.createElement("td");
      timeCell.textContent = formatTime(answer ? answer.timeSpentSec : null);
      row.appendChild(timeCell);

      const statusCell = document.createElement("td");
      statusCell.appendChild(createBadge(status));
      row.appendChild(statusCell);

      answersBodyEl.appendChild(row);
    });
  }

  function render(result) {
    titleEl.textContent = result.title || "受験結果";
    const mode = result.mode ? `モード: ${result.mode}` : "";
    const category = result.category ? `カテゴリ: ${result.category}` : "";
    const parts = [mode, category].filter(Boolean);
    metaEl.textContent = parts.length > 0 ? parts.join(" / ") : "結果の概要";

    const total = typeof result.total === "number" ? result.total : (Array.isArray(result.questions) ? result.questions.length : 0);
    const correct = typeof result.correct === "number" ? result.correct : 0;
    correctEl.textContent = String(correct);
    totalEl.textContent = String(total);
    const accuracy = total > 0 ? Math.round((correct / total) * 100) : 0;
    accuracyEl.textContent = `${accuracy}%`;

    renderAnswers(result);
  }

  function init() {
    try {
      const raw = sessionStorage.getItem(RESULTS_KEY);
      if (!raw) {
        redirectToStart("受験結果が見つかりませんでした。もう一度受験を開始してください。");
        return;
      }
      const result = JSON.parse(raw);
      if (!result || typeof result !== "object") {
        redirectToStart("受験結果の読み込みに失敗しました。");
        return;
      }
      render(result);
    } catch (error) {
      console.error(error);
      redirectToStart("受験結果の読み込みに失敗しました。");
    }
  }

  init();
})();
