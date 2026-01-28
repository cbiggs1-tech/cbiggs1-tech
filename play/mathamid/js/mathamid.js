// ==============================================
// MATHAMID - Math Pyramid Game
// ==============================================

// ==============================================
// CONSTANTS
// ==============================================

const OPERATIONS = ['addition', 'subtraction', 'multiplication', 'division'];
const OPERATION_SYMBOLS = {
  addition: '+',
  subtraction: '−',
  multiplication: '×',
  division: '÷'
};
const OPERATION_NAMES = {
  addition: 'Addition',
  subtraction: 'Subtraction',
  multiplication: 'Multiplication',
  division: 'Division'
};

const STONES_PER_SIDE = 14;  // 2 + 3 + 4 + 5
const PAIRS_PER_SIDE = 7;

// Difficulty levels - number ranges
const LEVELS = {
  1: { addMax: 12, mulMax: 5, name: 'Beginner' },
  2: { addMax: 18, mulMax: 7, name: 'Easy' },
  3: { addMax: 25, mulMax: 9, name: 'Medium' },
  4: { addMax: 40, mulMax: 10, name: 'Challenging' },
  5: { addMax: 60, mulMax: 12, name: 'Expert' }
};

// Scoring
const POINTS_CORRECT = 100;
const POINTS_WRONG = -25;
const STREAK_BONUS = 50;
const TIME_BONUS_THRESHOLD = 120;

// ==============================================
// GAME STATE
// ==============================================

let currentLevel = 1;
let currentFaceIndex = 0;
let score = 0;
let streak = 0;
let correctCount = 0;
let wrongCount = 0;
let timerInterval = null;
let elapsedSeconds = 0;
let gameInProgress = false;

let selectedStones = [];
let sideData = {};

let sfxEnabled = true;
let bgmEnabled = false;

// ==============================================
// PUZZLE GENERATION - SIMPLIFIED
// ==============================================

/**
 * Generate a puzzle for one side
 * Creates 7 pairs, shuffles all 14 stones, tracks which stones belong to which pair
 */
function generateSidePuzzle(operation, level) {
  const config = LEVELS[level];
  const pairs = [];
  const usedA = new Set();
  const usedB = new Set();

  for (let i = 0; i < PAIRS_PER_SIDE; i++) {
    let a, b, result;
    let attempts = 0;
    let success = false;

    while (attempts < 50 && !success) {
      attempts++;

      switch (operation) {
        case 'addition':
          a = Math.floor(Math.random() * config.addMax) + 1;
          b = Math.floor(Math.random() * config.addMax) + 1;
          result = a + b;
          break;

        case 'subtraction':
          a = Math.floor(Math.random() * config.addMax) + 3;
          b = Math.floor(Math.random() * (a - 1)) + 1;
          result = a - b;
          break;

        case 'multiplication':
          a = Math.floor(Math.random() * (config.mulMax - 1)) + 2;
          b = Math.floor(Math.random() * (config.mulMax - 1)) + 2;
          result = a * b;
          break;

        case 'division':
          b = Math.floor(Math.random() * (config.mulMax - 1)) + 2;
          result = Math.floor(Math.random() * (config.mulMax - 1)) + 2;
          a = b * result;
          break;
      }

      // Ensure unique values
      if (!usedA.has(a) && !usedB.has(b) && a !== b) {
        usedA.add(a);
        usedB.add(b);
        pairs.push({ a, b, result });
        success = true;
      }
    }

    // Fallback if we couldn't generate unique pair
    if (!success) {
      // Use guaranteed unique fallback values
      a = 100 + (i * 10);  // 100, 110, 120, etc.
      b = i + 2;           // 2, 3, 4, etc.
      switch (operation) {
        case 'addition': result = a + b; break;
        case 'subtraction': result = a - b; break;
        case 'multiplication': result = a * b; break;
        case 'division': 
          // For division, make sure it divides evenly
          a = b * (i + 2);
          result = i + 2;
          break;
      }
      usedA.add(a);
      usedB.add(b);
      pairs.push({ a, b, result });
    }
  }

  // Create stone array
  const stones = [];
  pairs.forEach((pair, pairIdx) => {
    stones.push({ value: pair.a, pairIndex: pairIdx, role: 'a' });
    stones.push({ value: pair.b, pairIndex: pairIdx, role: 'b' });
  });

  // Shuffle
  for (let i = stones.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [stones[i], stones[j]] = [stones[j], stones[i]];
  }

  return {
    operation,
    pairs,
    stones,
    currentCapstone: pairs[0].result,
    currentValidPairIndex: 0,  // Start with pair 0
    pairsCompleted: 0,
    usedStoneIndices: new Set()
  };
}

