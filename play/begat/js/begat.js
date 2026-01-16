/**
 * BEGAT - Biblical Genealogy Game
 * Main Game Logic
 *
 * A trivia/puzzle game tracing the lineage of Jesus Christ
 * from Abraham to Jesus (42 generations from Matthew 1:1-17).
 *
 * @version 1.0
 * @author GRANDPAPA.NET
 */

'use strict';

// ==============================================
// STORAGE FALLBACK (localStorage quota handling)
// ==============================================

/**
 * In-memory storage fallback when localStorage is unavailable or full.
 */
const memoryStorage = new Map();

/**
 * Safe localStorage wrapper with quota error handling.
 * Falls back to in-memory storage when localStorage fails.
 */
const storage = {
    getItem(key) {
        try {
            return localStorage.getItem(key);
        } catch (e) {
            console.warn('localStorage read failed, using memory fallback:', e);
            return memoryStorage.get(key) || null;
        }
    },
    setItem(key, value) {
        try {
            localStorage.setItem(key, value);
        } catch (e) {
            // Handle QuotaExceededError and other storage errors
            console.warn('localStorage write failed, using memory fallback:', e);
            memoryStorage.set(key, value);
        }
    },
    removeItem(key) {
        try {
            localStorage.removeItem(key);
        } catch (e) {
            console.warn('localStorage remove failed:', e);
            memoryStorage.delete(key);
        }
    }
};

// ==============================================
// GAME DATA - Genealogy and Level Configuration
// ==============================================

/**
 * Complete genealogy data for all 42 ancestors.
 * Each entry contains:
 * - name: The ancestor's name
 * - desc: Array of Bible descriptions/clues for trivia
 * - icon: Icon type for visual representation
 * - dates: Approximate date range (BC/AD)
 */
const genealogy = [
    { name: "Abraham", desc: ["Father of many nations, covenant with God (Gen 17:5)", "Tested with sacrifice of Isaac (Gen 22)", "Called from Ur, promised descendants as stars (Gen 12:1-3, 15:5)"], icon: "tent", dates: "~2166–1991 BC" },
    { name: "Isaac", desc: ["Miracle son of Abraham and Sarah in old age (Gen 21:1-3)", "Father of Jacob and Esau, blessed deceiver (Gen 25:19-26, 27:1-40)", "Wells digger, covenant renewed (Gen 26:1-5, 23-25)"], icon: "altar", dates: "~2066–1886 BC" },
    { name: "Jacob", desc: ["Renamed Israel after wrestling God (Gen 32:24-28)", "Father of 12 tribes, fled from Esau (Gen 27:41-45, 35:22-26)", "Dreamed of ladder to heaven (Gen 28:10-22)"], icon: "ladder", dates: "~2006–1859 BC" },
    { name: "Judah", desc: ["Son of Jacob, tribe of Messiah and kings (Gen 49:8-10)", "Father of Perez via Tamar (Gen 38:1-30)", "Offered himself for Benjamin (Gen 44:18-34)"], icon: "scepter", dates: "~1950–1800 BC" },
    { name: "Perez", desc: ["Twin son of Judah and Tamar, scarlet thread (Gen 38:27-30)", "Ancestor in Ruth's line to David (Ruth 4:18-22)", "Listed in Judahite clans (1 Chron 2:3-5)"], icon: "hand", dates: "~1850–1800 BC" },
    { name: "Hezron", desc: ["Son of Perez, father of Ram (Ruth 4:18-19)", "Early Judahite in genealogy (1 Chron 2:5-9)", "Part of post-exile records (1 Chron 4:1)"], icon: "scroll", dates: "~1800–1700 BC" },
    { name: "Ram", desc: ["Son of Hezron, also called Aram (Ruth 4:19)", "Father of Amminadab (1 Chron 2:9-10)", "In line from Judah to David (Matt 1:3-4)"], icon: "ram", dates: "~1750–1700 BC" },
    { name: "Amminadab", desc: ["Son of Ram, father of Nahshon (Ruth 4:19-20)", "Grandfather of Elisheba, Aaron's wife (Ex 6:23)", "Judahite leader (1 Chron 2:10)"], icon: "banner", dates: "~1700–1650 BC" },
    { name: "Nahshon", desc: ["Son of Amminadab, prince of Judah tribe (Num 1:7)", "Leader during wilderness wanderings (Num 2:3, 7:12)", "Offered first at tabernacle (Num 7:12-17)"], icon: "staff", dates: "~1650–1600 BC" },
    { name: "Salmon", desc: ["Son of Nahshon, father of Boaz (Ruth 4:20-21)", "Married Rahab the Canaanite (Matt 1:5, Josh 6:25 implied)", "Post-exodus settler (1 Chron 2:10-11)"], icon: "fish", dates: "~1600–1550 BC" },
    { name: "Boaz", desc: ["Son of Salmon, kinsman-redeemer of Ruth (Ruth 2:1-4:22)", "Wealthy Bethlehemite, married Moabite (Ruth 3:1-18)", "Ancestor of David (Ruth 4:17-22)"], icon: "sheaf", dates: "~1400–1350 BC" },
    { name: "Obed", desc: ["Son of Boaz and Ruth, born in Bethlehem (Ruth 4:13-17)", "Father of Jesse (Ruth 4:17-22)", "Grandson raised by Naomi (Ruth 4:16)"], icon: "servant", dates: "~1350–1300 BC" },
    { name: "Jesse", desc: ["Son of Obed, father of David (Ruth 4:22, 1 Sam 16:1)", "Bethlehemite with eight sons (1 Sam 17:12)", "Lineage in prophecies (Isa 11:1)"], icon: "tree", dates: "~1300–1250 BC" },
    { name: "David", desc: ["Son of Jesse, anointed king by Samuel (1 Sam 16:1-13)", "Slew Goliath, man after God's heart (1 Sam 17:1-58, Acts 13:22)", "Psalmist and united Israel (2 Sam 5:1-5, Ps many)"], icon: "crown", dates: "~1040–970 BC" },
    { name: "Solomon", desc: ["Son of David and Bathsheba, built temple (2 Sam 12:24, 1 Kings 6:1-38)", "Wisest king, asked for wisdom (1 Kings 3:5-15)", "Wrote Proverbs, Ecclesiastes (Prov 1:1, Eccl 1:1)"], icon: "temple", dates: "~990–931 BC" },
    { name: "Rehoboam", desc: ["Son of Solomon, first king of Judah (1 Kings 11:43)", "Rejected elders' advice, split kingdom (1 Kings 12:1-19)", "Fortified cities (2 Chron 11:5-12)"], icon: "split", dates: "~975–913 BC" },
    { name: "Abijah", desc: ["Son of Rehoboam, warred with Israel (1 Kings 15:1-8)", "Relied on God in battle (2 Chron 13:1-22)", "Had 14 wives (2 Chron 13:21)"], icon: "sword", dates: "~950–900 BC" },
    { name: "Asa", desc: ["Son of Abijah, reformed Judah (1 Kings 15:9-24)", "Removed idols, sought God (2 Chron 14:2-5)", "Defeated Ethiopians (2 Chron 14:9-15)"], icon: "reform", dates: "~940–870 BC" },
    { name: "Jehoshaphat", desc: ["Son of Asa, strengthened Judah (1 Kings 22:41-50)", "Allied with Ahab, but sought prophets (2 Chron 18:1-34)", "Appointed judges (2 Chron 19:4-11)"], icon: "judge", dates: "~900–848 BC" },
    { name: "Joram", desc: ["Son of Jehoshaphat, married Athaliah (2 Kings 8:16-24)", "Killed brothers, wicked reign (2 Chron 21:1-20)", "Struck with disease (2 Chron 21:18-19)"], icon: "plague", dates: "~880–841 BC" },
    { name: "Uzziah", desc: ["Son of Joram (via Ahaziah/Joash/Amaziah), long reign (2 Kings 15:1-7)", "Prospered until pride, struck with leprosy (2 Chron 26:1-23)", "Built towers, army (2 Chron 26:9-15)"], icon: "tower", dates: "~810–739 BC" },
    { name: "Jotham", desc: ["Son of Uzziah, ruled wisely (2 Kings 15:32-38)", "Built upper gate of temple (2 Chron 27:1-9)", "Conquered Ammonites (2 Chron 27:5)"], icon: "gate", dates: "~780–735 BC" },
    { name: "Ahaz", desc: ["Son of Jotham, wicked, sacrificed son (2 Kings 16:1-20)", "Altar from Damascus (2 Chron 28:1-27)", "Besieged by Syria and Israel (Isa 7:1-9)"], icon: "altar", dates: "~760–715 BC" },
    { name: "Hezekiah", desc: ["Son of Ahaz, reformed temple (2 Kings 18:1-8)", "Tunnel for water, prayed for life (2 Kings 20:1-11, 2 Chron 32:24-31)", "Defied Sennacherib (Isa 36-37)"], icon: "tunnel", dates: "~740–687 BC" },
    { name: "Manasseh", desc: ["Son of Hezekiah, longest reign, wicked then repented (2 Kings 21:1-18)", "Built altars to stars, shed blood (2 Chron 33:1-20)", "Captive in Babylon, humbled (2 Chron 33:11-13)"], icon: "chains", dates: "~710–643 BC" },
    { name: "Amon", desc: ["Son of Manasseh, wicked, assassinated (2 Kings 21:19-26)", "Followed father's early sins (2 Chron 33:21-25)", "Short two-year reign"], icon: "dagger", dates: "~670–640 BC" },
    { name: "Josiah", desc: ["Son of Amon, great reformer (2 Kings 22:1-23:30)", "Found law book, Passover revival (2 Chron 34:1-35:27)", "Killed at Megiddo (2 Kings 23:29-30)"], icon: "book", dates: "~648–609 BC" },
    { name: "Jeconiah", desc: ["Son of Josiah (via Jehoiakim), exiled to Babylon (2 Kings 24:6-16)", "Also called Coniah/Jehoiachin (Jer 22:24-30)", "Released by Evil-Merodach (2 Kings 25:27-30)"], icon: "exile", dates: "~615–560 BC" },
    { name: "Shealtiel", desc: ["Son of Jeconiah, post-exile (1 Chron 3:17-19)", "Father of Zerubbabel (Ezra 3:2)", "In messianic line (Hag 2:23 implied)"], icon: "chain", dates: "~580–520 BC" },
    { name: "Zerubbabel", desc: ["Son of Shealtiel, governor of Judah (Ezra 2:2, Hag 1:1)", "Led temple rebuild (Ezra 3:8-13, Zech 4:6-10)", "Signet ring of God (Hag 2:23)"], icon: "temple", dates: "~570–510 BC" },
    { name: "Abiud", desc: ["Son of Zerubbabel (Matt 1:13, possibly via 1 Chron 3:19-24 branches)", "Post-exile ancestor"], icon: "branch", dates: "~500–470 BC" },
    { name: "Eliakim", desc: ["Son of Abiud (Matt 1:13)", "In line to Joseph"], icon: "key", dates: "~470–440 BC" },
    { name: "Azor", desc: ["Son of Eliakim (Matt 1:13)", "Hellenistic-era name in genealogy"], icon: "star", dates: "~440–410 BC" },
    { name: "Zadok", desc: ["Son of Azor (Matt 1:14)", "Possibly priestly ties (like 1 Chron 6)"], icon: "priest", dates: "~410–380 BC" },
    { name: "Achim", desc: ["Son of Zadok (Matt 1:14)", "Post-exile figure"], icon: "scroll", dates: "~380–350 BC" },
    { name: "Eliud", desc: ["Son of Achim (Matt 1:14)", "Ancestor in Matthew's list"], icon: "light", dates: "~350–320 BC" },
    { name: "Eleazar", desc: ["Son of Eliud (Matt 1:15)", "Common priestly name (Ex 6:23)"], icon: "altar", dates: "~320–290 BC" },
    { name: "Matthan", desc: ["Son of Eleazar (Matt 1:15)", "Grandfather of Joseph"], icon: "father", dates: "~290–260 BC" },
    { name: "Jacob", desc: ["Son of Matthan, father of Joseph (Matt 1:15-16)", "Not the patriarch, later Jacob"], icon: "staff", dates: "~260–230 BC" },
    { name: "Joseph", desc: ["Son of Jacob, husband of Mary (Matt 1:16)", "Righteous man, dreams from angel (Matt 1:18-25, 2:13-23)", "Carpenter in Nazareth (Matt 13:55)"], icon: "carpenter", dates: "~20 BC–AD 20" },
    { name: "Jesus", desc: ["Son of Joseph (legally), the Christ (Matt 1:16-17)", "Born in Bethlehem, fulfilled prophecies (Mic 5:2, Isa 7:14)", "Savior, Emmanuel (Matt 1:21-23)"], icon: "lamb", dates: "~4 BC–AD 30" }
];

