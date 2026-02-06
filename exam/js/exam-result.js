(function () {
  const RESULTS_KEY = "spiExamResults";
  const REDIRECT_PATH = "select-mode.html";

  const dateEl = document.getElementById("metaDate");
  const modeEl = document.getElementById("metaMode");
  const categoryEl = document.getElementById("metaCategory");
  const correctEl = document.getElementById("correctCount");
  const totalEl = document.getElementById("totalCount");
  const accuracyEl = document.getElementById("accuracy");
  const desktopBodyEl = document.getElementById("answersBodyDesktop");
  const mobileBodyEl = document.getElementById("answersBodyMobile");

  function redirectToStart(message) {
    if (message) {
      window.alert(message);
    }
    window.location.href = REDIRECT_PATH;
  }

  function formatExamDate(timestamp) {
    if (typeof timestamp !== "number" || Number.isNaN(timestamp)) {
      return "----.--.--";
    }
    const date = new Date(timestamp);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}.${month}.${day}`;
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

  function getStatus(answer) {
    if (answer && answer.isCorrect === true) {
      return "correct";
    }
    if (answer && typeof answer.selectedIndex === "number") {
      return "incorrect";
    }
    return "unanswered";
  }

  function getStatusIcon(status) {
    if (status === "correct") {
      return "✓";
    }
    if (status === "incorrect") {
      return "×";
    }
    return "-";
  }

  function createEmptyRow(target, colSpan) {
    const row = document.createElement("tr");
    const cell = document.createElement("td");
    cell.colSpan = colSpan;
    cell.textContent = "受験結果が見つかりませんでした。";
    row.appendChild(cell);
    target.appendChild(row);
  }

  function createDesktopRow(answer, question, index) {
    const status = getStatus(answer);
    const row = document.createElement("tr");

    const cells = [
      `${index + 1}`,
      getOptionText(question, answer ? answer.selectedIndex : null),
      getOptionText(question, answer ? answer.correctIndex : null),
      null,
      formatTime(answer ? answer.timeSpentSec : null),
    ];

    cells.forEach((value, cellIndex) => {
      const cell = document.createElement("td");
      if (cellIndex === 3) {
        const mark = document.createElement("span");
        mark.className = `judgement ${status}`;
        mark.textContent = getStatusIcon(status);
        cell.appendChild(mark);
      } else {
        cell.textContent = value;
      }
      row.appendChild(cell);
    });

    return row;
  }

  function createMobileRows(answer, question, index) {
    const status = getStatus(answer);
    const summaryRow = document.createElement("tr");
    const detailRow = document.createElement("tr");
    detailRow.className = "mobile-detail-row";

    const numberCell = document.createElement("td");
    numberCell.textContent = `${index + 1}`;
    summaryRow.appendChild(numberCell);

    const statusCell = document.createElement("td");
    const mark = document.createElement("span");
    mark.className = `judgement ${status}`;
    mark.textContent = getStatusIcon(status);
    statusCell.appendChild(mark);
    summaryRow.appendChild(statusCell);

    const timeCell = document.createElement("td");
    timeCell.textContent = formatTime(answer ? answer.timeSpentSec : null);
    summaryRow.appendChild(timeCell);

    const toggleCell = document.createElement("td");
    const toggle = document.createElement("button");
    toggle.className = "mobile-toggle";
    toggle.type = "button";
    toggle.textContent = index === 0 ? "⌃" : "⌄";
    toggleCell.appendChild(toggle);
    summaryRow.appendChild(toggleCell);

    const detailCell = document.createElement("td");
    detailCell.colSpan = 4;

    const userLine = document.createElement("div");
    userLine.className = "mobile-answer-line";
    userLine.innerHTML = `<span class="mobile-answer-label">あなたの回答</span><span>${getOptionText(question, answer ? answer.selectedIndex : null)}</span>`;

    const correctLine = document.createElement("div");
    correctLine.className = "mobile-answer-line";
    correctLine.innerHTML = `<span class="mobile-answer-label">正解</span><span>${getOptionText(question, answer ? answer.correctIndex : null)}</span>`;

    detailCell.appendChild(userLine);
    detailCell.appendChild(correctLine);
    detailRow.appendChild(detailCell);

    if (index !== 0) {
      detailRow.hidden = true;
    }

    toggle.addEventListener("click", () => {
      const isHidden = detailRow.hidden;
      detailRow.hidden = !isHidden;
      toggle.textContent = isHidden ? "⌃" : "⌄";
    });

    return [summaryRow, detailRow];
  }

  function renderAnswers(result) {
    const answers = Array.isArray(result.answers) ? result.answers : [];
    const questions = Array.isArray(result.questions) ? result.questions : [];

    desktopBodyEl.innerHTML = "";
    mobileBodyEl.innerHTML = "";

    if (answers.length === 0) {
      createEmptyRow(desktopBodyEl, 5);
      createEmptyRow(mobileBodyEl, 4);
      return;
    }

    answers.forEach((answer, index) => {
      const question = questions[index] || null;
      desktopBodyEl.appendChild(createDesktopRow(answer, question, index));
      const mobileRows = createMobileRows(answer, question, index);
      mobileRows.forEach((row) => mobileBodyEl.appendChild(row));
    });
  }

  function render(result) {
    dateEl.textContent = formatExamDate(result.completedAt);
    modeEl.textContent = result.mode || result.title || "かんたん受験";
    categoryEl.textContent = result.category || "言語";

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
