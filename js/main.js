class TimerEngine extends EventTarget {
  static TIME_SETTINGS = {
    work: 25 * 60, // 25 minutes
    shortBreak: 5 * 60, // 5 minutes
    longBreak: 15 * 60, // 15 minutes
  };

  static MODES = {
    WORK: "work",
    SHORT_BREAK: "shortBreak",
    LONG_BREAK: "longBreak",
  };

  constructor() {
    super();
    this.timer = null;
    this.isRunning = false;
    this.isPaused = false;
    this.currentMode = TimerEngine.MODES.WORK;
    this.timeRemaining = TimerEngine.TIME_SETTINGS.work;
    this.sessionCount = 0; // Track completed work sessions
    this.cycleCount = 0; // Track completed cycles (4 sessions = 1 cycle)
    this.startTime = null;
    this.pausedTime = 0;

    // Event callbacks
    this.onTick = null;
    this.onComplete = null;
    this.onModeChange = null;
  }

  formatTime(seconds) {
    const mins = String(Math.floor(seconds / 60)).padStart(2, "0");
    const secs = String(seconds % 60).padStart(2, "0");
    return `${mins}:${secs}`;
  }

  start() {
    if (this.isPaused) {
      this.resume();
      return;
    }

    if (this.isRunning) {
      this.pause();
      return;
    }

    this.isRunning = true;
    this.isPaused = false;
    this.startTime = Date.now();

    this.timer = setInterval(() => {
      this.timeRemaining--;

      // Emit tick event
      this.dispatchEvent(
        new CustomEvent("tick", {
          detail: {
            timeRemaining: this.timeRemaining,
            formattedTime: this.formatTime(this.timeRemaining),
            mode: this.currentMode,
            sessionCount: this.sessionCount,
          },
        })
      );

      if (this.onTick) {
        this.onTick(this.timeRemaining, this.formatTime(this.timeRemaining));
      }

      if (this.timeRemaining <= 0) {
        this.complete();
      }
    }, 1000);

    // Emit start event
    this.dispatchEvent(
      new CustomEvent("start", {
        detail: { mode: this.currentMode, sessionCount: this.sessionCount },
      })
    );
  }

  pause() {
    if (!this.isRunning) return;

    this.isRunning = false;
    this.isPaused = true;
    this.pausedTime = Date.now();

    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }

    this.dispatchEvent(
      new CustomEvent("pause", {
        detail: { timeRemaining: this.timeRemaining, mode: this.currentMode },
      })
    );
  }

  resume() {
    if (!this.isPaused) return;

    this.isRunning = true;
    this.isPaused = false;
    this.start();

    this.dispatchEvent(
      new CustomEvent("resume", {
        detail: { timeRemaining: this.timeRemaining, mode: this.currentMode },
      })
    );
  }

  reset() {
    this.stop();
    this.currentMode = TimerEngine.MODES.WORK;
    this.timeRemaining = TimerEngine.TIME_SETTINGS.work;
    this.sessionCount = 0;
    this.cycleCount = 0;

    this.dispatchEvent(
      new CustomEvent("reset", {
        detail: { mode: this.currentMode, sessionCount: this.sessionCount },
      })
    );
  }

  stop() {
    this.isRunning = false;
    this.isPaused = false;

    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  complete() {
    this.stop();

    const completedMode = this.currentMode;
    const completedSession = this.sessionCount;

    // Handle session completion based on current mode
    if (this.currentMode === TimerEngine.MODES.WORK) {
      this.sessionCount++;

      // Emit work session complete event
      this.dispatchEvent(
        new CustomEvent("sessionComplete", {
          detail: {
            completedMode,
            sessionCount: this.sessionCount,
            cycleCount: this.cycleCount,
          },
        })
      );

      // Determine next mode: short break or long break
      if (this.sessionCount % 4 === 0) {
        // After 4 work sessions, take a long break
        this.switchToMode(TimerEngine.MODES.LONG_BREAK);
        this.cycleCount++;

        // Emit cycle complete event
        this.dispatchEvent(
          new CustomEvent("cycleComplete", {
            detail: {
              cycleCount: this.cycleCount,
              sessionCount: this.sessionCount,
            },
          })
        );
      } else {
        // Take a short break
        this.switchToMode(TimerEngine.MODES.SHORT_BREAK);
      }
    } else {
      // Break completed - switch back to work
      this.dispatchEvent(
        new CustomEvent("breakComplete", {
          detail: {
            completedMode,
            sessionCount: this.sessionCount,
            cycleCount: this.cycleCount,
          },
        })
      );

      this.switchToMode(TimerEngine.MODES.WORK);
    }

    // Auto-start next session (can be made configurable)
    setTimeout(() => {
      this.start();
    }, 1000);
  }

  switchToMode(newMode) {
    const previousMode = this.currentMode;
    this.currentMode = newMode;

    // Set time for new mode
    switch (newMode) {
      case TimerEngine.MODES.WORK:
        this.timeRemaining = TimerEngine.TIME_SETTINGS.work;
        break;
      case TimerEngine.MODES.SHORT_BREAK:
        this.timeRemaining = TimerEngine.TIME_SETTINGS.shortBreak;
        break;
      case TimerEngine.MODES.LONG_BREAK:
        this.timeRemaining = TimerEngine.TIME_SETTINGS.longBreak;
        break;
    }

    // Emit mode change event
    this.dispatchEvent(
      new CustomEvent("modeChange", {
        detail: {
          previousMode,
          currentMode: this.currentMode,
          timeRemaining: this.timeRemaining,
          sessionCount: this.sessionCount,
        },
      })
    );

    if (this.onModeChange) {
      this.onModeChange(this.currentMode, previousMode);
    }
  }

  skip() {
    // Skip current session and move to next
    this.complete();
  }

  extend(minutes = 5) {
    // Extend current session by specified minutes
    if (this.currentMode === TimerEngine.MODES.WORK) {
      this.timeRemaining += minutes * 60;

      this.dispatchEvent(
        new CustomEvent("extend", {
          detail: {
            extendedBy: minutes,
            newTimeRemaining: this.timeRemaining,
            mode: this.currentMode,
          },
        })
      );
    }
  }

  getCurrentState() {
    return {
      mode: this.currentMode,
      timeRemaining: this.timeRemaining,
      formattedTime: this.formatTime(this.timeRemaining),
      isRunning: this.isRunning,
      isPaused: this.isPaused,
      sessionCount: this.sessionCount,
      cycleCount: this.cycleCount,
    };
  }

  getSessionInfo() {
    const sessionsInCurrentCycle = this.sessionCount % 4;
    const nextBreakType = sessionsInCurrentCycle === 3 ? "long" : "short";

    return {
      currentSession: sessionsInCurrentCycle + 1,
      totalSessions: this.sessionCount,
      cycleCount: this.cycleCount,
      nextBreakType,
      sessionsUntilLongBreak: 4 - sessionsInCurrentCycle,
    };
  }
}

// Task Data Model
class Task {
  constructor(
    id,
    title,
    description = "",
    estimatedPomodoros = 1,
    category = "general",
    priority = "medium"
  ) {
    this.id = id || this.generateId();
    this.title = title;
    this.description = description;
    this.estimatedPomodoros = estimatedPomodoros;
    this.completedPomodoros = 0;
    this.category = category;
    this.priority = priority; // high, medium, low
    this.completed = false;
    this.createdAt = new Date();
    this.completedAt = null;
    this.sessions = []; // Array of session IDs associated with this task
  }

  generateId() {
    return "task_" + Date.now() + "_" + Math.random().toString(36).substr(2, 9);
  }

  addSession(sessionId) {
    this.sessions.push(sessionId);
    this.completedPomodoros++;
  }

  markComplete() {
    this.completed = true;
    this.completedAt = new Date();
  }

  getProgress() {
    if (this.estimatedPomodoros === 0) return 100;
    return Math.min(
      100,
      (this.completedPomodoros / this.estimatedPomodoros) * 100
    );
  }

  isOverdue() {
    return this.completedPomodoros > this.estimatedPomodoros;
  }

  toJSON() {
    return {
      id: this.id,
      title: this.title,
      description: this.description,
      estimatedPomodoros: this.estimatedPomodoros,
      completedPomodoros: this.completedPomodoros,
      category: this.category,
      priority: this.priority,
      completed: this.completed,
      createdAt: this.createdAt.toISOString(),
      completedAt: this.completedAt ? this.completedAt.toISOString() : null,
      sessions: this.sessions,
    };
  }

  static fromJSON(data) {
    const task = new Task(
      data.id,
      data.title,
      data.description,
      data.estimatedPomodoros,
      data.category,
      data.priority
    );
    task.completedPomodoros = data.completedPomodoros || 0;
    task.completed = data.completed || false;
    task.createdAt = new Date(data.createdAt);
    task.completedAt = data.completedAt ? new Date(data.completedAt) : null;
    task.sessions = data.sessions || [];
    return task;
  }
}

// Task Manager Class
class TaskManager {
  constructor() {
    this.tasks = new Map();
    this.currentTaskId = null;
    this.categories = ["general", "work", "personal", "learning", "health"];
    this.loadTasks();
  }

  // CRUD Operations
  createTask(
    title,
    description = "",
    estimatedPomodoros = 1,
    category = "general",
    priority = "medium"
  ) {
    if (!title || title.trim().length === 0) {
      throw new Error("Task title is required");
    }

    if (title.length > 100) {
      throw new Error("Task title must be 100 characters or less");
    }

    const task = new Task(
      null,
      title.trim(),
      description.trim(),
      estimatedPomodoros,
      category,
      priority
    );
    this.tasks.set(task.id, task);
    this.saveTasks();
    return task;
  }

  getTask(id) {
    return this.tasks.get(id);
  }

  getAllTasks() {
    return Array.from(this.tasks.values());
  }

  getActiveTasks() {
    return this.getAllTasks().filter((task) => !task.completed);
  }

  getCompletedTasks() {
    return this.getAllTasks().filter((task) => task.completed);
  }