/**
 * Level configurations with time limits.
 * Each level covers a portion of the genealogy.
 */
const levels = [
    { name: "Patriarchs", start: 0, end: 13, difficulty: "Easy", timeLimit: 180 },      // 3 minutes
    { name: "Kings of Judah", start: 14, end: 27, difficulty: "Medium", timeLimit: 240 }, // 4 minutes
    { name: "Post-Exile", start: 28, end: 41, difficulty: "Medium", timeLimit: 300 },   // 5 minutes
    { name: "Full Lineage", start: 0, end: 41, difficulty: "Hard", timeLimit: 480 }     // 8 minutes
];

// ==============================================
// GAME STATE
// ==============================================

/**
 * Central game state object tracking all gameplay data.
 * Reset by initGame() when starting a new game.
 */
let gameState = {
    currentLevel: 0,
    score: 0,
    stars: 0,
    mistakes: 0,                    // Total wrong MCQ guesses
    unlockedCards: new Set(),
    placedCards: new Map(),
    pendingRedemptions: new Map(),  // Map<ancestorIndex, {penalty, slotIndex}>
    assistedCards: new Set(),       // Cards unlocked via assisted reveal
    soundEnabled: true,
    speechEnabled: false,
    highContrast: false,
    colorblind: false,
    currentQuizCard: null,
    currentSlotIndex: null,         // The slot being filled
    draggedCard: null,
    quizAttempts: 0,                // Track attempts for current quiz
    timerStartTime: null,           // When the timer started
    timerInterval: null,            // Interval ID for timer updates
    elapsedSeconds: 0,              // Time elapsed in current game
    gameStarted: false              // Whether the game has been started
};

// Expose gameState for testing purposes
window.__test_gameState = gameState;

// ==============================================
// SCORING SYSTEM
// ==============================================

/**
 * Point values by level (1-indexed for display).
 * Higher levels award more points but have higher penalties.
 */
const LEVEL_POINTS = {
    1: { fullCorrect: 50, assisted: 25, wrongPenalty: -20, redemptionRefund: 20 },
    2: { fullCorrect: 75, assisted: 37, wrongPenalty: -40, redemptionRefund: 40 },
    3: { fullCorrect: 100, assisted: 50, wrongPenalty: -70, redemptionRefund: 70 },
    4: { fullCorrect: 150, assisted: 75, wrongPenalty: -120, redemptionRefund: 120 }
};

/**
 * Tier multipliers based on mistakes at level completion.
 * Fewer mistakes = higher score multiplier.
 */
const TIER_MULTIPLIERS = [
    { maxMistakes: 1, multiplier: 1.5, label: 'PERFECT!' },
    { maxMistakes: 4, multiplier: 1.3, label: 'EXCELLENT!' },
    { maxMistakes: 8, multiplier: 1.15, label: 'GOOD!' },
    { maxMistakes: Infinity, multiplier: 1.0, label: 'COMPLETED' }
];

/**
 * Get point values for the current level.
 * @returns {Object} Point configuration for current level
 */
function getLevelPoints() {
    const levelNum = gameState.currentLevel + 1;
    return LEVEL_POINTS[levelNum] || LEVEL_POINTS[1];
}

/**
 * Calculate theoretical maximum score for current level.
 * @returns {number} Maximum possible score
 */
function getLevelMaxScore() {
    const range = getCurrentGenealogyRange();
    const slotCount = range.end - range.start + 1;
    const points = getLevelPoints();
    return slotCount * points.fullCorrect;
}

/**
 * Get tier multiplier based on mistake count.
 * @param {number} netMistakes - Number of mistakes made
 * @returns {Object} Tier object with multiplier and label
 */
function getTierMultiplier(netMistakes) {
    for (const tier of TIER_MULTIPLIERS) {
        if (netMistakes <= tier.maxMistakes) {
            return tier;
        }
    }
    return TIER_MULTIPLIERS[TIER_MULTIPLIERS.length - 1];
}

// ==============================================
// TIMER SYSTEM
// ==============================================

/**
 * Start the game timer.
 * Called when player clicks Start Game button.
 */
function startTimer() {
    gameState.timerStartTime = Date.now();
    gameState.elapsedSeconds = 0;
    updateTimerDisplay();

    if (gameState.timerInterval) {
        clearInterval(gameState.timerInterval);
    }

    gameState.timerInterval = setInterval(() => {
        gameState.elapsedSeconds = Math.floor((Date.now() - gameState.timerStartTime) / 1000);
        updateTimerDisplay();
    }, 1000);
}

/**
 * Stop the game timer.
 * Called when level is completed.
 */
function stopTimer() {
    if (gameState.timerInterval) {
        clearInterval(gameState.timerInterval);
        gameState.timerInterval = null;
    }
}

/**
 * Update timer display with remaining time.
 * Shows negative time if over limit.
 */
function updateTimerDisplay() {
    const timerEl = document.getElementById('timerDisplay');
    const level = levels[gameState.currentLevel];
    const timeLimit = level.timeLimit;
    const remaining = timeLimit - gameState.elapsedSeconds;

    // Stop timer at -30 minutes
    if (remaining <= -1800) {
        stopTimer();
        timerEl.textContent = `⏱ -30:00`;
        timerEl.classList.remove('warning', 'bonus-eligible');
        timerEl.style.color = '#ff4444';
        timerEl.style.borderColor = '#ff4444';
        return;
    }

    // Format time display
    const absRemaining = Math.abs(remaining);
    const minutes = Math.floor(absRemaining / 60);
    const seconds = absRemaining % 60;
    const sign = remaining < 0 ? '-' : '';
    timerEl.textContent = `⏱ ${sign}${minutes}:${seconds.toString().padStart(2, '0')}`;

    // Update styling based on time remaining
    if (remaining < 0) {
        timerEl.classList.remove('warning', 'bonus-eligible');
        timerEl.style.color = '#ff4444';
        timerEl.style.borderColor = '#ff4444';
    } else if (remaining <= 30) {
        timerEl.style.color = '';
        timerEl.style.borderColor = '';
        timerEl.classList.add('warning');
        timerEl.classList.remove('bonus-eligible');
    } else {
        timerEl.style.color = '';
        timerEl.style.borderColor = '';
        timerEl.classList.remove('warning');
        timerEl.classList.add('bonus-eligible');
    }
}

/**
 * Check if completed within time limit for speed bonus.
 * @returns {number} Bonus multiplier (0.2 = 20% or 0)
 */
function getSpeedBonus() {
    const level = levels[gameState.currentLevel];
    if (gameState.elapsedSeconds <= level.timeLimit) {
        return 0.2;
    }
    return 0;
}

/**
 * Format seconds as MM:SS string.
 * @param {number} seconds - Time in seconds
 * @returns {string} Formatted time string
 */
function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// ==============================================
// HIGH SCORES SYSTEM
// ==============================================

/**
 * Get high scores for a specific level from localStorage.
 * @param {number} levelIndex - Level index (0-based)
 * @returns {Array} Array of score objects
 */
function getHighScores(levelIndex) {
    const key = `begat_highscores_level_${levelIndex}`;
    const stored = storage.getItem(key);
    if (stored) {
        try {
            return JSON.parse(stored);
        } catch (e) {
            console.warn('Failed to parse high scores:', e);
            return [];
        }
    }
    return [];
}

/**
 * Save high scores for a specific level to localStorage.
 * @param {number} levelIndex - Level index (0-based)
 * @param {Array} scores - Array of score objects
 */
function saveHighScores(levelIndex, scores) {
    const key = `begat_highscores_level_${levelIndex}`;
    storage.setItem(key, JSON.stringify(scores));
}

/**
 * Check if score qualifies for top 3.
 * @param {number} levelIndex - Level index
 * @param {number} score - Score to check
 * @returns {boolean} True if qualifies for high score
 */
function isHighScore(levelIndex, score) {
    const scores = getHighScores(levelIndex);
    if (scores.length < 3) return true;
    return score > scores[scores.length - 1].score;
}

/**
 * Add a new high score to the leaderboard.
 * @param {number} levelIndex - Level index
 * @param {string} name - Player name
 * @param {number} score - Score achieved
 * @returns {Array} Updated scores array
 */
function addHighScore(levelIndex, name, score) {
    const scores = getHighScores(levelIndex);
    scores.push({ name: name || 'Anonymous', score: score });
    scores.sort((a, b) => b.score - a.score);
    if (scores.length > 3) scores.length = 3;
    saveHighScores(levelIndex, scores);
    return scores;
}

/**
 * Display high scores in the win modal.
 * @param {number} levelIndex - Level index to display
 */
function displayHighScores(levelIndex) {
    const scores = getHighScores(levelIndex);
    document.getElementById('highScoreLevel').textContent = levelIndex + 1;

    const list = document.getElementById('highScoresList');
    list.innerHTML = '';

    for (let i = 0; i < 3; i++) {
        const li = document.createElement('li');
        const rank = document.createElement('span');
        rank.className = 'rank';
        rank.textContent = `${i + 1}.`;

        const name = document.createElement('span');
        name.className = 'name';
        name.textContent = scores[i] ? scores[i].name : '---';

        const scoreSpan = document.createElement('span');
        scoreSpan.className = 'score';
        scoreSpan.textContent = scores[i] ? scores[i].score : '0';

        li.appendChild(rank);
        li.appendChild(name);
        li.appendChild(scoreSpan);
        list.appendChild(li);
    }
}

// ==============================================
// FEEDBACK & UI HELPERS
// ==============================================

/**
 * Show feedback message to player.
 * @param {string} message - Message to display
 * @param {string} type - Type: 'info', 'success', 'error', 'redemption'
 */
