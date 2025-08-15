const timerDisplay = document.querySelector(".timer-display");
const startBtn = document.querySelector(".start-btn");
const tabs = document.querySelectorAll(".tab");

let timer;
let isRunning = false;
let currentMode = "pomodoro";
let timeLeft = 25 * 60;

const timeSettings = {
  pomodoro: 25 * 60,
  short: 5 * 60,
  long: 15 * 60,
};

function formatTime(seconds) {
  const mins = String(Math.floor(seconds / 60)).padStart(2, "0");
  const secs = String(seconds % 60).padStart(2, "0");
  return `${mins}:${secs}`;
}

function updateDisplay() {
  timerDisplay.textContent = formatTime(timeLeft);
}

function startTimer() {
  if (isRunning) {
    clearInterval(timer);
    isRunning = false;
    startBtn.textContent = "START";
    return;
  }

  timer = setInterval(() => {
    if (timeLeft > 0) {
      timeLeft--;
      updateDisplay();
    } else {
      clearInterval(timer);
      isRunning = false;
      startBtn.textContent = "START";
      alert("Time's up!");
    }
  }, 1000);

  isRunning = true;
  startBtn.textContent = "PAUSE";
}

function switchMode(mode) {
  clearInterval(timer);
  isRunning = false;
  currentMode = mode;
  timeLeft = timeSettings[mode] || 25 * 60;
  startBtn.textContent = "START";
  updateDisplay();

  tabs.forEach((tab) => tab.classList.remove("active"));
  document.querySelector(`.tab[data-mode="${mode}"]`).classList.add("active");
}

startBtn.addEventListener("click", startTimer);

tabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    const mode = tab.getAttribute("data-mode");
    switchMode(mode);
  });
});

updateDisplay();
document
  .querySelector(`.tab[data-mode="${currentMode}"]`)
  .classList.add("active");
