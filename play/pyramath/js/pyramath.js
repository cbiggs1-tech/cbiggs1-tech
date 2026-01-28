// pyramath.js - Mental Math Pyramid Trainer
// ===========================================
// Core Mechanic:
// - Capstone displays the CURRENT TARGET value
// - Player selects ANY two unsolved stones from the face (no row/adjacency restriction)
// - If their operation result equals the target → both stones turn gold (.solved)
// - Capstone then updates to a NEW target from remaining possible pairs
// - Face completes when no more valid pairs exist
// - Complete all 4 faces to level up!
// ===========================================

// ============================================
// Operations Configuration
// ============================================
const OPERATIONS = {
    add: {
        symbol: '+',
        name: 'Addition',
        fn: (a, b) => a + b
    },
    subtract: {
        symbol: '−',
        name: 'Subtraction',
        // Always larger - smaller to avoid negatives
        fn: (a, b) => Math.abs(a - b)
    },
    multiply: {
        symbol: '×',
        name: 'Multiplication',
        fn: (a, b) => a * b
    },
    divide: {
        symbol: '÷',
        name: 'Division',
        // Always larger / smaller, ensure integer result
        fn: (a, b) => {
            const dividend = Math.max(a, b);
            const divisor = Math.max(1, Math.min(a, b));
            return Math.floor(dividend / divisor);
        }
    }
};

const FACE_ORDER = ['add', 'subtract', 'multiply', 'divide'];

// Stones per row (capstone at top, base at bottom)
// Fixed at 5 rows: [1, 2, 3, 4, 5] = 15 stones, 7 pairs to solve per face
// FUTURE: Could add more rows for additional challenge modes
const ROWS = [1, 2, 3, 4, 5];

// ============================================
// Level Configuration
// Age-appropriate progression for 4th-6th graders (ages 9-12)
// ============================================

/**
 * Get number ranges for a given level and operation
 * Ranges apply to BASE ROW (row 4) only - upper rows compute from base
 *
 * Level 1: Very easy (warm-up)
 * Level 2-3: 4th grade fluency
 * Level 4-6: 5th grade speed/challenge
 * Level 7+: 6th grade estimation & mental math mastery
 */
