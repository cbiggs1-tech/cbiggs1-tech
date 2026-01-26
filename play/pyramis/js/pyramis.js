// ==============================================
// PYRAMIS - Phase 4: Egyptian Theme + Production Polish
// ==============================================
// A Pyramid Solitaire variant card game with:
// - Desert/Egyptian theme with hieroglyph suits
// - Scoring system with chain bonuses
// - Undo feature (5-move stack)
// - Difficulty modes (Easy/Medium/Hard)
// - Animations and win overlay
// ==============================================

// ==============================================
// CARD CREATION
// ==============================================

/**
 * Creates a standard 52-card deck.
 * Each card is an object with suit (string) and rank (number).
 * Ranks: A=1, 2-10, J=11, Q=12, K=13
 * Suits: hearts, diamonds, clubs, spades
 * @returns {Array<{suit: string, rank: number}>} Array of 52 card objects
 */
function createDeck() {
    const suits = ['hearts', 'diamonds', 'clubs', 'spades'];
    const deck = [];

    for (const suit of suits) {
        for (let rank = 1; rank <= 13; rank++) {
            deck.push({ suit, rank });
        }
    }

    return deck;
}

// ==============================================
// SHUFFLING
// ==============================================

/**
 * Shuffles an array in-place using Fisher-Yates algorithm.
 * This provides a uniform random permutation.
 * @param {Array} array - The array to shuffle
 * @returns {Array} The same array, now shuffled (for chaining)
 */
function shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

// ==============================================
// DEALING
// ==============================================

/**
 * Deals a new game of Pyramis.
 * Creates a shuffled deck, splits into pyramid (28 cards) and stock (24 cards).
 *
 * Pyramid layout (7 rows, 28 cards total):
 *   Row 0: 1 card  (index 0)
 *   Row 1: 2 cards (indices 1-2)
 *   Row 2: 3 cards (indices 3-5)
 *   Row 3: 4 cards (indices 6-9)
 *   Row 4: 5 cards (indices 10-14)
 *   Row 5: 6 cards (indices 15-20)
 *   Row 6: 7 cards (indices 21-27) - bottom row, initially exposed
 *
 * @returns {{pyramid: Array<{suit: string, rank: number}>, stock: Array<{suit: string, rank: number}>}}
 */
function deal() {
    const deck = createDeck();
    shuffle(deck);

    const pyramid = deck.slice(0, 28);
    const stock = deck.slice(28);

    return { pyramid, stock };
}

// ==============================================
// PYRAMID EXPOSURE LOGIC
// ==============================================

/**
 * Calculates which pyramid positions are currently exposed (playable).
 *
 * A card at index i is exposed if:
 * 1. It is in the bottom row (index >= 21), AND it hasn't been removed, OR
 * 2. Both of its covering children have been removed.
 *
 * Pyramid structure uses binary tree-like indexing:
 * - Left child of index i: 2*i + 1
 * - Right child of index i: 2*i + 2
 * - Only indices 0-20 have children (indices 21-27 are bottom row)
 *
 * @param {Set<number>} removedSet - Set of pyramid indices that have been removed
 * @returns {number[]} Sorted array of exposed (playable) pyramid indices
 */
function getExposedPositions(removedSet) {
    const exposed = [];

    for (let i = 0; i < 28; i++) {
        if (removedSet.has(i)) {
            continue;
        }
        if (isExposed(i, removedSet)) {
            exposed.push(i);
        }
    }

    return exposed.sort((a, b) => a - b);
}

/**
 * Determines if a single pyramid position is exposed.
 * FIXED: Proper edge node handling where one child may not exist.
 *
 * @param {number} index - Pyramid index (0-27)
 * @param {Set<number>} removedSet - Set of removed indices
 * @returns {boolean} True if the card at index is exposed
 */
function isExposed(index, removedSet) {
    const left = 2 * index + 1;
    const right = 2 * index + 2;

    const hasLeft = left < 28;
    const hasRight = right < 28;

    const leftRemoved = !hasLeft || removedSet.has(left);
    const rightRemoved = !hasRight || removedSet.has(right);

    return (index >= 21) ? true : (leftRemoved && rightRemoved);
}

// ==============================================
// UTILITY FUNCTIONS
// ==============================================

/**
 * Converts a card rank to its display string.
 * @param {number} rank - Card rank (1-13)
 * @returns {string} Display string (A, 2-10, J, Q, K)
 */
function rankToString(rank) {
    const rankNames = {
        1: 'A',
        11: 'J',
        12: 'Q',
        13: 'K',
    };
    return rankNames[rank] || String(rank);
}