function showFeedbackMessage(message, type = 'info') {
    const hint = document.getElementById('hintDisplay');
    hint.textContent = message;
    hint.className = 'hint-display visible';

    if (type === 'success') hint.style.borderColor = 'var(--success)';
    else if (type === 'error') hint.style.borderColor = 'var(--error)';
    else if (type === 'redemption') hint.style.borderColor = 'var(--gold)';
    else hint.style.borderColor = 'var(--gold)';

    setTimeout(() => {
        hint.classList.remove('visible');
        hint.style.borderColor = '';
    }, 3000);
}

/**
 * Check and apply redemption when placing a card correctly.
 * @param {number} ancestorIndex - Index of ancestor being placed
 * @returns {boolean} True if redemption was applied
 */
function checkAndApplyRedemption(ancestorIndex) {
    if (!gameState.pendingRedemptions.has(ancestorIndex)) {
        return false;
    }

    const redemptionData = gameState.pendingRedemptions.get(ancestorIndex);
    const points = getLevelPoints();

    gameState.score += points.fullCorrect + points.redemptionRefund;
    gameState.mistakes -= 1;
    gameState.pendingRedemptions.delete(ancestorIndex);
    gameState.stars += 1;

    const person = genealogy[ancestorIndex];
    showFeedbackMessage(
        `✅ ${person.name} Redeemed! +${points.fullCorrect} +${points.redemptionRefund} refund`,
        'redemption'
    );
    playChime();

    return true;
}

// ==============================================
// AUDIO SYSTEM
// ==============================================

let audioCtx = null;

/**
 * Initialize Web Audio API context.
 * @returns {AudioContext} The audio context
 */
function initAudio() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    return audioCtx;
}

/**
 * Play a tone using Web Audio API.
 * @param {number} frequency - Frequency in Hz
 * @param {number} duration - Duration in seconds
 * @param {string} type - Oscillator type
 */
function playTone(frequency, duration, type = 'sine') {
    if (!gameState.soundEnabled) return;
    try {
        const ctx = initAudio();
        if (ctx.state === 'suspended') ctx.resume();

        const oscillator = ctx.createOscillator();
        const gainNode = ctx.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(ctx.destination);

        oscillator.frequency.value = frequency;
        oscillator.type = type;

        gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);

        oscillator.start(ctx.currentTime);
        oscillator.stop(ctx.currentTime + duration);
    } catch (e) {
        console.log('Audio error:', e);
    }
}

/** Play success chime (ascending notes) */
function playChime() {
    playTone(523.25, 0.15); // C5
    setTimeout(() => playTone(659.25, 0.15), 100); // E5
    setTimeout(() => playTone(783.99, 0.2), 200); // G5
}

/** Play error sound */
function playError() {
    playTone(200, 0.3, 'square');
}

/** Play placement success sound */
function playSuccess() {
    playTone(392, 0.1); // G4
    setTimeout(() => playTone(523.25, 0.1), 100); // C5
    setTimeout(() => playTone(659.25, 0.15), 200); // E5
}

/** Play win fanfare (ascending scale) */
function playWin() {
    const notes = [523.25, 587.33, 659.25, 698.46, 783.99, 880, 987.77, 1046.5];
    notes.forEach((freq, i) => {
        setTimeout(() => playTone(freq, 0.2), i * 150);
    });
}

// ==============================================
// SPEECH SYNTHESIS
// ==============================================

/**
 * Speak text using Web Speech API.
 * @param {string} text - Text to speak
 */
function speak(text) {
    if (!gameState.speechEnabled) return;
    if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 0.9;
        utterance.pitch = 1;
        speechSynthesis.speak(utterance);
    }
}

// ==============================================
// DATE TOOLTIP SYSTEM
// ==============================================

const dateTooltip = document.getElementById('dateTooltip');
const tooltipDateEl = document.getElementById('tooltipDate');
let tooltipTimeout = null;
let currentTooltipElement = null;

/**
 * Show date tooltip for an ancestor.
 * @param {Element} element - Element being hovered/touched
 * @param {number} personIndex - Index of ancestor
 * @param {number} clientX - X position
 * @param {number} clientY - Y position
 */
function showDateTooltip(element, personIndex, clientX, clientY) {
    const person = genealogy[personIndex];
    if (!person || !person.dates) return;

    tooltipDateEl.textContent = person.dates;
    dateTooltip.classList.add('visible');

    const tooltipRect = dateTooltip.getBoundingClientRect();
    let x = clientX - tooltipRect.width / 2;
    let y = clientY - tooltipRect.height - 15;

    // Keep tooltip on screen
    if (x < 10) x = 10;
    if (x + tooltipRect.width > window.innerWidth - 10) {
        x = window.innerWidth - tooltipRect.width - 10;
    }
    if (y < 10) {
        y = clientY + 20;
    }

    dateTooltip.style.left = x + 'px';
    dateTooltip.style.top = y + 'px';

    currentTooltipElement = element;

    if (gameState.speechEnabled) {
        speak(person.dates);
    }
}

/** Hide the date tooltip */
function hideDateTooltip() {
    dateTooltip.classList.remove('visible');
    currentTooltipElement = null;
    if (tooltipTimeout) {
        clearTimeout(tooltipTimeout);
        tooltipTimeout = null;
    }
}

/**
 * Handle mouse enter for tooltip display.
 * @param {Event} e - Mouse event
 * @param {number} personIndex - Ancestor index
 */
function handleMouseEnterForTooltip(e, personIndex) {
    const rect = e.currentTarget.getBoundingClientRect();
    showDateTooltip(e.currentTarget, personIndex, rect.left + rect.width / 2, rect.top);
}

/** Handle mouse leave to hide tooltip */
function handleMouseLeaveForTooltip() {
    hideDateTooltip();
}

/**
 * Handle touch start for tooltip display (mobile).
 * @param {TouchEvent} e - Touch event
 * @param {number} personIndex - Ancestor index
 */
function handleTouchStartForTooltip(e, personIndex) {
    const touch = e.touches[0];
    const element = e.currentTarget;
    showDateTooltip(element, personIndex, touch.clientX, touch.clientY);
}

/** Handle touch end for tooltip (keep visible briefly) */
function handleTouchEndForTooltip() {
    if (tooltipTimeout) {
        clearTimeout(tooltipTimeout);
        tooltipTimeout = null;
    }
    setTimeout(hideDateTooltip, 1000);
}

// ==============================================
// HAPTIC FEEDBACK
// ==============================================

/**
 * Trigger device vibration if supported.
 * @param {number|Array} pattern - Vibration pattern
 */
function vibrate(pattern) {
    if ('vibrate' in navigator) {
        navigator.vibrate(pattern);
    }
}

// ==============================================
// ICON GENERATION (SVG)
// ==============================================

/**
 * Generate SVG icon for an ancestor.
 * @param {string} iconType - Type of icon to generate
 * @param {string} color - Stroke color
 * @returns {string} SVG markup
 */
