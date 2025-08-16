class Timer {
  static TIME_SETTINGS = {
    pomodoro: 25 * 60,
    short: 5 * 60,
    long: 15 * 60,
  };

  constructor() {
    this.timer = null;
    this.isRunning = false;
    this.currentMode = "pomodoro";
    this.timeLeft = Timer.TIME_SETTINGS.pomodoro;
    this.onTick = null;
    this.onComplete = null;
  }

  formatTime(seconds) {
    const mins = String(Math.floor(seconds / 60)).padStart(2, "0");
    const secs = String(seconds % 60).padStart(2, "0");
    return `${mins}:${secs}`;
  }

  start() {
    if (this.isRunning) {
      this.pause();
      return false;
    }

    this.timer = setInterval(() => {
      if (this.timeLeft > 0) {
        this.timeLeft--;
        this.onTick?.(this.formatTime(this.timeLeft));
      } else {
        this.pause();
        this.onComplete?.();
      }
    }, 1000);

    this.isRunning = true;
    return true;
  }

  pause() {
    clearInterval(this.timer);
    this.isRunning = false;
  }

  switchMode(mode) {
    this.pause();
    this.currentMode = mode;
    this.timeLeft = Timer.TIME_SETTINGS[mode] || Timer.TIME_SETTINGS.pomodoro;
    this.onTick?.(this.formatTime(this.timeLeft));
    return this.timeLeft;
  }

  getTimeLeft() {
    return this.formatTime(this.timeLeft);
  }

  isTimerRunning() {
    return this.isRunning;
  }
}

class TimerUI {
  constructor(timer) {
    this.timer = timer;
    this.timerDisplay = document.querySelector(".timer-display");
    this.startBtn = document.querySelector(".start-btn");
    this.tabs = document.querySelectorAll(".tab");
    this.addTaskBtn = document.querySelector(".add-task");

    this.initializeUI();
    this.setupEventListeners();
  }

  initializeUI() {
    this.updateDisplay(this.timer.getTimeLeft());
    this.updateTabState(this.timer.currentMode);
  }

  setupEventListeners() {
    this.startBtn.addEventListener("click", () => this.handleStartClick());

    this.tabs.forEach((tab) => {
      tab.addEventListener("click", () => {
        const mode = tab.getAttribute("data-mode");
        this.handleModeSwitch(mode);
      });
    });

    if (this.addTaskBtn) {
      this.addTaskBtn.addEventListener("click", () => this.handleAddTask());
    }

    // Set up timer callbacks
    this.timer.onTick = (time) => this.updateDisplay(time);
    this.timer.onComplete = () => {
      this.updateStartButton("START");
      alert("Time's up!");
    };
  }

  updateDisplay(time) {
    this.timerDisplay.textContent = time;
  }

  updateStartButton(text) {
    this.startBtn.textContent = text;
  }

  updateTabState(mode) {
    this.tabs.forEach((tab) => tab.classList.remove("active"));
    document.querySelector(`.tab[data-mode="${mode}"]`).classList.add("active");
  }

  handleStartClick() {
    const isStarting = this.timer.start();
    this.updateStartButton(isStarting ? "PAUSE" : "START");
  }

  handleModeSwitch(mode) {
    this.timer.switchMode(mode);
    this.updateStartButton("START");
    this.updateTabState(mode);
  }

  handleAddTask() {
    alert("Add tasks functionality is not implemented yet. 🤔");
  }
}

// Initialize the application
const timer = new Timer();
const timerUI = new TimerUI(timer);
