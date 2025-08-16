class NotificationManager {
  constructor() {
    this.synth = window.speechSynthesis;
    this.notificationSound = new Audio(
      "data:audio/wav;base64,//uQRAAAAWM...AACU=" // (use the correct base64 string for your notification sound)
    );
  }

  playNotificationSound() {
    this.notificationSound.play();
  }

  speak(text) {
    if (this.synth.speaking) {
      this.synth.cancel();
    }
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.9;
    utterance.pitch = 1;
    this.synth.speak(utterance);
  }

  notify(message, shouldSpeak = true) {
    this.playNotificationSound();
    if (shouldSpeak) {
      setTimeout(() => this.speak(message), 500);
    }
  }
}

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
    this.notificationManager = new NotificationManager();

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
      const message =
        this.timer.currentMode === "pomodoro"
          ? "25 minutes is up! Time to take a break. Remember to drink a glass of water!"
          : "Break time is over! Ready to focus?";
      this.notificationManager.notify(message);
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

class MusicPlayer {
  constructor() {
    // Spotify Client ID - You need to replace this with your own from Spotify Developer Dashboard
    this.clientId = "a661f417cc3d44eabe17a7b3d8143271";
    this.redirectUri = window.location.origin;

    // Spotify playlists for different moods (these are actual Spotify playlist IDs)
    this.playlists = [
      {
        title: "Workout Motivation",
        id: "37i9dQZF1DX5csH3Qm8KGX", // Spotify's "Beast Mode" playlist
      },
      {
        title: "Coding Focus",
        id: "37i9dQZF1DX5trt9i14X7j", // Spotify's "Deep Focus" playlist
      },
      {
        title: "Programming Zone",
        id: "37i9dQZF1DWZZbwlv3Vmtr", // Spotify's "Atmospheric Calm" playlist
      },
      {
        title: "Gym Beats",
        id: "37i9dQZF1DX76t638V6CA8", // Spotify's "Power Workout" playlist
      },
    ];

    this.currentPlaylistIndex = 0;
    this.isPlaying = false;
    this.lastVolume = 0.5;
    this.player = null;
    this.deviceId = null;
    this.token = null;

    this.initializeUI();
    this.initializeSpotify();
    this.setupEventListeners();
  }

  initializeUI() {
    this.playBtn = document.querySelector(".play-btn");
    this.prevBtn = document.querySelector(".prev-btn");
    this.nextBtn = document.querySelector(".next-btn");
    this.volumeSlider = document.querySelector(".volume-slider");
    this.volumeIcon = document.querySelector(".volume-icon");
    this.songTitle = document.querySelector(".song-title");

    this.songTitle.textContent = "Connecting to Spotify...";
    this.volumeSlider.value = 50;
  }

  async initializeSpotify() {
    // Initialize Spotify Web Playback SDK
    window.onSpotifyWebPlaybackSDKReady = () => {
      this.player = new Spotify.Player({
        name: "RFocus Pro Player",
        getOAuthToken: (cb) => {
          cb(this.token);
        },
      });

      // Error handling
      this.player.addListener("initialization_error", ({ message }) => {
        console.error("Failed to initialize:", message);
        this.songTitle.textContent = "Failed to initialize Spotify player";
      });

      this.player.addListener("authentication_error", ({ message }) => {
        console.error("Failed to authenticate:", message);
        this.songTitle.textContent = "Please login to Spotify";
        this.authenticateWithSpotify();
      });

      this.player.addListener("account_error", ({ message }) => {
        console.error("Failed to validate Spotify account:", message);
        this.songTitle.textContent = "Premium account required";
      });

      // Playback status updates
      this.player.addListener("player_state_changed", (state) => {
        if (state) {
          this.isPlaying = !state.paused;
          this.playBtn.textContent = this.isPlaying ? "⏸️" : "▶️";
          if (state.track_window.current_track) {
            this.songTitle.textContent = state.track_window.current_track.name;
          }
        }
      });

      // Ready
      this.player.addListener("ready", ({ device_id }) => {
        this.deviceId = device_id;
        this.songTitle.textContent = "Ready to play";
      });

      // Connect to the player!
      this.player.connect();
    };
  }

