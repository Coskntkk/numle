# Numle - Daily Number Puzzle Game

Numle is an addictive daily 4-digit number guessing puzzle inspired by Wordle. Built as a lightweight, zero-dependency, standalone single-page web app using **Vanilla HTML5, CSS3, and JavaScript**.

[Play Numle Live](https://coskntkk.github.io/numle/)

---

## 🎯 How to Play

1. **Objective**: Guess the secret 4-digit number in 6 tries.
2. **Rules**:
   - Each guess must be a valid 4-digit integer (from 1023 to 9876).
   - All 4 digits must be **distinct** (no duplicate digits allowed).
   - The first digit cannot be 0.
3. **Color Cues**:
   - 🟩 **Green**: Digit is in the secret number and in the correct spot.
   - 🟨 **Yellow**: Digit is in the secret number but in the wrong spot.
   - ⬛ **Dark Gray**: Digit is not in the secret number.

---

## ✨ Features

- 📅 **Daily Challenge**: Seeded deterministic daily puzzle synchronized globally.
- 🎮 **Practice Mode**: Unlimited random games for endless replayability.
- ⌨️ **Physical & Virtual Keyboard**: Play smoothly with your keyboard/numpad or responsive touch keypad.
- 📊 **Statistics & Streaks**: Track games played, win rate %, current streak, max streak, and guess distribution chart in `localStorage`.
- ⏳ **Countdown Timer**: Live countdown to midnight for the next daily puzzle.
- 📋 **Share with Friends**: One-click clipboard share with formatted emoji results.
- ✨ **Fluid Micro-Animations**: 3D card flips, row shakes on errors, pop tile typing, and celebratory win bounces.
- 🌙 **Modern Glassmorphic Dark UI**: Custom Outfit / Inter typography with responsive layout for mobile and desktop.
- ⚡ **Zero Dependencies**: Pure Vanilla HTML, CSS, and JS — instant loading with no build step required.

---

## 🚀 Running Locally

Open `index.html` directly in any web browser, or start a local static server:

```bash
# Using Python
python3 -m http.server 3000

# Or using npx
npx serve .
```

---

## 👨‍💻 Author

Coşkun Atak ([@Coskntkk](https://github.com/Coskntkk))
