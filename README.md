# 🍅 RFocus Pro - Advanced Pomodoro Timer

A beautiful, feature-rich Pomodoro timer application with task management, goal tracking, and productivity analytics. Built with vanilla JavaScript, HTML, and CSS for optimal performance and compatibility.

## ✨ Features

### 🎯 **Core Pomodoro Timer**

- **Automatic Cycles**: 25-minute work sessions → 5-minute short breaks → repeat
- **Long Breaks**: 15-minute long break after every 4 work sessions
- **Smart Controls**: Pause, resume, reset, skip, and extend sessions
- **Visual Feedback**: Dynamic themes for work and break modes
- **Audio Notifications**: Pleasant Web Audio API generated tones

### 🎉 **Reward System**

- **Progressive Celebrations**: 4 levels of increasingly spectacular animations
  - Level 1: Gift box animation 🎁
  - Level 2: Trophy with particles 🏆
  - Level 3: Star with fireworks 🌟
  - Level 4: Diamond with confetti + fireworks 💎
- **Beautiful Toast Notifications**: Smooth animations with progress bars
- **Streak Tracking**: Consecutive completion rewards
- **Achievement Badges**: Special effects for milestones

### 📋 **Task Management**

- **Full CRUD Operations**: Create, edit, delete, and complete tasks
- **Smart Organization**: Categories, priorities, and progress tracking
- **Pomodoro Integration**: Associate sessions with specific tasks
- **Visual Progress**: Progress bars and completion percentages
- **Filtering & Sorting**: By status, priority, progress, and date

### 🎯 **Goal Tracking**

- **Multiple Goal Types**: Daily Pomodoros, tasks, focus time, streaks
- **Flexible Periods**: Daily, weekly, and monthly goals
- **Real-time Progress**: Live progress bars and achievement detection
- **Automatic Celebrations**: Goal achievement notifications
- **Statistics Integration**: Goals based on actual session data

### 📊 **Analytics & Statistics**

- **Comprehensive Tracking**: Complete history of all sessions
- **Today's Dashboard**: Real-time productivity overview
- **Productivity Analytics**: Weekly and monthly breakdowns
- **Peak Performance**: Most productive days and patterns
- **Focus Time Tracking**: Total concentrated work time
- **Streak Calculation**: Consecutive day productivity streaks

### ⚙️ **Customization**

- **Timer Settings**: Adjustable work and break durations
- **Audio Preferences**: Volume control and sound toggle
- **Automation Options**: Auto-start breaks and work sessions
- **Persistent Storage**: Settings saved across sessions

## 🚀 Getting Started

### Prerequisites

- Modern web browser (Chrome, Firefox, Safari, Edge)
- No additional dependencies required

### Installation

1. **Clone the repository**

   ```bash
   git clone https://github.com/raju6991/rfocuspro
   cd rfocus-pro
   ```

2. **Open in browser**

   ```bash
   # Simply open index.html in your browser
   open index.html
   ```

3. **Start being productive!**
   - Click "START" to begin your first Pomodoro session
   - Add tasks to track your work
   - Set goals to stay motivated
   - Enjoy the beautiful celebrations! 🎉

## 📱 Usage

### Basic Pomodoro Flow

1. **Start Timer**: Click the START button to begin a 25-minute work session
2. **Stay Focused**: Work on your current task until the timer completes
3. **Enjoy Break**: Automatic 5-minute break with encouraging messages
4. **Repeat**: Continue the cycle for maximum productivity
5. **Long Break**: After 4 sessions, enjoy a 15-minute long break

### Task Management

1. **Add Tasks**: Click "+ Add Task" to create new tasks
2. **Set Details**: Add title, description, estimated Pomodoros, category, and priority
3. **Select Current**: Choose which task you're working on
4. **Track Progress**: Watch progress bars fill as you complete Pomodoros
5. **Complete Tasks**: Mark tasks as done when finished

### Goal Setting