function generateIcon(iconType, color = '#2c1810') {
    const icons = {
        tent: `<svg viewBox="0 0 100 100"><polygon points="50,10 90,85 10,85" fill="none" stroke="${color}" stroke-width="4"/><line x1="50" y1="10" x2="50" y2="85" stroke="${color}" stroke-width="3"/></svg>`,
        altar: `<svg viewBox="0 0 100 100"><rect x="20" y="50" width="60" height="35" fill="none" stroke="${color}" stroke-width="4"/><polygon points="30,50 50,25 70,50" fill="none" stroke="${color}" stroke-width="3"/><path d="M40,35 Q50,20 60,35" fill="none" stroke="${color}" stroke-width="2"/></svg>`,
        ladder: `<svg viewBox="0 0 100 100"><line x1="30" y1="90" x2="40" y2="10" stroke="${color}" stroke-width="4"/><line x1="70" y1="90" x2="60" y2="10" stroke="${color}" stroke-width="4"/><line x1="32" y1="75" x2="68" y2="75" stroke="${color}" stroke-width="3"/><line x1="35" y1="55" x2="65" y2="55" stroke="${color}" stroke-width="3"/><line x1="38" y1="35" x2="62" y2="35" stroke="${color}" stroke-width="3"/></svg>`,
        scepter: `<svg viewBox="0 0 100 100"><line x1="50" y1="90" x2="50" y2="25" stroke="${color}" stroke-width="5"/><circle cx="50" cy="18" r="12" fill="none" stroke="${color}" stroke-width="3"/><circle cx="50" cy="18" r="5" fill="${color}"/></svg>`,
        hand: `<svg viewBox="0 0 100 100"><path d="M35,80 L35,45 M45,80 L45,35 M55,80 L55,35 M65,80 L65,45 M75,55 L75,50 Q75,40 65,40" fill="none" stroke="${color}" stroke-width="4" stroke-linecap="round"/><path d="M30,80 Q50,90 75,70" fill="none" stroke="${color}" stroke-width="3"/></svg>`,
        scroll: `<svg viewBox="0 0 100 100"><rect x="25" y="20" width="50" height="60" rx="3" fill="none" stroke="${color}" stroke-width="3"/><ellipse cx="25" cy="20" rx="8" ry="5" fill="none" stroke="${color}" stroke-width="2"/><ellipse cx="75" cy="80" rx="8" ry="5" fill="none" stroke="${color}" stroke-width="2"/><line x1="35" y1="35" x2="65" y2="35" stroke="${color}" stroke-width="2"/><line x1="35" y1="50" x2="65" y2="50" stroke="${color}" stroke-width="2"/><line x1="35" y1="65" x2="55" y2="65" stroke="${color}" stroke-width="2"/></svg>`,
        ram: `<svg viewBox="0 0 100 100"><ellipse cx="55" cy="55" rx="25" ry="20" fill="none" stroke="${color}" stroke-width="3"/><circle cx="35" cy="45" r="15" fill="none" stroke="${color}" stroke-width="3"/><path d="M25,35 Q15,25 20,40" fill="none" stroke="${color}" stroke-width="3"/><path d="M45,35 Q55,25 50,40" fill="none" stroke="${color}" stroke-width="3"/><circle cx="30" cy="42" r="2" fill="${color}"/><circle cx="40" cy="42" r="2" fill="${color}"/></svg>`,
        banner: `<svg viewBox="0 0 100 100"><line x1="30" y1="90" x2="30" y2="15" stroke="${color}" stroke-width="4"/><path d="M30,15 L75,25 L75,55 L30,45 Z" fill="none" stroke="${color}" stroke-width="3"/><circle cx="30" cy="12" r="5" fill="${color}"/></svg>`,
        staff: `<svg viewBox="0 0 100 100"><line x1="50" y1="90" x2="50" y2="15" stroke="${color}" stroke-width="5"/><path d="M45,15 Q50,5 55,15" fill="none" stroke="${color}" stroke-width="3"/></svg>`,
        fish: `<svg viewBox="0 0 100 100"><ellipse cx="45" cy="50" rx="30" ry="18" fill="none" stroke="${color}" stroke-width="3"/><polygon points="75,50 95,35 95,65" fill="none" stroke="${color}" stroke-width="3"/><circle cx="28" cy="47" r="3" fill="${color}"/><path d="M45,45 Q55,50 45,55" fill="none" stroke="${color}" stroke-width="2"/></svg>`,
        sheaf: `<svg viewBox="0 0 100 100"><line x1="50" y1="90" x2="50" y2="40" stroke="${color}" stroke-width="3"/><line x1="35" y1="85" x2="40" y2="35" stroke="${color}" stroke-width="2"/><line x1="65" y1="85" x2="60" y2="35" stroke="${color}" stroke-width="2"/><ellipse cx="50" cy="30" rx="20" ry="15" fill="none" stroke="${color}" stroke-width="3"/><path d="M40,60 Q50,55 60,60" fill="none" stroke="${color}" stroke-width="3"/></svg>`,
        servant: `<svg viewBox="0 0 100 100"><circle cx="50" cy="25" r="12" fill="none" stroke="${color}" stroke-width="3"/><line x1="50" y1="37" x2="50" y2="65" stroke="${color}" stroke-width="3"/><line x1="50" y1="45" x2="30" y2="55" stroke="${color}" stroke-width="3"/><line x1="50" y1="45" x2="70" y2="55" stroke="${color}" stroke-width="3"/><line x1="50" y1="65" x2="35" y2="90" stroke="${color}" stroke-width="3"/><line x1="50" y1="65" x2="65" y2="90" stroke="${color}" stroke-width="3"/></svg>`,
        tree: `<svg viewBox="0 0 100 100"><line x1="50" y1="90" x2="50" y2="45" stroke="${color}" stroke-width="5"/><circle cx="50" cy="35" r="25" fill="none" stroke="${color}" stroke-width="3"/><line x1="50" y1="55" x2="30" y2="70" stroke="${color}" stroke-width="2"/><line x1="50" y1="55" x2="70" y2="70" stroke="${color}" stroke-width="2"/></svg>`,
        crown: `<svg viewBox="0 0 100 100"><path d="M20,70 L20,40 L35,55 L50,30 L65,55 L80,40 L80,70 Z" fill="none" stroke="${color}" stroke-width="3"/><rect x="20" y="70" width="60" height="10" fill="none" stroke="${color}" stroke-width="3"/><circle cx="50" cy="30" r="5" fill="${color}"/><circle cx="20" cy="40" r="4" fill="${color}"/><circle cx="80" cy="40" r="4" fill="${color}"/></svg>`,
        temple: `<svg viewBox="0 0 100 100"><polygon points="50,15 85,35 15,35" fill="none" stroke="${color}" stroke-width="3"/><rect x="20" y="35" width="60" height="50" fill="none" stroke="${color}" stroke-width="3"/><rect x="40" y="55" width="20" height="30" fill="none" stroke="${color}" stroke-width="2"/><line x1="30" y1="35" x2="30" y2="85" stroke="${color}" stroke-width="3"/><line x1="70" y1="35" x2="70" y2="85" stroke="${color}" stroke-width="3"/></svg>`,
        split: `<svg viewBox="0 0 100 100"><line x1="50" y1="20" x2="50" y2="50" stroke="${color}" stroke-width="4"/><line x1="50" y1="50" x2="25" y2="80" stroke="${color}" stroke-width="4"/><line x1="50" y1="50" x2="75" y2="80" stroke="${color}" stroke-width="4"/><circle cx="50" cy="20" r="5" fill="${color}"/></svg>`,
        sword: `<svg viewBox="0 0 100 100"><line x1="50" y1="15" x2="50" y2="70" stroke="${color}" stroke-width="4"/><line x1="35" y1="35" x2="65" y2="35" stroke="${color}" stroke-width="4"/><polygon points="50,15 45,25 55,25" fill="${color}"/><rect x="45" y="70" width="10" height="15" fill="none" stroke="${color}" stroke-width="2"/></svg>`,
        reform: `<svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="30" fill="none" stroke="${color}" stroke-width="3"/><path d="M50,25 L50,50 L70,50" fill="none" stroke="${color}" stroke-width="3"/><polygon points="25,50 15,45 15,55" fill="${color}"/></svg>`,
        judge: `<svg viewBox="0 0 100 100"><rect x="35" y="15" width="30" height="25" fill="none" stroke="${color}" stroke-width="3"/><line x1="50" y1="40" x2="50" y2="55" stroke="${color}" stroke-width="3"/><ellipse cx="50" cy="70" rx="30" ry="15" fill="none" stroke="${color}" stroke-width="3"/></svg>`,
        plague: `<svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="25" fill="none" stroke="${color}" stroke-width="3"/><circle cx="40" cy="45" r="5" fill="${color}"/><circle cx="60" cy="45" r="5" fill="${color}"/><circle cx="50" cy="60" r="4" fill="${color}"/><circle cx="35" cy="55" r="3" fill="${color}"/><circle cx="65" cy="55" r="3" fill="${color}"/></svg>`,
        tower: `<svg viewBox="0 0 100 100"><rect x="30" y="25" width="40" height="60" fill="none" stroke="${color}" stroke-width="3"/><polygon points="30,25 50,10 70,25" fill="none" stroke="${color}" stroke-width="3"/><rect x="40" y="60" width="20" height="25" fill="none" stroke="${color}" stroke-width="2"/><rect x="35" y="35" width="10" height="10" fill="none" stroke="${color}" stroke-width="2"/><rect x="55" y="35" width="10" height="10" fill="none" stroke="${color}" stroke-width="2"/></svg>`,
        gate: `<svg viewBox="0 0 100 100"><rect x="20" y="30" width="60" height="55" fill="none" stroke="${color}" stroke-width="3"/><path d="M35,85 L35,50 Q50,35 65,50 L65,85" fill="none" stroke="${color}" stroke-width="3"/><rect x="20" y="20" width="60" height="10" fill="none" stroke="${color}" stroke-width="2"/></svg>`,
        tunnel: `<svg viewBox="0 0 100 100"><ellipse cx="50" cy="50" rx="35" ry="25" fill="none" stroke="${color}" stroke-width="3"/><ellipse cx="50" cy="50" rx="20" ry="15" fill="none" stroke="${color}" stroke-width="2"/><path d="M15,50 Q30,60 50,50 Q70,40 85,50" fill="none" stroke="${color}" stroke-width="2"/></svg>`,
        chains: `<svg viewBox="0 0 100 100"><ellipse cx="35" cy="30" rx="12" ry="8" fill="none" stroke="${color}" stroke-width="3"/><ellipse cx="50" cy="50" rx="12" ry="8" fill="none" stroke="${color}" stroke-width="3"/><ellipse cx="65" cy="70" rx="12" ry="8" fill="none" stroke="${color}" stroke-width="3"/></svg>`,
        dagger: `<svg viewBox="0 0 100 100"><polygon points="50,15 45,55 55,55" fill="none" stroke="${color}" stroke-width="3"/><rect x="40" y="55" width="20" height="8" fill="none" stroke="${color}" stroke-width="2"/><rect x="45" y="63" width="10" height="15" fill="none" stroke="${color}" stroke-width="2"/></svg>`,
        book: `<svg viewBox="0 0 100 100"><rect x="25" y="20" width="50" height="60" rx="3" fill="none" stroke="${color}" stroke-width="3"/><line x1="50" y1="20" x2="50" y2="80" stroke="${color}" stroke-width="2"/><line x1="30" y1="30" x2="45" y2="30" stroke="${color}" stroke-width="1"/><line x1="30" y1="40" x2="45" y2="40" stroke="${color}" stroke-width="1"/><line x1="55" y1="30" x2="70" y2="30" stroke="${color}" stroke-width="1"/><line x1="55" y1="40" x2="70" y2="40" stroke="${color}" stroke-width="1"/></svg>`,
        exile: `<svg viewBox="0 0 100 100"><circle cx="40" cy="35" r="12" fill="none" stroke="${color}" stroke-width="3"/><line x1="40" y1="47" x2="40" y2="70" stroke="${color}" stroke-width="3"/><line x1="40" y1="70" x2="30" y2="90" stroke="${color}" stroke-width="3"/><line x1="40" y1="70" x2="50" y2="90" stroke="${color}" stroke-width="3"/><path d="M60,30 L80,30 L80,70 L60,70" fill="none" stroke="${color}" stroke-width="3"/></svg>`,
        chain: `<svg viewBox="0 0 100 100"><ellipse cx="50" cy="30" rx="15" ry="10" fill="none" stroke="${color}" stroke-width="3"/><ellipse cx="50" cy="50" rx="15" ry="10" fill="none" stroke="${color}" stroke-width="3"/><ellipse cx="50" cy="70" rx="15" ry="10" fill="none" stroke="${color}" stroke-width="3"/></svg>`,
        branch: `<svg viewBox="0 0 100 100"><line x1="50" y1="85" x2="50" y2="50" stroke="${color}" stroke-width="4"/><line x1="50" y1="50" x2="30" y2="30" stroke="${color}" stroke-width="3"/><line x1="50" y1="50" x2="70" y2="30" stroke="${color}" stroke-width="3"/><circle cx="30" cy="25" r="8" fill="none" stroke="${color}" stroke-width="2"/><circle cx="70" cy="25" r="8" fill="none" stroke="${color}" stroke-width="2"/></svg>`,
        key: `<svg viewBox="0 0 100 100"><circle cx="35" cy="35" r="15" fill="none" stroke="${color}" stroke-width="3"/><line x1="47" y1="43" x2="80" y2="76" stroke="${color}" stroke-width="4"/><line x1="70" y1="66" x2="80" y2="56" stroke="${color}" stroke-width="3"/><line x1="60" y1="56" x2="70" y2="46" stroke="${color}" stroke-width="3"/></svg>`,
        star: `<svg viewBox="0 0 100 100"><polygon points="50,15 58,40 85,40 63,55 73,85 50,67 27,85 37,55 15,40 42,40" fill="none" stroke="${color}" stroke-width="3"/></svg>`,
        priest: `<svg viewBox="0 0 100 100"><circle cx="50" cy="25" r="12" fill="none" stroke="${color}" stroke-width="3"/><path d="M35,40 L35,85 L65,85 L65,40" fill="none" stroke="${color}" stroke-width="3"/><line x1="35" y1="50" x2="65" y2="50" stroke="${color}" stroke-width="2"/><rect x="45" y="55" width="10" height="15" fill="none" stroke="${color}" stroke-width="2"/></svg>`,
        light: `<svg viewBox="0 0 100 100"><circle cx="50" cy="45" r="20" fill="none" stroke="${color}" stroke-width="3"/><line x1="50" y1="15" x2="50" y2="5" stroke="${color}" stroke-width="2"/><line x1="50" y1="75" x2="50" y2="85" stroke="${color}" stroke-width="2"/><line x1="20" y1="45" x2="10" y2="45" stroke="${color}" stroke-width="2"/><line x1="80" y1="45" x2="90" y2="45" stroke="${color}" stroke-width="2"/><line x1="28" y1="23" x2="20" y2="15" stroke="${color}" stroke-width="2"/><line x1="72" y1="23" x2="80" y2="15" stroke="${color}" stroke-width="2"/><line x1="28" y1="67" x2="20" y2="75" stroke="${color}" stroke-width="2"/><line x1="72" y1="67" x2="80" y2="75" stroke="${color}" stroke-width="2"/></svg>`,
        father: `<svg viewBox="0 0 100 100"><circle cx="50" cy="25" r="15" fill="none" stroke="${color}" stroke-width="3"/><path d="M30,50 Q50,45 70,50 L65,85 L35,85 Z" fill="none" stroke="${color}" stroke-width="3"/><circle cx="45" cy="23" r="2" fill="${color}"/><circle cx="55" cy="23" r="2" fill="${color}"/></svg>`,
        carpenter: `<svg viewBox="0 0 100 100"><rect x="20" y="40" width="60" height="10" fill="none" stroke="${color}" stroke-width="3"/><rect x="40" y="20" width="20" height="65" fill="none" stroke="${color}" stroke-width="3"/><line x1="30" y1="60" x2="30" y2="80" stroke="${color}" stroke-width="3"/><line x1="20" y1="75" x2="40" y2="75" stroke="${color}" stroke-width="3"/></svg>`,
        lamb: `<svg viewBox="0 0 100 100"><ellipse cx="50" cy="55" rx="30" ry="20" fill="none" stroke="${color}" stroke-width="3"/><circle cx="30" cy="45" r="12" fill="none" stroke="${color}" stroke-width="3"/><ellipse cx="26" cy="38" rx="3" ry="6" fill="none" stroke="${color}" stroke-width="2"/><ellipse cx="34" cy="38" rx="3" ry="6" fill="none" stroke="${color}" stroke-width="2"/><circle cx="26" cy="45" r="2" fill="${color}"/><line x1="35" y1="75" x2="35" y2="85" stroke="${color}" stroke-width="3"/><line x1="65" y1="75" x2="65" y2="85" stroke="${color}" stroke-width="3"/></svg>`
    };
    return icons[iconType] || icons.scroll;
}

