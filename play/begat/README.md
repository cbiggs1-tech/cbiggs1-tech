# Begat - The Lineage Game

A trivia/puzzle game tracing the lineage of Jesus Christ from Abraham to Jesus (42 generations from Matthew 1:1-17).

## Description

Begat challenges players to correctly identify and place biblical ancestors in chronological order. Players unlock ancestor cards by answering trivia questions about each person, then drag the unlocked cards to their correct position on the timeline.

## Features

- **4 Difficulty Levels**: Patriarchs (Easy), Kings of Judah (Medium), Post-Exile (Medium), Full Lineage (Hard)
- **Quiz System**: Multiple-choice questions based on biblical descriptions
- **Scoring System**: Points for correct answers, placement bonuses, tier multipliers, and speed bonuses
- **High Score Leaderboard**: Local storage-based per-level leaderboards
- **Accessibility**: Full keyboard navigation, screen reader support, high contrast and colorblind modes
- **Mobile Support**: Touch controls, responsive design, PWA installable
- **Audio**: Background music, sound effects, optional speech synthesis

## How to Play

1. Click **START GAME** to begin
2. **Tap a locked card** (marked with ?) to open a trivia quiz
3. **Answer correctly** to unlock the card
4. **Drag the unlocked card** to its correct position on the timeline
5. Complete all placements before time runs out for bonus points

## Controls

### Desktop
- **Mouse**: Click cards to open quizzes, drag to place
- **Keyboard**: Tab to navigate, Enter/Space to select, Arrow keys to move between cards
- **Escape**: Close modals or return to games menu

### Mobile
- **Tap**: Select locked cards for quiz
- **Long press + drag**: Move unlocked cards to timeline
- **Touch**: All buttons and interactions

## Tech Stack

- **HTML5**: Semantic markup with ARIA accessibility attributes
- **CSS3**: CSS variables, Flexbox, responsive design, animations
- **Vanilla JavaScript**: ES modules, Web Audio API, Speech Synthesis
- **Libraries**: html2canvas (screenshots)

## Project Structure

```
begat/
├── index.html          # Main HTML structure
├── begat.css           # Styles and responsive design
├── js/
│   └── begat.js        # Game logic (ES module)
├── tests/
│   └── scoring.test.js # Unit tests (Vitest)
├── cypress/
│   └── e2e/
│       └── begat.cy.js # E2E tests (Cypress)
├── package.json        # Dependencies and scripts
├── .eslintrc.js        # ESLint configuration
└── README.md           # This file
```

## Development

### Prerequisites
- Node.js 18+
- npm or yarn

### Setup
```bash
npm install
```

### Run Tests
```bash
# Unit tests
npm test

# E2E tests (requires local server)
npm run test:e2e
```

### Lint
```bash
npm run lint
npm run lint:fix
```

## Accessibility (WCAG 2.1)

- Full keyboard navigation with visible focus indicators
- ARIA labels on interactive elements
- High contrast mode
- Colorblind-friendly mode
- Reduced motion support
- Screen reader compatible

## Browser Support

- Chrome 80+
- Firefox 75+
- Safari 13+
- Edge 80+

## License

Part of GRANDPAPA.NET - Educational biblical games

## Credits

- Game Design & Development: GRANDPAPA.NET
- Biblical data sourced from Matthew 1:1-17 and related Scripture references