  updateTask(id, updates) {
    const task = this.tasks.get(id);
    if (!task) {
      throw new Error("Task not found");
    }

    // Validate updates
    if (updates.title !== undefined) {
      if (!updates.title || updates.title.trim().length === 0) {
        throw new Error("Task title is required");
      }
      if (updates.title.length > 100) {
        throw new Error("Task title must be 100 characters or less");
      }
      task.title = updates.title.trim();
    }

    if (updates.description !== undefined) {
      task.description = updates.description.trim();
    }

    if (updates.estimatedPomodoros !== undefined) {
      if (updates.estimatedPomodoros < 1) {
        throw new Error("Estimated Pomodoros must be at least 1");
      }
      task.estimatedPomodoros = updates.estimatedPomodoros;
    }

    if (updates.category !== undefined) {
      task.category = updates.category;
    }

    if (updates.priority !== undefined) {
      task.priority = updates.priority;
    }

    this.saveTasks();
    return task;
  }

  deleteTask(id) {
    const deleted = this.tasks.delete(id);
    if (deleted) {
      if (this.currentTaskId === id) {
        this.currentTaskId = null;
      }
      this.saveTasks();
    }
    return deleted;
  }

  completeTask(id) {
    const task = this.tasks.get(id);
    if (!task) {
      throw new Error("Task not found");
    }

    task.markComplete();
    if (this.currentTaskId === id) {
      this.currentTaskId = null;
    }
    this.saveTasks();
    return task;
  }

  // Session Management
  setCurrentTask(id) {
    if (id && !this.tasks.has(id)) {
      throw new Error("Task not found");
    }
    this.currentTaskId = id;
    this.saveTasks();
  }

  getCurrentTask() {
    return this.currentTaskId ? this.tasks.get(this.currentTaskId) : null;
  }

  addSessionToTask(taskId, sessionId) {
    const task = this.tasks.get(taskId);
    if (!task) {
      throw new Error("Task not found");
    }

    task.addSession(sessionId);

    // Check if task is complete
    if (task.completedPomodoros >= task.estimatedPomodoros && !task.completed) {
      task.markComplete();
      return { task, completed: true };
    }

    this.saveTasks();
    return { task, completed: false };
  }

  // Filtering and Sorting
  getTasksByCategory(category) {
    return this.getAllTasks().filter((task) => task.category === category);
  }

  getTasksByPriority(priority) {
    return this.getAllTasks().filter((task) => task.priority === priority);
  }

  searchTasks(query) {
    const lowercaseQuery = query.toLowerCase();
    return this.getAllTasks().filter(
      (task) =>
        task.title.toLowerCase().includes(lowercaseQuery) ||
        task.description.toLowerCase().includes(lowercaseQuery)
    );
  }

  sortTasks(tasks, sortBy = "createdAt", ascending = false) {
    return [...tasks].sort((a, b) => {
      let aValue, bValue;

      switch (sortBy) {
        case "title":
          aValue = a.title.toLowerCase();
          bValue = b.title.toLowerCase();
          break;
        case "priority":
          const priorityOrder = { high: 3, medium: 2, low: 1 };
          aValue = priorityOrder[a.priority];
          bValue = priorityOrder[b.priority];
          break;
        case "progress":
          aValue = a.getProgress();
          bValue = b.getProgress();
          break;
        case "createdAt":
        default:
          aValue = a.createdAt.getTime();
          bValue = b.createdAt.getTime();
          break;
      }

      if (aValue < bValue) return ascending ? -1 : 1;
      if (aValue > bValue) return ascending ? 1 : -1;
      return 0;
    });
  }

  // Statistics
  getTaskStats() {
    const allTasks = this.getAllTasks();
    const activeTasks = this.getActiveTasks();
    const completedTasks = this.getCompletedTasks();

    const totalPomodoros = allTasks.reduce(
      (sum, task) => sum + task.completedPomodoros,
      0
    );
    const estimatedPomodoros = activeTasks.reduce(
      (sum, task) => sum + task.estimatedPomodoros,
      0
    );

    return {
      total: allTasks.length,
      active: activeTasks.length,
      completed: completedTasks.length,
      completionRate:
        allTasks.length > 0
          ? (completedTasks.length / allTasks.length) * 100
          : 0,
      totalPomodoros,
      estimatedPomodoros,
      averagePomodorosPerTask:
        allTasks.length > 0 ? totalPomodoros / allTasks.length : 0,
    };
  }

  // Storage Management
  saveTasks() {
    try {
      const tasksData = {
        tasks: Object.fromEntries(
          Array.from(this.tasks.entries()).map(([id, task]) => [
            id,
            task.toJSON(),
          ])
        ),
        currentTaskId: this.currentTaskId,
        lastSaved: new Date().toISOString(),
      };
      localStorage.setItem("rfocus_tasks", JSON.stringify(tasksData));
    } catch (error) {
      console.error("Failed to save tasks:", error);
      // Fallback to session storage
      try {
        sessionStorage.setItem("rfocus_tasks", JSON.stringify(tasksData));
      } catch (sessionError) {
        console.error("Failed to save tasks to session storage:", sessionError);
      }
    }
  }

  loadTasks() {
    try {
      let tasksData = null;

      // Try localStorage first
      const localData = localStorage.getItem("rfocus_tasks");
      if (localData) {
        tasksData = JSON.parse(localData);
      } else {
        // Fallback to session storage
        const sessionData = sessionStorage.getItem("rfocus_tasks");
        if (sessionData) {
          tasksData = JSON.parse(sessionData);
        }
      }

      if (tasksData && tasksData.tasks) {
        this.tasks.clear();
        Object.entries(tasksData.tasks).forEach(([id, taskData]) => {
          const task = Task.fromJSON(taskData);
          this.tasks.set(id, task);
        });
        this.currentTaskId = tasksData.currentTaskId || null;
      }
    } catch (error) {
      console.error("Failed to load tasks:", error);
      this.tasks.clear();
      this.currentTaskId = null;
    }
  }

  // Export/Import
  exportTasks() {
    return {
      tasks: Object.fromEntries(
        Array.from(this.tasks.entries()).map(([id, task]) => [
          id,
          task.toJSON(),
        ])
      ),
      exportedAt: new Date().toISOString(),
      version: "1.0",
    };
  }

  importTasks(data) {
    if (!data || !data.tasks) {
      throw new Error("Invalid task data");
    }

    try {
      Object.entries(data.tasks).forEach(([id, taskData]) => {
        const task = Task.fromJSON(taskData);
        this.tasks.set(id, task);
      });
      this.saveTasks();
      return true;
    } catch (error) {
      console.error("Failed to import tasks:", error);
      throw new Error("Failed to import tasks: " + error.message);
    }
  }
}

// Audio Manager Class
class AudioManager {
  constructor() {
    this.audioContext = null;
    this.soundEnabled = true;
    this.volume = 0.5;
    this.initAudioContext();
  }

  initAudioContext() {
    try {
      this.audioContext = new (window.AudioContext ||
        window.webkitAudioContext)();
    } catch (e) {
      console.warn("Web Audio API not supported");
      this.audioContext = null;
    }
  }

  // Create pleasant notification sounds using Web Audio API
  createTone(frequency, duration, type = "sine") {
    if (!this.audioContext || !this.soundEnabled) return;

    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(this.audioContext.destination);

    oscillator.frequency.setValueAtTime(
      frequency,
      this.audioContext.currentTime
    );
    oscillator.type = type;

    // Create envelope for smooth sound
    gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
    gainNode.gain.linearRampToValueAtTime(
      this.volume * 0.3,
      this.audioContext.currentTime + 0.01
    );
    gainNode.gain.exponentialRampToValueAtTime(
      0.01,
      this.audioContext.currentTime + duration
    );

    oscillator.start(this.audioContext.currentTime);
    oscillator.stop(this.audioContext.currentTime + duration);
  }

  playSessionComplete() {
    // Pleasant ascending chime
    this.createTone(523.25, 0.2); // C5
    setTimeout(() => this.createTone(659.25, 0.2), 100); // E5
    setTimeout(() => this.createTone(783.99, 0.3), 200); // G5
  }

  playBreakComplete() {
    // Gentle notification
    this.createTone(440, 0.15); // A4
    setTimeout(() => this.createTone(554.37, 0.2), 80); // C#5
  }

  playCycleComplete() {
    // Celebration fanfare
    this.createTone(523.25, 0.15); // C5
    setTimeout(() => this.createTone(659.25, 0.15), 100); // E5
    setTimeout(() => this.createTone(783.99, 0.15), 200); // G5
    setTimeout(() => this.createTone(1046.5, 0.3), 300); // C6
  }

  playAchievement() {
    // Special achievement sound
    this.createTone(659.25, 0.1); // E5
    setTimeout(() => this.createTone(783.99, 0.1), 50); // G5
    setTimeout(() => this.createTone(1046.5, 0.1), 100); // C6
    setTimeout(() => this.createTone(1318.51, 0.2), 150); // E6
  }

  playStreak(level) {
    // Progressive streak sounds
    const baseFreq = 523.25; // C5
    for (let i = 0; i < level && i < 4; i++) {
      setTimeout(() => {
        this.createTone(baseFreq * Math.pow(1.2, i), 0.1);
      }, i * 50);
    }
  }

  setSoundEnabled(enabled) {
    this.soundEnabled = enabled;
  }

  setVolume(volume) {
    this.volume = Math.max(0, Math.min(1, volume));
  }

  // Resume audio context (required after user interaction)
  resumeAudioContext() {
    if (this.audioContext && this.audioContext.state === "suspended") {
      this.audioContext.resume();
    }
  }
}

// Notification Manager Class
class NotificationManager {
  constructor() {
    this.container = document.getElementById("toast-container");
    this.toastQueue = [];
    this.activeToasts = new Set();
    this.consecutiveCompletions = 0;
    this.lastCompletionTime = null;
    this.audioManager = new AudioManager();

    // Create container if it doesn't exist
    if (!this.container) {
      this.container = document.createElement("div");
      this.container.id = "toast-container";
      this.container.className = "toast-container";
      document.body.appendChild(this.container);
    }
  }

  showToast(options) {
    const toast = this.createToast(options);
    this.container.appendChild(toast);
    this.activeToasts.add(toast);

    // Trigger entrance animation
    setTimeout(() => {
      toast.classList.add("show");
    }, 10);

    // Auto-hide after duration
    const duration = options.duration || 4000;
    setTimeout(() => {
      this.hideToast(toast);
    }, duration);

    return toast;
  }

