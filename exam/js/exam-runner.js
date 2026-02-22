(function () {
  const STORAGE_KEY = "spiExamState";
  const RESULTS_KEY = "spiExamResults";
  const REDIRECT_PATH = "select-mode.html";
  const RESULT_PAGE_PATH = "result.html";
  const SUBMISSION_FORM_PATH = "../submission_form.html";
  const LOGIN_CHECK_TIMEOUT_MS = 3000;

  let loginCheckPromise = null;

  const examPage = document.getElementById("examPage");
  const subjectEl = document.getElementById("examSubject");
  const descriptionEl = document.getElementById("examDescription");
  const questionTitleEl = document.getElementById("questionTitle");
  const questionTextEl = document.getElementById("questionText");
  const optionsListEl = document.getElementById("optionsList");
  const progressBarsEl = document.getElementById("progressBars");
  const timerBarEl = document.getElementById("timerBar");
  const timerTextEl = document.getElementById("timerText");
  const timerFillEl = document.getElementById("timerFill");
  const formEl = document.getElementById("questionForm");
  const nextButtonEl = document.getElementById("nextButton");
  const statusMessageEl = document.getElementById("statusMessage");

  let state = null;
  let timerId = null;
  let timerStartedAt = null;
  let timeRemaining = 0;

  function redirectToStart(message) {
    if (message) {
      window.alert(message);
    }
    window.location.href = REDIRECT_PATH;
  }

  function resolveFirebaseModuleUrl() {
    try {
      const url = new URL("../auth/js/firebase.js", window.location.href);
      return url.href;
    } catch (error) {
      console.warn("Failed to resolve firebase module URL", error);
      return "../auth/js/firebase.js";
    }
  }

  async function loadLoginStatus() {
    const firebaseModuleUrl = resolveFirebaseModuleUrl();
    const firebaseAuthUrl = "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
    try {
      const [firebaseModule, authModule] = await Promise.all([
        import(firebaseModuleUrl),
        import(firebaseAuthUrl),
      ]);
      const { auth } = firebaseModule;
      const { onAuthStateChanged } = authModule;
      if (!auth || typeof onAuthStateChanged !== "function") {
        return false;
      }
      return await new Promise((resolve) => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
          unsubscribe();
          resolve(Boolean(user));
        });
      });
    } catch (error) {
      console.warn("Failed to determine login status", error);
      return false;
    }
  }

  function shouldShowResultPage() {
    if (!loginCheckPromise) {
      loginCheckPromise = Promise.race([
        loadLoginStatus(),
        new Promise((resolve) => {
          window.setTimeout(() => resolve(false), LOGIN_CHECK_TIMEOUT_MS);
        }),
      ]);
    }
    return loginCheckPromise;
  }

  function loadState() {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (!raw) {
        return null;
      }
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object") {
        return null;
      }
      if (!Array.isArray(parsed.questions) || parsed.questions.length === 0) {
        return null;
      }
      if (typeof parsed.currentIndex !== "number") {
        parsed.currentIndex = 0;
      }
      if (!Array.isArray(parsed.answers)) {
        parsed.answers = [];
      }
      return parsed;
    } catch (error) {
      console.error("failed to parse state", error);
      return null;
    }
  }

  function saveState() {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  function renderProgressBars() {
    const total = state.questions.length;
    progressBarsEl.innerHTML = "";
    for (let i = 0; i < total; i += 1) {
      const bar = document.createElement("div");
      bar.className = "bar";
      if (i < state.currentIndex) {
        bar.classList.add("done");
      } else if (i === state.currentIndex) {
        bar.classList.add("current");
      }
      progressBarsEl.appendChild(bar);
    }
  }

  function updateTimerDisplay() {
    timerTextEl.textContent = String(Math.max(0, timeRemaining));
    const progressValue = 1 - timeRemaining / state.timePerQuestionSec;
    const width = Math.max(0, Math.min(1, 1 - progressValue));
    timerFillEl.style.width = `${width * 100}%`;
  }

  function stopTimer() {
    if (timerId) {
      clearInterval(timerId);
      timerId = null;
    }
  }

  function handleTimeout() {
    stopTimer();
    examPage.classList.add("state-submitting");
    const elapsed = state.timePerQuestionSec;
    recordAnswer(null, elapsed);
  }

  function tick() {
    timeRemaining -= 1;
    if (timeRemaining <= 0) {
      updateTimerDisplay();
      handleTimeout();
      return;
    }
    updateTimerDisplay();
  }

  function startTimer() {
    stopTimer();
    timeRemaining = state.timePerQuestionSec;
    timerStartedAt = Date.now();
    updateTimerDisplay();
    timerId = setInterval(tick, 1000);
  }

  function clearStatus() {
    statusMessageEl.classList.add("hidden");
    statusMessageEl.textContent = "";
  }

  function setStatus(message) {
    statusMessageEl.textContent = message;
    statusMessageEl.classList.remove("hidden");
  }

  function renderQuestion() {
    clearStatus();
    const { currentIndex, questions, timePerQuestionSec } = state;
    if (currentIndex >= questions.length) {
      finishExam();
      return;
    }
    examPage.classList.remove("state-answered", "state-submitting");
    examPage.classList.add("state-unanswered");

    renderProgressBars();
    const question = questions[currentIndex];
    subjectEl.textContent = state.title || "さっくとSPI";
    descriptionEl.textContent = state.description || "設問に回答してください。";
    questionTitleEl.textContent = `問題 ${currentIndex + 1}/${questions.length}`;
    questionTextEl.innerHTML = question.prompt_html || "";

    optionsListEl.innerHTML = "";
    if (!Array.isArray(question.options) || question.options.length === 0) {
      setStatus("選択肢を読み込めませんでした。");
      nextButtonEl.disabled = true;
      timerBarEl.dataset.hidden = "true";
      return;
    }

    const fieldsetId = `question-${currentIndex}`;
    question.options.forEach((option, index) => {
      const label = document.createElement("label");
      label.className = "option-item";
      const input = document.createElement("input");
      input.type = "radio";
      input.name = "option";
      input.value = String(index);
      input.id = `${fieldsetId}-option-${index}`;
      const span = document.createElement("span");
      span.innerHTML = option;
      label.appendChild(input);
      label.appendChild(span);
      label.addEventListener("change", () => {
        nextButtonEl.disabled = false;
        examPage.classList.remove("state-unanswered");
        examPage.classList.add("state-answered");
        const labels = optionsListEl.querySelectorAll(".option-item");
        labels.forEach((item) => item.classList.remove("selected"));
        label.classList.add("selected");
      });
      optionsListEl.appendChild(label);
    });

    nextButtonEl.disabled = true;
    nextButtonEl.textContent = currentIndex + 1 === questions.length ? "結果を見る" : "次へ進む";
    timerBarEl.dataset.hidden = "false";
    timerBarEl.setAttribute("data-hidden", "false");
    startTimer();
  }

  function recordAnswer(selectedIndex, elapsedSeconds) {
    const question = state.questions[state.currentIndex];
    const answerIndex = typeof question.answer_index === "number" ? question.answer_index : null;
    const isCorrect = typeof selectedIndex === "number" && selectedIndex === answerIndex;
    state.answers.push({
      questionId: question.id || `Q${state.currentIndex + 1}`,
      selectedIndex,
      correctIndex: answerIndex,
      isCorrect,
      timeSpentSec: elapsedSeconds,
    });
    state.currentIndex += 1;
    saveState();
    if (state.currentIndex >= state.questions.length) {
      finishExam();
    } else {
      renderQuestion();
    }
  }

  async function finishExam() {
    stopTimer();
    const total = state.questions.length;
    const correct = state.answers.filter((entry) => entry.isCorrect).length;
    const result = {
      questionSetId: state.questionSetId,
      title: state.title,
      description: state.description,
      mode: state.mode,
      category: state.category,
      total,
      correct,
      answers: state.answers,
      questions: state.questions,
      completedAt: Date.now(),
      timePerQuestionSec: state.timePerQuestionSec,
    };
    sessionStorage.setItem(RESULTS_KEY, JSON.stringify(result));
    sessionStorage.removeItem(STORAGE_KEY);
    const showResult = await shouldShowResultPage();
    window.location.href = showResult ? RESULT_PAGE_PATH : SUBMISSION_FORM_PATH;
  }

  function handleSubmit(event) {
    event.preventDefault();
    if (nextButtonEl.disabled) {
      return;
    }
    stopTimer();
    examPage.classList.add("state-submitting");
    let selectedIndex = null;
    const selectedInput = formEl.querySelector('input[name="option"]:checked');
    if (selectedInput) {
      selectedIndex = Number.parseInt(selectedInput.value, 10);
    }
    const elapsedMs = Date.now() - (timerStartedAt || Date.now());
    const elapsedSeconds = Math.min(state.timePerQuestionSec, Math.max(0, Math.round(elapsedMs / 1000)));
    recordAnswer(Number.isInteger(selectedIndex) ? selectedIndex : null, elapsedSeconds);
  }

  function init() {
    if (!examPage) {
      return;
    }
    state = loadState();
    if (!state) {
      redirectToStart("受験セッションが見つかりませんでした。改めて受験内容を選択してください。");
      return;
    }
    formEl.addEventListener("submit", handleSubmit);
    renderQuestion();
  }

  init();
})();
