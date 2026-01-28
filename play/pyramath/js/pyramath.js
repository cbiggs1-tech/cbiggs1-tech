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
const ROWS = [1, 2, 3, 4, 5];

// ============================================
// Level Configuration
// Age-appropriate progression for 4th-6th graders (ages 9-12)
// ============================================

function getLevelRanges(level, operation) {
    const levelScaling = {
        add: [
            { min: 1, max: 10 },      // Level 1: 1-10
            { min: 5, max: 25 },      // Level 2: 5-25
            { min: 10, max: 50 },     // Level 3: 10-50
            { min: 20, max: 100 },    // Level 4: 20-100
            { min: 50, max: 200 },    // Level 5: 50-200
            { min: 75, max: 300 },    // Level 6: 75-300
        ],
        subtract: [
            { min: 5, max: 20 },      // Level 1: 5-20
            { min: 10, max: 50 },     // Level 2: 10-50
            { min: 20, max: 100 },    // Level 3: 20-100
            { min: 40, max: 200 },    // Level 4: 40-200
            { min: 80, max: 400 },    // Level 5: 80-400
            { min: 120, max: 600 },   // Level 6: 120-600
        ],
        multiply: [
            { min: 2, max: 9 },       // Level 1: 2-9 (basic times tables)
            { min: 3, max: 12 },      // Level 2: 3-12
            { min: 4, max: 12 },      // Level 3: 4-12
            { min: 5, max: 15 },      // Level 4: 5-15
            { min: 6, max: 15 },      // Level 5: 6-15
            { min: 7, max: 18 },      // Level 6: 7-18
        ],
        divide: [
            // For division, we generate factor pairs
            { minFactor: 2, maxFactor: 6, minQuotient: 2, maxQuotient: 9 },    // L1
            { minFactor: 2, maxFactor: 9, minQuotient: 2, maxQuotient: 12 },   // L2
            { minFactor: 3, maxFactor: 10, minQuotient: 3, maxQuotient: 12 },  // L3
            { minFactor: 4, maxFactor: 12, minQuotient: 4, maxQuotient: 15 },  // L4
            { minFactor: 5, maxFactor: 15, minQuotient: 5, maxQuotient: 18 },  // L5
            { minFactor: 6, maxFactor: 18, minQuotient: 6, maxQuotient: 20 },  // L6
        ]
    };

    const scales = levelScaling[operation];
    const idx = Math.min(level - 1, scales.length - 1);
    let range = { ...scales[idx] };

    // For levels beyond defined ranges, scale up progressively
    if (level > scales.length) {
        const extraLevels = level - scales.length;
        if (operation === 'add' || operation === 'subtract') {
            const multiplier = Math.pow(1.5, extraLevels);
            range.min = Math.round(range.min * multiplier);
            range.max = Math.round(range.max * multiplier);
        } else if (operation === 'multiply') {
            const multiplier = Math.pow(1.2, extraLevels);
            range.min = Math.round(range.min * multiplier);
            range.max = Math.round(range.max * multiplier);
        } else if (operation === 'divide') {
            const multiplier = Math.pow(1.25, extraLevels);
            range.minFactor = Math.round(range.minFactor * multiplier);
            range.maxFactor = Math.round(range.maxFactor * multiplier);
            range.minQuotient = Math.round(range.minQuotient * multiplier);
            range.maxQuotient = Math.round(range.maxQuotient * multiplier);
        }
    }

    return range;
}

// ============================================
// Game State
// ============================================
let currentLevel = 1;
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
// DOM Elements (initialized after DOM ready)
// ============================================
let pyramid, levelValue, scoreValue, timerValue, streakValue;
let operationSymbol, operationName, feedback, statusDisplay;
let newGameBtn, rotateLeftBtn, rotateRightBtn, soundToggleBtn, musicToggleBtn;
let levelCompleteModal, pyramidCompleteModal, levelContinueBtn, playAgainBtn, nextLevelBtn;
let faces;

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
// Each operation generates numbers differently to ensure
// sensible, achievable targets
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

/**
 * Addition: Generate numbers where sums make sense
 * All stones are smaller than possible targets
 */
function generateAdditionNumbers(level) {
    const range = getLevelRanges(level, 'add');
    const grid = [];

    // Generate ALL 14 non-capstone stones as base numbers
    // This ensures we have full control over the values
    const allNumbers = [];
    for (let i = 0; i < 14; i++) {
        allNumbers.push(randomInt(range.min, range.max));
    }
    shuffleArray(allNumbers);

    // Distribute to pyramid (rows 1-4, total 14 stones)
    let idx = 0;
    for (let row = 1; row <= 4; row++) {
        grid[row] = [];
        for (let col = 0; col <= row; col++) {
            grid[row][col] = allNumbers[idx++];
        }
    }

    // Capstone (row 0) - placeholder, will be set by setInitialTarget
    grid[0] = [0];

    return grid;
}