  createToast(options) {
    const toast = document.createElement("div");
    toast.className = `toast ${options.type || ""}`;

    // Add special effects for high-level achievements
    if (options.confetti) {
      this.createConfetti();
    }

    if (options.fireworks) {
      this.createFireworks(toast);
    }

    // Add particles for special toasts
    if (options.particles) {
      const particles = this.createParticles();
      toast.appendChild(particles);
    }

    const header = document.createElement("div");
    header.className = "toast-header";

    const icon = document.createElement("span");
    icon.className = `toast-icon ${options.iconAnimation || ""}`;
    icon.textContent = options.icon || "🎉";

    // Add achievement badge wrapper for special achievements
    if (options.achievement) {
      const badge = document.createElement("div");
      badge.className = "achievement-badge";
      badge.appendChild(icon);
      header.appendChild(badge);
    } else {
      header.appendChild(icon);
    }

    const title = document.createElement("span");
    title.textContent = options.title || "Notification";

    // Add streak counter for consecutive completions
    if (options.streak && options.streak > 1) {
      const streakCounter = document.createElement("span");
      streakCounter.className = "streak-counter";
      streakCounter.textContent = ` (${options.streak}x streak!)`;
      streakCounter.style.fontSize = "0.9rem";
      streakCounter.style.color = "#FFD700";
      streakCounter.style.fontWeight = "bold";
      title.appendChild(streakCounter);
    }

    header.appendChild(title);

    const message = document.createElement("div");
    message.className = "toast-message";
    message.textContent = options.message || "";

    toast.appendChild(header);
    toast.appendChild(message);

    // Add cycle celebration effects
    if (options.cycleComplete) {
      toast.classList.add("cycle-celebration");
    }

    // Add progress bar for timed toasts
    if (options.showProgress) {
      const progress = document.createElement("div");
      progress.className = "toast-progress";

      const progressBar = document.createElement("div");
      progressBar.className = "toast-progress-bar";
      progressBar.style.width = "100%";

      progress.appendChild(progressBar);
      toast.appendChild(progress);

      // Animate progress bar
      setTimeout(() => {
        progressBar.style.width = "0%";
        progressBar.style.transition = `width ${
          options.duration || 4000
        }ms linear`;
      }, 100);
    }

    // Add click to dismiss
    toast.addEventListener("click", () => {
      this.hideToast(toast);
    });

    return toast;
  }

  createParticles() {
    const particles = document.createElement("div");
    particles.className = "particles";

    // Create multiple particles
    for (let i = 0; i < 8; i++) {
      const particle = document.createElement("div");
      particle.className = "particle";

      // Random positioning and delay
      particle.style.left = Math.random() * 100 + "%";
      particle.style.animationDelay = Math.random() * 0.5 + "s";
      particle.style.animationDuration = 1.5 + Math.random() * 1 + "s";

      particles.appendChild(particle);
    }

    return particles;
  }

  createConfetti() {
    const confettiContainer = document.createElement("div");
    confettiContainer.className = "confetti-container";
    document.body.appendChild(confettiContainer);

    // Create multiple confetti pieces
    for (let i = 0; i < 50; i++) {
      const confetti = document.createElement("div");
      confetti.className = "confetti";

      // Random positioning and timing
      confetti.style.left = Math.random() * 100 + "%";
      confetti.style.animationDelay = Math.random() * 2 + "s";
      confetti.style.animationDuration = 2 + Math.random() * 2 + "s";

      // Random colors
      const colors = [
        "#FFD700",
        "#FF6B6B",
        "#4ECDC4",
        "#45B7D1",
        "#96CEB4",
        "#FECA57",
      ];
      confetti.style.background =
        colors[Math.floor(Math.random() * colors.length)];

      confettiContainer.appendChild(confetti);
    }

    // Remove confetti after animation
    setTimeout(() => {
      if (confettiContainer.parentNode) {
        confettiContainer.parentNode.removeChild(confettiContainer);
      }
    }, 5000);
  }

  createFireworks(toast) {
    const fireworksContainer = document.createElement("div");
    fireworksContainer.style.position = "absolute";
    fireworksContainer.style.top = "0";
    fireworksContainer.style.left = "0";
    fireworksContainer.style.width = "100%";
    fireworksContainer.style.height = "100%";
    fireworksContainer.style.pointerEvents = "none";
    fireworksContainer.style.overflow = "hidden";

    toast.appendChild(fireworksContainer);

    // Create multiple firework bursts
    for (let i = 0; i < 8; i++) {
      setTimeout(() => {
        const firework = document.createElement("div");
        firework.className = "firework";

        // Random positioning
        firework.style.left = Math.random() * 100 + "%";
        firework.style.top = Math.random() * 100 + "%";

        // Random colors
        const colors = ["#FFD700", "#FF6B6B", "#4ECDC4", "#45B7D1"];
        firework.style.background =
          colors[Math.floor(Math.random() * colors.length)];

        fireworksContainer.appendChild(firework);

        // Remove after animation
        setTimeout(() => {
          if (firework.parentNode) {
            firework.parentNode.removeChild(firework);
          }
        }, 1200);
      }, i * 200);
    }
  }

  createStarBurst(toast) {
    const starContainer = document.createElement("div");
    starContainer.style.position = "absolute";
    starContainer.style.top = "50%";
    starContainer.style.left = "50%";
    starContainer.style.transform = "translate(-50%, -50%)";
    starContainer.style.pointerEvents = "none";

    toast.appendChild(starContainer);

    // Create multiple star bursts
    for (let i = 0; i < 6; i++) {
      const star = document.createElement("div");
      star.className = "star-burst";
      star.style.animationDelay = i * 0.1 + "s";
      starContainer.appendChild(star);

      // Remove after animation
      setTimeout(() => {
        if (star.parentNode) {
          star.parentNode.removeChild(star);
        }
      }, 1000 + i * 100);
    }
  }

  hideToast(toast) {
    if (!this.activeToasts.has(toast)) return;

    toast.classList.remove("show");
    toast.classList.add("hide");
    this.activeToasts.delete(toast);

    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    }, 500);
  }

  // Specific notification methods
  showSessionComplete(sessionCount, cycleCount) {
    const now = Date.now();

    // Check for consecutive completions (within 2 minutes)
    if (this.lastCompletionTime && now - this.lastCompletionTime < 120000) {
      this.consecutiveCompletions++;
    } else {
      this.consecutiveCompletions = 1;
    }
    this.lastCompletionTime = now;

    // Determine reward level based on consecutive completions
    let rewardLevel = Math.min(this.consecutiveCompletions, 4);
    let icon,
      iconAnimation,
      particles = false,
      confetti = false,
      fireworks = false,
      achievement = false;

    switch (rewardLevel) {
      case 1:
        icon = "🎁";
        iconAnimation = "gift-level-1";
        break;
      case 2:
        icon = "🏆";
        iconAnimation = "gift-level-2";
        particles = true;
        break;
      case 3:
        icon = "🌟";
        iconAnimation = "gift-level-3";
        particles = true;
        fireworks = true;
        achievement = true;
        break;
      default:
        icon = "💎";
        iconAnimation = "gift-level-4";
        particles = true;
        confetti = true;
        fireworks = true;
        achievement = true;
        break;
    }

    const messages = [
      "Great focus! Keep it up!",
      "Excellent work! You're on fire!",
      "Amazing streak! You're unstoppable!",
      "Legendary focus! You're a productivity master!",
    ];

    this.showToast({
      type: "session-complete",
      icon: icon,
      iconAnimation: iconAnimation,
      title: `Session ${sessionCount} Complete!`,
      message: messages[rewardLevel - 1],
      duration: 3000 + rewardLevel * 500,
      showProgress: true,
      particles: particles,
      confetti: confetti,
      fireworks: fireworks,
      achievement: achievement,
      streak: this.consecutiveCompletions,
      showProgress: true,
      particles: particles,
    });

    // Play audio notification
    if (achievement) {
      this.audioManager.playAchievement();
    } else if (this.consecutiveCompletions > 1) {
      this.audioManager.playStreak(this.consecutiveCompletions);
    } else {
      this.audioManager.playSessionComplete();
    }
  }

  showBreakComplete(sessionCount) {
    const encouragements = [
      "Ready to focus again?",
      "Refreshed and ready!",
      "Time to get back to work!",
      "Let's make this session count!",
    ];

    const randomMessage =
      encouragements[Math.floor(Math.random() * encouragements.length)];

    this.showToast({
      type: "break-complete",
      icon: "⚡",
      iconAnimation: "bounce",
      title: "Break Complete!",
      message: randomMessage,
      duration: 2500,
      showProgress: true,
    });

    // Play audio notification
    this.audioManager.playBreakComplete();
  }

  showCycleComplete(cycleCount) {
    this.showToast({
      type: "cycle-complete",
      icon: "🎊",
      iconAnimation: "gift-level-4",
      title: `Cycle ${cycleCount} Complete!`,
      message:
        "Outstanding! You've completed 4 focused sessions. Time for a well-deserved long break!",
      duration: 6000,
      showProgress: true,
      particles: true,
      confetti: true,
      fireworks: true,
      achievement: true,
      cycleComplete: true,
    });

    // Play audio notification
    this.audioManager.playCycleComplete();
  }

  showTaskComplete(taskName) {
    this.showToast({
      type: "achievement",
      icon: "✅",
      iconAnimation: "celebration-animation",
      title: "Task Completed!",
      message: `"${taskName}" is now complete. Great job!`,
      duration: 4000,
      showProgress: true,
      particles: true,
    });

    // Play audio notification
    this.audioManager.playAchievement();
  }

  showGoalAchieved(goalType, progress) {
    this.showToast({
      type: "achievement",
      icon: "🎯",
      iconAnimation: "celebration-animation",
      title: "Goal Achieved!",
      message: `You've reached your ${goalType} goal! ${progress}% complete.`,
      duration: 4000,
      showProgress: true,
      particles: true,
    });

    // Play audio notification
    this.audioManager.playAchievement();
  }

  // Reset consecutive completions (e.g., when user takes a long break)
  resetStreak() {
    this.consecutiveCompletions = 0;
    this.lastCompletionTime = null;
  }

  // Clear all active toasts
  clearAll() {
    this.activeToasts.forEach((toast) => {
      this.hideToast(toast);
    });
  }
}