function getLevelRanges(level, operation) {
    // Level scaling ranges
    // Addition/Subtraction scale faster (linear math)
    // Multiplication/Division scale slower (exponential growth in results)
    const levelScaling = {
        add: [
            { min: 1, max: 10 },      // Level 1: 1-10
            { min: 5, max: 25 },      // Level 2: 5-25
            { min: 10, max: 50 },     // Level 3: 10-50
            { min: 20, max: 100 },    // Level 4: 20-100
            { min: 50, max: 200 },    // Level 5: 50-200
            { min: 75, max: 300 },    // Level 6: 75-300
            // Level 7+: +50% per level
        ],
        subtract: [
            { min: 5, max: 20 },      // Level 1: 5-20
            { min: 10, max: 50 },     // Level 2: 10-50
            { min: 20, max: 100 },    // Level 3: 20-100
            { min: 40, max: 200 },    // Level 4: 40-200
            { min: 80, max: 400 },    // Level 5: 80-400
            { min: 120, max: 600 },   // Level 6: 120-600
            // Level 7+: +50% per level
        ],
        multiply: [
            { min: 1, max: 8 },       // Level 1: 1-8
            { min: 2, max: 12 },      // Level 2: 2-12
            { min: 4, max: 15 },      // Level 3: 4-15
            { min: 5, max: 20 },      // Level 4: 5-20
            { min: 8, max: 25 },      // Level 5: 8-25
            { min: 10, max: 30 },     // Level 6: 10-30
            // Level 7+: +25% per level
        ],
        divide: [
            // divisor × quotient = product shown on stone
            { minDivisor: 2, maxDivisor: 6, minQuotient: 2, maxQuotient: 8 },    // L1: 4-48
            { minDivisor: 3, maxDivisor: 9, minQuotient: 3, maxQuotient: 12 },   // L2: 9-108
            { minDivisor: 4, maxDivisor: 12, minQuotient: 4, maxQuotient: 15 },  // L3: 16-180
            { minDivisor: 5, maxDivisor: 15, minQuotient: 5, maxQuotient: 20 },  // L4: 25-300
            { minDivisor: 6, maxDivisor: 20, minQuotient: 6, maxQuotient: 25 },  // L5: 36-500
            { minDivisor: 8, maxDivisor: 25, minQuotient: 8, maxQuotient: 30 },  // L6: 64-750
            // Level 7+: +30% per level
        ]
    };

    const scales = levelScaling[operation];
    const idx = Math.min(level - 1, scales.length - 1);
    let range = { ...scales[idx] };

    // For levels beyond our defined ranges, scale up progressively
    if (level > scales.length) {
        const extraLevels = level - scales.length;

        if (operation === 'add' || operation === 'subtract') {
            // +50% per level for add/subtract
            const multiplier = Math.pow(1.5, extraLevels);
            range.min = Math.round(range.min * multiplier);
            range.max = Math.round(range.max * multiplier);
        } else if (operation === 'multiply') {
            // +25% per level for multiply
            const multiplier = Math.pow(1.25, extraLevels);
            range.min = Math.round(range.min * multiplier);
            range.max = Math.round(range.max * multiplier);
        } else if (operation === 'divide') {
            // +30% per level for divide
            const multiplier = Math.pow(1.3, extraLevels);
            range.minDivisor = Math.round(range.minDivisor * multiplier);
            range.maxDivisor = Math.round(range.maxDivisor * multiplier);
            range.minQuotient = Math.round(range.minQuotient * multiplier);
            range.maxQuotient = Math.round(range.maxQuotient * multiplier);
        }
    }

    return range;
}

// ============================================
// Game State
// ============================================
let currentLevel = 1;  // Difficulty level (1-10+)
let currentFaceIndex = 0;
let score = 0;
let streak = 0;
let timerInterval = null;
let elapsedSeconds = 0;
let selectedStones = [];
let soundEnabled = true;
let musicEnabled = true;
let completedFaces = new Set();

// ============================================
// DOM Elements
// ============================================
const pyramid = document.getElementById('pyramid');
const levelValue = document.getElementById('level-value');
const scoreValue = document.getElementById('score-value');
const timerValue = document.getElementById('timer-value');
const streakValue = document.getElementById('streak-value');
const operationSymbol = document.getElementById('operation-symbol');
const operationName = document.getElementById('operation-name');
const feedback = document.getElementById('feedback');
const status = document.getElementById('status');

const newGameBtn = document.getElementById('new-game-btn');
const rotateLeftBtn = document.getElementById('rotate-left-btn');
const rotateRightBtn = document.getElementById('rotate-right-btn');
const soundToggleBtn = document.getElementById('sound-toggle-btn');
const musicToggleBtn = document.getElementById('music-toggle-btn');

const levelCompleteModal = document.getElementById('level-complete-modal');
const pyramidCompleteModal = document.getElementById('pyramid-complete-modal');
const levelContinueBtn = document.getElementById('level-continue-btn');
const playAgainBtn = document.getElementById('play-again-btn');
const nextLevelBtn = document.getElementById('next-level-btn');

const faces = {
    add: document.querySelector('.face-front'),
    subtract: document.querySelector('.face-right'),
    multiply: document.querySelector('.face-back'),
    divide: document.querySelector('.face-left')
};

// ============================================
// Utility Functions
// ============================================