  async authenticateWithSpotify() {
    // Redirect to Spotify login
    const scopes = [
      "streaming",
      "user-read-email",
      "user-read-private",
      "user-modify-playback-state",
    ];

    const authUrl = `https://accounts.spotify.com/authorize?client_id=${
      this.clientId
    }&response_type=token&redirect_uri=${encodeURIComponent(
      this.redirectUri
    )}&scope=${encodeURIComponent(scopes.join(" "))}`;

    window.location.href = authUrl;
  }

  setupEventListeners() {
    // Check for Spotify access token in URL after authentication
    if (window.location.hash) {
      const params = new URLSearchParams(window.location.hash.substring(1));
      this.token = params.get("access_token");
      window.location.hash = "";
    }

    this.playBtn.addEventListener("click", () => this.togglePlay());
    this.prevBtn.addEventListener("click", () => this.prevPlaylist());
    this.nextBtn.addEventListener("click", () => this.nextPlaylist());
    this.volumeSlider.addEventListener("input", (e) =>
      this.setVolume(e.target.value)
    );
    this.volumeIcon.addEventListener("click", () => this.toggleMute());
  }

  async loadCurrentSong() {
    const song = this.songs[this.currentSongIndex];
    this.audio.src = song.url;
    this.songTitle.textContent = "Loading...";

    try {
      await this.audio.load();
      this.songTitle.textContent = song.title;
    } catch (error) {
      console.error("Error loading song:", error);
      this.songTitle.textContent = "Error loading song";
    }
  }

  async togglePlay() {
    if (!this.token) {
      this.authenticateWithSpotify();
      return;
    }

    if (this.player) {
      const state = await this.player.getCurrentState();
      if (!state) {
        // Start playing the current playlist
        await fetch(
          `https://api.spotify.com/v1/me/player/play?device_id=${this.deviceId}`,
          {
            method: "PUT",
            headers: {
              Authorization: `Bearer ${this.token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              context_uri: `spotify:playlist:${
                this.playlists[this.currentPlaylistIndex].id
              }`,
              position_ms: 0,
            }),
          }
        );
      } else {
        await this.player.togglePlay();
      }
    } else {
      this.songTitle.textContent = "Spotify player not ready";
    }
  }

  async nextPlaylist() {
    if (!this.token) return;

    this.currentPlaylistIndex =
      (this.currentPlaylistIndex + 1) % this.playlists.length;
    this.songTitle.textContent =
      this.playlists[this.currentPlaylistIndex].title;

    if (this.isPlaying) {
      await fetch(
        `https://api.spotify.com/v1/me/player/play?device_id=${this.deviceId}`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${this.token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            context_uri: `spotify:playlist:${
              this.playlists[this.currentPlaylistIndex].id
            }`,
            position_ms: 0,
          }),
        }
      );
    }
  }

  async prevPlaylist() {
    if (!this.token) return;

    this.currentPlaylistIndex =
      (this.currentPlaylistIndex - 1 + this.playlists.length) %
      this.playlists.length;
    this.songTitle.textContent =
      this.playlists[this.currentPlaylistIndex].title;

    if (this.isPlaying) {
      await fetch(
        `https://api.spotify.com/v1/me/player/play?device_id=${this.deviceId}`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${this.token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            context_uri: `spotify:playlist:${
              this.playlists[this.currentPlaylistIndex].id
            }`,
            position_ms: 0,
          }),
        }
      );
    }
  }

  async setVolume(value) {
    if (!this.player) return;

    const volume = value / 100;
    await this.player.setVolume(volume);
    this.lastVolume = volume;
    this.updateVolumeIcon(volume);
  }

  async toggleMute() {
    if (!this.player) return;

    if ((await this.player.getVolume()) > 0) {
      this.lastVolume = await this.player.getVolume();
      await this.setVolume(0);
      this.volumeSlider.value = 0;
    } else {
      await this.setVolume(this.lastVolume * 100);
      this.volumeSlider.value = this.lastVolume * 100;
    }
  }

  updateVolumeIcon(volume) {
    if (volume === 0) {
      this.volumeIcon.textContent = "🔇";
    } else if (volume < 0.5) {
      this.volumeIcon.textContent = "🔉";
    } else {
      this.volumeIcon.textContent = "🔊";
    }
  }
}
const musicPlayer = new MusicPlayer();