/**
 * Subtraction: Generate numbers where differences are achievable
 */
function generateSubtractionNumbers(level) {
    const range = getLevelRanges(level, 'subtract');
    const grid = [];

    // Generate varied numbers for subtraction
    const allNumbers = [];
    for (let i = 0; i < 14; i++) {
        allNumbers.push(randomInt(range.min, range.max));
    }
    shuffleArray(allNumbers);

    let idx = 0;
    for (let row = 1; row <= 4; row++) {
        grid[row] = [];
        for (let col = 0; col <= row; col++) {
            grid[row][col] = allNumbers[idx++];
        }
    }

    grid[0] = [0];
    return grid;
}

/**
 * Multiplication: Use smaller base numbers to avoid huge products
 */
function generateMultiplicationNumbers(level) {
    const range = getLevelRanges(level, 'multiply');
    const grid = [];

    // Keep multiplication numbers small to avoid overflow
    const allNumbers = [];
    for (let i = 0; i < 14; i++) {
        allNumbers.push(randomInt(range.min, range.max));
    }
    shuffleArray(allNumbers);

    let idx = 0;
    for (let row = 1; row <= 4; row++) {
        grid[row] = [];
        for (let col = 0; col <= row; col++) {
            grid[row][col] = allNumbers[idx++];
        }
    }

    grid[0] = [0];
    return grid;
}

/**
 * Division: Generate numbers that divide cleanly with VARIED quotients
 * Key insight: Create factor pairs (dividend, divisor) where dividend = divisor × quotient
 */
function generateDivisionNumbers(level) {
    const range = getLevelRanges(level, 'divide');
    const grid = [];

    // Generate diverse numbers that can form clean division pairs
    // Strategy: Create numbers that are products of small factors
    const allNumbers = [];
    const usedNumbers = new Set();

    // Generate varied products to ensure diverse quotients
    for (let i = 0; i < 14; i++) {
        let num;
        let attempts = 0;
        do {
            // Create a product of two factors to ensure clean division
            const factor1 = randomInt(range.minFactor, range.maxFactor);
            const factor2 = randomInt(range.minQuotient, range.maxQuotient);
            num = factor1 * factor2;
            attempts++;
        } while (usedNumbers.has(num) && attempts < 20);

        usedNumbers.add(num);
        allNumbers.push(num);
    }

    shuffleArray(allNumbers);

    let idx = 0;
    for (let row = 1; row <= 4; row++) {
        grid[row] = [];
        for (let col = 0; col <= row; col++) {
            grid[row][col] = allNumbers[idx++];
        }
    }

    grid[0] = [0];
    return grid;
}

// ============================================
// Face Population
// ============================================