// Task UI Controller Class
class TaskUI {
  constructor(taskManager, notificationManager) {
    this.taskManager = taskManager;
    this.notifications = notificationManager;
    this.elements = {
      taskList: document.getElementById("task-list"),
      addTaskBtn: document.getElementById("add-task-btn"),
      addTaskForm: document.getElementById("add-task-form"),
      taskTitle: document.getElementById("task-title"),
      taskDescription: document.getElementById("task-description"),
      taskPomodoros: document.getElementById("task-pomodoros"),
      taskCategory: document.getElementById("task-category"),
      taskPriority: document.getElementById("task-priority"),
      saveTaskBtn: document.getElementById("save-task"),
      cancelTaskBtn: document.getElementById("cancel-task"),
      taskFilter: document.getElementById("task-filter"),
      taskSort: document.getElementById("task-sort"),
      currentTask: document.getElementById("current-task"),
      currentTaskTitle: document.getElementById("current-task-title"),
      currentTaskProgress: document.getElementById("current-task-progress"),
      clearCurrentTask: document.getElementById("clear-current-task"),
    };

    this.editingTaskId = null;
    this.init();
  }

  init() {
    this.bindEvents();
    this.renderTasks();
    this.updateCurrentTaskDisplay();
  }

  bindEvents() {
    // Add task form
    this.elements.addTaskBtn.addEventListener("click", () =>
      this.showAddTaskForm()
    );
    this.elements.cancelTaskBtn.addEventListener("click", () =>
      this.hideAddTaskForm()
    );
    this.elements.saveTaskBtn.addEventListener("click", () => this.saveTask());

    // Form validation
    this.elements.taskTitle.addEventListener("input", () =>
      this.validateForm()
    );
    this.elements.taskTitle.addEventListener("keypress", (e) => {
      if (e.key === "Enter") this.saveTask();
    });

    // Filtering and sorting
    this.elements.taskFilter.addEventListener("change", () =>
      this.renderTasks()
    );
    this.elements.taskSort.addEventListener("change", () => this.renderTasks());

    // Current task
    this.elements.clearCurrentTask.addEventListener("click", () =>
      this.clearCurrentTask()
    );
  }

  showAddTaskForm() {
    this.editingTaskId = null;
    this.elements.addTaskForm.style.display = "block";
    this.elements.addTaskBtn.style.display = "none";
    this.elements.taskTitle.focus();
    this.resetForm();
  }

  hideAddTaskForm() {
    this.elements.addTaskForm.style.display = "none";
    this.elements.addTaskBtn.style.display = "block";
    this.editingTaskId = null;
    this.resetForm();
  }

  resetForm() {
    this.elements.taskTitle.value = "";
    this.elements.taskDescription.value = "";
    this.elements.taskPomodoros.value = "1";
    this.elements.taskCategory.value = "general";
    this.elements.taskPriority.value = "medium";
    this.validateForm();
  }

  validateForm() {
    const title = this.elements.taskTitle.value.trim();
    const isValid = title.length > 0 && title.length <= 100;
    this.elements.saveTaskBtn.disabled = !isValid;

    if (title.length > 100) {
      this.elements.taskTitle.style.borderColor = "#FF6B6B";
    } else {
      this.elements.taskTitle.style.borderColor = "";
    }
  }

  saveTask() {
    const title = this.elements.taskTitle.value.trim();
    const description = this.elements.taskDescription.value.trim();
    const estimatedPomodoros = parseInt(this.elements.taskPomodoros.value);
    const category = this.elements.taskCategory.value;
    const priority = this.elements.taskPriority.value;

    try {
      if (this.editingTaskId) {
        // Update existing task
        this.taskManager.updateTask(this.editingTaskId, {
          title,
          description,
          estimatedPomodoros,
          category,
          priority,
        });
      } else {
        // Create new task
        this.taskManager.createTask(
          title,
          description,
          estimatedPomodoros,
          category,
          priority
        );
      }

      this.hideAddTaskForm();
      this.renderTasks();

      // Show success notification
      this.notifications.showToast({
        type: "success",
        icon: "✅",
        title: this.editingTaskId ? "Task Updated!" : "Task Created!",
        message: `"${title}" has been ${
          this.editingTaskId ? "updated" : "added"
        } to your task list.`,
        duration: 2000,
      });
    } catch (error) {
      // Show error notification
      this.notifications.showToast({
        type: "error",
        icon: "❌",
        title: "Error",
        message: error.message,
        duration: 3000,
      });
    }
  }

  editTask(taskId) {
    const task = this.taskManager.getTask(taskId);
    if (!task) return;

    this.editingTaskId = taskId;
    this.elements.taskTitle.value = task.title;
    this.elements.taskDescription.value = task.description;
    this.elements.taskPomodoros.value = task.estimatedPomodoros;
    this.elements.taskCategory.value = task.category;
    this.elements.taskPriority.value = task.priority;

    this.showAddTaskForm();
    this.validateForm();
  }

  deleteTask(taskId) {
    const task = this.taskManager.getTask(taskId);
    if (!task) return;

    if (confirm(`Are you sure you want to delete "${task.title}"?`)) {
      this.taskManager.deleteTask(taskId);
      this.renderTasks();
      this.updateCurrentTaskDisplay();

      this.notifications.showToast({
        type: "info",
        icon: "🗑️",
        title: "Task Deleted",
        message: `"${task.title}" has been removed.`,
        duration: 2000,
      });
    }
  }

  completeTask(taskId) {
    const task = this.taskManager.getTask(taskId);
    if (!task) return;

    // Add completion animation
    const taskElement = document.querySelector(`[data-task-id="${taskId}"]`);
    if (taskElement) {
      taskElement.classList.add("task-completing");
    }

    setTimeout(() => {
      this.taskManager.completeTask(taskId);
      this.renderTasks();
      this.updateCurrentTaskDisplay();

      // Show completion notification
      this.notifications.showTaskComplete(task.title);
    }, 300);
  }

  selectTask(taskId) {
    this.taskManager.setCurrentTask(taskId);
    this.renderTasks();
    this.updateCurrentTaskDisplay();

    const task = this.taskManager.getTask(taskId);
    if (task) {
      this.notifications.showToast({
        type: "info",
        icon: "🎯",
        title: "Task Selected",
        message: `Now focusing on: "${task.title}"`,
        duration: 2000,
      });
    }
  }

  clearCurrentTask() {
    this.taskManager.setCurrentTask(null);
    this.renderTasks();
    this.updateCurrentTaskDisplay();
  }

  updateCurrentTaskDisplay() {
    const currentTask = this.taskManager.getCurrentTask();

    if (currentTask) {
      this.elements.currentTask.style.display = "block";
      this.elements.currentTaskTitle.textContent = currentTask.title;

      const progress = currentTask.getProgress();
      this.elements.currentTaskProgress.textContent = `${
        currentTask.completedPomodoros
      }/${currentTask.estimatedPomodoros} Pomodoros (${Math.round(progress)}%)`;
    } else {
      this.elements.currentTask.style.display = "none";
    }
  }

  renderTasks() {
    const filter = this.elements.taskFilter.value;
    const sortBy = this.elements.taskSort.value;

    let tasks;
    switch (filter) {
      case "active":
        tasks = this.taskManager.getActiveTasks();
        break;
      case "completed":
        tasks = this.taskManager.getCompletedTasks();
        break;
      default:
        tasks = this.taskManager.getAllTasks();
    }

    // Sort tasks
    tasks = this.taskManager.sortTasks(tasks, sortBy, false);

    // Clear current list
    this.elements.taskList.innerHTML = "";

    if (tasks.length === 0) {
      this.renderEmptyState(filter);
      return;
    }

    // Render each task
    tasks.forEach((task) => {
      const taskElement = this.createTaskElement(task);
      this.elements.taskList.appendChild(taskElement);
    });
  }

  createTaskElement(task) {
    const currentTaskId = this.taskManager.currentTaskId;
    const isCurrentTask = task.id === currentTaskId;
    const progress = task.getProgress();

    const taskElement = document.createElement("div");
    taskElement.className = `task-item ${task.completed ? "completed" : ""} ${
      isCurrentTask ? "current" : ""
    }`;
    taskElement.setAttribute("data-task-id", task.id);

    taskElement.innerHTML = `
      <div class="task-header">
        <div class="task-main">
          <div class="task-title">${this.escapeHtml(task.title)}</div>
          ${
            task.description
              ? `<div class="task-description">${this.escapeHtml(
                  task.description
                )}</div>`
              : ""
          }
          <div class="task-meta">
            <span class="task-category">${task.category}</span>
            <span class="task-priority ${task.priority}">Priority: ${
      task.priority
    }</span>
            <span class="task-created">Created: ${this.formatDate(
              task.createdAt
            )}</span>
          </div>
          <div class="task-progress">
            <div class="task-progress-bar">
              <div class="task-progress-fill" style="width: ${progress}%"></div>
            </div>
            <div class="task-progress-text">
              ${task.completedPomodoros}/${
      task.estimatedPomodoros
    } Pomodoros (${Math.round(progress)}%)
              ${task.isOverdue() ? " - Overdue" : ""}
            </div>
          </div>
        </div>
        <div class="task-actions">
          ${
            !task.completed
              ? `
            <button class="task-action-btn select ${
              isCurrentTask ? "active" : ""
            }"
                    onclick="window.taskUI.selectTask('${task.id}')"
                    title="${
                      isCurrentTask ? "Current task" : "Select as current task"
                    }">
              ${isCurrentTask ? "🎯 Current" : "📌 Select"}
            </button>
            <button class="task-action-btn complete"
                    onclick="window.taskUI.completeTask('${task.id}')"
                    title="Mark as complete">
              ✅ Complete
            </button>
          `
              : ""
          }
          <button class="task-action-btn edit"
                  onclick="window.taskUI.editTask('${task.id}')"
                  title="Edit task">
            ✏️ Edit
          </button>
          <button class="task-action-btn delete"
                  onclick="window.taskUI.deleteTask('${task.id}')"
                  title="Delete task">
            🗑️ Delete
          </button>
        </div>
      </div>
    `;

    return taskElement;
  }

  renderEmptyState(filter) {
    const messages = {
      all: {
        icon: "📝",
        message: "No tasks yet",
        submessage: "Create your first task to get started!",
      },
      active: {
        icon: "✅",
        message: "No active tasks",
        submessage: "All tasks are completed or create a new one!",
      },
      completed: {
        icon: "🎉",
        message: "No completed tasks yet",
        submessage: "Complete some tasks to see them here!",
      },
    };

    const config = messages[filter] || messages.all;

    this.elements.taskList.innerHTML = `
      <div class="task-empty-state">
        <div class="empty-icon">${config.icon}</div>
        <div class="empty-message">${config.message}</div>
        <div class="empty-submessage">${config.submessage}</div>
      </div>
    `;
  }

  // Utility methods
  escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }

  formatDate(date) {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  }

  // Public methods for integration with timer
  onSessionComplete(sessionId) {
    const currentTask = this.taskManager.getCurrentTask();
    if (currentTask) {
      const result = this.taskManager.addSessionToTask(
        currentTask.id,
        sessionId
      );
      this.renderTasks();
      this.updateCurrentTaskDisplay();

      if (result.completed) {
        // Task was completed with this session
        setTimeout(() => {
          this.notifications.showTaskComplete(result.task.title);
        }, 1000); // Delay to show after session complete notification
      }
    }
  }

  getCurrentTaskInfo() {
    const currentTask = this.taskManager.getCurrentTask();
    return currentTask
      ? {
          id: currentTask.id,
          title: currentTask.title,
          progress: currentTask.getProgress(),
          completedPomodoros: currentTask.completedPomodoros,
          estimatedPomodoros: currentTask.estimatedPomodoros,
        }
      : null;
  }
}