// ==============================================
// GAME LOGIC
// ==============================================

function getCurrentSide() {
  const operation = OPERATIONS[currentFaceIndex];
  return sideData[operation];
}

function getCurrentCapstone() {
  const side = getCurrentSide();
  if (!side) return null;
  return side.currentCapstone;
}

/**
 * Check if two stones form a valid match - just check if math is correct
 */
function isValidMatch(stone1Idx, stone2Idx, side) {
  const stone1 = side.stones[stone1Idx];
  const stone2 = side.stones[stone2Idx];
  const capstone = getCurrentCapstone();

  if (capstone === null) return false;

  // Check if the math produces the capstone
  const result = getResult(stone1.value, stone2.value, side.operation);
  return result === capstone;
}

// ==============================================
// PYRAMID ROTATION
// ==============================================

function rotatePyramid(direction) {
  if (direction === 'left') {
    currentFaceIndex = (currentFaceIndex + 3) % 4;
  } else {
    currentFaceIndex = (currentFaceIndex + 1) % 4;
  }

  const pyramid = document.getElementById('pyramid');
  const rotation = -currentFaceIndex * 90;
  pyramid.style.transform = `rotateY(${rotation}deg)`;

  updateOperationDisplay();
  updateCapstoneDisplay();
  clearSelection();
  updateStatus(`Find two stones that equal ${getCurrentCapstone()}!`);

  playSFX('rotate');
}

// ==============================================
// UI UPDATES
// ==============================================

function updateOperationDisplay() {
  const operation = OPERATIONS[currentFaceIndex];
  document.getElementById('operation-symbol').textContent = OPERATION_SYMBOLS[operation];
  document.getElementById('operation-name').textContent = OPERATION_NAMES[operation];
}

function updateCapstoneDisplay() {
  const capstone = getCurrentCapstone();
  const faceClass = ['front', 'right', 'back', 'left'][currentFaceIndex];
  const capstoneEl = document.querySelector(`.face-${faceClass} .cap-number`);

  if (capstoneEl && capstone !== null) {
    capstoneEl.textContent = capstone;
  }
}

function updateScoreDisplay() {
  document.getElementById('score-value').textContent = score;
  document.getElementById('streak-value').textContent = streak;
}