/**
 * Formats a card for display (text version).
 * @param {{suit: string, rank: number}} card - Card object
 * @returns {string} Formatted string like "A-hearts" or "10-spades"
 */
function formatCard(card) {
    if (!card) return '[empty]';
    return `${rankToString(card.rank)}-${card.suit}`;
}

/**
 * Formats a card for UI display with standard suit symbols.
 * // CARD SYMBOL FIX - Using standard Unicode playing card suits
 * @param {{suit: string, rank: number}} card - Card object
 * @returns {string} Formatted string like "A♥" or "10♠"
 */
function formatCardUI(card) {
    if (!card) return '';
    // CARD SYMBOL FIX - Standard playing card suits
    const suitSymbols = { hearts: '♥', diamonds: '♦', clubs: '♣', spades: '♠' };
    return `${rankToString(card.rank)}${suitSymbols[card.suit]}`;
}

/**
 * Gets the row number for a pyramid index.
 * Row 0 has 1 card, row 1 has 2, etc.
 * @param {number} index - Pyramid index (0-27)
 * @returns {number} Row number (0-6)
 */
function getRowForIndex(index) {
    let row = 0;
    let startOfRow = 0;
    while (startOfRow + row + 1 <= index) {
        startOfRow += row + 1;
        row++;
    }
    return row;
}

// ==============================================
// DIFFICULTY MODES
// ==============================================

const DIFFICULTY_SETTINGS = {
    easy: {
        maxDraws: 20,
        targetSum: 14,
        label: 'Easy'
    },
    medium: {
        maxDraws: 15,
        targetSum: 14,
        label: 'Medium'
    },
    hard: {
        maxDraws: 10,
        targetSum: 15,
        label: 'Hard'
    }
};

let currentDifficulty = 'medium';

/**
 * Gets current difficulty settings.
 * @returns {Object} Difficulty settings object
 */
function getDifficultySettings() {
    return DIFFICULTY_SETTINGS[currentDifficulty];
}

// ==============================================
// GAME STATE
// ==============================================

// Module-level game state variables
let pyramid = [];
let stock = [];
let waste = null;
let removedSet = new Set();
let drawsLeft = 15;

// UI State
let selectedCard = null;

// Scoring State
let score = 0;
let pairsRemoved = 0;
let chainCount = 0;  // Consecutive pairs without drawing
let totalChainBonus = 0;
let streakMultiplier = 1;

// Undo State (max 5 moves)
const MAX_UNDO_STACK = 5;
let undoStack = [];

/**
 * Creates a snapshot of current game state for undo.
 * @returns {Object} State snapshot
 */
function createStateSnapshot() {
    return {
        pyramid: pyramid.map(card => card ? { ...card } : null),
        stock: stock.map(card => ({ ...card })),
        waste: waste ? { ...waste } : null,
        removedSet: new Set(removedSet),
        drawsLeft: drawsLeft,
        score: score,
        pairsRemoved: pairsRemoved,
        chainCount: chainCount,
        totalChainBonus: totalChainBonus,
        streakMultiplier: streakMultiplier,
        selectedCard: selectedCard
    };
}

/**
 * Restores game state from a snapshot.
 * @param {Object} snapshot - State snapshot to restore
 */
function restoreStateSnapshot(snapshot) {
    pyramid = snapshot.pyramid.map(card => card ? { ...card } : null);
    stock = snapshot.stock.map(card => ({ ...card }));
    waste = snapshot.waste ? { ...snapshot.waste } : null;
    removedSet = new Set(snapshot.removedSet);
    drawsLeft = snapshot.drawsLeft;
    score = snapshot.score;
    pairsRemoved = snapshot.pairsRemoved;
    chainCount = snapshot.chainCount;
    totalChainBonus = snapshot.totalChainBonus;
    streakMultiplier = snapshot.streakMultiplier;
    selectedCard = null; // Always clear selection on undo
}

/**
 * Saves current state to undo stack (before making a move).
 */
function saveUndoState() {
    undoStack.push(createStateSnapshot());
    if (undoStack.length > MAX_UNDO_STACK) {
        undoStack.shift(); // Remove oldest if exceeding max
    }
    updateUndoButton();
}

/**
 * Performs undo operation.
 * @returns {boolean} True if undo was successful
 */
function performUndo() {
    if (undoStack.length === 0) {
        return false;
    }

    const snapshot = undoStack.pop();
    restoreStateSnapshot(snapshot);
    updateUndoButton();
    updateUI();
    showFeedback('Move undone', 'info');
    return true;
}