// Session Record Class
class SessionRecord {
  constructor(type, startTime, taskId = null) {
    this.id = this.generateId();
    this.type = type; // 'work', 'shortBreak', 'longBreak'
    this.startTime = startTime;
    this.endTime = null;
    this.completed = false;
    this.taskId = taskId;
    this.interrupted = false;
  }

  generateId() {
    return (
      "session_" + Date.now() + "_" + Math.random().toString(36).substr(2, 9)
    );
  }

  complete(endTime = new Date()) {
    this.endTime = endTime;
    this.completed = true;
  }

  interrupt(endTime = new Date()) {
    this.endTime = endTime;
    this.interrupted = true;
  }

  getDuration() {
    if (!this.endTime) return 0;
    return Math.floor((this.endTime - this.startTime) / 1000);
  }

  toJSON() {
    return {
      id: this.id,
      type: this.type,
      startTime: this.startTime.toISOString(),
      endTime: this.endTime ? this.endTime.toISOString() : null,
      completed: this.completed,
      taskId: this.taskId,
      interrupted: this.interrupted,
    };
  }

  static fromJSON(data) {
    const session = new SessionRecord(
      data.type,
      new Date(data.startTime),
      data.taskId
    );
    session.id = data.id;
    session.endTime = data.endTime ? new Date(data.endTime) : null;
    session.completed = data.completed || false;
    session.interrupted = data.interrupted || false;
    return session;
  }
}

// Goal Data Model
class Goal {
  constructor(id, type, target, period = "daily", description = "") {
    this.id = id || this.generateId();
    this.type = type; // 'pomodoros', 'tasks', 'focusTime', 'streak'
    this.target = target;
    this.period = period; // 'daily', 'weekly', 'monthly'
    this.description = description;
    this.createdAt = new Date();
    this.active = true;
    this.achievedDates = []; // Array of dates when goal was achieved
  }

  generateId() {
    return "goal_" + Date.now() + "_" + Math.random().toString(36).substr(2, 9);
  }

  toJSON() {
    return {
      id: this.id,
      type: this.type,
      target: this.target,
      period: this.period,
      description: this.description,
      createdAt: this.createdAt.toISOString(),
      active: this.active,
      achievedDates: this.achievedDates.map((date) => date.toISOString()),
    };
  }

  static fromJSON(data) {
    const goal = new Goal(
      data.id,
      data.type,
      data.target,
      data.period,
      data.description
    );
    goal.createdAt = new Date(data.createdAt);
    goal.active = data.active !== undefined ? data.active : true;
    goal.achievedDates = (data.achievedDates || []).map(
      (dateStr) => new Date(dateStr)
    );
    return goal;
  }
}

// Goal Tracker Class
class GoalTracker {
  constructor(statisticsEngine, taskManager) {
    this.statistics = statisticsEngine;
    this.taskManager = taskManager;
    this.goals = new Map();
    this.loadGoals();
  }

  // CRUD Operations
  createGoal(type, target, period = "daily", description = "") {
    if (target <= 0) {
      throw new Error("Goal target must be greater than 0");
    }

    const goal = new Goal(null, type, target, period, description);
    this.goals.set(goal.id, goal);
    this.saveGoals();
    return goal;
  }

  getGoal(id) {
    return this.goals.get(id);
  }

  getAllGoals() {
    return Array.from(this.goals.values());
  }

  getActiveGoals() {
    return this.getAllGoals().filter((goal) => goal.active);
  }

  updateGoal(id, updates) {
    const goal = this.goals.get(id);
    if (!goal) {
      throw new Error("Goal not found");
    }

    if (updates.target !== undefined) {
      if (updates.target <= 0) {
        throw new Error("Goal target must be greater than 0");
      }
      goal.target = updates.target;
    }

    if (updates.description !== undefined) {
      goal.description = updates.description;
    }

    if (updates.active !== undefined) {
      goal.active = updates.active;
    }

    this.saveGoals();
    return goal;
  }

  deleteGoal(id) {
    const deleted = this.goals.delete(id);
    if (deleted) {
      this.saveGoals();
    }
    return deleted;
  }

  // Progress Calculation
  getGoalProgress(goalId, date = new Date()) {
    const goal = this.goals.get(goalId);
    if (!goal) return null;

    const current = this.getCurrentValue(goal, date);
    const progress = Math.min(100, (current / goal.target) * 100);
    const achieved = current >= goal.target;

    return {
      goal,
      current,
      target: goal.target,
      progress,
      achieved,
      remaining: Math.max(0, goal.target - current),
    };
  }

  getCurrentValue(goal, date = new Date()) {
    switch (goal.type) {
      case "pomodoros":
        return this.getPomodorosForPeriod(goal.period, date);
      case "tasks":
        return this.getTasksCompletedForPeriod(goal.period, date);
      case "focusTime":
        return this.getFocusTimeForPeriod(goal.period, date);
      case "streak":
        return this.getCurrentStreak(date);
      default:
        return 0;
    }
  }

  getPomodorosForPeriod(period, date) {
    const sessions = this.getSessionsForPeriod(period, date);
    return sessions.filter((s) => s.type === "work" && s.completed).length;
  }

  getTasksCompletedForPeriod(period, date) {
    const { startDate, endDate } = this.getPeriodRange(period, date);
    const tasks = this.taskManager.getCompletedTasks();

    return tasks.filter((task) => {
      if (!task.completedAt) return false;
      const completedDate = new Date(task.completedAt);
      return completedDate >= startDate && completedDate <= endDate;
    }).length;
  }

  getFocusTimeForPeriod(period, date) {
    const sessions = this.getSessionsForPeriod(period, date);
    const workSessions = sessions.filter(
      (s) => s.type === "work" && s.completed
    );
    return workSessions.reduce(
      (total, session) => total + session.getDuration(),
      0
    );
  }

  getCurrentStreak(date = new Date()) {
    // Calculate consecutive days with at least 1 completed pomodoro
    let streak = 0;
    let currentDate = new Date(date);
    currentDate.setHours(0, 0, 0, 0);

    while (true) {
      const dayPomodoros = this.getPomodorosForPeriod("daily", currentDate);
      if (dayPomodoros > 0) {
        streak++;
        currentDate.setDate(currentDate.getDate() - 1);
      } else {
        break;
      }
    }

    return streak;
  }

  getSessionsForPeriod(period, date) {
    const { startDate, endDate } = this.getPeriodRange(period, date);

    return Array.from(this.statistics.sessions.values()).filter((session) => {
      const sessionDate = new Date(session.startTime);
      return sessionDate >= startDate && sessionDate <= endDate;
    });
  }

  getPeriodRange(period, date) {
    const targetDate = new Date(date);
    let startDate, endDate;

    switch (period) {
      case "daily":
        startDate = new Date(targetDate);
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date(targetDate);
        endDate.setHours(23, 59, 59, 999);
        break;

      case "weekly":
        startDate = new Date(targetDate);
        startDate.setDate(targetDate.getDate() - targetDate.getDay());
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date(startDate);
        endDate.setDate(startDate.getDate() + 6);
        endDate.setHours(23, 59, 59, 999);
        break;

      case "monthly":
        startDate = new Date(
          targetDate.getFullYear(),
          targetDate.getMonth(),
          1
        );
        endDate = new Date(
          targetDate.getFullYear(),
          targetDate.getMonth() + 1,
          0
        );
        endDate.setHours(23, 59, 59, 999);
        break;

      default:
        throw new Error("Invalid period: " + period);
    }

    return { startDate, endDate };
  }

  // Goal Achievement
  checkGoalAchievement(goalId, date = new Date()) {
    const progress = this.getGoalProgress(goalId, date);
    if (!progress || !progress.achieved) return false;

    const goal = progress.goal;
    const dateKey = this.getDateKey(date, goal.period);

    // Check if already recorded for this period
    const alreadyAchieved = goal.achievedDates.some((achievedDate) => {
      return this.getDateKey(achievedDate, goal.period) === dateKey;
    });

    if (!alreadyAchieved) {
      goal.achievedDates.push(new Date(date));
      this.saveGoals();
      return true; // Newly achieved
    }

    return false; // Already achieved for this period
  }