function updateTimerDisplay() {
  const minutes = Math.floor(elapsedSeconds / 60);
  const seconds = elapsedSeconds % 60;
  document.getElementById('timer-value').textContent =
    `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

function updateLevelDisplay() {
  document.getElementById('level-value').textContent = currentLevel;
}

function updateStatus(message) {
  document.getElementById('status').textContent = message;
}

function showFeedback(message, type) {
  const feedback = document.getElementById('feedback');
  feedback.textContent = message;
  feedback.className = `show ${type}`;

  setTimeout(() => {
    feedback.className = '';
  }, 1500);
}

// ==============================================
// STONE INTERACTION
// ==============================================

function handleStoneClick(stoneEl, stoneIndex) {
  if (!gameInProgress) return;

  const side = getCurrentSide();
  if (!side) return;

  // Can't select already-used stones
  if (side.usedStoneIndices.has(stoneIndex)) return;
  if (stoneEl.classList.contains('correct')) return;

  // Toggle selection
  if (stoneEl.classList.contains('selected')) {
    stoneEl.classList.remove('selected');
    selectedStones = selectedStones.filter(s => s.index !== stoneIndex);
  } else {
    if (selectedStones.length >= 2) {
      // Deselect first stone
      const firstStone = selectedStones.shift();
      firstStone.element?.classList.remove('selected');
    }

    stoneEl.classList.add('selected');
    selectedStones.push({
      index: stoneIndex,
      value: side.stones[stoneIndex].value,
      element: stoneEl
    });
  }

  // Check for match if two selected
  if (selectedStones.length === 2) {
    checkPair();
  }
}

function checkPair() {
  const side = getCurrentSide();
  const [stone1, stone2] = selectedStones;

  if (isValidMatch(stone1.index, stone2.index, side)) {
    handleCorrectPair(stone1, stone2, side);
  } else {
    handleWrongPair(stone1, stone2);
  }
}

function handleCorrectPair(stone1, stone2, side) {
  // Mark stones as correct
  stone1.element.classList.remove('selected');
  stone2.element.classList.remove('selected');
  stone1.element.classList.add('correct');
  stone2.element.classList.add('correct');

  // Update state
  side.usedStoneIndices.add(stone1.index);
  side.usedStoneIndices.add(stone2.index);
  side.pairsCompleted = (side.pairsCompleted || 0) + 1;

  // Scoring
  streak++;
  const streakBonus = streak > 1 ? (streak - 1) * STREAK_BONUS : 0;
  const points = POINTS_CORRECT + streakBonus;
  score += points;
  correctCount++;

  updateScoreDisplay();
  clearSelection();

  playSFX('correct');

  if (streakBonus > 0) {
    showFeedback(`+${points} (${streak}x Streak!)`, 'success');
  } else {
    showFeedback(`+${points}`, 'success');
  }

  // Check if side complete
  if (side.pairsCompleted >= PAIRS_PER_SIDE) {
    handleSideComplete();
  } else {
    // Find next valid capstone from remaining stones (may regroup for division)
    const nextCapstone = findNextValidCapstone(side);
    if (nextCapstone !== null) {
      side.currentCapstone = nextCapstone;
    }
    
    // Update stone displays in case values changed (division regrouping)
    updateStoneDisplays(side);
    updateCapstoneDisplay();
    updateStatus(`Find two stones that equal ${getCurrentCapstone()}!`);
  }
}

/**
 * Update the stone elements to reflect current values
 */
function updateStoneDisplays(side) {
  const faceClass = ['front', 'right', 'back', 'left'][currentFaceIndex];
  const face = document.querySelector(`.face-${faceClass}`);
  if (!face) return;

  const stoneEls = face.querySelectorAll('.stone');
  stoneEls.forEach(stoneEl => {
    const idx = parseInt(stoneEl.dataset.index);
    if (!side.usedStoneIndices.has(idx)) {
      const stone = side.stones[idx];
      stoneEl.textContent = stone.value;
      stoneEl.dataset.value = stone.value;
    }
  });
}

/**
 * Check if value a and b form a valid result for the operation
 */
function getResult(a, b, operation) {
  switch (operation) {
    case 'addition': return a + b;
    case 'subtraction': return Math.abs(a - b);
    case 'multiplication': return a * b;
    case 'division':
      if (a > b && a % b === 0) return a / b;
      if (b > a && b % a === 0) return b / a;
      if (a === b) return 1;
      return null; // Not divisible
    default: return null;
  }
}

/**
 * Regroup remaining stones into valid pairs for the operation
 * This ensures the puzzle is always solvable
 */
function regroupRemainingStones(side) {
  // Get all unused stone indices and their values
  const unusedIndices = [];
  const unusedValues = [];
  
  side.stones.forEach((stone, idx) => {
    if (!side.usedStoneIndices.has(idx)) {
      unusedIndices.push(idx);
      unusedValues.push(stone.value);
    }
  });

  if (unusedValues.length < 2) return;

  // For division, we need to regroup values into valid pairs
  if (side.operation === 'division') {
    const newPairs = createValidDivisionPairs(unusedValues);
    
    // Reassign stone values and pair indices
    let pairIdx = 100; // Use high numbers to avoid confusion with original pairs
    let valueIdx = 0;
    
    newPairs.forEach(pair => {
      if (valueIdx < unusedIndices.length) {
        side.stones[unusedIndices[valueIdx]].value = pair.a;
        side.stones[unusedIndices[valueIdx]].pairIndex = pairIdx;
        side.stones[unusedIndices[valueIdx]].role = 'a';
        valueIdx++;
      }
      if (valueIdx < unusedIndices.length) {
        side.stones[unusedIndices[valueIdx]].value = pair.b;
        side.stones[unusedIndices[valueIdx]].pairIndex = pairIdx;
        side.stones[unusedIndices[valueIdx]].role = 'b';
        valueIdx++;
      }
      pairIdx++;
    });

    // Update the pairs array for capstone selection
    side.regroupedPairs = newPairs;
  }
}

/**
 * Create valid division pairs from a set of values
 * May modify values to ensure all can be paired
 */
function createValidDivisionPairs(values) {
  const pairs = [];
  const remaining = [...values];
  
  while (remaining.length >= 2) {
    let foundPair = false;
    
    // Try to find a valid pair
    for (let i = 0; i < remaining.length && !foundPair; i++) {
      for (let j = i + 1; j < remaining.length && !foundPair; j++) {
        const a = remaining[i];
        const b = remaining[j];
        
        if ((a > b && a % b === 0) || (b > a && b % a === 0) || a === b) {
          const result = a > b ? a / b : (b > a ? b / a : 1);
          pairs.push({ a: Math.max(a, b), b: Math.min(a, b), result });
          remaining.splice(j, 1);
          remaining.splice(i, 1);
          foundPair = true;
        }
      }
    }
    
    // If no valid pair found, modify the last two values to make a valid pair
    if (!foundPair && remaining.length >= 2) {
      const b = remaining.pop();
      remaining.pop();
      const a = b * 2;  // Create a simple valid pair
      pairs.push({ a, b, result: 2 });
    }
  }
  
  return pairs;
}

/**
 * Find next valid capstone from remaining stones
 */
function findNextValidCapstone(side) {
  // First, regroup remaining stones to ensure valid pairs exist
  regroupRemainingStones(side);
  
  // Get available stone indices
  const unusedIndices = [];
  side.stones.forEach((stone, idx) => {
    if (!side.usedStoneIndices.has(idx)) {
      unusedIndices.push(idx);
    }
  });

  if (unusedIndices.length < 2) return null;

  // Find a valid pair from remaining stones
  for (let i = 0; i < unusedIndices.length; i++) {
    for (let j = i + 1; j < unusedIndices.length; j++) {
      const stone1 = side.stones[unusedIndices[i]];
      const stone2 = side.stones[unusedIndices[j]];
      
      if (stone1.pairIndex === stone2.pairIndex) {
        return getResult(stone1.value, stone2.value, side.operation);
      }
    }
  }

  // Fallback: return any valid result
  const s1 = side.stones[unusedIndices[0]];
  const s2 = side.stones[unusedIndices[1]];
  return getResult(s1.value, s2.value, side.operation);
}

function handleWrongPair(stone1, stone2) {
  stone1.element.classList.remove('selected');
  stone2.element.classList.remove('selected');
  stone1.element.classList.add('wrong');
  stone2.element.classList.add('wrong');

  streak = 0;
  score = Math.max(0, score + POINTS_WRONG);
  wrongCount++;

  updateScoreDisplay();
  clearSelection();

  playSFX('wrong');
  showFeedback(`${POINTS_WRONG} points`, 'error');

  setTimeout(() => {
    stone1.element.classList.remove('wrong');
    stone2.element.classList.remove('wrong');
  }, 500);
}

function clearSelection() {
  selectedStones.forEach(s => s.element?.classList.remove('selected'));
  selectedStones = [];
}

// ==============================================
// GAME FLOW
// ==============================================

function handleSideComplete() {
  const operation = OPERATIONS[currentFaceIndex];

  playSFX('sideComplete');

  document.getElementById('complete-operation').textContent = OPERATION_NAMES[operation];
  document.getElementById('complete-score').textContent = score;
  document.getElementById('level-complete-modal').classList.add('show');
}

function handleNextSide() {
  document.getElementById('level-complete-modal').classList.remove('show');

  // Find next incomplete side
  let foundIncomplete = false;
  for (let i = 0; i < 4; i++) {
    const nextIndex = (currentFaceIndex + 1 + i) % 4;
    const operation = OPERATIONS[nextIndex];
    const side = sideData[operation];

    if ((side.pairsCompleted || 0) < PAIRS_PER_SIDE) {
      currentFaceIndex = nextIndex;
      foundIncomplete = true;
      break;
    }
  }

  if (!foundIncomplete) {
    handlePyramidComplete();
  } else {
    const pyramid = document.getElementById('pyramid');
    const rotation = -currentFaceIndex * 90;
    pyramid.style.transform = `rotateY(${rotation}deg)`;

    updateOperationDisplay();
    updateCapstoneDisplay();
    updateStatus(`Find two stones that equal ${getCurrentCapstone()}!`);

    playSFX('rotate');
  }
}

function handlePyramidComplete() {
  stopTimer();
  gameInProgress = false;

  const accuracy = correctCount > 0
    ? Math.round((correctCount / (correctCount + wrongCount)) * 100)
    : 0;

  if (elapsedSeconds < TIME_BONUS_THRESHOLD) {
    const timeBonus = (TIME_BONUS_THRESHOLD - elapsedSeconds) * 5;
    score += timeBonus;
    updateScoreDisplay();
  }

  document.getElementById('final-score').textContent = score;
  document.getElementById('final-time').textContent = document.getElementById('timer-value').textContent;
  document.getElementById('final-accuracy').textContent = `${accuracy}%`;
  document.getElementById('pyramid-complete-modal').classList.add('show');

  playSFX('win');
}

function handleNextLevel() {
  document.getElementById('pyramid-complete-modal').classList.remove('show');
  currentLevel = Math.min(currentLevel + 1, Object.keys(LEVELS).length);
  startNewGame();
}

// ==============================================
// GAME INITIALIZATION
// ==============================================

function startNewGame() {
  score = 0;
  streak = 0;
  correctCount = 0;
  wrongCount = 0;
  elapsedSeconds = 0;
  currentFaceIndex = 0;
  selectedStones = [];
  gameInProgress = true;

  // Generate puzzles for all 4 sides
  OPERATIONS.forEach(operation => {
    sideData[operation] = generateSidePuzzle(operation, currentLevel);
  });

  // Render all sides
  renderAllSides();

  // Reset pyramid rotation
  const pyramid = document.getElementById('pyramid');
  pyramid.style.transform = 'rotateY(0deg)';

  // Update displays
  updateOperationDisplay();
  updateCapstoneDisplay();
  updateScoreDisplay();
  updateLevelDisplay();
  updateTimerDisplay();
  updateStatus(`Find two stones that equal ${getCurrentCapstone()}!`);

  startTimer();
}

function renderAllSides() {
  const faceClasses = ['front', 'right', 'back', 'left'];

  OPERATIONS.forEach((operation, i) => {
    const face = document.querySelector(`.face-${faceClasses[i]}`);
    if (!face) return;

    const side = sideData[operation];

    // Update capstone
    const capstone = face.querySelector('.cap-number');
    if (capstone) {
      capstone.textContent = side.currentCapstone;
    }

    // Update stones
    const rows = [
      face.querySelector('.row-2'),
      face.querySelector('.row-3'),
      face.querySelector('.row-4'),
      face.querySelector('.row-5')
    ];

    let stoneIndex = 0;
    const stoneCounts = [2, 3, 4, 5];

    rows.forEach((row, rowIndex) => {
      if (!row) return;
      row.innerHTML = '';

      for (let j = 0; j < stoneCounts[rowIndex]; j++) {
        const stoneData = side.stones[stoneIndex];
        const stone = document.createElement('div');
        stone.className = 'stone';
        stone.dataset.value = stoneData.value;
        stone.dataset.index = stoneIndex;
        stone.textContent = stoneData.value;

        const idx = stoneIndex;
        stone.addEventListener('click', () => handleStoneClick(stone, idx));
        stone.addEventListener('touchend', (e) => {
          e.preventDefault();
          handleStoneClick(stone, idx);
        });

        row.appendChild(stone);
        stoneIndex++;
      }
    });
  });
}

// ==============================================
// TIMER
// ==============================================

function startTimer() {
  stopTimer();
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

// ==============================================
// AUDIO
// ==============================================

function playSFX(name) {
  if (!sfxEnabled) return;

  const freqs = {
    correct: 880,
    wrong: 220,
    rotate: 440,
    sideComplete: 660,
    win: 1320
  };

  const durations = {
    correct: 0.15,
    wrong: 0.3,
    rotate: 0.1,
    sideComplete: 0.4,
    win: 0.5
  };

  try {
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();

    oscillator.type = name === 'wrong' ? 'sawtooth' : 'sine';
    oscillator.frequency.value = freqs[name] || 440;

    gainNode.gain.setValueAtTime(0.3, audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + (durations[name] || 0.2));

    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    oscillator.start();
    oscillator.stop(audioCtx.currentTime + (durations[name] || 0.2));
  } catch (e) {
    // Audio not available
  }
}

// ==============================================
// EVENT LISTENERS
// ==============================================

function initEventListeners() {
  document.getElementById('new-game-btn').addEventListener('click', startNewGame);
  document.getElementById('rotate-left-btn').addEventListener('click', () => rotatePyramid('left'));
  document.getElementById('rotate-right-btn').addEventListener('click', () => rotatePyramid('right'));
  document.getElementById('next-side-btn').addEventListener('click', handleNextSide);
  document.getElementById('next-level-btn').addEventListener('click', handleNextLevel);

  document.getElementById('sfxToggle').addEventListener('click', () => {
    sfxEnabled = !sfxEnabled;
    document.getElementById('sfxToggle').classList.toggle('muted', !sfxEnabled);
  });

  document.getElementById('bgmToggle').addEventListener('click', () => {
    bgmEnabled = !bgmEnabled;
    document.getElementById('bgmToggle').classList.toggle('muted', !bgmEnabled);
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') rotatePyramid('left');
    if (e.key === 'ArrowRight') rotatePyramid('right');
  });
}

// ==============================================
// INITIALIZATION
// ==============================================

function init() {
  initEventListeners();
  startNewGame();
}

document.addEventListener('DOMContentLoaded', init);