/**
 * Updates undo button state and badge.
 */
function updateUndoButton() {
    const undoBtn = document.getElementById('undo-btn');
    const undoCount = document.getElementById('undo-count');

    if (undoBtn) {
        undoBtn.disabled = undoStack.length === 0;
    }
    if (undoCount) {
        undoCount.textContent = undoStack.length;
    }
}

/**
 * Initializes a new game state.
 * Deals cards and resets all state variables.
 */
function initGame() {
    const dealt = deal();
    pyramid = dealt.pyramid;
    stock = dealt.stock;
    waste = null;
    removedSet = new Set();

    const settings = getDifficultySettings();
    drawsLeft = settings.maxDraws;

    selectedCard = null;

    // Reset scoring
    score = 0;
    pairsRemoved = 0;
    chainCount = 0;
    totalChainBonus = 0;
    streakMultiplier = 1;

    // Clear undo stack
    undoStack = [];
    updateUndoButton();
}

/**
 * Resets game state without re-dealing (for testing).
 */
function resetGameState() {
    removedSet.clear();
    waste = null;
    drawsLeft = getDifficultySettings().maxDraws;
    selectedCard = null;
    score = 0;
    pairsRemoved = 0;
    chainCount = 0;
    totalChainBonus = 0;
    streakMultiplier = 1;
    undoStack = [];
}

// ==============================================
// WILD CARD & PAIRING LOGIC
// ==============================================

/**
 * Checks if a card is wild (Ace or King).
 * Wild cards can pair with any other card.
 * @param {{suit: string, rank: number}|null} card - Card to check
 * @returns {boolean} True if card exists and is wild (A=1 or K=13)
 */
function isWild(card) {
    return card && (card.rank === 1 || card.rank === 13);
}

/**
 * Determines if two cards can be paired.
 * Rules:
 * - If either card is wild (A or K), they can pair with anything
 * - Otherwise, ranks must sum to the target (14 for Easy/Medium, 15 for Hard)
 * @param {{suit: string, rank: number}|null} cardA - First card
 * @param {{suit: string, rank: number}|null} cardB - Second card
 * @returns {boolean} True if the cards can be paired
 */
function canPair(cardA, cardB) {
    if (!cardA || !cardB) {
        return false;
    }

    if (isWild(cardA) || isWild(cardB)) {
        return true;
    }

    const targetSum = getDifficultySettings().targetSum;
    return cardA.rank + cardB.rank === targetSum;
}

// ==============================================
// SCORING SYSTEM
// ==============================================

const BASE_PAIR_SCORE = 50;
const CHAIN_BONUS = 100;
const STREAK_THRESHOLD = 5;

/**
 * Calculates and adds score for a successful pair.
 * @param {boolean} wasChain - True if this was part of a chain (no draw between pairs)
 * @returns {number} Points earned for this pair
 */
function addPairScore(wasChain) {
    let points = BASE_PAIR_SCORE;

    if (wasChain && chainCount > 0) {
        // Chain bonus
        points += CHAIN_BONUS;
        totalChainBonus += CHAIN_BONUS;

        // Streak multiplier after 5 chains
        if (chainCount >= STREAK_THRESHOLD) {
            streakMultiplier = 2;
            points *= streakMultiplier;
        }
    }

    score += points;
    pairsRemoved++;
    chainCount++;

    updateScoreDisplay();
    return points;
}

/**
 * Resets chain count (called when drawing).
 */
function resetChain() {
    chainCount = 0;
    streakMultiplier = 1;
}

/**
 * Updates the score display in UI.
 */
function updateScoreDisplay() {
    const scoreValue = document.getElementById('score-value');
    if (scoreValue) {
        scoreValue.textContent = score;
    }
}

// ==============================================
// GAME ACTIONS
// ==============================================

/**
 * Gets a card from a source (pyramid index or 'waste').
 * @param {number|'waste'} source - Pyramid index or 'waste'
 * @returns {{suit: string, rank: number}|null} Card or null if unavailable
 */
function getCardFromSource(source) {
    if (source === 'waste') {
        return waste;
    }
    if (typeof source === 'number') {
        if (removedSet.has(source) || source < 0 || source >= 28) {
            return null;
        }
        return pyramid[source];
    }
    return null;
}

/**
 * Checks if a source is available for pairing.
 * @param {number|'waste'} source - Pyramid index or 'waste'
 * @returns {boolean} True if the source card can be used
 */