function populateFace(faceElement, operation) {
    faceElement.innerHTML = '';

    const faceBg = document.createElement('div');
    faceBg.className = 'face-bg';
    faceElement.appendChild(faceBg);

    const grid = generateNumbersForFace(operation, currentLevel);

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
            } else {
                // Dynamic font sizing for large numbers
                const numStr = String(grid[rowIndex][col]);
                if (numStr.length >= 5) {
                    stone.classList.add('tiny-text');
                } else if (numStr.length >= 4) {
                    stone.classList.add('small-text');
                }
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
 * For addition: pick targets that are >= max stone value (makes intuitive sense)
 */
function setInitialTarget(faceElement, operation) {
    const possibleTargets = getAllPossibleResults(faceElement, operation);
    const unsolvedStones = faceElement.querySelectorAll('.stone:not(.target)');

    if (possibleTargets.length > 0) {
        let validTargets = possibleTargets;

        // For addition, filter to targets >= max stone value
        // This prevents confusing scenarios like "target is 5 but there's a 12 on the board"
        if (operation === 'add') {
            const maxStone = Math.max(...Array.from(unsolvedStones).map(s => parseInt(s.dataset.value)));
            validTargets = possibleTargets.filter(t => t >= maxStone);
            if (validTargets.length === 0) validTargets = possibleTargets; // fallback
        }

        // For division, prefer targets > 1 to avoid trivial answers
        if (operation === 'divide') {
            const nonTrivial = possibleTargets.filter(t => t > 1);
            if (nonTrivial.length > 0) validTargets = nonTrivial;
        }

        const target = validTargets[randomInt(0, validTargets.length - 1)];
        const capstone = faceElement.querySelector('.stone-row[data-row="0"] .stone');
        capstone.dataset.value = target;
        capstone.textContent = target;

        // Dynamic font sizing for capstone too
        const numStr = String(target);
        capstone.classList.remove('tiny-text', 'small-text');
        if (numStr.length >= 5) {
            capstone.classList.add('tiny-text');
        } else if (numStr.length >= 4) {
            capstone.classList.add('small-text');
        }
    }
}

/**
 * Get all possible results from pairing unsolved stones
 */
function getAllPossibleResults(faceElement, operation) {
    const unsolvedStones = faceElement.querySelectorAll('.stone:not(.solved):not(.target)');
    const results = new Set();
    const opFn = OPERATIONS[operation].fn;

    const stones = Array.from(unsolvedStones);
    for (let i = 0; i < stones.length; i++) {
        for (let j = i + 1; j < stones.length; j++) {
            const a = parseInt(stones[i].dataset.value);
            const b = parseInt(stones[j].dataset.value);

            // For division, only include clean integer results
            if (operation === 'divide') {
                const dividend = Math.max(a, b);
                const divisor = Math.max(1, Math.min(a, b));
                if (divisor > 0 && dividend % divisor === 0) {
                    results.add(Math.floor(dividend / divisor));
                }
            } else {
                results.add(opFn(a, b));
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

    // Populate all faces with numbers
    Object.keys(faces).forEach(operation => {
        populateFace(faces[operation], operation);
    });

    rotatePyramidTo(0);
    startTimer();

    const levelName = getLevelName(currentLevel);
    setStatus(`Level ${currentLevel} (${levelName}) - Find two stones that equal the target!`);
}

function getLevelName(level) {
    if (level === 1) return 'Warm-up';
    if (level <= 3) return '4th Grade';
    if (level <= 6) return '5th Grade';
    if (level <= 9) return '6th Grade';
    return 'Math Master';
}

function startNewGame() {
    currentLevel = 1;
    initPyramid(false);
}

function advanceToNextLevel() {
    currentLevel++;
    const levelBonus = 100 * currentLevel;
    score += levelBonus;
    initPyramid(true);

    setFeedback(`Level Up! Welcome to Level ${currentLevel}! (+${levelBonus} bonus)`, false);

    if (levelValue) {
        levelValue.classList.add('level-up-animation');
        setTimeout(() => levelValue.classList.remove('level-up-animation'), 1000);
    }
}

// ============================================
// Stone Selection & Pair Checking
// ============================================

function handleStoneClick(stone) {
    const operation = stone.dataset.operation;
    const currentOperation = FACE_ORDER[currentFaceIndex];

    if (operation !== currentOperation) return;

    if (stone.classList.contains('solved')) {
        setFeedback('That stone is already used!', true);
        return;
    }

    if (stone.classList.contains('target')) {
        const val = stone.dataset.value;
        setFeedback(`Target: ${val} — Find two stones that make this!`, false);
        return;
    }

    if (stone.classList.contains('selected')) {
        stone.classList.remove('selected');
        selectedStones = selectedStones.filter(s => s !== stone);
        clearFeedback();
    } else {
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

function checkSelectedPair() {
    const [stoneA, stoneB] = selectedStones;
    const valA = parseInt(stoneA.dataset.value);
    const valB = parseInt(stoneB.dataset.value);
    const operation = FACE_ORDER[currentFaceIndex];
    const opData = OPERATIONS[operation];
    const faceElement = faces[operation];

    const capstone = faceElement.querySelector('.stone-row[data-row="0"] .stone');
    const target = parseInt(capstone.dataset.value);

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

    if (result === target) {
        handleCorrectPair(stoneA, stoneB, valA, valB, result, operation, opData);
    } else {
        handleWrongPair(valA, valB, result, target, opData);
    }
}

function handleCorrectPair(stoneA, stoneB, valA, valB, result, operation, opData) {
    solveStone(stoneA);
    solveStone(stoneB);

    const basePoints = 10 + (streak * 5);
    const points = basePoints * currentLevel;
    score += points;
    streak++;

    updateScoreDisplay();
    updateStreakDisplay();

    if (currentLevel > 1) {
        setFeedback(`✓ ${valA} ${opData.symbol} ${valB} = ${result}! (+${points} = ${basePoints}×L${currentLevel})`, false);
    } else {
        setFeedback(`✓ ${valA} ${opData.symbol} ${valB} = ${result}! (+${points})`, false);
    }
    playSound('correct');

    clearSelection();
    updateCapstoneToNewTarget(operation);
}

function handleWrongPair(valA, valB, result, target, opData) {
    streak = 0;
    updateStreakDisplay();

    setFeedback(`✗ ${valA} ${opData.symbol} ${valB} = ${result}, not ${target}. Try again!`, true);
    shakeStones(selectedStones);
    playSound('wrong');

    clearSelection();
}

function updateCapstoneToNewTarget(operation) {
    const faceElement = faces[operation];
    const possibleTargets = getAllPossibleResults(faceElement, operation);
    const capstone = faceElement.querySelector('.stone-row[data-row="0"] .stone');

    if (possibleTargets.length === 0) {
        capstone.classList.add('solved');
        capstone.textContent = '✓';
        handleFaceComplete(operation);
    } else {
        // For division, prefer non-trivial targets
        let validTargets = possibleTargets;
        if (operation === 'divide') {
            const nonTrivial = possibleTargets.filter(t => t > 1);
            if (nonTrivial.length > 0) validTargets = nonTrivial;
        }

        // For addition, prefer larger targets
        if (operation === 'add') {
            const unsolvedStones = faceElement.querySelectorAll('.stone:not(.solved):not(.target)');
            const maxStone = Math.max(...Array.from(unsolvedStones).map(s => parseInt(s.dataset.value)));
            const sensibleTargets = possibleTargets.filter(t => t >= maxStone);
            if (sensibleTargets.length > 0) validTargets = sensibleTargets;
        }

        const newTarget = validTargets[randomInt(0, validTargets.length - 1)];
        capstone.dataset.value = newTarget;
        capstone.textContent = newTarget;

        // Dynamic font sizing
        const numStr = String(newTarget);
        capstone.classList.remove('tiny-text', 'small-text');
        if (numStr.length >= 5) {
            capstone.classList.add('tiny-text');
        } else if (numStr.length >= 4) {
            capstone.classList.add('small-text');
        }

        capstone.classList.add('target-changed');
        setTimeout(() => capstone.classList.remove('target-changed'), 500);

        setStatus(`New target: ${newTarget}! Find a matching pair.`);
    }
}

function solveStone(stone) {
    stone.classList.remove('selected');
    stone.classList.add('solved');
    stone.classList.add('just-solved');
    setTimeout(() => stone.classList.remove('just-solved'), 600);
}

function shakeStones(stones) {
    stones.forEach(stone => {
        stone.classList.add('shake');
        setTimeout(() => stone.classList.remove('shake'), 500);
    });
}

function clearSelection() {
    selectedStones.forEach(stone => stone.classList.remove('selected'));
    selectedStones = [];
}

// ============================================
// Face & Pyramid Completion
// ============================================

function handleFaceComplete(operation) {
    completedFaces.add(operation);

    const faceBonus = 50 * currentLevel;
    score += faceBonus;
    updateScoreDisplay();

    if (completedFaces.size === 4) {
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

    Object.values(faces).forEach(face => {
        face.classList.remove('active');
    });

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
    if (levelValue) levelValue.textContent = currentLevel;
}

function updateScoreDisplay() {
    if (scoreValue) scoreValue.textContent = score;
}

function updateStreakDisplay() {
    if (streakValue) streakValue.textContent = streak;
}

function updateTimerDisplay() {
    if (timerValue) {
        const minutes = Math.floor(elapsedSeconds / 60);
        const seconds = elapsedSeconds % 60;
        timerValue.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }
}

function updateOperationDisplay() {
    const operation = FACE_ORDER[currentFaceIndex];
    const opData = OPERATIONS[operation];
    if (operationSymbol) operationSymbol.textContent = opData.symbol;
    if (operationName) operationName.textContent = opData.name;
}

function setFeedback(message, isError = false) {
    if (feedback) {
        feedback.textContent = message;
        feedback.style.color = isError ? '#C44' : '#3D2914';
    }
}

function clearFeedback() {
    if (feedback) feedback.textContent = '';
}

function setStatus(message) {
    if (statusDisplay) statusDisplay.textContent = message;
}

// ============================================
// Timer Functions
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
    const completedOp = document.getElementById('completed-operation');
    const bonusEl = document.getElementById('level-bonus');
    if (completedOp) completedOp.textContent = OPERATIONS[operation].name;
    if (bonusEl) bonusEl.textContent = `+${faceBonus}`;
    if (levelCompleteModal) levelCompleteModal.classList.add('active');
}

function hideLevelCompleteModal() {
    if (levelCompleteModal) levelCompleteModal.classList.remove('active');
}

function showPyramidCompleteModal() {
    const finalScoreEl = document.getElementById('final-score');
    const finalTimeEl = document.getElementById('final-time');
    const levelUpMsg = document.getElementById('level-up-message');

    if (finalScoreEl) finalScoreEl.textContent = score;
    if (finalTimeEl && timerValue) finalTimeEl.textContent = timerValue.textContent;

    if (levelUpMsg) {
        const nextLevel = currentLevel + 1;
        const nextLevelName = getLevelName(nextLevel);
        levelUpMsg.textContent = `Level Up! Ready for Level ${nextLevel} (${nextLevelName})?`;
    }

    if (pyramidCompleteModal) pyramidCompleteModal.classList.add('active');
}

function hidePyramidCompleteModal() {
    if (pyramidCompleteModal) pyramidCompleteModal.classList.remove('active');
}

// ============================================
// Sound Functions (Placeholders)
// ============================================

function toggleSound() {
    soundEnabled = !soundEnabled;
    if (soundToggleBtn) {
        soundToggleBtn.textContent = soundEnabled ? '🔊' : '🔇';
        soundToggleBtn.classList.toggle('muted', !soundEnabled);
    }
}

function toggleMusic() {
    musicEnabled = !musicEnabled;
    if (musicToggleBtn) {
        musicToggleBtn.textContent = musicEnabled ? '🎵' : '🎵';
        musicToggleBtn.classList.toggle('muted', !musicEnabled);
    }
}

function playSound(soundName) {
    if (!soundEnabled) return;
    console.log('Play sound:', soundName);
}

// ============================================
// Initialize DOM Elements and Event Listeners
// ============================================

function initDOMElements() {
    pyramid = document.getElementById('pyramid');
    levelValue = document.getElementById('level-value');
    scoreValue = document.getElementById('score-value');
    timerValue = document.getElementById('timer-value');
    streakValue = document.getElementById('streak-value');
    operationSymbol = document.getElementById('operation-symbol');
    operationName = document.getElementById('operation-name');
    feedback = document.getElementById('feedback');
    statusDisplay = document.getElementById('status');

    newGameBtn = document.getElementById('new-game-btn');
    rotateLeftBtn = document.getElementById('rotate-left-btn');
    rotateRightBtn = document.getElementById('rotate-right-btn');
    soundToggleBtn = document.getElementById('sound-toggle-btn');
    musicToggleBtn = document.getElementById('music-toggle-btn');

    levelCompleteModal = document.getElementById('level-complete-modal');
    pyramidCompleteModal = document.getElementById('pyramid-complete-modal');
    levelContinueBtn = document.getElementById('level-continue-btn');
    playAgainBtn = document.getElementById('play-again-btn');
    nextLevelBtn = document.getElementById('next-level-btn');

    faces = {
        add: document.querySelector('.face-front'),
        subtract: document.querySelector('.face-right'),
        multiply: document.querySelector('.face-back'),
        divide: document.querySelector('.face-left')
    };
}

function initEventListeners() {
    if (newGameBtn) {
        newGameBtn.addEventListener('click', () => {
            hideLevelCompleteModal();
            hidePyramidCompleteModal();
            startNewGame();
        });
    }

    if (rotateLeftBtn) rotateLeftBtn.addEventListener('click', rotateLeft);
    if (rotateRightBtn) rotateRightBtn.addEventListener('click', rotateRight);

    if (soundToggleBtn) soundToggleBtn.addEventListener('click', toggleSound);
    if (musicToggleBtn) musicToggleBtn.addEventListener('click', toggleMusic);

    if (levelContinueBtn) {
        levelContinueBtn.addEventListener('click', () => {
            hideLevelCompleteModal();
            rotateRight();
        });
    }

    // IMPORTANT: Next Level button advances to harder difficulty
    if (nextLevelBtn) {
        console.log('Next Level button found, attaching listener');
        nextLevelBtn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            console.log('Next Level clicked!');
            alert('Level Up! Going to level ' + (currentLevel + 1));
            hidePyramidCompleteModal();
            advanceToNextLevel();
        });
    } else {
        console.error('Next Level button NOT FOUND!');
    }

    // Play Again button restarts at level 1
    if (playAgainBtn) {
        playAgainBtn.addEventListener('click', () => {
            hidePyramidCompleteModal();
            startNewGame();
        });
    }

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
}

// ============================================
// Initialize on Page Load
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    initDOMElements();
    initEventListeners();
    initPyramid();
});