// ==============================================
// STARS BACKGROUND
// ==============================================

/**
 * Create animated star background.
 * Generates random star elements with twinkling animation.
 */
function createStars() {
    const starsContainer = document.getElementById('stars');
    const count = 100;

    for (let i = 0; i < count; i++) {
        const star = document.createElement('div');
        star.className = 'star';
        star.style.left = Math.random() * 100 + '%';
        star.style.top = Math.random() * 100 + '%';
        star.style.width = (Math.random() * 3 + 1) + 'px';
        star.style.height = star.style.width;
        star.style.animationDelay = Math.random() * 3 + 's';
        star.style.animationDuration = (Math.random() * 2 + 2) + 's';
        starsContainer.appendChild(star);
    }
}

// ==============================================
// GAME INITIALIZATION
// ==============================================

/**
 * Get current level's genealogy subset.
 * @returns {Object} Object with start, end indices and data array
 */
function getCurrentGenealogyRange() {
    const level = levels[gameState.currentLevel];
    return {
        start: level.start,
        end: level.end,
        data: genealogy.slice(level.start, level.end + 1)
    };
}

/**
 * Initialize game board (doesn't start timer).
 * Resets all state and renders initial board.
 */
function initGame() {
    const range = getCurrentGenealogyRange();

    // Reset all scoring state
    gameState.score = 0;
    gameState.stars = 0;
    gameState.mistakes = 0;
    gameState.unlockedCards = new Set();
    gameState.placedCards = new Map();
    gameState.pendingRedemptions = new Map();
    gameState.assistedCards = new Set();
    gameState.currentQuizCard = null;
    gameState.currentSlotIndex = null;
    gameState.quizAttempts = 0;
    gameState.gameStarted = false;

    // First and last are always unlocked and placed
    gameState.unlockedCards.add(range.start);
    gameState.unlockedCards.add(range.end);
    gameState.placedCards.set(range.start, 0);
    gameState.placedCards.set(range.end, range.data.length - 1);

    renderTimeline();
    renderCardPool();
    updateDisplay();

    // Reset timer display but don't start
    stopTimer();
    gameState.elapsedSeconds = 0;
    updateTimerDisplay();
}

/**
 * Start the game (called when Start button pressed).
 * Hides start screen, starts timer, initializes audio.
 */
function startGame() {
    gameState.gameStarted = true;
    document.getElementById('startScreen').classList.add('hidden');
    startTimer();
    initAudio();
    switchToGameplayMusic();
}

/**
 * Show start screen with current level info.
 */
function showStartScreen() {
    const level = levels[gameState.currentLevel];
    const timeLimit = level.timeLimit;
    const minutes = Math.floor(timeLimit / 60);
    const seconds = timeLimit % 60;

    document.getElementById('startLevelInfo').textContent =
        `Level ${gameState.currentLevel + 1}: ${level.name}`;
    document.getElementById('startTimeLimit').textContent =
        `Time Limit: ${minutes}:${seconds.toString().padStart(2, '0')}`;
    document.getElementById('startScreen').classList.remove('hidden');
    switchToStartMusic();
}

// ==============================================
// RENDERING FUNCTIONS
// ==============================================

/**
 * Render the timeline slots (upper section).
 */
function renderTimeline() {
    const timeline = document.getElementById('timeline');
    const range = getCurrentGenealogyRange();
    timeline.innerHTML = '';
    timeline.setAttribute('role', 'list');
    timeline.setAttribute('aria-label', `Timeline of ${range.data.length} ancestors from ${genealogy[range.start].name} to ${genealogy[range.end].name}`);

    for (let i = 0; i < range.data.length; i++) {
        if (i > 0) {
            const connector = document.createElement('div');
            connector.className = 'connector';
            timeline.appendChild(connector);
        }

        const slot = document.createElement('div');
        slot.className = 'timeline-slot';
        slot.dataset.position = i;
        slot.tabIndex = 0; // Keyboard accessibility
        slot.setAttribute('role', 'listitem');

        const actualIndex = range.start + i;
        const isFixed = (i === 0 || i === range.data.length - 1);
        const isPlaced = gameState.placedCards.has(actualIndex);

        if (isFixed || isPlaced) {
            slot.classList.add('fixed');
            const person = genealogy[actualIndex];
            slot.setAttribute('aria-label', `Timeline position ${i + 1}: ${person.name}, ${person.dates}`);

            const iconDiv = document.createElement('div');
            iconDiv.className = 'slot-icon';
            iconDiv.innerHTML = generateIcon(person.icon);
            slot.appendChild(iconDiv);

            const nameDiv = document.createElement('div');
            nameDiv.className = 'slot-name';
            nameDiv.textContent = person.name;
            slot.appendChild(nameDiv);

            // Tooltip events for date display
            slot.dataset.personIndex = actualIndex;
            slot.addEventListener('mouseenter', (e) => handleMouseEnterForTooltip(e, actualIndex));
            slot.addEventListener('mouseleave', handleMouseLeaveForTooltip);
            slot.addEventListener('touchstart', (e) => handleTouchStartForTooltip(e, actualIndex), { passive: true });
            slot.addEventListener('touchend', handleTouchEndForTooltip);
        } else {
            slot.classList.add('ready');
            slot.innerHTML = '<span style="font-size:2rem;color:var(--gold);opacity:0.5">?</span>';
            slot.setAttribute('aria-label', `Empty timeline position ${i + 1}. Drop an ancestor card here.`);
        }

        // Drop zone events
        slot.addEventListener('dragover', handleDragOver);
        slot.addEventListener('drop', handleDrop);
        slot.addEventListener('touchmove', handleTouchMove, { passive: false });
        slot.addEventListener('touchend', handleTouchEnd);

        timeline.appendChild(slot);
    }

    // Render time scale after timeline so it can match the width
    renderTimeScale();
}

/**
 * Render time scale above timeline.
 * Shows date markers at intervals matching the timeline width.
 */
function renderTimeScale() {
    const timeScale = document.getElementById('timeScale');
    const timeline = document.getElementById('timeline');
    const range = getCurrentGenealogyRange();
    timeScale.innerHTML = '';

    // Match the timeline's width and padding
    const timelineStyle = window.getComputedStyle(timeline);
    const timelinePadding = parseFloat(timelineStyle.paddingLeft) || 16;
    timeScale.style.paddingLeft = timelinePadding + 'px';
    timeScale.style.paddingRight = timelinePadding + 'px';

    // Extract year from date string (e.g., "~2166–1991 BC" -> 2166)
    function extractStartYear(dateStr) {
        const match = dateStr.match(/~?(\d+)/);
        return match ? parseInt(match[1]) : 0;
    }

    // Create markers at start, every 3rd person, and end
    const totalCards = range.data.length;
    const markers = [];

    markers.push({ index: range.start, position: 0 });

    for (let i = 3; i < totalCards - 1; i += 3) {
        markers.push({ index: range.start + i, position: i / (totalCards - 1) });
    }

    markers.push({ index: range.end, position: 1 });

    markers.forEach(marker => {
        const person = genealogy[marker.index];
        const markerDiv = document.createElement('div');
        markerDiv.className = 'time-marker';
        markerDiv.style.position = 'absolute';
        markerDiv.style.left = `${marker.position * 100}%`;
        markerDiv.style.transform = 'translateX(-50%)';

        const label = document.createElement('span');
        label.className = 'time-marker-label';
        const year = extractStartYear(person.dates);
        const era = person.dates.includes('AD') ? 'AD' : 'BC';
        label.textContent = era === 'AD' ? `${year} AD` : `${year} BC`;

        markerDiv.appendChild(label);
        timeScale.appendChild(markerDiv);
    });
}

/**
 * Render card pool (lower section).
 * Shows shuffled unlocked/locked cards.
 */
function renderCardPool() {
    const cardPool = document.getElementById('cardPool');
    const range = getCurrentGenealogyRange();
    cardPool.innerHTML = '';

    // Get cards that haven't been placed (excluding fixed endpoints)
    const availableIndices = [];
    for (let i = range.start + 1; i < range.end; i++) {
        if (!gameState.placedCards.has(i)) {
            availableIndices.push(i);
        }
    }

    // Shuffle
    for (let i = availableIndices.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [availableIndices[i], availableIndices[j]] = [availableIndices[j], availableIndices[i]];
    }

    availableIndices.forEach(idx => {
        const person = genealogy[idx];
        const card = document.createElement('div');
        card.className = 'card';
        card.dataset.index = idx;
        card.tabIndex = 0; // Keyboard accessibility
        card.setAttribute('role', 'button');

        const isUnlocked = gameState.unlockedCards.has(idx);

        if (isUnlocked) {
            card.classList.add('unlocked');
            card.draggable = true;
            card.setAttribute('aria-label', `${person.name}, unlocked. Press Enter to select and drag to timeline.`);

            const iconDiv = document.createElement('div');
            iconDiv.className = 'card-icon';
            iconDiv.innerHTML = generateIcon(person.icon);
            card.appendChild(iconDiv);

            const nameDiv = document.createElement('div');
            nameDiv.className = 'card-name';
            nameDiv.textContent = person.name;
            card.appendChild(nameDiv);

            // Drag events
            card.addEventListener('dragstart', handleDragStart);
            card.addEventListener('dragend', handleDragEnd);
            card.addEventListener('touchstart', handleTouchStart, { passive: false });
            card.addEventListener('touchend', handleTouchEndForTooltip, { passive: true });

            // Tooltip events for date display (mouse hover)
            card.addEventListener('mouseenter', (e) => handleMouseEnterForTooltip(e, idx));
            card.addEventListener('mouseleave', handleMouseLeaveForTooltip);

            // Keyboard navigation - Enter/Space to start drag mode
            card.addEventListener('keydown', (e) => handleCardKeydown(e, idx));
        } else {
            card.classList.add('locked');
            card.setAttribute('aria-label', `Locked ancestor card. Press Enter to answer a quiz and unlock.`);

            const iconDiv = document.createElement('div');
            iconDiv.className = 'card-icon';
            iconDiv.innerHTML = generateIcon(person.icon, '#888');
            card.appendChild(iconDiv);

            const questionMark = document.createElement('div');
            questionMark.className = 'card-question-mark';
            questionMark.textContent = '?';
            card.appendChild(questionMark);

            card.addEventListener('click', () => openQuiz(idx));
            card.addEventListener('touchend', (e) => {
                e.preventDefault();
                openQuiz(idx);
            });

            // Keyboard - Enter/Space to open quiz
            card.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    openQuiz(idx);
                }
            });
        }

        cardPool.appendChild(card);
    });
}