function isSourceAvailable(source) {
    if (source === 'waste') {
        return waste !== null;
    }
    if (typeof source === 'number') {
        if (removedSet.has(source) || source < 0 || source >= 28) {
            return false;
        }
        const exposed = getExposedPositions(removedSet);
        return exposed.includes(source);
    }
    return false;
}

/**
 * Attempts to remove a pair of cards.
 * @param {number|'waste'} source1 - First source (pyramid index or 'waste')
 * @param {number|'waste'} source2 - Second source (pyramid index or 'waste')
 * @returns {boolean} True if pair was successfully removed
 */
function tryRemovePair(source1, source2) {
    const card1 = getCardFromSource(source1);
    const card2 = getCardFromSource(source2);

    if (!isSourceAvailable(source1)) {
        return false;
    }
    if (!isSourceAvailable(source2)) {
        return false;
    }

    if (source1 === source2) {
        return false;
    }

    if (!canPair(card1, card2)) {
        return false;
    }

    // Valid pair - remove both cards
    if (source1 === 'waste') {
        waste = null;
    } else {
        removedSet.add(source1);
        pyramid[source1] = null;
    }

    if (source2 === 'waste') {
        waste = null;
    } else {
        removedSet.add(source2);
        pyramid[source2] = null;
    }

    return true;
}

/**
 * Draws a card from stock to waste pile if possible.
 * @returns {boolean} True if draw was successful
 */
function drawIfPossible() {
    if (drawsLeft <= 0) {
        return false;
    }

    if (stock.length === 0) {
        return false;
    }

    const drawnCard = stock.shift();
    waste = drawnCard;
    drawsLeft--;

    // Drawing resets chain
    resetChain();

    return true;
}

// ==============================================
// GAME STATUS HELPERS
// ==============================================

/**
 * Gets current count of remaining pyramid cards.
 * @returns {number} Number of cards still in pyramid
 */
function getRemainingPyramidCount() {
    return 28 - removedSet.size;
}

/**
 * Checks if the game is won (all pyramid cards removed).
 * @returns {boolean} True if player won
 */
function isGameWon() {
    return removedSet.size === 28;
}

/**
 * Checks if any valid moves exist.
 * @returns {boolean} True if at least one move is possible
 */
function hasValidMoves() {
    const exposed = getExposedPositions(removedSet);

    for (let i = 0; i < exposed.length; i++) {
        for (let j = i + 1; j < exposed.length; j++) {
            if (canPair(pyramid[exposed[i]], pyramid[exposed[j]])) {
                return true;
            }
        }
    }

    if (waste) {
        for (const pos of exposed) {
            if (canPair(pyramid[pos], waste)) {
                return true;
            }
        }
    }

    if (drawsLeft > 0 && stock.length > 0) {
        return true;
    }

    return false;
}

/**
 * Checks if the game is lost (no moves and no draws).
 * @returns {boolean} True if player lost
 */
function isGameLost() {
    return !hasValidMoves();
}

/**
 * Gets a formatted summary of current game state.
 * @returns {string} Multi-line state summary
 */
function getCurrentStateSummary() {
    const exposed = getExposedPositions(removedSet);
    const exposedCards = exposed.map(i => `[${i}]${formatCard(pyramid[i])}`).join(', ');

    const lines = [
        `  Exposed: ${exposedCards || '(none)'}`,
        `  Waste: ${waste ? formatCard(waste) : 'empty'}`,
        `  Draws left: ${drawsLeft}`,
        `  Pyramid remaining: ${getRemainingPyramidCount()}/28`,
        `  Stock remaining: ${stock.length}`,
        `  Score: ${score}`,
    ];

    return lines.join('\n');
}

// ==============================================
// AUDIO (BGM + SFX)
// ==============================================

// Background music
let bgm = null;
let bgmFadeInterval = null;
let bgmStopping = false;
const BGM_TARGET_VOLUME = 0.25;
const BGM_FADE_DURATION = 2000;
const BGM_FADE_STEPS = 40;

// Sound effects
const sfx = {
    draw: null,
    pair: null,
    invalid: null,
    win: null
};
const SFX_VOLUME = 0.5;
let sfxEnabled = true;

/**
 * Initializes all audio elements.
 */
function initAudio() {
    bgm = new Audio('audio/pyramis.mp3');
    bgm.loop = true;
    bgm.volume = 0;

    sfx.draw = new Audio('audio/draw.mp3');
    sfx.pair = new Audio('audio/pair.mp3');
    sfx.invalid = new Audio('audio/Invalid.mp3');
    sfx.win = new Audio('audio/win.mp3');

    Object.values(sfx).forEach(sound => {
        if (sound) sound.volume = SFX_VOLUME;
    });
}