function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function shuffleArray(array) {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

// ============================================
// Number Generation
// Generates values for all stones on a face
// Uses currentLevel to scale difficulty
// ============================================

function generateNumbersForFace(operation, level = currentLevel) {
    switch (operation) {
        case 'add':
            return generateAdditionNumbers(level);
        case 'subtract':
            return generateSubtractionNumbers(level);
        case 'multiply':
            return generateMultiplicationNumbers(level);
        case 'divide':
            return generateDivisionNumbers(level);
        default:
            return generateAdditionNumbers(level);
    }
}

function generateAdditionNumbers(level) {
    const range = getLevelRanges(level, 'add');
    const grid = [];

    // Generate base row (row 4) with level-appropriate numbers
    grid[4] = [];
    for (let i = 0; i < 5; i++) {
        grid[4][i] = randomInt(range.min, range.max);
    }

    // Build upward - upper rows computed from pairs below
    // This naturally scales the capstone target with level
    for (let row = 3; row >= 0; row--) {
        grid[row] = [];
        for (let col = 0; col <= row; col++) {
            grid[row][col] = grid[row + 1][col] + grid[row + 1][col + 1];
        }
    }

    return grid;
}

function generateSubtractionNumbers(level) {
    const range = getLevelRanges(level, 'subtract');
    const grid = [];

    // Generate base row with level-appropriate numbers
    grid[4] = [];
    for (let i = 0; i < 5; i++) {
        grid[4][i] = randomInt(range.min, range.max);
    }

    // Build upward using absolute difference (always non-negative)
    for (let row = 3; row >= 0; row--) {
        grid[row] = [];
        for (let col = 0; col <= row; col++) {
            grid[row][col] = Math.abs(grid[row + 1][col] - grid[row + 1][col + 1]);
        }
    }

    return grid;
}

function generateMultiplicationNumbers(level) {
    const range = getLevelRanges(level, 'multiply');
    const grid = [];

    // Generate base row with level-appropriate numbers
    grid[4] = [];
    for (let i = 0; i < 5; i++) {
        grid[4][i] = randomInt(range.min, range.max);
    }

    // Build upward using multiplication
    for (let row = 3; row >= 0; row--) {
        grid[row] = [];
        for (let col = 0; col <= row; col++) {
            grid[row][col] = grid[row + 1][col] * grid[row + 1][col + 1];
        }
    }

    return grid;
}

function generateDivisionNumbers(level) {
    const range = getLevelRanges(level, 'divide');
    const grid = [];

    // Generate base row as products of divisor × quotient
    // This ensures clean integer division is always possible
    grid[4] = [];
    for (let i = 0; i < 5; i++) {
        const divisor = randomInt(range.minDivisor, range.maxDivisor);
        const quotient = randomInt(range.minQuotient, range.maxQuotient);
        grid[4][i] = divisor * quotient; // Always clean, never 0
    }

    // Build upward using division (larger / smaller)
    for (let row = 3; row >= 0; row--) {
        grid[row] = [];
        for (let col = 0; col <= row; col++) {
            const a = grid[row + 1][col];
            const b = grid[row + 1][col + 1];
            const dividend = Math.max(a, b);
            const divisor = Math.max(1, Math.min(a, b));
            grid[row][col] = Math.floor(dividend / divisor);
            // Ensure no zeros (minimum 1)
            if (grid[row][col] === 0) grid[row][col] = 1;
        }
    }

    return grid;
}

// ============================================
// Face Population
// Creates DOM stones and sets initial target
// ============================================

function populateFace(faceElement, operation) {
    faceElement.innerHTML = '';

    // Re-add the pyramid background for this face
    const faceBg = document.createElement('div');
    faceBg.className = 'face-bg';
    faceElement.appendChild(faceBg);

    const grid = generateNumbersForFace(operation, currentLevel);

    // Create all rows and stones
    ROWS.forEach((stoneCount, rowIndex) => {
        const row = document.createElement('div');
        row.className = 'stone-row';
        row.dataset.row = rowIndex;

        for (let col = 0; col < stoneCount; col++) {
            const stone = document.createElement('div');
            stone.className = 'stone';
            stone.dataset.row = rowIndex;
            stone.dataset.col = col;
            stone.dataset.operation = operation;
            stone.dataset.value = grid[rowIndex][col];
            stone.textContent = grid[rowIndex][col];

            // Capstone (row 0) is the target display
            if (rowIndex === 0) {
                stone.classList.add('target');
            }

            stone.addEventListener('click', () => handleStoneClick(stone));
            row.appendChild(stone);
        }

        faceElement.appendChild(row);
    });

    // Set initial target from possible pairs
    setInitialTarget(faceElement, operation);
}

/**
 * Set the initial capstone target based on possible pairs
 */
function setInitialTarget(faceElement, operation) {
    const possibleTargets = getAllPossibleResults(faceElement, operation);

    if (possibleTargets.length > 0) {
        // Pick a random target from possible results
        const target = possibleTargets[randomInt(0, possibleTargets.length - 1)];
        const capstone = faceElement.querySelector('.stone-row[data-row="0"] .stone');
        capstone.dataset.value = target;
        capstone.textContent = target;
    }
}

/**
 * Get all possible results from pairing unsolved stones
 */
function getAllPossibleResults(faceElement, operation) {
    const unsolvedStones = faceElement.querySelectorAll('.stone:not(.solved):not(.target)');
    const results = new Set();
    const opFn = OPERATIONS[operation].fn;

    // Check all possible pairs
    const stones = Array.from(unsolvedStones);
    for (let i = 0; i < stones.length; i++) {
        for (let j = i + 1; j < stones.length; j++) {
            const a = parseInt(stones[i].dataset.value);
            const b = parseInt(stones[j].dataset.value);
            const result = opFn(a, b);

            // For division, only include integer results
            if (operation === 'divide') {
                const dividend = Math.max(a, b);
                const divisor = Math.max(1, Math.min(a, b));
                if (dividend % divisor === 0) {
                    results.add(result);
                }
            } else {
                results.add(result);
            }
        }
    }

    return Array.from(results);
}

/**
 * Find all pairs that produce a specific target value
 */
function findPairsForTarget(faceElement, operation, target) {
    const unsolvedStones = faceElement.querySelectorAll('.stone:not(.solved):not(.target)');
    const pairs = [];
    const opFn = OPERATIONS[operation].fn;

    const stones = Array.from(unsolvedStones);
    for (let i = 0; i < stones.length; i++) {
        for (let j = i + 1; j < stones.length; j++) {
            const a = parseInt(stones[i].dataset.value);
            const b = parseInt(stones[j].dataset.value);
            const result = opFn(a, b);

            if (result === target) {
                pairs.push([stones[i], stones[j], a, b]);
            }
        }
    }

    return pairs;
}

// ============================================
// Game Initialization
// ============================================

function initPyramid(keepScore = false) {
    currentFaceIndex = 0;
    if (!keepScore) {
        score = 0;
    }
    streak = 0;
    selectedStones = [];
    elapsedSeconds = 0;
    completedFaces = new Set();

    updateLevelDisplay();
    updateScoreDisplay();
    updateStreakDisplay();
    updateTimerDisplay();
    updateOperationDisplay();
    clearFeedback();

    // Populate all faces with numbers (using currentLevel)
    Object.keys(faces).forEach(operation => {
        populateFace(faces[operation], operation);
    });

    rotatePyramidTo(0);
    startTimer();

    const levelName = getLevelName(currentLevel);
    setStatus(`Level ${currentLevel} (${levelName}) - Find two stones that equal the target!`);
}

/**
 * Get a friendly name for the current level
 */
function getLevelName(level) {
    if (level === 1) return 'Warm-up';
    if (level <= 3) return '4th Grade';
    if (level <= 6) return '5th Grade';
    if (level <= 9) return '6th Grade';
    return 'Math Master';
}

/**
 * Start a completely new game at level 1
 */
function startNewGame() {
    currentLevel = 1;
    initPyramid(false);
}

/**
 * Advance to the next level (keep score)
 */
function advanceToNextLevel() {
    currentLevel++;
    // Add level-up bonus
    const levelBonus = 100 * currentLevel;
    score += levelBonus;
    initPyramid(true);

    // Show level up feedback
    setFeedback(`Level Up! Welcome to Level ${currentLevel}! (+${levelBonus} bonus)`, false);

    // Animate the level display
    levelValue.classList.add('level-up-animation');
    setTimeout(() => levelValue.classList.remove('level-up-animation'), 1000);
}

// ============================================
// Stone Selection & Pair Checking
// ============================================

/**
 * Handle stone click - no row restriction, any two unsolved stones
 */
function handleStoneClick(stone) {
    const operation = stone.dataset.operation;
    const currentOperation = FACE_ORDER[currentFaceIndex];

    // Ignore clicks on wrong face
    if (operation !== currentOperation) return;

    // Ignore clicks on solved stones
    if (stone.classList.contains('solved')) {
        setFeedback('That stone is already used!', true);
        return;
    }

    // Ignore clicks on the target capstone
    if (stone.classList.contains('target')) {
        const val = stone.dataset.value;
        setFeedback(`Target: ${val} — Find two stones that make this!`, false);
        return;
    }

    // Toggle selection
    if (stone.classList.contains('selected')) {
        stone.classList.remove('selected');
        selectedStones = selectedStones.filter(s => s !== stone);
        clearFeedback();
    } else {
        // Auto-deselect oldest if already have 2
        if (selectedStones.length >= 2) {
            const oldest = selectedStones.shift();
            oldest.classList.remove('selected');
        }

        stone.classList.add('selected');
        selectedStones.push(stone);

        if (selectedStones.length === 2) {
            checkSelectedPair();
        } else {
            const val = stone.dataset.value;
            setFeedback(`Selected ${val}. Pick another stone!`, false);
        }
    }
}

/**
 * Check if the two selected stones produce the target
 */
function checkSelectedPair() {
    const [stoneA, stoneB] = selectedStones;
    const valA = parseInt(stoneA.dataset.value);
    const valB = parseInt(stoneB.dataset.value);
    const operation = FACE_ORDER[currentFaceIndex];
    const opData = OPERATIONS[operation];
    const faceElement = faces[operation];

    // Get current target
    const capstone = faceElement.querySelector('.stone-row[data-row="0"] .stone');
    const target = parseInt(capstone.dataset.value);

    // Calculate result
    const result = opData.fn(valA, valB);

    // For division, check if it's clean
    if (operation === 'divide') {
        const dividend = Math.max(valA, valB);
        const divisor = Math.max(1, Math.min(valA, valB));
        if (dividend % divisor !== 0) {
            setFeedback(`${dividend} ${opData.symbol} ${divisor} doesn't divide evenly!`, true);
            streak = 0;
            updateStreakDisplay();
            shakeStones(selectedStones);
            clearSelection();
            return;
        }
    }

    // Check if result matches target
    if (result === target) {
        // SUCCESS!
        handleCorrectPair(stoneA, stoneB, valA, valB, result, operation, opData);
    } else {
        // Wrong pair
        handleWrongPair(valA, valB, result, target, opData);
    }
}

/**
 * Handle a correct pair match
 */
function handleCorrectPair(stoneA, stoneB, valA, valB, result, operation, opData) {
    // Mark both stones as solved
    solveStone(stoneA);
    solveStone(stoneB);

    // Calculate points: (base 10 + streak bonus) × level multiplier
    const basePoints = 10 + (streak * 5);
    const points = basePoints * currentLevel;
    score += points;
    streak++;

    updateScoreDisplay();
    updateStreakDisplay();

    // Show success feedback with level multiplier
    if (currentLevel > 1) {
        setFeedback(`✓ ${valA} ${opData.symbol} ${valB} = ${result}! (+${points} = ${basePoints}×L${currentLevel})`, false);
    } else {
        setFeedback(`✓ ${valA} ${opData.symbol} ${valB} = ${result}! (+${points})`, false);
    }
    playSound('correct');

    clearSelection();

    // Update to new target or complete face
    updateCapstoneToNewTarget(operation);
}

/**
 * Handle a wrong pair attempt
 */
function handleWrongPair(valA, valB, result, target, opData) {
    streak = 0;
    updateStreakDisplay();

    setFeedback(`✗ ${valA} ${opData.symbol} ${valB} = ${result}, not ${target}. Try again!`, true);
    shakeStones(selectedStones);
    playSound('wrong');

    clearSelection();
}

/**
 * Update the capstone to a new target from remaining pairs
 * If no pairs left, face is complete
 */
function updateCapstoneToNewTarget(operation) {
    const faceElement = faces[operation];
    const possibleTargets = getAllPossibleResults(faceElement, operation);
    const capstone = faceElement.querySelector('.stone-row[data-row="0"] .stone');

    if (possibleTargets.length === 0) {
        // No more pairs possible - face complete!
        capstone.classList.add('solved');
        capstone.textContent = '✓';
        handleFaceComplete(operation);
    } else {
        // Pick a new random target
        const newTarget = possibleTargets[randomInt(0, possibleTargets.length - 1)];
        capstone.dataset.value = newTarget;
        capstone.textContent = newTarget;

        // Brief highlight to show target changed
        capstone.classList.add('target-changed');
        setTimeout(() => capstone.classList.remove('target-changed'), 500);

        setStatus(`New target: ${newTarget}! Find a matching pair.`);
    }
}

/**
 * Mark a stone as solved
 */
function solveStone(stone) {
    stone.classList.remove('selected');
    stone.classList.add('solved');
    stone.classList.add('just-solved');
    setTimeout(() => stone.classList.remove('just-solved'), 600);
}

/**
 * Shake stones for wrong answer feedback
 */
function shakeStones(stones) {
    stones.forEach(stone => {
        stone.classList.add('shake');
        setTimeout(() => stone.classList.remove('shake'), 500);
    });
}

/**
 * Clear selection state
 */
function clearSelection() {
    selectedStones.forEach(stone => stone.classList.remove('selected'));
    selectedStones = [];
}

// ============================================
// Face & Pyramid Completion
// ============================================

function handleFaceComplete(operation) {
    completedFaces.add(operation);

    // Bonus points for completing a face (scaled by level)
    const faceBonus = 50 * currentLevel;
    score += faceBonus;
    updateScoreDisplay();

    if (completedFaces.size === 4) {
        // All faces complete - pyramid complete!
        stopTimer();
        playSound('pyramidComplete');
        setTimeout(() => showPyramidCompleteModal(), 800);
    } else {
        playSound('levelComplete');
        showLevelCompleteModal(operation);
    }
}

// ============================================
// Rotation Functions
// ============================================

function rotatePyramidTo(faceIndex) {
    currentFaceIndex = ((faceIndex % 4) + 4) % 4;

    // Remove active class from all faces
    Object.values(faces).forEach(face => {
        face.classList.remove('active');
    });

    // Add active class to current face
    const operation = FACE_ORDER[currentFaceIndex];
    faces[operation].classList.add('active');

    updateOperationDisplay();
    clearSelection();
    clearFeedback();

    if (completedFaces.has(operation)) {
        setStatus('✓ This face is complete! Rotate to continue.');
    } else {
        const faceElement = faces[operation];
        const capstone = faceElement.querySelector('.stone-row[data-row="0"] .stone');
        const target = capstone ? capstone.dataset.value : '?';
        setStatus(`Target: ${target} — Find two stones that make this!`);
    }
}

function rotateLeft() {
    rotatePyramidTo(currentFaceIndex - 1);
}

function rotateRight() {
    rotatePyramidTo(currentFaceIndex + 1);
}

// ============================================
// Display Updates
// ============================================

function updateLevelDisplay() {
    levelValue.textContent = currentLevel;
}

function updateScoreDisplay() {
    scoreValue.textContent = score;
}

function updateStreakDisplay() {
    streakValue.textContent = streak;
}

function updateTimerDisplay() {
    const minutes = Math.floor(elapsedSeconds / 60);
    const seconds = elapsedSeconds % 60;
    timerValue.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

function updateOperationDisplay() {
    const operation = FACE_ORDER[currentFaceIndex];
    const opData = OPERATIONS[operation];
    operationSymbol.textContent = opData.symbol;
    operationName.textContent = opData.name;
}

function setFeedback(message, isError = false) {
    feedback.textContent = message;
    feedback.style.color = isError ? '#C44' : '#3D2914';
}

function clearFeedback() {
    feedback.textContent = '';
}

function setStatus(message) {
    status.textContent = message;
}

// ============================================
// Timer Functions
// FUTURE: Could add time bonuses or time attack modes here
// ============================================

function startTimer() {
    stopTimer();
    elapsedSeconds = 0;
    updateTimerDisplay();
    timerInterval = setInterval(() => {
        elapsedSeconds++;
        updateTimerDisplay();
    }, 1000);
}

function stopTimer() {
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
}

// ============================================
// Modal Functions
// ============================================

function showLevelCompleteModal(operation) {
    const faceBonus = 50 * currentLevel;
    document.getElementById('completed-operation').textContent = OPERATIONS[operation].name;
    document.getElementById('level-bonus').textContent = `+${faceBonus}`;
    levelCompleteModal.classList.add('active');
}

function hideLevelCompleteModal() {
    levelCompleteModal.classList.remove('active');
}

function showPyramidCompleteModal() {
    document.getElementById('final-score').textContent = score;
    document.getElementById('final-time').textContent = timerValue.textContent;

    // Update level-up message
    const levelUpMsg = document.getElementById('level-up-message');
    if (levelUpMsg) {
        const nextLevel = currentLevel + 1;
        const nextLevelName = getLevelName(nextLevel);
        levelUpMsg.textContent = `Level Up! Ready for Level ${nextLevel} (${nextLevelName})?`;
    }

    pyramidCompleteModal.classList.add('active');
}

function hidePyramidCompleteModal() {
    pyramidCompleteModal.classList.remove('active');
}

// ============================================
// Sound Functions (Placeholders)
// FUTURE: Add actual sound effects here
// ============================================

function toggleSound() {
    soundEnabled = !soundEnabled;
    soundToggleBtn.textContent = soundEnabled ? '🔊' : '🔇';
    soundToggleBtn.classList.toggle('muted', !soundEnabled);
}

function toggleMusic() {
    musicEnabled = !musicEnabled;
    musicToggleBtn.textContent = musicEnabled ? '🎵' : '🎵';
    musicToggleBtn.classList.toggle('muted', !musicEnabled);
}

function playSound(soundName) {
    if (!soundEnabled) return;
    // FUTURE: Implement actual sound playback
    console.log('Play sound:', soundName);
}

// ============================================
// Event Listeners
// ============================================

newGameBtn.addEventListener('click', () => {
    hideLevelCompleteModal();
    hidePyramidCompleteModal();
    startNewGame();
});

rotateLeftBtn.addEventListener('click', rotateLeft);
rotateRightBtn.addEventListener('click', rotateRight);

soundToggleBtn.addEventListener('click', toggleSound);
musicToggleBtn.addEventListener('click', toggleMusic);

levelContinueBtn.addEventListener('click', () => {
    hideLevelCompleteModal();
    rotateRight();
});

// Next Level button - advance to harder difficulty
if (nextLevelBtn) {
    nextLevelBtn.addEventListener('click', () => {
        hidePyramidCompleteModal();
        advanceToNextLevel();
    });
}

// Play Again button - restart at level 1
playAgainBtn.addEventListener('click', () => {
    hidePyramidCompleteModal();
    startNewGame();
});

document.addEventListener('keydown', (e) => {
    switch (e.key) {
        case 'ArrowLeft':
            rotateLeft();
            break;
        case 'ArrowRight':
            rotateRight();
            break;
        case 'Escape':
            clearSelection();
            clearFeedback();
            break;
    }
});

// ============================================
// Initialize on Page Load
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    initPyramid();
});
