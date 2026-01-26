# Pyramis

A relaxing pyramid solitaire card game with an Egyptian/desert theme.

## Features

- **Pyramid Solitaire Gameplay**: Clear 28 cards by pairing exposed cards that sum to 14
- **Wild Cards**: Aces (1) and Kings (13) pair with any card
- **Difficulty Modes**: Easy (20 draws), Medium (15 draws), Hard (10 draws with random target)
- **Scoring System**: 50 points per pair + chain bonuses + streak multipliers
- **Undo Feature**: 5-move undo stack
- **Statistics Tracking**: Win/loss record, best score, total games
- **PWA Support**: Installable as an app, works offline
- **Mobile-Friendly**: Touch controls and responsive design
- **First-Play Tutorial**: Quick rules modal for new players
- **Win Celebration**: Confetti animation on victory

## How to Play

1. Tap two exposed cards that sum to 14 (e.g., 6 + 8, 7 + 7)
2. Aces and Kings are wild - pair with anything
3. Use the Draw button to flip stock cards when stuck
4. Clear all 28 pyramid cards to win!

## Game Modes

| Mode   | Draws | Target Sum  | Win Rate |
|--------|-------|-------------|----------|
| Easy   | 20    | 13-15       | ~60%     |
| Medium | 15    | 14          | ~30-40%  |
| Hard   | 10    | Random 12-15| ~15%     |

## Scoring

- Base pair: 50 points
- Chain bonus: +100 points for consecutive pairs without drawing
- Streak multiplier: x2 after 5 consecutive chains

## Tech Stack

- Vanilla HTML/CSS/JavaScript
- No frameworks or dependencies
- Service Worker for offline support
- LocalStorage for game state persistence

## File Structure

```
pyramis/
├── index.html          # Main game page
├── readme.html         # In-game help page
├── manifest.json       # PWA manifest
├── sw.js               # Service worker
├── README.md
├── js/
│   └── pyramis.js      # Game logic
├── audio/
│   ├── pyramis.mp3     # Background music
│   ├── win.mp3         # Victory sound
│   ├── pair.mp3        # Card pair sound
│   ├── draw.mp3        # Card draw sound
│   └── Invalid.mp3     # Invalid move sound
└── icons/              # PWA icons
```

## Credits

- Developed by Curtis Biggs ([@Cbiggs90](https://x.com/cbiggs90))
- Audio generated with Suno.ai
- Part of [GRANDPAPA.NET](https://grandpapa.net)

## License

MIT License