/**
 * Plays a sound effect if enabled.
 * @param {string} name - Sound name: 'draw', 'pair', 'invalid', 'win'
 */
function playSFX(name) {
    if (!sfxEnabled) return;

    const sound = sfx[name];
    if (sound) {
        sound.currentTime = 0;
        sound.play().catch(err => {
            console.log(`[SFX] ${name} play failed:`, err.message);
        });
    }
}

/**
 * Plays background music with fade-in effect.
 */
function playBGM() {
    if (!bgm) return;

    bgmStopping = false;

    if (bgmFadeInterval) {
        clearInterval(bgmFadeInterval);
        bgmFadeInterval = null;
    }

    const startVolume = bgm.volume;
    const volumeStep = (BGM_TARGET_VOLUME - startVolume) / BGM_FADE_STEPS;
    const stepDuration = BGM_FADE_DURATION / BGM_FADE_STEPS;
    let currentStep = 0;

    bgm.play().then(() => {
        bgmFadeInterval = setInterval(() => {
            currentStep++;
            bgm.volume = Math.min(startVolume + (volumeStep * currentStep), BGM_TARGET_VOLUME);
            if (currentStep >= BGM_FADE_STEPS) {
                clearInterval(bgmFadeInterval);
                bgmFadeInterval = null;
                bgm.volume = BGM_TARGET_VOLUME;
            }
        }, stepDuration);
    }).catch(err => {
        console.log('[BGM] Play failed:', err.message);
    });
}

/**
 * Stops background music with fade-out effect.
 */
function stopBGM() {
    if (!bgm) return;

    bgmStopping = true;

    if (bgmFadeInterval) {
        clearInterval(bgmFadeInterval);
        bgmFadeInterval = null;
    }

    const startVolume = bgm.volume;
    if (startVolume === 0) {
        bgm.pause();
        return;
    }

    const volumeStep = startVolume / BGM_FADE_STEPS;
    const stepDuration = BGM_FADE_DURATION / BGM_FADE_STEPS;
    let currentStep = 0;

    bgmFadeInterval = setInterval(() => {
        currentStep++;
        bgm.volume = Math.max(startVolume - (volumeStep * currentStep), 0);
        if (currentStep >= BGM_FADE_STEPS) {
            clearInterval(bgmFadeInterval);
            bgmFadeInterval = null;
            bgm.volume = 0;
            bgm.pause();
            bgmStopping = false;
        }
    }, stepDuration);
}

/**
 * Updates audio button visual states.
 */
function updateAudioButtons() {
    const bgmBtn = document.getElementById('bgmToggle');
    const sfxBtn = document.getElementById('sfxToggle');

    if (bgmBtn) {
        const bgmEnabled = localStorage.getItem('pyramis-bgm-enabled') === 'true';
        bgmBtn.classList.toggle('active', bgmEnabled);
        bgmBtn.classList.toggle('muted', !bgmEnabled);
        bgmBtn.textContent = bgmEnabled ? '🎵' : '🎵';
    }

    if (sfxBtn) {
        sfxBtn.classList.toggle('active', sfxEnabled);
        sfxBtn.classList.toggle('muted', !sfxEnabled);
        sfxBtn.textContent = sfxEnabled ? '🔊' : '🔇';
    }
}

/**
 * Handles BGM toggle click.
 */
function handleBGMToggle() {
    const saved = localStorage.getItem('pyramis-bgm-enabled');
    const enabled = saved !== 'true'; // Toggle current state

    localStorage.setItem('pyramis-bgm-enabled', enabled ? 'true' : 'false');
    updateAudioButtons();

    if (enabled) {
        playBGM();
    } else {
        stopBGM();
    }
}

/**
 * Handles SFX toggle click.
 */
function handleSFXToggle() {
    sfxEnabled = !sfxEnabled;
    localStorage.setItem('pyramis-sfx-enabled', sfxEnabled ? 'true' : 'false');
    updateAudioButtons();

    // Play a quick sound to confirm SFX is on
    if (sfxEnabled) {
        playSFX('draw');
    }
}

/**
 * Initializes audio toggles from localStorage.
 */
function initAudioToggles() {
    const bgmBtn = document.getElementById('bgmToggle');
    const sfxBtn = document.getElementById('sfxToggle');

    // Load SFX preference (default to true)
    const sfxSaved = localStorage.getItem('pyramis-sfx-enabled');
    sfxEnabled = sfxSaved !== 'false'; // Default to enabled

    if (bgmBtn) {
        bgmBtn.addEventListener('click', handleBGMToggle);
    }

    if (sfxBtn) {
        sfxBtn.addEventListener('click', handleSFXToggle);
    }

    updateAudioButtons();
}