  getDateKey(date, period) {
    const d = new Date(date);
    switch (period) {
      case "daily":
        return d.toISOString().split("T")[0];
      case "weekly":
        const weekStart = new Date(d);
        weekStart.setDate(d.getDate() - d.getDay());
        return weekStart.toISOString().split("T")[0] + "_week";
      case "monthly":
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
          2,
          "0"
        )}_month`;
      default:
        return d.toISOString().split("T")[0];
    }
  }

  // Check all active goals for achievements
  checkAllGoals(date = new Date()) {
    const newAchievements = [];

    this.getActiveGoals().forEach((goal) => {
      if (this.checkGoalAchievement(goal.id, date)) {
        const progress = this.getGoalProgress(goal.id, date);
        newAchievements.push({
          goal,
          progress,
        });
      }
    });

    return newAchievements;
  }

  // Statistics
  getGoalStats() {
    const allGoals = this.getAllGoals();
    const activeGoals = this.getActiveGoals();

    const totalAchievements = allGoals.reduce(
      (sum, goal) => sum + goal.achievedDates.length,
      0
    );
    const todayProgress = activeGoals.map((goal) =>
      this.getGoalProgress(goal.id)
    );
    const achievedToday = todayProgress.filter((p) => p.achieved).length;

    return {
      totalGoals: allGoals.length,
      activeGoals: activeGoals.length,
      totalAchievements,
      achievedToday,
      averageProgress:
        todayProgress.length > 0
          ? todayProgress.reduce((sum, p) => sum + p.progress, 0) /
            todayProgress.length
          : 0,
    };
  }

  // Preset Goals
  createPresetGoals() {
    const presets = [
      {
        type: "pomodoros",
        target: 8,
        period: "daily",
        description: "Complete 8 Pomodoros daily",
      },
      {
        type: "tasks",
        target: 3,
        period: "daily",
        description: "Complete 3 tasks daily",
      },
      {
        type: "focusTime",
        target: 7200,
        period: "daily",
        description: "2 hours of focused work daily",
      }, // 2 hours in seconds
      {
        type: "streak",
        target: 7,
        period: "weekly",
        description: "Maintain a 7-day streak",
      },
      {
        type: "pomodoros",
        target: 40,
        period: "weekly",
        description: "Complete 40 Pomodoros weekly",
      },
    ];

    presets.forEach((preset) => {
      try {
        this.createGoal(
          preset.type,
          preset.target,
          preset.period,
          preset.description
        );
      } catch (error) {
        console.warn("Failed to create preset goal:", error);
      }
    });
  }

  // Storage
  saveGoals() {
    try {
      const goalsData = {
        goals: Object.fromEntries(
          Array.from(this.goals.entries()).map(([id, goal]) => [
            id,
            goal.toJSON(),
          ])
        ),
        lastSaved: new Date().toISOString(),
      };
      localStorage.setItem("rfocus_goals", JSON.stringify(goalsData));
    } catch (error) {
      console.error("Failed to save goals:", error);
    }
  }

  loadGoals() {
    try {
      const goalsData = localStorage.getItem("rfocus_goals");
      if (goalsData) {
        const data = JSON.parse(goalsData);
        if (data.goals) {
          this.goals.clear();
          Object.entries(data.goals).forEach(([id, goalData]) => {
            const goal = Goal.fromJSON(goalData);
            this.goals.set(id, goal);
          });
        }
      }
    } catch (error) {
      console.error("Failed to load goals:", error);
      this.goals.clear();
    }
  }
}

// Statistics Engine Class
class StatisticsEngine {
  constructor() {
    this.sessions = new Map();
    this.loadSessions();
  }

  recordSession(sessionRecord) {
    this.sessions.set(sessionRecord.id, sessionRecord);
    this.saveSessions();
    return sessionRecord;
  }

  getSessionsByDate(date) {
    const targetDate = new Date(date);
    targetDate.setHours(0, 0, 0, 0);
    const nextDate = new Date(targetDate);
    nextDate.setDate(nextDate.getDate() + 1);

    return Array.from(this.sessions.values()).filter((session) => {
      const sessionDate = new Date(session.startTime);
      return sessionDate >= targetDate && sessionDate < nextDate;
    });
  }

  getTodayStats() {
    const today = new Date();
    const todaySessions = this.getSessionsByDate(today);

    const workSessions = todaySessions.filter(
      (s) => s.type === "work" && s.completed
    );
    const totalPomodoros = workSessions.length;
    const totalFocusTime = workSessions.reduce(
      (sum, s) => sum + s.getDuration(),
      0
    );

    return {
      totalPomodoros,
      totalFocusTime,
      completedSessions: todaySessions.filter((s) => s.completed).length,
      interruptedSessions: todaySessions.filter((s) => s.interrupted).length,
      averageSessionLength:
        workSessions.length > 0 ? totalFocusTime / workSessions.length : 0,
    };
  }

  getWeeklyStats() {
    const today = new Date();
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay());
    weekStart.setHours(0, 0, 0, 0);

    const weekSessions = Array.from(this.sessions.values()).filter(
      (session) => {
        return new Date(session.startTime) >= weekStart;
      }
    );

    const dailyStats = {};
    for (let i = 0; i < 7; i++) {
      const date = new Date(weekStart);
      date.setDate(weekStart.getDate() + i);
      const dayName = date.toLocaleDateString("en-US", { weekday: "short" });
      const daySessions = this.getSessionsByDate(date);
      dailyStats[dayName] = daySessions.filter(
        (s) => s.type === "work" && s.completed
      ).length;
    }

    return {
      totalPomodoros: weekSessions.filter(
        (s) => s.type === "work" && s.completed
      ).length,
      dailyBreakdown: dailyStats,
      weekSessions,
    };
  }

  saveSessions() {
    try {
      const sessionsData = {
        sessions: Object.fromEntries(
          Array.from(this.sessions.entries()).map(([id, session]) => [
            id,
            session.toJSON(),
          ])
        ),
        lastSaved: new Date().toISOString(),
      };
      localStorage.setItem("rfocus_sessions", JSON.stringify(sessionsData));
    } catch (error) {
      console.error("Failed to save sessions:", error);
    }
  }

  loadSessions() {
    try {
      const sessionsData = localStorage.getItem("rfocus_sessions");
      if (sessionsData) {
        const data = JSON.parse(sessionsData);
        if (data.sessions) {
          this.sessions.clear();
          Object.entries(data.sessions).forEach(([id, sessionData]) => {
            const session = SessionRecord.fromJSON(sessionData);
            this.sessions.set(id, session);
          });
        }
      }
    } catch (error) {
      console.error("Failed to load sessions:", error);
      this.sessions.clear();
    }
  }
}

// UI Controller Class
class UIController {
  constructor(
    timerEngine,
    notificationManager,
    taskManager,
    taskUI,
    statisticsEngine
  ) {
    this.timer = timerEngine;
    this.notifications = notificationManager;
    this.taskManager = taskManager;
    this.taskUI = taskUI;
    this.statistics = statisticsEngine;
    this.currentSession = null;

    this.elements = {
      timerDisplay: document.querySelector(".timer-display"),
      startBtn: document.querySelector(".start-btn"),
      message: document.querySelector(".message"),
      tabs: document.querySelectorAll(".tab"),
      pomodoroTab: document.querySelector('[data-mode="pomodoro"]'),
      shortTab: document.querySelector('[data-mode="short"]'),
      longTab: document.querySelector('[data-mode="long"]'),
    };

    this.init();
  }

  init() {
    this.bindEvents();
    this.updateDisplay();
  }

  bindEvents() {
    // Timer events
    this.timer.addEventListener("tick", (e) => this.onTick(e.detail));
    this.timer.addEventListener("start", (e) => this.onStart(e.detail));
    this.timer.addEventListener("pause", (e) => this.onPause(e.detail));
    this.timer.addEventListener("resume", (e) => this.onResume(e.detail));
    this.timer.addEventListener("sessionComplete", (e) =>
      this.onSessionComplete(e.detail)
    );
    this.timer.addEventListener("breakComplete", (e) =>
      this.onBreakComplete(e.detail)
    );
    this.timer.addEventListener("cycleComplete", (e) =>
      this.onCycleComplete(e.detail)
    );
    this.timer.addEventListener("modeChange", (e) =>
      this.onModeChange(e.detail)
    );
    this.timer.addEventListener("reset", (e) => this.onReset(e.detail));

    // UI events
    this.elements.startBtn.addEventListener("click", () => {
      // Resume audio context on user interaction
      this.notifications.audioManager.resumeAudioContext();
      this.timer.start();
    });

    // Tab switching (manual mode switching)
    this.elements.tabs.forEach((tab) => {
      tab.addEventListener("click", () => {
        if (!this.timer.isRunning) {
          this.switchTab(tab.dataset.mode);
        }
      });
    });
  }

  onTick(detail) {
    this.elements.timerDisplay.textContent = detail.formattedTime;
    this.updatePageTitle(detail.formattedTime, detail.mode);
  }

  onStart(detail) {
    this.elements.startBtn.textContent = "PAUSE";
    this.updateMessage(detail.mode, detail.sessionCount);

    // Start new session record
    const currentTask = this.taskManager.getCurrentTask();
    this.currentSession = new SessionRecord(
      detail.mode,
      new Date(),
      currentTask ? currentTask.id : null
    );
  }

  onPause(detail) {
    this.elements.startBtn.textContent = "RESUME";
  }

  onResume(detail) {
    this.elements.startBtn.textContent = "PAUSE";
  }

  onSessionComplete(detail) {
    this.elements.startBtn.textContent = "START";

    // Complete current session record
    if (this.currentSession) {
      this.currentSession.complete();
      this.statistics.recordSession(this.currentSession);

      // Associate session with current task
      if (this.currentSession.taskId) {
        this.taskUI.onSessionComplete(this.currentSession.id);
      }
    }

    this.notifications.showSessionComplete(
      detail.sessionCount,
      detail.cycleCount
    );
  }

  onBreakComplete(detail) {
    this.elements.startBtn.textContent = "START";

    // Complete current session record (break session)
    if (this.currentSession) {
      this.currentSession.complete();
      this.statistics.recordSession(this.currentSession);
    }

    this.notifications.showBreakComplete(detail.sessionCount);
  }

  onCycleComplete(detail) {
    this.notifications.showCycleComplete(detail.cycleCount);
  }

  onModeChange(detail) {
    this.updateActiveTab(detail.currentMode);
    this.updateMessage(detail.currentMode, detail.sessionCount);
    this.elements.timerDisplay.textContent = this.timer.formatTime(
      detail.timeRemaining
    );
  }

  onReset(detail) {
    this.elements.startBtn.textContent = "START";
    this.updateActiveTab(detail.mode);
    this.updateMessage(detail.mode, detail.sessionCount);
    this.elements.timerDisplay.textContent = this.timer.formatTime(
      this.timer.timeRemaining
    );

    // Mark current session as interrupted if it exists
    if (this.currentSession && !this.currentSession.completed) {
      this.currentSession.interrupt();
      this.statistics.recordSession(this.currentSession);
      this.currentSession = null;
    }
  }

  updateDisplay() {
    const state = this.timer.getCurrentState();
    this.elements.timerDisplay.textContent = state.formattedTime;
    this.updateActiveTab(state.mode);
    this.updateMessage(state.mode, state.sessionCount);
    this.elements.startBtn.textContent = state.isRunning ? "PAUSE" : "START";
  }

  updateActiveTab(mode) {
    this.elements.tabs.forEach((tab) => tab.classList.remove("active"));

    switch (mode) {
      case TimerEngine.MODES.WORK:
        this.elements.pomodoroTab.classList.add("active");
        break;
      case TimerEngine.MODES.SHORT_BREAK:
        this.elements.shortTab.classList.add("active");
        break;
      case TimerEngine.MODES.LONG_BREAK:
        this.elements.longTab.classList.add("active");
        break;
    }
  }

  updateMessage(mode, sessionCount) {
    const sessionInfo = this.timer.getSessionInfo();
    const currentTaskInfo = this.taskUI.getCurrentTaskInfo();
    let message = "";

    switch (mode) {
      case TimerEngine.MODES.WORK:
        if (currentTaskInfo) {
          message = `#${sessionInfo.currentSession}<br />Working on: ${currentTaskInfo.title}`;
        } else {
          message = `#${sessionInfo.currentSession}<br />Time to focus!`;
        }
        break;
      case TimerEngine.MODES.SHORT_BREAK:
        message = `Break #${sessionCount}<br />Take a short break!`;
        break;
      case TimerEngine.MODES.LONG_BREAK:
        message = `Long Break<br />Great job! Relax and recharge.`;
        break;
    }

    this.elements.message.innerHTML = message;
  }

  updatePageTitle(formattedTime, mode) {
    const modeText = mode === TimerEngine.MODES.WORK ? "Focus" : "Break";
    document.title = `${formattedTime} - ${modeText} | RFocus Pro`;
  }

  switchTab(mode) {
    // Manual tab switching when timer is not running
    let timerMode;
    switch (mode) {
      case "pomodoro":
        timerMode = TimerEngine.MODES.WORK;
        break;
      case "short":
        timerMode = TimerEngine.MODES.SHORT_BREAK;
        break;
      case "long":
        timerMode = TimerEngine.MODES.LONG_BREAK;
        break;
    }

    if (timerMode) {
      this.timer.switchToMode(timerMode);
    }
  }
}