1. **Navigate to Goals**: Click "🎯 Goals & Stats" in the navigation
2. **Create Goals**: Set daily, weekly, or monthly targets
3. **Choose Types**: Pomodoros, tasks, focus time, or streak goals
4. **Monitor Progress**: Watch real-time progress toward your goals
5. **Celebrate Achievements**: Enjoy special notifications when goals are reached

### Settings Customization

1. **Access Settings**: Click "⚙️ Settings" in the navigation
2. **Adjust Timers**: Customize work and break durations
3. **Configure Audio**: Set volume and enable/disable sounds
4. **Set Automation**: Choose auto-start preferences
5. **Save Changes**: Settings are automatically saved

## 🏗️ Architecture

### File Structure

```
rfocus-pro/
├── index.html              # Main HTML structure
├── css/
│   └── styles.css         # All styling and animations
├── js/
│   └── main.js            # Complete application logic
|── specs/                 # Development specifications
└── README.md              # This file
```

### Core Components

- **TimerEngine**: Manages Pomodoro cycles and session counting
- **TaskManager**: Handles task CRUD operations and storage
- **GoalTracker**: Tracks goals and calculates progress
- **NotificationManager**: Beautiful toast notifications and rewards
- **StatisticsEngine**: Records and analyzes productivity data
- **AudioManager**: Web Audio API for pleasant notification sounds
- **UIController**: Coordinates all user interface interactions

### Data Storage

- **Local Storage**: Persistent data storage in browser
- **Session Storage**: Fallback for quota-exceeded scenarios
- **JSON Format**: Human-readable data structure
- **Automatic Backup**: Data saved on every change

## 🎨 Customization

### Themes

The app uses CSS custom properties for easy theming:

```css
:root {
  --main-bg: #4a47e5; /* Primary background */
  --box-bg: #3e3cd7; /* Timer box background */
  --text-color: #fff; /* Primary text color */
  --accent-color: #fff; /* Accent elements */
  --button-bg: #1c39b9; /* Button background */
}
```

### Adding New Goal Types

Extend the GoalTracker class:

```javascript
// Add new goal type in GoalTracker.getCurrentValue()
case 'newGoalType':
  return this.calculateNewGoalValue(goal.period, date);
```

### Custom Notifications

Create new notification types:

```javascript
notificationManager.showToast({
  type: "custom",
  icon: "🎊",
  title: "Custom Achievement!",
  message: "You did something amazing!",
  duration: 3000,
  particles: true,
});
```

### Browser Compatibility

- ✅ Chrome 60+
- ✅ Firefox 55+
- ✅ Safari 12+
- ✅ Edge 79+

### Performance Features

- **Vanilla JavaScript**: No framework overhead
- **Efficient Animations**: CSS transforms and GPU acceleration
- **Lazy Loading**: Components initialized on demand
- **Memory Management**: Proper cleanup of timers and events
- **Responsive Design**: Mobile-first approach

## 🐛 Troubleshooting

### Common Issues

**Timer not starting?**

- Check browser console for errors
- Ensure JavaScript is enabled
- Try refreshing the page

**Audio not playing?**

- Check browser audio permissions
- Ensure volume is not muted
- Try clicking START to resume audio context

**Data not saving?**

- Check browser storage permissions
- Clear browser cache if corrupted
- Ensure sufficient storage space

**Animations not smooth?**

- Update to latest browser version
- Check hardware acceleration settings
- Close other resource-intensive tabs

### Debug Mode

Open browser console and access global objects:

```javascript
// Check timer state
console.log(window.timer.getCurrentState());

// View all tasks
console.log(window.taskManager.getAllTasks());

// Check goal progress
console.log(window.goalTracker.getActiveGoals());

// View statistics
console.log(window.statistics.getTodayStats());
```

### Development Guidelines

- Use vanilla JavaScript (no frameworks)
- Follow existing naming conventions
- Add comments for complex logic
- Test on multiple browsers
- Ensure mobile compatibility

## 🙏 Acknowledgments

- **Pomodoro Technique**: Created by Francesco Cirillo
- **Web Audio API**: For beautiful notification sounds
- **CSS Animations**: For smooth and engaging user experience
- **Local Storage API**: For persistent data storage