/**
 * Tries to resume BGM if enabled and not stopping.
 */
function tryResumeBGM() {
    if (bgmStopping) return;

    const bgmEnabled = localStorage.getItem('pyramis-bgm-enabled') === 'true';
    if (bgmEnabled && bgm && bgm.paused) {
        playBGM();
    }
}

// ==============================================
// UI RENDERING
// ==============================================

/**
 * Renders the pyramid to the DOM.
 */
function renderPyramid() {
    const container = document.getElementById('pyramid');
    if (!container) return;

    container.innerHTML = '';
    const exposed = getExposedPositions(removedSet);

    for (let row = 0; row < 7; row++) {
        const rowDiv = document.createElement('div');
        rowDiv.className = 'pyramid-row';

        const rowStart = (row * (row + 1)) / 2;
        const cardsInRow = row + 1;

        for (let pos = 0; pos < cardsInRow; pos++) {
            const index = rowStart + pos;
            const card = pyramid[index];

            const cardDiv = document.createElement('div');
            cardDiv.className = 'card';
            cardDiv.dataset.index = index;

            if (removedSet.has(index) || !card) {
                cardDiv.classList.add('removed');
            } else {
                const isCardExposed = exposed.includes(index);

                if (isCardExposed) {
                    cardDiv.textContent = formatCardUI(card);
                    cardDiv.classList.add(card.suit);
                    cardDiv.classList.add('exposed');

                    if (isWild(card)) {
                        cardDiv.classList.add('wild');
                    }

                    if (selectedCard === index) {
                        cardDiv.classList.add('selected');
                    }
                } else {
                    cardDiv.classList.add('facedown');
                }
            }

            rowDiv.appendChild(cardDiv);
        }

        container.appendChild(rowDiv);
    }
}

/**
 * Renders the stock pile.
 */
function renderStock() {
    const stockDiv = document.getElementById('stock');
    if (!stockDiv) return;

    stockDiv.innerHTML = '';

    const cardBack = document.createElement('div');
    cardBack.className = 'card card-back';

    // CARD SYMBOL FIX - Standard card back symbol
    if (stock.length > 0) {
        cardBack.textContent = '🂠';
    } else {
        cardBack.classList.add('empty');
        cardBack.textContent = '';
    }

    const badge = document.createElement('span');
    badge.className = 'stock-badge';
    badge.textContent = stock.length;

    stockDiv.appendChild(cardBack);
    stockDiv.appendChild(badge);
}

/**
 * Renders the waste pile.
 */
function renderWaste() {
    const wasteDiv = document.getElementById('waste');
    if (!wasteDiv) return;

    wasteDiv.innerHTML = '';

    const cardDiv = document.createElement('div');
    cardDiv.className = 'card';
    cardDiv.dataset.source = 'waste';

    if (waste) {
        cardDiv.textContent = formatCardUI(waste);
        cardDiv.classList.add(waste.suit);
        cardDiv.classList.add('exposed');

        if (isWild(waste)) {
            cardDiv.classList.add('wild');
        }

        if (selectedCard === 'waste') {
            cardDiv.classList.add('selected');
        }
    } else {
        cardDiv.classList.add('empty');
        cardDiv.textContent = '';
    }

    wasteDiv.appendChild(cardDiv);
}

/**
 * Renders the status bar.
 */
function renderStatus() {
    const statusDiv = document.getElementById('status');
    if (!statusDiv) return;

    const remaining = getRemainingPyramidCount();
    const drawBtn = document.getElementById('draw-btn');
    const settings = getDifficultySettings();

    statusDiv.classList.remove('win', 'lose');

    if (isGameWon()) {
        statusDiv.textContent = '𓂀 VICTORY! 𓂀';
        statusDiv.classList.add('win');
        if (drawBtn) drawBtn.disabled = true;
        showWinOverlay();
    } else if (isGameLost()) {
        statusDiv.textContent = 'Game Over - No moves left';
        statusDiv.classList.add('lose');
        if (drawBtn) drawBtn.disabled = true;
    } else {
        const sumText = settings.targetSum !== 14 ? ` | Sum: ${settings.targetSum}` : '';
        statusDiv.textContent = `Pyramid: ${remaining}/28 | Draws: ${drawsLeft}/${settings.maxDraws} | Stock: ${stock.length}${sumText}`;
        if (drawBtn) {
            drawBtn.disabled = drawsLeft <= 0 || stock.length === 0;
        }
    }
}