/**
 * Update score and status display.
 */
function updateDisplay() {
    document.getElementById('scoreDisplay').textContent = `Score: ${gameState.score}`;
    document.getElementById('starsDisplay').textContent = `Mistakes: ${gameState.mistakes}`;
    document.getElementById('levelIndicator').textContent =
        `Level ${gameState.currentLevel + 1}: ${levels[gameState.currentLevel].name}`;
}

// ==============================================
// QUIZ SYSTEM
// ==============================================

/**
 * Open quiz for a locked card.
 * @param {number} cardIndex - Index of card to quiz
 */
function openQuiz(cardIndex) {
    gameState.currentQuizCard = cardIndex;
    gameState.quizAttempts = 0;
    const person = genealogy[cardIndex];

    // Random description about this ancestor
    const desc = person.desc[Math.floor(Math.random() * person.desc.length)];
    document.getElementById('quizDescription').textContent = desc;
    speak(desc);

    // Generate options (correct + 3 random from current level range)
    const range = getCurrentGenealogyRange();
    const options = [cardIndex];
    const available = [];

    for (let i = range.start; i <= range.end; i++) {
        if (i !== cardIndex) available.push(i);
    }

    while (options.length < 4 && available.length > 0) {
        const randomIdx = Math.floor(Math.random() * available.length);
        options.push(available[randomIdx]);
        available.splice(randomIdx, 1);
    }

    // Shuffle options
    for (let i = options.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [options[i], options[j]] = [options[j], options[i]];
    }

    const optionsContainer = document.getElementById('quizOptions');
    optionsContainer.innerHTML = '';

    options.forEach((optIdx, buttonIndex) => {
        const btn = document.createElement('button');
        btn.className = 'quiz-option';
        btn.textContent = genealogy[optIdx].name;
        btn.dataset.index = optIdx;
        btn.tabIndex = 0;
        btn.addEventListener('click', () => checkQuizAnswer(optIdx));

        // Keyboard navigation in quiz
        btn.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                checkQuizAnswer(optIdx);
            }
        });

        optionsContainer.appendChild(btn);
    });

    document.getElementById('quizFeedback').textContent = '';
    document.getElementById('quizModal').classList.add('active');

    // Focus first option for keyboard users
    const firstOption = optionsContainer.querySelector('.quiz-option');
    if (firstOption) firstOption.focus();
}

/**
 * Check quiz answer and handle scoring.
 * @param {number} selectedIndex - Index of selected answer
 */
function checkQuizAnswer(selectedIndex) {
    const feedback = document.getElementById('quizFeedback');
    const options = document.querySelectorAll('.quiz-option');
    const correctIndex = gameState.currentQuizCard;
    const points = getLevelPoints();

    gameState.quizAttempts++;

    options.forEach(opt => {
        opt.disabled = true;
        if (parseInt(opt.dataset.index) === correctIndex) {
            opt.classList.add('correct');
        } else if (parseInt(opt.dataset.index) === selectedIndex && selectedIndex !== correctIndex) {
            opt.classList.add('wrong');
        }
    });

    if (selectedIndex === correctIndex) {
        // CORRECT
        if (gameState.quizAttempts === 1) {
            gameState.score += points.fullCorrect;
            gameState.stars += 1;
            feedback.textContent = `Correct! +${points.fullCorrect}`;
            showFeedbackMessage(`+${points.fullCorrect} points!`, 'success');
        } else {
            gameState.score += points.assisted;
            gameState.assistedCards.add(correctIndex);
            feedback.textContent = `+${points.assisted} (Assisted)`;
            showFeedbackMessage(`+${points.assisted} (Assisted)`, 'info');
        }

        feedback.className = 'quiz-feedback success';
        playChime();
        vibrate(100);
        speak('Correct!');

        gameState.unlockedCards.add(correctIndex);

        setTimeout(() => {
            document.getElementById('quizModal').classList.remove('active');
            renderCardPool();
            updateDisplay();
        }, 1000);
    } else {
        // WRONG
        gameState.score += points.wrongPenalty;
        gameState.mistakes += 1;

        feedback.textContent = `❌ Wrong! -${Math.abs(points.wrongPenalty)} points`;
        feedback.className = 'quiz-feedback error';
        playError();
        vibrate([50, 50, 50]);
        speak('Try again');

        updateDisplay();

        setTimeout(() => {
            options.forEach(opt => {
                opt.disabled = false;
                opt.classList.remove('correct', 'wrong');
            });
            feedback.textContent = '';
        }, 1500);
    }
}

// ==============================================
// DRAG AND DROP HANDLERS
// ==============================================

/**
 * Handle drag start event.
 * @param {DragEvent} e - Drag event
 */
function handleDragStart(e) {
    gameState.draggedCard = parseInt(e.target.dataset.index);
    e.target.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
}

/**
 * Handle drag end event.
 * @param {DragEvent} e - Drag event
 */
function handleDragEnd(e) {
    e.target.classList.remove('dragging');
    gameState.draggedCard = null;
}

/**
 * Handle drag over event for drop zones.
 * @param {DragEvent} e - Drag event
 */
function handleDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
}

/**
 * Handle drop event on timeline slot.
 * @param {DragEvent} e - Drop event
 */
function handleDrop(e) {
    e.preventDefault();
    const slot = e.currentTarget;
    const position = parseInt(slot.dataset.position);
    attemptPlacement(position);
}

// ==============================================
// TOUCH HANDLERS (Mobile)
// ==============================================

let touchCard = null;
let touchClone = null;
let touchStartX = 0;
let touchStartY = 0;
let isTouchDragging = false;

/**
 * Handle touch start on card.
 * @param {TouchEvent} e - Touch event
 */
function handleTouchStart(e) {
    e.preventDefault();
    const card = e.currentTarget;
    const touch = e.touches[0];
    touchStartX = touch.clientX;
    touchStartY = touch.clientY;
    touchCard = card;
    gameState.draggedCard = parseInt(card.dataset.index);
    isTouchDragging = false;

    // Show tooltip immediately on touch
    const personIndex = parseInt(card.dataset.index);
    showDateTooltip(card, personIndex, touch.clientX, touch.clientY);

    // Delay clone creation for 1 second to allow tooltip reading
    card.touchTimeout = setTimeout(() => {
        isTouchDragging = true;
        hideDateTooltip();

        // Create visual clone
        touchClone = card.cloneNode(true);
        touchClone.style.position = 'fixed';
        touchClone.style.zIndex = '1000';
        touchClone.style.pointerEvents = 'none';
        touchClone.style.opacity = '0.9';
        touchClone.style.transform = 'scale(1.1)';
        touchClone.style.width = card.offsetWidth + 'px';
        touchClone.style.height = card.offsetHeight + 'px';
        document.body.appendChild(touchClone);
        touchClone.style.left = (touch.clientX - card.offsetWidth/2) + 'px';
        touchClone.style.top = (touch.clientY - card.offsetHeight/2) + 'px';
        card.classList.add('dragging');
        vibrate(50);
    }, 1000);
}

// Global touch move handler
document.addEventListener('touchmove', (e) => {
    if (!touchClone || !isTouchDragging) return;
    e.preventDefault();

    const touch = e.touches[0];
    touchClone.style.left = (touch.clientX - touchClone.offsetWidth/2) + 'px';
    touchClone.style.top = (touch.clientY - touchClone.offsetHeight/2) + 'px';

    // Highlight slot under finger
    const slots = document.querySelectorAll('.timeline-slot.ready');
    slots.forEach(slot => {
        const rect = slot.getBoundingClientRect();
        if (touch.clientX >= rect.left && touch.clientX <= rect.right &&
            touch.clientY >= rect.top && touch.clientY <= rect.bottom) {
            slot.style.transform = 'scale(1.1)';
            slot.style.borderColor = 'var(--gold)';
        } else {
            slot.style.transform = '';
            slot.style.borderColor = '';
        }
    });
}, { passive: false });

// Global touch end handler
document.addEventListener('touchend', (e) => {
    if (!touchCard) return;

    if (touchCard.touchTimeout) {
        clearTimeout(touchCard.touchTimeout);
        touchCard.touchTimeout = null;
    }

    hideDateTooltip();

    const slots = document.querySelectorAll('.timeline-slot');
    slots.forEach(slot => {
        slot.style.transform = '';
        slot.style.borderColor = '';
    });

    if (!touchClone || !isTouchDragging) {
        touchCard = null;
        gameState.draggedCard = null;
        return;
    }

    const touch = e.changedTouches[0];
    touchClone.remove();
    touchClone = null;
    touchCard.classList.remove('dragging');

    // Find slot under touch
    slots.forEach(slot => {
        const rect = slot.getBoundingClientRect();
        if (touch.clientX >= rect.left && touch.clientX <= rect.right &&
            touch.clientY >= rect.top && touch.clientY <= rect.bottom) {
            const position = parseInt(slot.dataset.position);
            attemptPlacement(position);
        }
    });

    touchCard = null;
    isTouchDragging = false;
    gameState.draggedCard = null;
});

// Legacy handlers for compatibility
function handleTouchMove(e) { }
function handleTouchEnd(e) { }

// ==============================================
// KEYBOARD NAVIGATION (WCAG Accessibility)
// ==============================================

// Track keyboard drag state
let keyboardDraggedCard = null;

/**
 * Handle keydown on unlocked cards for keyboard navigation.
 * @param {KeyboardEvent} e - Keyboard event
 * @param {number} cardIndex - Card index
 */
function handleCardKeydown(e, cardIndex) {
    if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();

        if (keyboardDraggedCard === cardIndex) {
            // Cancel drag
            keyboardDraggedCard = null;
            gameState.draggedCard = null;
            e.target.classList.remove('dragging');
            showFeedbackMessage('Card selection cancelled', 'info');
        } else {
            // Start drag
            keyboardDraggedCard = cardIndex;
            gameState.draggedCard = cardIndex;
            e.target.classList.add('dragging');
            showFeedbackMessage('Card selected. Use Tab to navigate to a slot, then press Enter to place.', 'info');
        }
    }
}

// Handle keyboard placement on slots
document.addEventListener('keydown', (e) => {
    // Handle slot selection when card is being dragged via keyboard
    if ((e.key === 'Enter' || e.key === ' ') && keyboardDraggedCard !== null) {
        const target = e.target;
        if (target.classList.contains('timeline-slot') && target.classList.contains('ready')) {
            e.preventDefault();
            const position = parseInt(target.dataset.position);
            attemptPlacement(position);

            // Clear keyboard drag state
            const draggedCardEl = document.querySelector(`.card[data-index="${keyboardDraggedCard}"]`);
            if (draggedCardEl) draggedCardEl.classList.remove('dragging');
            keyboardDraggedCard = null;
        }
    }

    // Arrow key navigation in card pool
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight' ||
        e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        const cards = Array.from(document.querySelectorAll('.card-pool .card'));
        const currentIndex = cards.indexOf(document.activeElement);

        if (currentIndex !== -1) {
            e.preventDefault();
            let nextIndex = currentIndex;

            if (e.key === 'ArrowRight') nextIndex = Math.min(currentIndex + 1, cards.length - 1);
            else if (e.key === 'ArrowLeft') nextIndex = Math.max(currentIndex - 1, 0);
            else if (e.key === 'ArrowDown') nextIndex = Math.min(currentIndex + 4, cards.length - 1);
            else if (e.key === 'ArrowUp') nextIndex = Math.max(currentIndex - 4, 0);

            cards[nextIndex].focus();
        }
    }
});

