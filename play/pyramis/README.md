# Pyramis

Ancient Egyptian-themed pyramid solitaire card game. Pair cards to sum 14 (or 15 on Hard mode), with Aces & Kings wild.

## Status
- Phase 1: Deck, shuffle, deal, pyramid exposure
- Phase 2: Pairing, wilds, waste, draws, simulation (console-based)
- Phase 3: Browser UI with pyramid display, click-to-pair, mobile-friendly
- Phase 4: Egyptian theme, scoring system, undo, difficulty modes, animations, PWA

## How to Play
1. Open `index.html` in browser
2. Select difficulty mode (Easy/Medium/Hard)
3. Click exposed pyramid cards or waste card to select
4. Click a second card to pair (must sum to target or include Ace/King wild)
5. Click Draw to flip stock card to waste
6. Clear all pyramid cards to win!

## Rules
- **Easy Mode**: 20 draws, sum to 14
- **Medium Mode**: 15 draws, sum to 14
- **Hard Mode**: 10 draws, sum to 15
- Aces (1) and Kings (13) are wild - pair with any card
- Only exposed pyramid cards (no cards covering them) can be selected

## Scoring System
- Base pair: 50 points
- Chain bonus: +100 points for consecutive pairs without drawing
- Streak multiplier: x2 after 5 consecutive chains

## Features
- 𓂀 Egyptian/desert theme with hieroglyph suits (☥ 𓆣 𓋾 𓂀)
- 🎵 Background music with toggle
- 🔊 Sound effects (draw, pair, invalid, win)
- ↩️ Undo feature (5-move stack)
- 📱 Mobile-friendly responsive design
- 💾 Settings persist via localStorage
- 🏆 Win overlay with score breakdown

## File Structure
```
pyramis/
├── index.html          # Main game page
├── manifest.json       # PWA manifest
├── README.md
├── js/
│   └── pyramis.js      # Game logic (~1340 lines)
├── audio/
│   ├── pyramis.mp3     # Background music
│   ├── win.mp3         # Victory sound
│   ├── pair.mp3        # Card pair sound
│   ├── draw.mp3        # Card draw sound
│   └── Invalid.mp3     # Invalid move sound
└── icons/              # PWA icons (need to add)
    ├── icon-72.png
    ├── icon-96.png
    ├── icon-128.png
    ├── icon-144.png
    ├── icon-152.png
    ├── icon-192.png
    ├── icon-384.png
    └── icon-512.png
```

## PWA Installation
The game can be installed as a Progressive Web App. Add icon images to the `icons/` folder in the required sizes for full PWA support.