/**
 * Updates the entire UI.
 */
function updateUI() {
    renderPyramid();
    renderStock();
    renderWaste();
    renderStatus();
    updateScoreDisplay();
    updateUndoButton();
}

// ==============================================
// WIN OVERLAY
// ==============================================

/**
 * Shows the win overlay modal with final score.
 */
function showWinOverlay() {
    const overlay = document.getElementById('win-overlay');
    const finalScoreEl = document.getElementById('final-score-value');
    const breakdownEl = document.getElementById('score-breakdown');

    if (!overlay) return;

    if (finalScoreEl) {
        finalScoreEl.textContent = score;
    }

    if (breakdownEl) {
        const settings = getDifficultySettings();
        breakdownEl.innerHTML = `
            Pairs Removed: ${pairsRemoved}<br>
            Chain Bonuses: ${totalChainBonus} pts<br>
            Draws Used: ${settings.maxDraws - drawsLeft}/${settings.maxDraws}<br>
            Difficulty: ${settings.label}
        `;
    }

    overlay.classList.add('show');
    playSFX('win');
}

/**
 * Hides the win overlay modal.
 */
function hideWinOverlay() {
    const overlay = document.getElementById('win-overlay');
    if (overlay) {
        overlay.classList.remove('show');
    }
}

// ==============================================
// ANIMATIONS
// ==============================================

/**
 * Triggers pairing animation on card elements.
 * @param {number|'waste'} source1 - First source
 * @param {number|'waste'} source2 - Second source
 */
function triggerPairAnimation(source1, source2) {
    const cards = [];

    if (source1 === 'waste') {
        const wasteCard = document.querySelector('#waste .card');
        if (wasteCard) cards.push(wasteCard);
    } else {
        const card = document.querySelector(`.card[data-index="${source1}"]`);
        if (card) cards.push(card);
    }

    if (source2 === 'waste') {
        const wasteCard = document.querySelector('#waste .card');
        if (wasteCard && !cards.includes(wasteCard)) cards.push(wasteCard);
    } else {
        const card = document.querySelector(`.card[data-index="${source2}"]`);
        if (card) cards.push(card);
    }

    cards.forEach(card => {
        card.classList.add('pairing');
    });

    // Remove animation class after animation completes
    setTimeout(() => {
        cards.forEach(card => {
            card.classList.remove('pairing');
        });
    }, 400);
}

/**
 * Triggers flip animation on waste card.
 */
function triggerDrawAnimation() {
    const wasteCard = document.querySelector('#waste .card');
    if (wasteCard) {
        wasteCard.classList.add('flipping');
        setTimeout(() => {
            wasteCard.classList.remove('flipping');
        }, 300);
    }
}

// ==============================================
// UI INTERACTION
// ==============================================

/**
 * Clears current selection and updates UI.
 */
function clearSelection() {
    selectedCard = null;
    updateUI();
}

/**
 * Handles card selection.
 * Uses strict isSourceAvailable check.
 * @param {number|'waste'} source - Card source to select
 */
function selectCard(source) {
    if (!isSourceAvailable(source)) {
        return;
    }

    if (selectedCard === null) {
        selectedCard = source;
        updateUI();
    } else if (selectedCard === source) {
        clearSelection();
    } else {
        attemptPairFromUI(selectedCard, source);
    }
}

/**
 * Attempts to pair two cards from UI interaction.
 * @param {number|'waste'} source1 - First source
 * @param {number|'waste'} source2 - Second source
 */
function attemptPairFromUI(source1, source2) {
    const card1 = getCardFromSource(source1);
    const card2 = getCardFromSource(source2);

    // Check if pair is valid before saving undo state
    if (!canPair(card1, card2)) {
        playSFX('invalid');
        const settings = getDifficultySettings();
        if (card1 && card2) {
            const sum = card1.rank + card2.rank;
            showFeedback(`${card1.rank} + ${card2.rank} = ${sum} (need ${settings.targetSum} or wild)`, 'error');
        } else {
            showFeedback('Invalid pair', 'error');
        }
        selectedCard = null;
        updateUI();
        return;
    }

    // Save state before making the move
    saveUndoState();

    // Trigger animation before removing
    triggerPairAnimation(source1, source2);

    const wasChain = chainCount > 0;
    const success = tryRemovePair(source1, source2);

    selectedCard = null;

    if (success) {
        const points = addPairScore(wasChain);
        playSFX('pair');

        let message = `+${points} pts!`;
        if (wasChain && chainCount > 1) {
            message += ` (${chainCount}x chain!)`;
        }
        if (streakMultiplier > 1) {
            message += ' 🔥';
        }
        showFeedback(message, 'success');
    }

    // Delay UI update slightly to show animation
    setTimeout(() => {
        updateUI();
    }, 200);
}