// ==============================================
// PLACEMENT LOGIC
// ==============================================

/**
 * Attempt to place dragged card at position.
 * @param {number} position - Timeline position (0-indexed)
 */
function attemptPlacement(position) {
    if (gameState.draggedCard === null) return;

    const range = getCurrentGenealogyRange();
    const expectedIndex = range.start + position;
    const points = getLevelPoints();

    if (gameState.draggedCard === expectedIndex) {
        // Correct placement
        gameState.placedCards.set(gameState.draggedCard, position);
        const placementBonus = Math.floor(points.fullCorrect * 0.5);
        gameState.score += placementBonus;
        showFeedbackMessage(`Placed! +${placementBonus}`, 'success');
        playSuccess();
        vibrate(100);

        renderTimeline();
        renderCardPool();
        updateDisplay();

        checkWinCondition();
    } else {
        // Wrong placement
        playError();
        vibrate([50, 50, 50]);
        showHint(gameState.draggedCard, expectedIndex);
    }
}

/**
 * Show placement hint when wrong slot selected.
 * @param {number} cardIndex - Card that was placed
 * @param {number} expectedPosition - Where it should go
 */
function showHint(cardIndex, expectedPosition) {
    const hint = document.getElementById('hintDisplay');
    const range = getCurrentGenealogyRange();

    let era = '';
    if (cardIndex < 14) era = 'Patriarchs';
    else if (cardIndex < 28) era = 'Kings of Judah';
    else era = 'Post-Exile';

    const direction = cardIndex < expectedPosition ? 'Earlier' : 'Later';
    hint.textContent = `${direction} in the lineage (Era: ${era})`;
    hint.classList.add('visible');

    setTimeout(() => {
        hint.classList.remove('visible');
    }, 2000);
}

// ==============================================
// WIN CONDITION
// ==============================================

/**
 * Check if all cards have been placed.
 */
function checkWinCondition() {
    const range = getCurrentGenealogyRange();
    let allPlaced = true;

    for (let i = range.start; i <= range.end; i++) {
        if (!gameState.placedCards.has(i)) {
            allPlaced = false;
            break;
        }
    }

    if (allPlaced) {
        setTimeout(() => {
            const completionResult = calculateLevelCompletion();

            playWin();
            vibrate([100, 50, 100, 50, 200]);

            // Build detailed score breakdown
            const timeDisplay = formatTime(completionResult.elapsedTime);
            const timeLimitDisplay = formatTime(completionResult.timeLimit);
            const speedBonusLine = completionResult.underTimeLimit
                ? `<div style="color: #4aff4a;">⚡ Speed Bonus (+20%): +${completionResult.speedBonus}</div>`
                : `<div style="color: #888;">Time: ${timeDisplay} (limit: ${timeLimitDisplay})</div>`;

            const finalScoreEl = document.getElementById('finalScore');
            finalScoreEl.innerHTML = `
                <div style="text-align: center;">
                    <div style="font-size: 1.2rem; margin-bottom: 10px;">${completionResult.tierLabel}</div>
                    <div>Base Score: ${completionResult.baseScore}</div>
                    <div>Multiplier (${completionResult.netMistakes} mistakes): ×${completionResult.multiplier}</div>
                    <div>Completion Bonus: +${completionResult.completionBonus}</div>
                    ${speedBonusLine}
                    <div style="font-size: 1.5rem; margin-top: 10px; color: var(--gold);">
                        Final Score: ${completionResult.finalScore}
                    </div>
                </div>
            `;

            // Check for high score
            const nameEntry = document.getElementById('nameEntry');
            if (isHighScore(gameState.currentLevel, completionResult.finalScore)) {
                nameEntry.classList.add('active');
                document.getElementById('playerNameInput').value = '';
                document.getElementById('playerNameInput').focus();
            } else {
                nameEntry.classList.remove('active');
            }

            displayHighScores(gameState.currentLevel);

            document.getElementById('winModal').classList.add('active');
            speak(`${completionResult.tierLabel}! Final score: ${completionResult.finalScore}`);
            saveProgress();
        }, 500);
    }
}

/**
 * Calculate final score with all bonuses.
 * @returns {Object} Completion result with all score details
 */
function calculateLevelCompletion() {
    stopTimer();

    const baseScore = gameState.score;
    const netMistakes = gameState.mistakes;
    const tier = getTierMultiplier(netMistakes);
    const maxScore = getLevelMaxScore();

    const multipliedScore = Math.floor(baseScore * tier.multiplier);
    const completionBonus = Math.floor(maxScore * 0.2);
    const speedBonusPercent = getSpeedBonus();
    const level = levels[gameState.currentLevel];
    const underTimeLimit = gameState.elapsedSeconds <= level.timeLimit;
    const speedBonus = Math.floor(multipliedScore * speedBonusPercent);

    const finalScore = multipliedScore + completionBonus + speedBonus;

    gameState.score = finalScore;

    return {
        baseScore,
        netMistakes,
        multiplier: tier.multiplier,
        tierLabel: tier.label,
        completionBonus,
        speedBonus,
        underTimeLimit,
        elapsedTime: gameState.elapsedSeconds,
        timeLimit: level.timeLimit,
        finalScore
    };
}

// ==============================================
// SAVE/LOAD PROGRESS
// ==============================================

/**
 * Save progress to localStorage.
 */
function saveProgress() {
    const saveData = {
        score: gameState.score,
        stars: gameState.stars,
        highScore: Math.max(gameState.score, parseInt(storage.getItem('begat_highscore') || '0'))
    };
    storage.setItem('begat_progress', JSON.stringify(saveData));
    storage.setItem('begat_highscore', saveData.highScore.toString());
}

/**
 * Load progress from localStorage.
 */
function loadProgress() {
    const saved = storage.getItem('begat_progress');
    if (saved) {
        try {
            const data = JSON.parse(saved);
            gameState.stars = data.stars || 0;
        } catch (e) {
            console.warn('Failed to parse saved progress:', e);
        }
    }
}

// ==============================================
// MUSIC SYSTEM
// ==============================================

const startMusic = document.getElementById('startMusic');
const gameMusic = document.getElementById('gameMusic');
const musicBtn = document.getElementById('musicToggle');
const startMusicBtn = document.getElementById('startMusicToggle');
startMusic.volume = 0.4;
gameMusic.volume = 0.4;

let musicAutoplayBlocked = false;
let musicEnabled = true;

/**
 * Update music button UI state.
 * @param {boolean} playing - Whether music is playing
 */
function updateMusicButtonState(playing) {
    if (playing) {
        musicBtn.textContent = 'MUSIC: ON';
        musicBtn.classList.add('playing');
        startMusicBtn.textContent = 'MUSIC: ON';
        startMusicBtn.classList.add('playing');
    } else {
        musicBtn.textContent = 'MUSIC: OFF';
        musicBtn.classList.remove('playing');
        startMusicBtn.textContent = 'MUSIC: OFF';
        startMusicBtn.classList.remove('playing');
    }
}

/**
 * Get currently active music track.
 * @returns {HTMLAudioElement} Current music element
 */
function getCurrentMusic() {
    return gameState.gameStarted ? gameMusic : startMusic;
}

/**
 * Switch from start music to gameplay music.
 */
function switchToGameplayMusic() {
    if (musicEnabled && !startMusic.paused) {
        startMusic.pause();
        gameMusic.currentTime = 0;
        gameMusic.play().catch(() => {});
    } else if (musicEnabled && startMusic.paused && musicAutoplayBlocked) {
        gameMusic.currentTime = 0;
        gameMusic.play().catch(() => {});
    }
}

/**
 * Switch from gameplay music to start music.
 */
function switchToStartMusic() {
    if (musicEnabled) {
        gameMusic.pause();
        startMusic.currentTime = 0;
        startMusic.play().catch(() => {});
    }
}

// Try to play start music on page load
startMusic.play().then(() => {
    updateMusicButtonState(true);
}).catch(() => {
    musicAutoplayBlocked = true;
    updateMusicButtonState(true);
});

// Start music on first user interaction if autoplay blocked
function tryStartMusicOnInteraction(e) {
    if (e.target === musicBtn || e.target === startMusicBtn) return;
    if (musicAutoplayBlocked && musicEnabled) {
        getCurrentMusic().play().then(() => {
            musicAutoplayBlocked = false;
            updateMusicButtonState(true);
            document.removeEventListener('click', tryStartMusicOnInteraction);
            document.removeEventListener('touchstart', tryStartMusicOnInteraction);
        }).catch(() => {});
    }
}
document.addEventListener('click', tryStartMusicOnInteraction);
document.addEventListener('touchstart', tryStartMusicOnInteraction);

// Music button click handlers
musicBtn.addEventListener('click', () => {
    const currentMusic = getCurrentMusic();
    if (currentMusic.paused) {
        currentMusic.play();
        updateMusicButtonState(true);
        musicEnabled = true;
        musicAutoplayBlocked = false;
    } else {
        startMusic.pause();
        gameMusic.pause();
        updateMusicButtonState(false);
        musicEnabled = false;
    }
});

startMusicBtn.addEventListener('click', () => {
    const currentMusic = getCurrentMusic();
    if (currentMusic.paused) {
        currentMusic.play();
        updateMusicButtonState(true);
        musicEnabled = true;
        musicAutoplayBlocked = false;
    } else {
        startMusic.pause();
        gameMusic.pause();
        updateMusicButtonState(false);
        musicEnabled = false;
    }
});

// ==============================================
// SCREENSHOT & SHARE SYSTEM
// ==============================================

let capturedImageBlob = null;
let capturedImageDataUrl = null;

/**
 * Capture screenshot using html2canvas.
 */
async function captureScreenshot() {
    const shareStatus = document.getElementById('shareStatus');
    shareStatus.textContent = 'Capturing screenshot...';

    try {
        const elementsToHide = [
            document.getElementById('shareBtn'),
            document.getElementById('musicToggle'),
            document.querySelector('.menu-btn'),
            document.querySelector('.home-btn')
        ];
        elementsToHide.forEach(el => { if (el) el.style.visibility = 'hidden'; });

        const canvas = await html2canvas(document.body, {
            backgroundColor: '#1a1a2e',
            scale: 2,
            useCORS: true,
            logging: false
        });

        elementsToHide.forEach(el => { if (el) el.style.visibility = 'visible'; });

        capturedImageDataUrl = canvas.toDataURL('image/png');

        const preview = document.getElementById('sharePreview');
        preview.src = capturedImageDataUrl;
        preview.style.display = 'block';

        canvas.toBlob((blob) => {
            capturedImageBlob = blob;
            shareStatus.textContent = 'Screenshot ready!';
        }, 'image/png');

    } catch (error) {
        console.error('Screenshot error:', error);
        shareStatus.textContent = 'Error capturing screenshot. Try again.';
    }
}