// Page Router Class
class PageRouter {
  constructor() {
    this.currentPage = "timer";
    this.pages = ["timer", "goals", "settings"];
    this.init();
  }

  init() {
    // Bind navigation events
    document.querySelectorAll(".nav-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const page = e.target.dataset.page;
        this.navigateTo(page);
      });
    });
  }

  navigateTo(page) {
    if (!this.pages.includes(page)) return;

    // Hide all pages
    this.pages.forEach((p) => {
      const pageElement = document.getElementById(`${p}-page`);
      if (pageElement) {
        pageElement.style.display = "none";
      }
    });

    // Show target page
    const targetPage = document.getElementById(`${page}-page`);
    if (targetPage) {
      targetPage.style.display = "block";
    }

    // Update navigation
    document.querySelectorAll(".nav-btn").forEach((btn) => {
      btn.classList.remove("active");
      if (btn.dataset.page === page) {
        btn.classList.add("active");
      }
    });

    this.currentPage = page;

    // Trigger page-specific updates
    this.onPageChange(page);
  }

  onPageChange(page) {
    switch (page) {
      case "goals":
        if (window.goalUI) {
          window.goalUI.refresh();
        }
        break;
      case "settings":
        if (window.settingsUI) {
          window.settingsUI.loadSettings();
        }
        break;
    }
  }
}

// Goal UI Class
class GoalUI {
  constructor(goalTracker, notificationManager) {
    this.goalTracker = goalTracker;
    this.notifications = notificationManager;
    this.elements = {
      todayPomodoros: document.getElementById("today-pomodoros"),
      todayTasks: document.getElementById("today-tasks"),
      todayFocusTime: document.getElementById("today-focus-time"),
      currentStreak: document.getElementById("current-streak"),
      goalsList: document.getElementById("goals-list"),
      addGoalBtn: document.getElementById("add-goal-btn"),
      addGoalForm: document.getElementById("add-goal-form"),
      goalType: document.getElementById("goal-type"),
      goalTarget: document.getElementById("goal-target"),
      goalPeriod: document.getElementById("goal-period"),
      goalDescription: document.getElementById("goal-description"),
      saveGoalBtn: document.getElementById("save-goal"),
      cancelGoalBtn: document.getElementById("cancel-goal"),
      detailedStats: document.getElementById("detailed-stats"),
    };

    this.editingGoalId = null;
    this.init();
  }

  init() {
    try {
      this.bindEvents();
      this.refresh();
    } catch (error) {
      console.error("GoalUI initialization error:", error);
    }
  }

  bindEvents() {
    this.elements.addGoalBtn.addEventListener("click", () =>
      this.showAddGoalForm()
    );
    this.elements.cancelGoalBtn.addEventListener("click", () =>
      this.hideAddGoalForm()
    );
    this.elements.saveGoalBtn.addEventListener("click", () => this.saveGoal());

    // Stats tabs
    document.querySelectorAll(".stats-tab").forEach((tab) => {
      tab.addEventListener("click", (e) => {
        document
          .querySelectorAll(".stats-tab")
          .forEach((t) => t.classList.remove("active"));
        e.target.classList.add("active");
        this.updateDetailedStats(e.target.dataset.period);
      });
    });
  }

  refresh() {
    this.updateOverview();
    this.renderGoals();
    this.updateDetailedStats("week");
  }

  updateOverview() {
    const todayStats = this.goalTracker.statistics.getTodayStats();

    this.elements.todayPomodoros.textContent = todayStats.totalPomodoros;
    this.elements.todayTasks.textContent = this.getTodayCompletedTasks();
    this.elements.todayFocusTime.textContent = this.formatTime(
      todayStats.totalFocusTime
    );
    this.elements.currentStreak.textContent =
      this.goalTracker.getCurrentStreak();
  }

  getTodayCompletedTasks() {
    const today = new Date();
    const startOfDay = new Date(today);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(today);
    endOfDay.setHours(23, 59, 59, 999);

    const tasks = this.goalTracker.taskManager.getCompletedTasks();
    return tasks.filter((task) => {
      if (!task.completedAt) return false;
      const completedDate = new Date(task.completedAt);
      return completedDate >= startOfDay && completedDate <= endOfDay;
    }).length;
  }

  formatTime(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  }

  renderGoals() {
    const goals = this.goalTracker.getActiveGoals();

    if (goals.length === 0) {
      this.renderGoalsEmptyState();
      return;
    }

    this.elements.goalsList.innerHTML = "";

    goals.forEach((goal) => {
      const progress = this.goalTracker.getGoalProgress(goal.id);
      const goalElement = this.createGoalElement(goal, progress);
      this.elements.goalsList.appendChild(goalElement);
    });
  }

  createGoalElement(goal, progress) {
    const goalElement = document.createElement("div");
    goalElement.className = `goal-item ${progress.achieved ? "achieved" : ""}`;
    goalElement.setAttribute("data-goal-id", goal.id);

    const typeLabels = {
      pomodoros: "Pomodoros",
      tasks: "Tasks",
      focusTime: "Focus Time",
      streak: "Streak Days",
    };

    const targetDisplay =
      goal.type === "focusTime" ? this.formatTime(goal.target) : goal.target;

    const currentDisplay =
      goal.type === "focusTime"
        ? this.formatTime(progress.current)
        : progress.current;

    goalElement.innerHTML = `
      <div class="goal-header">
        <div class="goal-info">
          <div class="goal-title">
            ${typeLabels[goal.type]} Goal
            ${
              progress.achieved
                ? '<span class="achievement-indicator">✨ Achieved!</span>'
                : ""
            }
          </div>
          ${
            goal.description
              ? `<div class="goal-description">${this.escapeHtml(
                  goal.description
                )}</div>`
              : ""
          }
          <div class="goal-meta">
            ${
              goal.period.charAt(0).toUpperCase() + goal.period.slice(1)
            } • Target: ${targetDisplay}
          </div>
        </div>
        <div class="goal-actions">
          <button class="goal-action-btn edit" onclick="window.goalUI.editGoal('${
            goal.id
          }')" title="Edit goal">
            ✏️ Edit
          </button>
          <button class="goal-action-btn delete" onclick="window.goalUI.deleteGoal('${
            goal.id
          }')" title="Delete goal">
            🗑️ Delete
          </button>
        </div>
      </div>
      <div class="goal-progress">
        <div class="goal-progress-bar">
          <div class="goal-progress-fill ${progress.achieved ? "achieved" : ""}"
               style="width: ${Math.min(100, progress.progress)}%"></div>
        </div>
        <div class="goal-progress-text">
          <span>${currentDisplay} / ${targetDisplay}</span>
          <span>${Math.round(progress.progress)}%</span>
        </div>
      </div>
    `;

    return goalElement;
  }

  renderGoalsEmptyState() {
    this.elements.goalsList.innerHTML = `
      <div class="goals-empty-state">
        <div class="empty-icon">🎯</div>
        <div class="empty-message">No goals set yet</div>
        <div class="empty-submessage">Create your first goal to track your progress!</div>
      </div>
    `;
  }

  showAddGoalForm() {
    this.editingGoalId = null;
    this.elements.addGoalForm.style.display = "block";
    this.elements.addGoalBtn.style.display = "none";
    this.resetGoalForm();
  }

  hideAddGoalForm() {
    this.elements.addGoalForm.style.display = "none";
    this.elements.addGoalBtn.style.display = "block";
    this.editingGoalId = null;
  }

  resetGoalForm() {
    this.elements.goalType.value = "pomodoros";
    this.elements.goalTarget.value = "8";
    this.elements.goalPeriod.value = "daily";
    this.elements.goalDescription.value = "";
  }

  saveGoal() {
    const type = this.elements.goalType.value;
    const target = parseInt(this.elements.goalTarget.value);
    const period = this.elements.goalPeriod.value;
    const description = this.elements.goalDescription.value.trim();

    try {
      if (this.editingGoalId) {
        this.goalTracker.updateGoal(this.editingGoalId, {
          target,
          description,
        });
      } else {
        this.goalTracker.createGoal(type, target, period, description);
      }

      this.hideAddGoalForm();
      this.renderGoals();

      this.notifications.showToast({
        type: "success",
        icon: "🎯",
        title: this.editingGoalId ? "Goal Updated!" : "Goal Created!",
        message: `Your ${type} goal has been ${
          this.editingGoalId ? "updated" : "created"
        }.`,
        duration: 2000,
      });
    } catch (error) {
      this.notifications.showToast({
        type: "error",
        icon: "❌",
        title: "Error",
        message: error.message,
        duration: 3000,
      });
    }
  }