/**
 * Handles draw button click.
 */
function handleDraw() {
    tryResumeBGM();
    selectedCard = null;

    if (drawsLeft <= 0) {
        playSFX('invalid');
        showFeedback('No draws remaining!', 'error');
        return;
    }

    if (stock.length === 0) {
        playSFX('invalid');
        showFeedback('Stock is empty!', 'error');
        return;
    }

    // Save state before drawing
    saveUndoState();

    const success = drawIfPossible();
    if (success) {
        playSFX('draw');
        updateUI();
        triggerDrawAnimation();
        showFeedback(`Drew ${formatCardUI(waste)}`, 'info');
    }
}

/**
 * Handles new game button click.
 */
function handleNewGame() {
    tryResumeBGM();
    hideWinOverlay();
    initGame();
    showFeedback('New game started!', 'info');
    updateUI();
}

/**
 * Handles difficulty change.
 */
function handleDifficultyChange() {
    const select = document.getElementById('difficulty-select');
    if (!select) return;

    currentDifficulty = select.value;
    localStorage.setItem('pyramis-difficulty', currentDifficulty);

    // Start new game with new difficulty
    initGame();
    showFeedback(`${getDifficultySettings().label} mode - New game!`, 'info');
    updateUI();
}

/**
 * Initializes difficulty selector from localStorage.
 */
function initDifficultySelector() {
    const select = document.getElementById('difficulty-select');
    if (!select) return;

    const saved = localStorage.getItem('pyramis-difficulty');
    if (saved && DIFFICULTY_SETTINGS[saved]) {
        currentDifficulty = saved;
        select.value = saved;
    }

    select.addEventListener('change', handleDifficultyChange);
}

/**
 * Shows temporary feedback message.
 * @param {string} message - Message to show
 * @param {string} type - 'success', 'error', or 'info'
 */
function showFeedback(message, type) {
    const feedback = document.getElementById('feedback');
    if (!feedback) return;

    feedback.textContent = message;
    feedback.className = `show ${type}`;

    setTimeout(() => {
        feedback.className = '';
    }, 1500);
}

/**
 * Handles click events on the game container.
 * Uses strict isSourceAvailable check for all clicks.
 * @param {Event} e - Click event
 */
function handleGameClick(e) {
    tryResumeBGM();

    const cardEl = e.target.closest('.card');
    if (!cardEl) return;

    if (cardEl.classList.contains('removed') || cardEl.classList.contains('empty')) {
        return;
    }

    if (cardEl.dataset.source === 'waste') {
        if (isSourceAvailable('waste')) {
            selectCard('waste');
        }
        return;
    }

    if (cardEl.dataset.index !== undefined) {
        const index = parseInt(cardEl.dataset.index, 10);

        if (isSourceAvailable(index)) {
            selectCard(index);
        }
    }
}

/**
 * Handles undo button click.
 */
function handleUndo() {
    tryResumeBGM();
    performUndo();
}

/**
 * Initializes the UI and sets up event listeners.
 */
function initUI() {
    // Initialize difficulty first (affects initial game state)
    initDifficultySelector();

    // Initialize game state
    initGame();

    // Initialize audio (BGM + SFX)
    initAudio();
    initAudioToggles();

    const gameContainer = document.getElementById('game-container');
    if (gameContainer) {
        gameContainer.addEventListener('click', handleGameClick);
        gameContainer.addEventListener('touchend', (e) => {
            if (e.target.closest('.card')) {
                e.preventDefault();
            }
        });
    }

    const drawBtn = document.getElementById('draw-btn');
    if (drawBtn) {
        drawBtn.addEventListener('click', handleDraw);
    }

    const newGameBtn = document.getElementById('new-game-btn');
    if (newGameBtn) {
        newGameBtn.addEventListener('click', handleNewGame);
    }

    const undoBtn = document.getElementById('undo-btn');
    if (undoBtn) {
        undoBtn.addEventListener('click', handleUndo);
    }

    const playAgainBtn = document.getElementById('play-again-btn');
    if (playAgainBtn) {
        playAgainBtn.addEventListener('click', handleNewGame);
    }

    updateUI();
    console.log('[initUI] Pyramis initialized');
    console.log(getCurrentStateSummary());
}

// Start the game when DOM is ready
document.addEventListener('DOMContentLoaded', initUI);
