/**
 * Numle - Standalone Vanilla JS Game Engine
 */

(function () {
  "use strict";

  // --- Constants ---
  const MAX_ATTEMPTS = 6;
  const NUMBER_LENGTH = 4;
  const STORAGE_KEYS = {
    DAILY: "numle_daily_state",
    PRACTICE: "numle_practice_state",
    STATS: "numle_stats",
  };

  // Status priority for keyboard colors: correct > present > absent > unused
  const STATUS_PRIORITY = {
    correct: 3,
    present: 2,
    absent: 1,
    unused: 0,
  };

  // Precompute all valid 4-digit distinct numbers (1023 to 9876)
  const VALID_NUMBERS = (() => {
    const list = [];
    for (let num = 1000; num <= 9999; num++) {
      const digits = num.toString().split("");
      const unique = new Set(digits);
      if (unique.size === NUMBER_LENGTH) {
        list.push(num.toString());
      }
    }
    return list;
  })();

  // --- Seeded PRNG for deterministic daily puzzle ---
  function xmur3(str) {
    let h = 1779033703 ^ str.length;
    for (let i = 0; i < str.length; i++) {
      h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
      h = (h << 13) | (h >>> 19);
    }
    return function () {
      h = Math.imul(h ^ (h >>> 16), 2246822507);
      h = Math.imul(h ^ (h >>> 13), 3266489909);
      return (h ^= h >>> 16) >>> 0;
    };
  }

  function mulberry32(a) {
    return function () {
      let t = (a += 0x6d2b79f5);
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function getTodayKey() {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  function getFormattedDate(dateStr) {
    const [year, month, day] = (dateStr || getTodayKey()).split("-").map(Number);
    const d = new Date(year, month - 1, day);
    return d.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  }

  function getDailySecret(dateKey = getTodayKey()) {
    const seedGen = xmur3(`numle-${dateKey}`);
    const rng = mulberry32(seedGen());
    const randomIndex = Math.floor(rng() * VALID_NUMBERS.length);
    return VALID_NUMBERS[randomIndex];
  }

  function getRandomSecret() {
    const randomIndex = Math.floor(Math.random() * VALID_NUMBERS.length);
    return VALID_NUMBERS[randomIndex];
  }

  // --- Game Logic Helpers ---
  function validateGuess(guessStr) {
    if (!guessStr || guessStr.length !== NUMBER_LENGTH) {
      return { valid: false, message: `Must be exactly ${NUMBER_LENGTH} digits` };
    }
    if (guessStr[0] === "0") {
      return { valid: false, message: "First digit cannot be 0" };
    }
    const unique = new Set(guessStr.split(""));
    if (unique.size !== NUMBER_LENGTH) {
      return { valid: false, message: "Digits must all be distinct" };
    }
    return { valid: true };
  }

  function evaluateGuess(guessStr, solutionStr) {
    const results = Array(NUMBER_LENGTH).fill("absent");
    const guessArr = guessStr.split("");
    const solArr = solutionStr.split("");

    for (let i = 0; i < NUMBER_LENGTH; i++) {
      if (guessArr[i] === solArr[i]) {
        results[i] = "correct";
      } else if (solArr.includes(guessArr[i])) {
        results[i] = "present";
      } else {
        results[i] = "absent";
      }
    }
    return results;
  }

  function updateKeyboardStatuses(prevStatuses = {}, guessStr, evaluation) {
    const nextStatuses = { ...prevStatuses };
    for (let i = 0; i < guessStr.length; i++) {
      const digit = guessStr[i];
      const newStatus = evaluation[i];
      const currentStatus = nextStatuses[digit] || "unused";

      if (STATUS_PRIORITY[newStatus] > STATUS_PRIORITY[currentStatus]) {
        nextStatuses[digit] = newStatus;
      }
    }
    return nextStatuses;
  }

  // --- Storage ---
  const initialStats = {
    gamesPlayed: 0,
    gamesWon: 0,
    currentStreak: 0,
    maxStreak: 0,
    guessDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 },
    lastWonDate: null,
  };

  function loadStats() {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.STATS);
      if (!raw) return { ...initialStats };
      const parsed = JSON.parse(raw);
      return {
        ...initialStats,
        ...parsed,
        guessDistribution: {
          ...initialStats.guessDistribution,
          ...(parsed.guessDistribution || {}),
        },
      };
    } catch {
      return { ...initialStats };
    }
  }

  function saveStats(stats) {
    try {
      localStorage.setItem(STORAGE_KEYS.STATS, JSON.stringify(stats));
    } catch (e) {
      console.error(e);
    }
  }

  function loadDailyState(dateKey) {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.DAILY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      return parsed.dateKey === dateKey ? parsed : null;
    } catch {
      return null;
    }
  }

  function saveDailyState(state) {
    try {
      localStorage.setItem(STORAGE_KEYS.DAILY, JSON.stringify(state));
    } catch (e) {
      console.error(e);
    }
  }

  function loadPracticeState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.PRACTICE);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  function savePracticeState(state) {
    try {
      localStorage.setItem(STORAGE_KEYS.PRACTICE, JSON.stringify(state));
    } catch (e) {
      console.error(e);
    }
  }

  function clearPracticeState() {
    try {
      localStorage.removeItem(STORAGE_KEYS.PRACTICE);
    } catch (e) {
      console.error(e);
    }
  }

  // --- Game State Object ---
  const state = {
    gameMode: "daily", // "daily" | "practice"
    dateKey: getTodayKey(),
    stats: loadStats(),

    // Daily
    dailySecret: "",
    dailyGuesses: [],
    dailyEvaluations: [],
    dailyGameStatus: "IN_PROGRESS", // "IN_PROGRESS" | "WON" | "LOST"
    dailyKeyboardStatuses: {},

    // Practice
    practiceSecret: "",
    practiceGuesses: [],
    practiceEvaluations: [],
    practiceGameStatus: "IN_PROGRESS",
    practiceKeyboardStatuses: {},

    // Transient
    currentGuess: "",
    isRevealing: false,
  };

  // --- DOM Elements ---
  const boardEl = document.getElementById("board");
  const toastContainerEl = document.getElementById("toast-container");
  const modeDailyBtn = document.getElementById("mode-daily");
  const modePracticeBtn = document.getElementById("mode-practice");
  const btnHelp = document.getElementById("btn-help");
  const btnStats = document.getElementById("btn-stats");
  const btnNewPractice = document.getElementById("btn-new-practice");
  const helpModalEl = document.getElementById("help-modal");
  const statsModalEl = document.getElementById("stats-modal");
  const distributionBarsEl = document.getElementById("distribution-bars");
  const statsFooterEl = document.getElementById("stats-footer");
  const countdownContainerEl = document.getElementById("countdown-container");
  const countdownTimerEl = document.getElementById("countdown-timer");
  const btnPlayAgain = document.getElementById("btn-play-again");
  const btnShare = document.getElementById("btn-share");
  const shareBtnText = document.getElementById("share-btn-text");

  // --- Toast Manager ---
  function showToast(message, duration = 2200, type = "info") {
    const toast = document.createElement("div");
    toast.className = `toast-item ${type}`;
    toast.textContent = message;
    toast.addEventListener("click", () => toast.remove());

    toastContainerEl.appendChild(toast);

    setTimeout(() => {
      if (toast.parentNode) {
        toast.remove();
      }
    }, duration);
  }

  // --- Board Initialization ---
  function initBoardDOM() {
    boardEl.innerHTML = "";
    for (let r = 0; r < MAX_ATTEMPTS; r++) {
      const row = document.createElement("div");
      row.className = "board-row";
      row.id = `row-${r}`;

      for (let c = 0; c < NUMBER_LENGTH; c++) {
        const tile = document.createElement("div");
        tile.className = "board-tile empty";
        tile.id = `tile-${r}-${c}`;
        const content = document.createElement("span");
        content.className = "tile-content";
        tile.appendChild(content);
        row.appendChild(tile);
      }
      boardEl.appendChild(row);
    }
  }

  // --- Renderers ---
  function getActiveState() {
    const isPractice = state.gameMode === "practice";
    return {
      isPractice,
      secret: isPractice ? state.practiceSecret : state.dailySecret,
      guesses: isPractice ? state.practiceGuesses : state.dailyGuesses,
      evaluations: isPractice ? state.practiceEvaluations : state.dailyEvaluations,
      gameStatus: isPractice ? state.practiceGameStatus : state.dailyGameStatus,
      keyboardStatuses: isPractice
        ? state.practiceKeyboardStatuses
        : state.dailyKeyboardStatuses,
    };
  }

  function renderBoard() {
    const { guesses, evaluations, gameStatus } = getActiveState();
    const currentRowIndex = guesses.length;

    for (let r = 0; r < MAX_ATTEMPTS; r++) {
      const rowEl = document.getElementById(`row-${r}`);
      if (!rowEl) continue;

      if (r < guesses.length) {
        // Completed Row
        const guess = guesses[r];
        const evaluation = evaluations[r] || [];

        for (let c = 0; c < NUMBER_LENGTH; c++) {
          const tile = document.getElementById(`tile-${r}-${c}`);
          if (!tile) continue;
          const status = evaluation[c] || "absent";
          tile.className = `board-tile ${status}`;
          tile.querySelector(".tile-content").textContent = guess[c] || "";
        }
      } else if (r === currentRowIndex && gameStatus === "IN_PROGRESS") {
        // Active Row
        const chars = state.currentGuess.split("");
        for (let c = 0; c < NUMBER_LENGTH; c++) {
          const tile = document.getElementById(`tile-${r}-${c}`);
          if (!tile) continue;
          const char = chars[c] || "";
          const isPop = char !== "" && !tile.classList.contains("tbd");

          tile.className = `board-tile ${char ? "tbd" : "empty"} ${isPop ? "pop" : ""}`;
          tile.querySelector(".tile-content").textContent = char;
        }
      } else {
        // Future Empty Row
        for (let c = 0; c < NUMBER_LENGTH; c++) {
          const tile = document.getElementById(`tile-${r}-${c}`);
          if (!tile) continue;
          tile.className = "board-tile empty";
          tile.querySelector(".tile-content").textContent = "";
        }
      }
    }
  }

  function renderKeyboard() {
    const { keyboardStatuses, gameStatus } = getActiveState();
    const isDisabled = gameStatus !== "IN_PROGRESS" || state.isRevealing;

    document.querySelectorAll(".keyboard-key").forEach((keyEl) => {
      const keyVal = keyEl.getAttribute("data-key");
      keyEl.disabled = isDisabled;

      if (keyVal !== "Enter" && keyVal !== "Backspace") {
        const status = keyboardStatuses[keyVal] || "unused";
        keyEl.className = `keyboard-key ${status}`;
      }
    });
  }

  function triggerShake() {
    const { guesses } = getActiveState();
    const rowEl = document.getElementById(`row-${guesses.length}`);
    if (rowEl) {
      rowEl.classList.remove("shake");
      void rowEl.offsetWidth; // Trigger reflow
      rowEl.classList.add("shake");
      setTimeout(() => rowEl.classList.remove("shake"), 600);
    }
  }

  function triggerWinBounce(rowIndex) {
    const rowEl = document.getElementById(`row-${rowIndex}`);
    if (!rowEl) return;
    const tiles = rowEl.querySelectorAll(".board-tile");
    tiles.forEach((tile, index) => {
      tile.style.animationDelay = `${index * 100}ms`;
      tile.classList.add("bounce");
      setTimeout(() => tile.classList.remove("bounce"), 1500);
    });
  }

  // --- Input Handlers ---
  function handleDigit(digit) {
    const { gameStatus } = getActiveState();
    if (gameStatus !== "IN_PROGRESS" || state.isRevealing) return;

    if (state.currentGuess.length >= NUMBER_LENGTH) return;

    if (state.currentGuess.length === 0 && digit === "0") {
      showToast("First digit cannot be 0");
      triggerShake();
      return;
    }

    if (state.currentGuess.includes(digit)) {
      showToast("Digits must all be distinct");
      triggerShake();
      return;
    }

    state.currentGuess += digit;
    renderBoard();
  }

  function handleBackspace() {
    const { gameStatus } = getActiveState();
    if (gameStatus !== "IN_PROGRESS" || state.isRevealing) return;
    if (state.currentGuess.length === 0) return;

    state.currentGuess = state.currentGuess.slice(0, -1);
    renderBoard();
  }

  function handleEnter() {
    const { isPractice, secret, guesses, evaluations, keyboardStatuses, gameStatus } =
      getActiveState();
    if (gameStatus !== "IN_PROGRESS" || state.isRevealing) return;

    const validation = validateGuess(state.currentGuess);
    if (!validation.valid) {
      showToast(validation.message);
      triggerShake();
      return;
    }

    const currentGuessStr = state.currentGuess;
    const evaluation = evaluateGuess(currentGuessStr, secret);
    const nextEvaluations = [...evaluations, evaluation];
    const nextGuesses = [...guesses, currentGuessStr];
    const nextKeyboardStatuses = updateKeyboardStatuses(
      keyboardStatuses,
      currentGuessStr,
      evaluation
    );

    const isWin = currentGuessStr === secret;
    const isLost = !isWin && nextGuesses.length >= MAX_ATTEMPTS;
    const nextGameStatus = isWin ? "WON" : isLost ? "LOST" : "IN_PROGRESS";

    state.isRevealing = true;
    renderKeyboard();

    // Staggered 3D Tile Flip Animation
    const rowIndex = guesses.length;
    const rowEl = document.getElementById(`row-${rowIndex}`);
    const tiles = rowEl ? rowEl.querySelectorAll(".board-tile") : [];

    tiles.forEach((tile, index) => {
      tile.style.animationDelay = `${index * 300}ms`;
      tile.classList.add("flip");

      // Mid-flip color reveal at 300ms + (index * 300ms)
      setTimeout(() => {
        tile.className = `board-tile ${evaluation[index]} flip`;
      }, index * 300 + 300);
    });

    const totalFlipTime = NUMBER_LENGTH * 300 + 150;

    setTimeout(() => {
      state.isRevealing = false;
      state.currentGuess = "";

      if (isPractice) {
        state.practiceGuesses = nextGuesses;
        state.practiceEvaluations = nextEvaluations;
        state.practiceKeyboardStatuses = nextKeyboardStatuses;
        state.practiceGameStatus = nextGameStatus;
        savePracticeState({
          secret,
          guesses: nextGuesses,
          evaluations: nextEvaluations,
          keyboardStatuses: nextKeyboardStatuses,
          gameStatus: nextGameStatus,
        });
      } else {
        state.dailyGuesses = nextGuesses;
        state.dailyEvaluations = nextEvaluations;
        state.dailyKeyboardStatuses = nextKeyboardStatuses;
        state.dailyGameStatus = nextGameStatus;
        saveDailyState({
          dateKey: state.dateKey,
          guesses: nextGuesses,
          evaluations: nextEvaluations,
          keyboardStatuses: nextKeyboardStatuses,
          gameStatus: nextGameStatus,
        });
      }

      renderBoard();
      renderKeyboard();

      if (isWin) {
        triggerWinBounce(rowIndex);
        showToast(
          nextGuesses.length === 1
            ? "Genius! 🎯"
            : nextGuesses.length <= 3
            ? "Impressive! 🔥"
            : "Magnificent! 🎉",
          2500
        );
        if (!isPractice) {
          recordStats(true, nextGuesses.length);
        }
        setTimeout(() => openStatsModal(), 1600);
      } else if (isLost) {
        showToast(`The number was ${secret}`, 4000);
        if (!isPractice) {
          recordStats(false, nextGuesses.length);
        }
        setTimeout(() => openStatsModal(), 1600);
      }
    }, totalFlipTime);
  }

  // --- Stats Tracking ---
  function recordStats(isWin, attemptsCount) {
    const prev = state.stats;
    const newPlayed = prev.gamesPlayed + 1;
    const newWon = isWin ? prev.gamesWon + 1 : prev.gamesWon;
    const newStreak = isWin ? prev.currentStreak + 1 : 0;
    const newMaxStreak = Math.max(prev.maxStreak, newStreak);
    const newDistribution = { ...prev.guessDistribution };

    if (isWin && attemptsCount >= 1 && attemptsCount <= 6) {
      newDistribution[attemptsCount] = (newDistribution[attemptsCount] || 0) + 1;
    }

    state.stats = {
      gamesPlayed: newPlayed,
      gamesWon: newWon,
      currentStreak: newStreak,
      maxStreak: newMaxStreak,
      guessDistribution: newDistribution,
      lastWonDate: isWin ? state.dateKey : prev.lastWonDate,
    };
    saveStats(state.stats);
  }

  // --- Modals Management ---
  function openModal(modalEl) {
    modalEl.classList.remove("hidden");
  }

  function closeModal(modalEl) {
    modalEl.classList.add("hidden");
  }

  function isAnyModalOpen() {
    return (
      !helpModalEl.classList.contains("hidden") ||
      !statsModalEl.classList.contains("hidden")
    );
  }

  function openStatsModal() {
    const { stats } = state;
    const { isPractice, gameStatus, evaluations } = getActiveState();
    const isGameOver = gameStatus === "WON" || gameStatus === "LOST";
    const lastWinAttempt = gameStatus === "WON" ? evaluations.length : null;

    document.getElementById("stat-played").textContent = stats.gamesPlayed;
    const winPct =
      stats.gamesPlayed > 0
        ? Math.round((stats.gamesWon / stats.gamesPlayed) * 100)
        : 0;
    document.getElementById("stat-win-pct").textContent = winPct;
    document.getElementById("stat-current-streak").textContent = stats.currentStreak;
    document.getElementById("stat-max-streak").textContent = stats.maxStreak;

    // Distribution Bars
    const maxVal = Math.max(1, ...Object.values(stats.guessDistribution || {}));
    distributionBarsEl.innerHTML = "";

    for (let attempt = 1; attempt <= 6; attempt++) {
      const count = stats.guessDistribution[attempt] || 0;
      const pct = Math.max(7, Math.round((count / maxVal) * 100));
      const isWinner = lastWinAttempt === attempt;

      const row = document.createElement("div");
      row.className = "dist-row";
      row.innerHTML = `
        <span class="dist-label">${attempt}</span>
        <div class="dist-bar-track">
          <div class="dist-bar-fill ${isWinner ? "highlight" : ""}" style="width: ${pct}%">
            <span class="dist-count">${count}</span>
          </div>
        </div>
      `;
      distributionBarsEl.appendChild(row);
    }

    if (isGameOver) {
      statsFooterEl.classList.remove("hidden");
      if (isPractice) {
        countdownContainerEl.classList.add("hidden");
        btnPlayAgain.classList.remove("hidden");
      } else {
        countdownContainerEl.classList.remove("hidden");
        btnPlayAgain.classList.add("hidden");
      }
    } else {
      statsFooterEl.classList.add("hidden");
    }

    openModal(statsModalEl);
  }

  // --- Countdown Timer ---
  function updateCountdown() {
    const now = new Date();
    const midnight = new Date(now);
    midnight.setHours(24, 0, 0, 0);
    const diffSec = Math.max(0, Math.floor((midnight.getTime() - now.getTime()) / 1000));

    const h = String(Math.floor(diffSec / 3600)).padStart(2, "0");
    const m = String(Math.floor((diffSec % 3600) / 60)).padStart(2, "0");
    const s = String(diffSec % 60).padStart(2, "0");

    countdownTimerEl.textContent = `${h}:${m}:${s}`;
  }

  setInterval(updateCountdown, 1000);
  updateCountdown();

  // --- Share Results ---
  async function handleShare() {
    const { isPractice, gameStatus, evaluations } = getActiveState();
    const isWin = gameStatus === "WON";
    const attemptsText = isWin ? `${evaluations.length}/${MAX_ATTEMPTS}` : `X/${MAX_ATTEMPTS}`;
    const header = isPractice
      ? `Numle (Practice) ${attemptsText}`
      : `Numle ${getFormattedDate(state.dateKey)} ${attemptsText}`;

    const emojiMap = {
      correct: "🟩",
      present: "🟨",
      absent: "⬛",
    };

    const grid = evaluations
      .map((row) => row.map((status) => emojiMap[status] || "⬛").join(""))
      .join("\n");

    const text = `${header}\n\n${grid}\n\nhttps://coskntkk.github.io/numle/`;

    let copied = false;
    if (navigator?.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(text);
        copied = true;
      } catch (err) {
        console.warn(err);
      }
    }

    if (!copied) {
      try {
        const el = document.createElement("textarea");
        el.value = text;
        el.setAttribute("readonly", "");
        el.style.position = "absolute";
        el.style.left = "-9999px";
        document.body.appendChild(el);
        el.select();
        copied = document.execCommand("copy");
        document.body.removeChild(el);
      } catch (err) {
        console.error(err);
      }
    }

    if (copied) {
      btnShare.classList.add("copied");
      shareBtnText.textContent = "COPIED!";
      showToast("Copied results to clipboard! 📋");
      setTimeout(() => {
        btnShare.classList.remove("copied");
        shareBtnText.textContent = "SHARE";
      }, 2500);
    } else {
      showToast("Failed to copy to clipboard", 2000, "error");
    }
  }

  // --- Mode Switching & Practice Reset ---
  function switchMode(newMode) {
    if (state.gameMode === newMode) return;
    state.gameMode = newMode;
    state.currentGuess = "";

    if (newMode === "daily") {
      modeDailyBtn.classList.add("active");
      modeDailyBtn.setAttribute("aria-selected", "true");
      modePracticeBtn.classList.remove("active");
      modePracticeBtn.setAttribute("aria-selected", "false");
      btnNewPractice.classList.add("hidden");
    } else {
      modePracticeBtn.classList.add("active");
      modePracticeBtn.setAttribute("aria-selected", "true");
      modeDailyBtn.classList.remove("active");
      modeDailyBtn.setAttribute("aria-selected", "false");
      btnNewPractice.classList.remove("hidden");
    }

    renderBoard();
    renderKeyboard();
  }

  function resetPracticeGame() {
    state.practiceSecret = getRandomSecret();
    state.practiceGuesses = [];
    state.practiceEvaluations = [];
    state.practiceKeyboardStatuses = {};
    state.practiceGameStatus = "IN_PROGRESS";
    state.currentGuess = "";
    clearPracticeState();

    renderBoard();
    renderKeyboard();
    showToast("New practice game started!");
  }

  // --- Initialization ---
  function initGame() {
    initBoardDOM();

    // 1. Daily Setup
    state.dailySecret = getDailySecret(state.dateKey);
    const savedDaily = loadDailyState(state.dateKey);
    if (savedDaily) {
      state.dailyGuesses = savedDaily.guesses || [];
      state.dailyEvaluations = savedDaily.evaluations || [];
      state.dailyKeyboardStatuses = savedDaily.keyboardStatuses || {};
      state.dailyGameStatus = savedDaily.gameStatus || "IN_PROGRESS";
    }

    // 2. Practice Setup
    const savedPractice = loadPracticeState();
    if (savedPractice && savedPractice.secret) {
      state.practiceSecret = savedPractice.secret;
      state.practiceGuesses = savedPractice.guesses || [];
      state.practiceEvaluations = savedPractice.evaluations || [];
      state.practiceKeyboardStatuses = savedPractice.keyboardStatuses || {};
      state.practiceGameStatus = savedPractice.gameStatus || "IN_PROGRESS";
    } else {
      state.practiceSecret = getRandomSecret();
    }

    // Event Listeners
    modeDailyBtn.addEventListener("click", () => switchMode("daily"));
    modePracticeBtn.addEventListener("click", () => switchMode("practice"));
    btnHelp.addEventListener("click", () => openModal(helpModalEl));
    btnStats.addEventListener("click", openStatsModal);
    btnNewPractice.addEventListener("click", resetPracticeGame);
    btnPlayAgain.addEventListener("click", () => {
      closeModal(statsModalEl);
      resetPracticeGame();
    });
    btnShare.addEventListener("click", handleShare);

    // Modal Close Buttons & Backdrop click
    document.querySelectorAll("[data-close-modal]").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const modalId = e.currentTarget.getAttribute("data-close-modal");
        const modal = document.getElementById(modalId);
        if (modal) closeModal(modal);
      });
    });

    document.querySelectorAll(".modal-backdrop").forEach((backdrop) => {
      backdrop.addEventListener("click", (e) => {
        if (e.target === backdrop) closeModal(backdrop);
      });
    });

    // Virtual Keyboard Click Events
    document.querySelectorAll(".keyboard-key").forEach((keyEl) => {
      keyEl.addEventListener("click", (e) => {
        e.preventDefault();
        const key = keyEl.getAttribute("data-key");
        if (key === "Enter") handleEnter();
        else if (key === "Backspace") handleBackspace();
        else if (key >= "0" && key <= "9") handleDigit(key);
      });
    });

    // Physical Keyboard Listener
    window.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        if (!helpModalEl.classList.contains("hidden")) closeModal(helpModalEl);
        if (!statsModalEl.classList.contains("hidden")) closeModal(statsModalEl);
        return;
      }

      if (isAnyModalOpen()) return;

      if (e.key >= "0" && e.key <= "9") {
        e.preventDefault();
        handleDigit(e.key);
      } else if (e.key === "Backspace") {
        e.preventDefault();
        handleBackspace();
      } else if (e.key === "Enter") {
        e.preventDefault();
        handleEnter();
      }
    });

    renderBoard();
    renderKeyboard();
  }

  // Run on DOM ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initGame);
  } else {
    initGame();
  }
})();