  editGoal(goalId) {
    const goal = this.goalTracker.getGoal(goalId);
    if (!goal) return;

    this.editingGoalId = goalId;
    this.elements.goalType.value = goal.type;
    this.elements.goalTarget.value = goal.target;
    this.elements.goalPeriod.value = goal.period;
    this.elements.goalDescription.value = goal.description;

    this.showAddGoalForm();
  }

  deleteGoal(goalId) {
    const goal = this.goalTracker.getGoal(goalId);
    if (!goal) return;

    if (confirm("Are you sure you want to delete this goal?")) {
      this.goalTracker.deleteGoal(goalId);
      this.renderGoals();

      this.notifications.showToast({
        type: "info",
        icon: "🗑️",
        title: "Goal Deleted",
        message: "The goal has been removed.",
        duration: 2000,
      });
    }
  }

  updateDetailedStats(period) {
    const weeklyStats = this.goalTracker.statistics.getWeeklyStats();

    this.elements.detailedStats.innerHTML = `
      <div class="detailed-stat-card">
        <div class="detailed-stat-title">Total Pomodoros</div>
        <div class="detailed-stat-value">${weeklyStats.totalPomodoros}</div>
      </div>
      <div class="detailed-stat-card">
        <div class="detailed-stat-title">Most Productive Day</div>
        <div class="detailed-stat-value">${this.getMostProductiveDay(
          weeklyStats.dailyBreakdown
        )}</div>
      </div>
      <div class="detailed-stat-card">
        <div class="detailed-stat-title">Average Daily</div>
        <div class="detailed-stat-value">${Math.round(
          weeklyStats.totalPomodoros / 7
        )}</div>
      </div>
      <div class="detailed-stat-card">
        <div class="detailed-stat-title">Goals Achieved</div>
        <div class="detailed-stat-value">${this.getGoalsAchievedCount()}</div>
      </div>
    `;
  }

  getMostProductiveDay(dailyBreakdown) {
    let maxDay = "None";
    let maxCount = 0;

    Object.entries(dailyBreakdown).forEach(([day, count]) => {
      if (count > maxCount) {
        maxCount = count;
        maxDay = day;
      }
    });

    return maxCount > 0 ? maxDay : "None";
  }

  getGoalsAchievedCount() {
    const goals = this.goalTracker.getActiveGoals();
    return goals.filter((goal) => {
      const progress = this.goalTracker.getGoalProgress(goal.id);
      return progress.achieved;
    }).length;
  }

  // Check for goal achievements
  checkGoalAchievements() {
    const achievements = this.goalTracker.checkAllGoals();
    achievements.forEach((achievement) => {
      this.notifications.showGoalAchieved(
        achievement.goal.type,
        Math.round(achievement.progress.progress)
      );
    });

    if (achievements.length > 0) {
      this.refresh();
    }
  }

  escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }
}

// Settings UI Class
class SettingsUI {
  constructor(timerEngine, notificationManager) {
    this.timer = timerEngine;
    this.notifications = notificationManager;
    this.elements = {
      workDuration: document.getElementById("work-duration"),
      shortBreakDuration: document.getElementById("short-break-duration"),
      longBreakDuration: document.getElementById("long-break-duration"),
      soundEnabled: document.getElementById("sound-enabled"),
      notificationVolume: document.getElementById("notification-volume"),
      autoStartBreaks: document.getElementById("auto-start-breaks"),
      autoStartWork: document.getElementById("auto-start-work"),
      saveSettings: document.getElementById("save-settings"),
      resetSettings: document.getElementById("reset-settings"),
    };

    this.init();
  }

  init() {
    this.bindEvents();
    this.loadSettings();
  }

  bindEvents() {
    this.elements.saveSettings.addEventListener("click", () =>
      this.saveSettings()
    );
    this.elements.resetSettings.addEventListener("click", () =>
      this.resetSettings()
    );

    // Real-time volume adjustment
    this.elements.notificationVolume.addEventListener("input", (e) => {
      this.notifications.audioManager.setVolume(e.target.value / 100);
    });

    // Real-time sound toggle
    this.elements.soundEnabled.addEventListener("change", (e) => {
      this.notifications.audioManager.setSoundEnabled(e.target.checked);
    });
  }

  loadSettings() {
    try {
      const settings = JSON.parse(
        localStorage.getItem("rfocus_settings") || "{}"
      );

      this.elements.workDuration.value = settings.workDuration || 25;
      this.elements.shortBreakDuration.value = settings.shortBreakDuration || 5;
      this.elements.longBreakDuration.value = settings.longBreakDuration || 15;
      this.elements.soundEnabled.checked = settings.soundEnabled !== false;
      this.elements.notificationVolume.value =
        settings.notificationVolume || 50;
      this.elements.autoStartBreaks.checked =
        settings.autoStartBreaks !== false;
      this.elements.autoStartWork.checked = settings.autoStartWork !== false;

      // Apply settings
      this.applySettings(settings);
    } catch (error) {
      console.error("Failed to load settings:", error);
    }
  }

  saveSettings() {
    const settings = {
      workDuration: parseInt(this.elements.workDuration.value),
      shortBreakDuration: parseInt(this.elements.shortBreakDuration.value),
      longBreakDuration: parseInt(this.elements.longBreakDuration.value),
      soundEnabled: this.elements.soundEnabled.checked,
      notificationVolume: parseInt(this.elements.notificationVolume.value),
      autoStartBreaks: this.elements.autoStartBreaks.checked,
      autoStartWork: this.elements.autoStartWork.checked,
    };

    try {
      localStorage.setItem("rfocus_settings", JSON.stringify(settings));
      this.applySettings(settings);

      this.notifications.showToast({
        type: "success",
        icon: "⚙️",
        title: "Settings Saved!",
        message: "Your preferences have been updated.",
        duration: 2000,
      });
    } catch (error) {
      this.notifications.showToast({
        type: "error",
        icon: "❌",
        title: "Error",
        message: "Failed to save settings.",
        duration: 3000,
      });
    }
  }

  applySettings(settings) {
    // Update timer durations
    TimerEngine.TIME_SETTINGS.work = (settings.workDuration || 25) * 60;
    TimerEngine.TIME_SETTINGS.shortBreak =
      (settings.shortBreakDuration || 5) * 60;
    TimerEngine.TIME_SETTINGS.longBreak =
      (settings.longBreakDuration || 15) * 60;

    // Update audio settings
    this.notifications.audioManager.setSoundEnabled(
      settings.soundEnabled !== false
    );
    this.notifications.audioManager.setVolume(
      (settings.notificationVolume || 50) / 100
    );

    // Reset timer if not running
    if (!this.timer.isRunning) {
      this.timer.timeRemaining =
        TimerEngine.TIME_SETTINGS[this.timer.currentMode];
      if (window.ui) {
        window.ui.updateDisplay();
      }
    }
  }

  resetSettings() {
    if (confirm("Are you sure you want to reset all settings to defaults?")) {
      localStorage.removeItem("rfocus_settings");
      this.loadSettings();

      this.notifications.showToast({
        type: "info",
        icon: "🔄",
        title: "Settings Reset",
        message: "All settings have been restored to defaults.",
        duration: 2000,
      });
    }
  }
}

// Error handling utility
function handleError(error, context = "Application") {
  console.error(`${context} Error:`, error);

  // Show user-friendly error message
  if (window.notifications) {
    window.notifications.showToast({
      type: "error",
      icon: "⚠️",
      title: "Something went wrong",
      message: "Please refresh the page if issues persist.",
      duration: 5000,
    });
  }
}

// Initialize the application with error handling
document.addEventListener("DOMContentLoaded", () => {
  try {
    const timerEngine = new TimerEngine();
    const notificationManager = new NotificationManager();
    const taskManager = new TaskManager();
    const statisticsEngine = new StatisticsEngine();
    const goalTracker = new GoalTracker(statisticsEngine, taskManager);
    const taskUI = new TaskUI(taskManager, notificationManager);
    const goalUI = new GoalUI(goalTracker, notificationManager);
    const settingsUI = new SettingsUI(timerEngine, notificationManager);
    const pageRouter = new PageRouter();
    const uiController = new UIController(
      timerEngine,
      notificationManager,
      taskManager,
      taskUI,
      statisticsEngine
    );

    // Enhanced UI Controller to check goals
    const originalOnSessionComplete =
      uiController.onSessionComplete.bind(uiController);
    uiController.onSessionComplete = function (detail) {
      try {
        originalOnSessionComplete(detail);
        // Check for goal achievements after session completion
        setTimeout(() => {
          try {
            goalUI.checkGoalAchievements();
          } catch (error) {
            handleError(error, "Goal Achievement Check");
          }
        }, 1000);
      } catch (error) {
        handleError(error, "Session Complete Handler");
      }
    };

    // Make components globally accessible for debugging and UI interactions
    window.timer = timerEngine;
    window.notifications = notificationManager;
    window.taskManager = taskManager;
    window.taskUI = taskUI;
    window.statistics = statisticsEngine;
    window.goalTracker = goalTracker;
    window.goalUI = goalUI;
    window.settingsUI = settingsUI;
    window.pageRouter = pageRouter;
    window.ui = uiController;

    // Add global error handlers
    window.addEventListener("error", (event) => {
      handleError(event.error, "Global");
    });

    window.addEventListener("unhandledrejection", (event) => {
      handleError(event.reason, "Promise Rejection");
      event.preventDefault();
    });

    console.log("🍅 RFocus Pro initialized successfully!");

    // Hide loading indicator and show app
    setTimeout(() => {
      const loadingIndicator = document.getElementById("loading-indicator");
      if (loadingIndicator) {
        document.body.classList.add("app-ready");
        setTimeout(() => {
          loadingIndicator.remove();
        }, 500);
      }
    }, 500);
  } catch (error) {
    handleError(error, "Initialization");

    // Fallback: show basic error message
    document.body.innerHTML = `
      <div style="
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        height: 100vh;
        text-align: center;
        color: white;
        font-family: 'Segoe UI', sans-serif;
        background: #4a47e5;
      ">
        <h1>⚠️ Application Error</h1>
        <p>Sorry, something went wrong while loading RFocus Pro.</p>
        <button onclick="location.reload()" style="
          margin-top: 20px;
          padding: 10px 20px;
          background: rgba(255, 255, 255, 0.2);
          color: white;
          border: 1px solid rgba(255, 255, 255, 0.3);
          border-radius: 5px;
          cursor: pointer;
        ">Reload Page</button>
      </div>
    `;
  }
});