// ==============================================
// MENU EVENT HANDLERS
// ==============================================

document.getElementById('menuBtn').addEventListener('click', () => {
    document.getElementById('menuModal').classList.add('active');
});

document.getElementById('closeMenuBtn').addEventListener('click', () => {
    document.getElementById('menuModal').classList.remove('active');
});

document.getElementById('howToPlayBtn').addEventListener('click', () => {
    window.location.href = 'readme.html';
});

document.getElementById('newGameBtn').addEventListener('click', () => {
    initGame();
    document.getElementById('menuModal').classList.remove('active');
    showStartScreen();
});

document.getElementById('levelSelectBtn').addEventListener('click', () => {
    const levelOptions = document.getElementById('levelOptions');
    levelOptions.innerHTML = '';

    levels.forEach((level, idx) => {
        const btn = document.createElement('button');
        btn.className = 'menu-option';
        btn.textContent = `${idx + 1}. ${level.name} (${level.difficulty})`;
        btn.addEventListener('click', () => {
            gameState.currentLevel = idx;
            initGame();
            document.getElementById('levelModal').classList.remove('active');
            document.getElementById('menuModal').classList.remove('active');
            showStartScreen();
        });
        levelOptions.appendChild(btn);
    });

    const closeBtn = document.createElement('button');
    closeBtn.className = 'menu-option';
    closeBtn.textContent = 'Cancel';
    closeBtn.addEventListener('click', () => {
        document.getElementById('levelModal').classList.remove('active');
    });
    levelOptions.appendChild(closeBtn);

    document.getElementById('levelModal').classList.add('active');
});

document.getElementById('toggleSoundBtn').addEventListener('click', () => {
    gameState.soundEnabled = !gameState.soundEnabled;
    document.getElementById('toggleSoundBtn').textContent =
        `Sound: ${gameState.soundEnabled ? 'ON' : 'OFF'}`;
    if (gameState.soundEnabled) {
        playChime();
    }
});

document.getElementById('toggleSpeechBtn').addEventListener('click', () => {
    gameState.speechEnabled = !gameState.speechEnabled;
    document.getElementById('toggleSpeechBtn').textContent =
        `Speech: ${gameState.speechEnabled ? 'ON' : 'OFF'}`;
    if (gameState.speechEnabled) {
        speak('Speech enabled');
    }
});

document.getElementById('highContrastBtn').addEventListener('click', () => {
    gameState.highContrast = !gameState.highContrast;
    document.body.classList.toggle('high-contrast', gameState.highContrast);
});

document.getElementById('colorblindBtn').addEventListener('click', () => {
    gameState.colorblind = !gameState.colorblind;
    document.body.classList.toggle('colorblind', gameState.colorblind);
});

document.getElementById('playAgainBtn').addEventListener('click', () => {
    document.getElementById('winModal').classList.remove('active');
    initGame();
});

// Save high score button
document.getElementById('saveScoreBtn').addEventListener('click', () => {
    const nameInput = document.getElementById('playerNameInput');
    const name = nameInput.value.trim() || 'Anonymous';
    addHighScore(gameState.currentLevel, name, gameState.score);
    displayHighScores(gameState.currentLevel);
    document.getElementById('nameEntry').classList.remove('active');
});

// Enter key to save score
document.getElementById('playerNameInput').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        document.getElementById('saveScoreBtn').click();
    }
});

// Camera button on win modal
document.getElementById('winCameraBtn').addEventListener('click', async () => {
    try {
        const winModal = document.getElementById('winModal');
        winModal.style.display = 'none';

        if (typeof html2canvas !== 'undefined') {
            const canvas = await html2canvas(document.body, {
                backgroundColor: '#1a1a2e',
                scale: 2
            });

            winModal.style.display = '';

            const link = document.createElement('a');
            link.download = `begat-score-${gameState.score}.png`;
            link.href = canvas.toDataURL('image/png');
            link.click();
        } else {
            winModal.style.display = '';
            document.getElementById('shareBtn').click();
        }
    } catch (err) {
        console.error('Screenshot failed:', err);
        document.getElementById('winModal').style.display = '';
        document.getElementById('shareBtn').click();
    }
});

// ==============================================
// PWA INSTALL PROMPT
// ==============================================

let deferredPrompt;
window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    document.getElementById('installPrompt').classList.add('visible');
});

document.getElementById('installBtn').addEventListener('click', async () => {
    if (deferredPrompt) {
        deferredPrompt.prompt();
        const result = await deferredPrompt.userChoice;
        deferredPrompt = null;
    }
    document.getElementById('installPrompt').classList.remove('visible');
});

document.getElementById('dismissInstall').addEventListener('click', () => {
    document.getElementById('installPrompt').classList.remove('visible');
});

// ==============================================
// SHARE MODAL HANDLERS
// ==============================================

document.getElementById('shareBtn').addEventListener('click', async () => {
    document.getElementById('shareModal').classList.add('active');
    document.getElementById('sharePreview').style.display = 'none';
    document.getElementById('shareStatus').textContent = '';
    capturedImageBlob = null;
    capturedImageDataUrl = null;
    await captureScreenshot();
});

document.getElementById('shareNativeBtn').addEventListener('click', async () => {
    const shareStatus = document.getElementById('shareStatus');

    if (!capturedImageBlob) {
        shareStatus.textContent = 'Please wait for screenshot to finish...';
        return;
    }

    const shareText = `Check out my progress in Begat! Score: ${gameState.score} | Stars: ${gameState.stars} - Play at grandpapa.net`;

    if (navigator.canShare && navigator.canShare({ files: [new File([capturedImageBlob], 'begat-score.png', { type: 'image/png' })] })) {
        try {
            const file = new File([capturedImageBlob], 'begat-score.png', { type: 'image/png' });
            await navigator.share({
                title: 'My Begat Score',
                text: shareText,
                files: [file]
            });
            shareStatus.textContent = 'Shared successfully!';
            playChime();
        } catch (err) {
            if (err.name !== 'AbortError') {
                shareStatus.textContent = 'Share cancelled or failed.';
            }
        }
    } else if (navigator.share) {
        try {
            await navigator.share({
                title: 'My Begat Score',
                text: shareText,
                url: 'https://grandpapa.net/play/begat/'
            });
            shareStatus.textContent = 'Shared successfully!';
            playChime();
        } catch (err) {
            if (err.name !== 'AbortError') {
                shareStatus.textContent = 'Share cancelled.';
            }
        }
    } else {
        shareStatus.textContent = 'Native sharing not supported. Try email or download.';
    }
});

document.getElementById('shareEmailBtn').addEventListener('click', () => {
    const shareStatus = document.getElementById('shareStatus');

    const subject = encodeURIComponent('Check out my Begat score!');
    const body = encodeURIComponent(
        `I'm playing Begat - the biblical genealogy game!\n\n` +
        `My Score: ${gameState.score}\n` +
        `Stars Earned: ${gameState.stars}\n` +
        `Level: ${levels[gameState.currentLevel].name}\n\n` +
        `Play the game at: https://grandpapa.net/play/begat/\n\n` +
        `(Screenshot attached separately - save the image first then attach to email)`
    );

    window.location.href = `mailto:?subject=${subject}&body=${body}`;
    shareStatus.textContent = 'Opening email... Save image first to attach!';
});

document.getElementById('downloadBtn').addEventListener('click', () => {
    const shareStatus = document.getElementById('shareStatus');

    if (!capturedImageDataUrl) {
        shareStatus.textContent = 'Please wait for screenshot to finish...';
        return;
    }

    const link = document.createElement('a');
    link.download = `begat-score-${Date.now()}.png`;
    link.href = capturedImageDataUrl;
    link.click();

    shareStatus.textContent = 'Image saved!';
    playChime();
});

document.getElementById('closeShareBtn').addEventListener('click', () => {
    document.getElementById('shareModal').classList.remove('active');
});

// ==============================================
// SERVICE WORKER (Offline Support)
// ==============================================

if ('serviceWorker' in navigator) {
    const swCode = `
        const CACHE_NAME = 'begat-v1';
        self.addEventListener('install', e => {
            e.waitUntil(caches.open(CACHE_NAME));
        });
        self.addEventListener('fetch', e => {
            e.respondWith(
                caches.match(e.request).then(r => r || fetch(e.request))
            );
        });
    `;
    const blob = new Blob([swCode], { type: 'application/javascript' });
    navigator.serviceWorker.register(URL.createObjectURL(blob)).catch(() => {});
}

// ==============================================
// KEYBOARD NAVIGATION (Global)
// ==============================================

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        // Close any open modal or go back to games
        if (document.getElementById('quizModal').classList.contains('active')) {
            document.getElementById('quizModal').classList.remove('active');
        } else if (document.getElementById('menuModal').classList.contains('active')) {
            document.getElementById('menuModal').classList.remove('active');
        } else if (document.getElementById('levelModal').classList.contains('active')) {
            document.getElementById('levelModal').classList.remove('active');
        } else if (document.getElementById('winModal').classList.contains('active')) {
            document.getElementById('winModal').classList.remove('active');
        } else if (document.getElementById('shareModal').classList.contains('active')) {
            document.getElementById('shareModal').classList.remove('active');
        } else {
            window.location.href = '../../games.html';
        }
    }
});

// ==============================================
// WINDOW RESIZE HANDLING
// ==============================================

let resizeTimeout = null;

/**
 * Debounced resize handler to re-render on window resize.
 * Prevents excessive re-renders during resize drag.
 */
function handleResize() {
    if (resizeTimeout) {
        clearTimeout(resizeTimeout);
    }
    resizeTimeout = setTimeout(() => {
        // Only re-render if game has started
        if (gameState.gameStarted) {
            renderTimeline();
            renderCardPool();
        }
    }, 250); // 250ms debounce
}

window.addEventListener('resize', handleResize);
window.addEventListener('orientationchange', handleResize);

// ==============================================
// INITIALIZATION ON PAGE LOAD
// ==============================================

window.addEventListener('load', () => {
    createStars();
    loadProgress();
    initGame();

    // Start button event listener
    document.getElementById('startGameBtn').addEventListener('click', startGame);

    // Hide loading screen and show start screen
    setTimeout(() => {
        document.getElementById('loadingScreen').classList.add('hidden');
        showStartScreen();
    }, 1000);
});

// Hide tooltip on any touch (mobile fix)
document.addEventListener('touchstart', () => {
    hideDateTooltip();
}, { passive: true });

// Prevent zoom on double tap
document.addEventListener('touchend', (e) => {
    const now = Date.now();
    if (now - (window.lastTouchEnd || 0) < 300) {
        e.preventDefault();
    }
    window.lastTouchEnd = now;
}, { passive: false });

// ==============================================
// EXPORTS FOR TESTING (ES Module)
// ==============================================

/**
 * Export core functions and data for unit testing.
 * These are also available via window.__test_* for legacy test runners.
 */
export {
    genealogy,
    levels,
    gameState,
    LEVEL_POINTS,
    TIER_MULTIPLIERS,
    getLevelPoints,
    getLevelMaxScore,
    getTierMultiplier,
    getSpeedBonus,
    formatTime,
    getHighScores,
    saveHighScores,
    isHighScore,
    addHighScore,
    storage
};
