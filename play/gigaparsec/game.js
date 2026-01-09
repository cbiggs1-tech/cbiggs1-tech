// Gigaparsec - Space Shooter Game
// Inspired by TI-99 Parsec

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Set canvas resolution
canvas.width = 800;
canvas.height = 600;

// Game state
const GameState = {
    MENU: 'menu',
    PLAYING: 'playing',
    GAME_OVER: 'gameover'
};

let gameState = GameState.MENU;
let score = 0;
let lives = 3;
let level = 1;
let enemySpawnTimer = 0;
let asteroidSpawnTimer = 0;
let stars = [];
let enemies = [];
let bullets = [];
let particles = [];
let asteroids = [];
let powerUps = [];

// Audio context for retro sounds
let audioCtx = null;

// Background music
let bgMusic = null;
let musicPlaying = false;
let musicVolume = 0.3;

function initAudio() {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
}

function initMusic() {
    if (!bgMusic) {
        bgMusic = new Audio('music.mp3');
        bgMusic.loop = true;
        bgMusic.volume = musicVolume;
    }
}

function toggleMusic() {
    initMusic();
    if (musicPlaying) {
        bgMusic.pause();
        musicPlaying = false;
    } else {
        bgMusic.play();
        musicPlaying = true;
    }
}

function playSound(type) {
    if (!audioCtx) return;

    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    switch(type) {
        case 'shoot':
            oscillator.frequency.setValueAtTime(880, audioCtx.currentTime);
            oscillator.frequency.exponentialRampToValueAtTime(110, audioCtx.currentTime + 0.1);
            gainNode.gain.setValueAtTime(0.3, audioCtx.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
            oscillator.start(audioCtx.currentTime);
            oscillator.stop(audioCtx.currentTime + 0.1);
            break;
        case 'explosion':
            oscillator.type = 'sawtooth';
            oscillator.frequency.setValueAtTime(150, audioCtx.currentTime);
            oscillator.frequency.exponentialRampToValueAtTime(30, audioCtx.currentTime + 0.3);
            gainNode.gain.setValueAtTime(0.4, audioCtx.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
            oscillator.start(audioCtx.currentTime);
            oscillator.stop(audioCtx.currentTime + 0.3);
            break;
        case 'powerup':
            oscillator.frequency.setValueAtTime(440, audioCtx.currentTime);
            oscillator.frequency.setValueAtTime(660, audioCtx.currentTime + 0.1);
            oscillator.frequency.setValueAtTime(880, audioCtx.currentTime + 0.2);
            gainNode.gain.setValueAtTime(0.3, audioCtx.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
            oscillator.start(audioCtx.currentTime);
            oscillator.stop(audioCtx.currentTime + 0.3);
            break;
        case 'hit':
            oscillator.type = 'square';
            oscillator.frequency.setValueAtTime(200, audioCtx.currentTime);
            oscillator.frequency.exponentialRampToValueAtTime(50, audioCtx.currentTime + 0.2);
            gainNode.gain.setValueAtTime(0.4, audioCtx.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.2);
            oscillator.start(audioCtx.currentTime);
            oscillator.stop(audioCtx.currentTime + 0.2);
            break;
    }
}

// Player ship
const player = {
    x: 100,
    y: canvas.height / 2,
    width: 40,
    height: 20,
    speed: 6,
    color: '#00ffff',
    shootCooldown: 0,
    shootDelay: 10,
    invincible: 0,
    powerLevel: 1
};

// Input handling
const mouse = {
    x: player.x,
    y: player.y,
    firing: false
};

// Gamepad support
let gamepadConnected = false;
let gamepadIndex = -1;
const GAMEPAD_DEADZONE = 0.15;
let lastGamepadAction = false; // To prevent rapid-fire menu actions

window.addEventListener('gamepadconnected', (e) => {
    console.log('Gamepad connected:', e.gamepad.id);
    gamepadConnected = true;
    gamepadIndex = e.gamepad.index;
});

window.addEventListener('gamepaddisconnected', (e) => {
    console.log('Gamepad disconnected:', e.gamepad.id);
    if (e.gamepad.index === gamepadIndex) {
        gamepadConnected = false;
        gamepadIndex = -1;
    }
});

function getGamepadInput() {
    if (!gamepadConnected || gamepadIndex < 0) return null;

    const gamepads = navigator.getGamepads();
    const gp = gamepads[gamepadIndex];
    if (!gp) return null;

    // Logitech F310 mapping (standard gamepad):
    // Left stick: axes[0] (X), axes[1] (Y)
    // Right stick: axes[2] (X), axes[3] (Y)
    // A button (0), B button (1), X button (2), Y button (3)
    // LB (4), RB (5), LT (6), RT (7)
    // Back (8), Start (9)
    // Left stick press (10), Right stick press (11)
    // D-pad: Up (12), Down (13), Left (14), Right (15)

    let moveX = 0, moveY = 0;
    let fire = false;
    let action = false; // For menu/restart

    // Left analog stick for movement
    if (Math.abs(gp.axes[0]) > GAMEPAD_DEADZONE) {
        moveX = gp.axes[0];
    }
    if (Math.abs(gp.axes[1]) > GAMEPAD_DEADZONE) {
        moveY = gp.axes[1];
    }

    // D-pad for movement (fallback)
    if (gp.buttons[12] && gp.buttons[12].pressed) moveY = -1; // Up
    if (gp.buttons[13] && gp.buttons[13].pressed) moveY = 1;  // Down
    if (gp.buttons[14] && gp.buttons[14].pressed) moveX = -1; // Left
    if (gp.buttons[15] && gp.buttons[15].pressed) moveX = 1;  // Right

    // Fire buttons: A, X, RB, RT (any trigger/face button)
    if ((gp.buttons[0] && gp.buttons[0].pressed) ||  // A
        (gp.buttons[2] && gp.buttons[2].pressed) ||  // X
        (gp.buttons[5] && gp.buttons[5].pressed) ||  // RB
        (gp.buttons[7] && gp.buttons[7].pressed)) {  // RT
        fire = true;
    }

    // Action buttons for menu: Start, A, B
    if ((gp.buttons[9] && gp.buttons[9].pressed) ||  // Start
        (gp.buttons[0] && gp.buttons[0].pressed) ||  // A
        (gp.buttons[1] && gp.buttons[1].pressed)) {  // B
        action = true;
    }

    return { moveX, moveY, fire, action };
}

// Get canvas position for accurate mouse coordinates
function getCanvasMousePos(e) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
        x: (e.clientX - rect.left) * scaleX,
        y: (e.clientY - rect.top) * scaleY
    };
}

canvas.addEventListener('mousemove', (e) => {
    const pos = getCanvasMousePos(e);
    mouse.x = pos.x;
    mouse.y = pos.y;
});

canvas.addEventListener('mousedown', (e) => {
    if (e.button === 2) { // Right click
        e.preventDefault();
        mouse.firing = true;
        if (gameState === GameState.MENU) {
            startGame();
        } else if (gameState === GameState.GAME_OVER) {
            resetGame();
        }
    }
});

canvas.addEventListener('mouseup', (e) => {
    if (e.button === 2) { // Right click
        mouse.firing = false;
    }
});

// Prevent context menu on right click
canvas.addEventListener('contextmenu', (e) => {
    e.preventDefault();
});

// Also allow space/click to start for convenience
document.addEventListener('keydown', (e) => {
    // Music toggle works in any state
    if (e.key === 'm' || e.key === 'M') {
        toggleMusic();
        return;
    }

    if (e.code === 'Space') {
        if (gameState === GameState.MENU) {
            startGame();
        } else if (gameState === GameState.GAME_OVER) {
            resetGame();
        }
    }
});

canvas.addEventListener('click', (e) => {
    if (gameState === GameState.MENU) {
        startGame();
    } else if (gameState === GameState.GAME_OVER) {
        resetGame();
    }
});

// Initialize stars for background
function initStars() {
    stars = [];
    for (let i = 0; i < 100; i++) {
        stars.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            speed: Math.random() * 3 + 1,
            size: Math.random() * 2 + 1,
            brightness: Math.random()
        });
    }
}

// Draw player ship (classic Parsec style)
function drawPlayer() {
    if (player.invincible > 0 && Math.floor(player.invincible / 5) % 2 === 0) {
        return; // Blinking effect when invincible
    }

    ctx.save();
    ctx.translate(player.x, player.y);

    // Main body
    ctx.fillStyle = player.color;
    ctx.beginPath();
    ctx.moveTo(player.width / 2, 0);
    ctx.lineTo(-player.width / 2, -player.height / 2);
    ctx.lineTo(-player.width / 3, 0);
    ctx.lineTo(-player.width / 2, player.height / 2);
    ctx.closePath();
    ctx.fill();

    // Cockpit
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(-5, -3, 10, 6);

    // Engine glow
    ctx.fillStyle = '#ff6600';
    ctx.beginPath();
    ctx.moveTo(-player.width / 3, -5);
    ctx.lineTo(-player.width / 2 - Math.random() * 10 - 5, 0);
    ctx.lineTo(-player.width / 3, 5);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
}

// Enemy types
const EnemyTypes = {
    FIGHTER: {
        width: 30,
        height: 15,
        speed: 3,
        color: '#ff0000',
        points: 100,
        health: 1
    },
    BOMBER: {
        width: 40,
        height: 25,
        speed: 2,
        color: '#ff6600',
        points: 200,
        health: 2
    },
    SPEEDER: {
        width: 25,
        height: 12,
        speed: 6,
        color: '#ffff00',
        points: 150,
        health: 1
    }
};

function spawnEnemy() {
    const types = Object.values(EnemyTypes);
    const type = types[Math.floor(Math.random() * types.length)];

    // Wave patterns
    const patterns = ['straight', 'sine', 'dive'];
    const pattern = patterns[Math.floor(Math.random() * patterns.length)];

    enemies.push({
        x: canvas.width + type.width,
        y: Math.random() * (canvas.height - 100) + 50,
        ...type,
        pattern: pattern,
        patternOffset: Math.random() * Math.PI * 2,
        startY: 0,
        time: 0
    });
    enemies[enemies.length - 1].startY = enemies[enemies.length - 1].y;
}

function drawEnemy(enemy) {
    ctx.save();
    ctx.translate(enemy.x, enemy.y);

    // Different shapes based on color (type)
    ctx.fillStyle = enemy.color;

    if (enemy.color === '#ff0000') {
        // Fighter - arrow shape
        ctx.beginPath();
        ctx.moveTo(-enemy.width / 2, 0);
        ctx.lineTo(enemy.width / 2, -enemy.height / 2);
        ctx.lineTo(enemy.width / 4, 0);
        ctx.lineTo(enemy.width / 2, enemy.height / 2);
        ctx.closePath();
        ctx.fill();
    } else if (enemy.color === '#ff6600') {
        // Bomber - hexagon
        ctx.beginPath();
        ctx.moveTo(-enemy.width / 2, 0);
        ctx.lineTo(-enemy.width / 4, -enemy.height / 2);
        ctx.lineTo(enemy.width / 4, -enemy.height / 2);
        ctx.lineTo(enemy.width / 2, 0);
        ctx.lineTo(enemy.width / 4, enemy.height / 2);
        ctx.lineTo(-enemy.width / 4, enemy.height / 2);
        ctx.closePath();
        ctx.fill();
    } else {
        // Speeder - diamond
        ctx.beginPath();
        ctx.moveTo(-enemy.width / 2, 0);
        ctx.lineTo(0, -enemy.height / 2);
        ctx.lineTo(enemy.width / 2, 0);
        ctx.lineTo(0, enemy.height / 2);
        ctx.closePath();
        ctx.fill();
    }

    // Engine glow
    ctx.fillStyle = '#00ffff';
    ctx.beginPath();
    ctx.arc(enemy.width / 2 + 5, 0, 3, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
}

function updateEnemies() {
    for (let i = enemies.length - 1; i >= 0; i--) {
        const enemy = enemies[i];
        enemy.time += 0.05;

        // Move based on pattern
        enemy.x -= enemy.speed + level * 0.5;

        switch(enemy.pattern) {
            case 'sine':
                enemy.y = enemy.startY + Math.sin(enemy.time + enemy.patternOffset) * 50;
                break;
            case 'dive':
                if (enemy.x < canvas.width * 0.7) {
                    enemy.y += (player.y - enemy.y) * 0.02;
                }
                break;
        }

        // Keep in bounds
        enemy.y = Math.max(30, Math.min(canvas.height - 30, enemy.y));

        // Remove if off screen
        if (enemy.x < -enemy.width) {
            enemies.splice(i, 1);
        }
    }
}

// Asteroids (terrain obstacles like in Parsec)
function spawnAsteroid() {
    const size = Math.random() * 30 + 20;
    asteroids.push({
        x: canvas.width + size,
        y: Math.random() * (canvas.height - 100) + 50,
        size: size,
        speed: 2 + Math.random() * 2,
        rotation: 0,
        rotationSpeed: (Math.random() - 0.5) * 0.1,
        vertices: generateAsteroidVertices(size)
    });
}

function generateAsteroidVertices(size) {
    const vertices = [];
    const numVertices = 8;
    for (let i = 0; i < numVertices; i++) {
        const angle = (i / numVertices) * Math.PI * 2;
        const radius = size * (0.7 + Math.random() * 0.3);
        vertices.push({
            x: Math.cos(angle) * radius,
            y: Math.sin(angle) * radius
        });
    }
    return vertices;
}

function drawAsteroid(asteroid) {
    ctx.save();
    ctx.translate(asteroid.x, asteroid.y);
    ctx.rotate(asteroid.rotation);

    ctx.strokeStyle = '#888888';
    ctx.lineWidth = 2;
    ctx.fillStyle = '#333333';

    ctx.beginPath();
    ctx.moveTo(asteroid.vertices[0].x, asteroid.vertices[0].y);
    for (let i = 1; i < asteroid.vertices.length; i++) {
        ctx.lineTo(asteroid.vertices[i].x, asteroid.vertices[i].y);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.restore();
}

function updateAsteroids() {
    for (let i = asteroids.length - 1; i >= 0; i--) {
        const asteroid = asteroids[i];
        asteroid.x -= asteroid.speed;
        asteroid.rotation += asteroid.rotationSpeed;

        if (asteroid.x < -asteroid.size) {
            asteroids.splice(i, 1);
        }
    }
}

// Bullets
function shoot() {
    if (player.shootCooldown > 0) return;

    playSound('shoot');
    player.shootCooldown = player.shootDelay;

    // Main bullet
    bullets.push({
        x: player.x + player.width / 2,
        y: player.y,
        width: 15,
        height: 4,
        speed: 12,
        color: '#00ff00'
    });

    // Extra bullets for power level
    if (player.powerLevel >= 2) {
        bullets.push({
            x: player.x + player.width / 2,
            y: player.y - 10,
            width: 10,
            height: 3,
            speed: 12,
            color: '#00ff00'
        });
        bullets.push({
            x: player.x + player.width / 2,
            y: player.y + 10,
            width: 10,
            height: 3,
            speed: 12,
            color: '#00ff00'
        });
    }
}

function drawBullet(bullet) {
    ctx.fillStyle = bullet.color;
    ctx.shadowColor = bullet.color;
    ctx.shadowBlur = 10;
    ctx.fillRect(bullet.x - bullet.width / 2, bullet.y - bullet.height / 2, bullet.width, bullet.height);
    ctx.shadowBlur = 0;
}

function updateBullets() {
    for (let i = bullets.length - 1; i >= 0; i--) {
        bullets[i].x += bullets[i].speed;

        if (bullets[i].x > canvas.width) {
            bullets.splice(i, 1);
        }
    }
}

// Particles for explosions
function createExplosion(x, y, color, count = 20) {
    for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 5 + 2;
        particles.push({
            x: x,
            y: y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            life: 30 + Math.random() * 20,
            maxLife: 50,
            color: color,
            size: Math.random() * 4 + 2
        });
    }
}

function updateParticles() {
    for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vx *= 0.98;
        p.vy *= 0.98;
        p.life--;

        if (p.life <= 0) {
            particles.splice(i, 1);
        }
    }
}

function drawParticles() {
    for (const p of particles) {
        const alpha = p.life / p.maxLife;
        ctx.fillStyle = p.color;
        ctx.globalAlpha = alpha;
        ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
    }
    ctx.globalAlpha = 1;
}

// Power-ups
function spawnPowerUp(x, y) {
    if (Math.random() < 0.2) { // 20% chance
        powerUps.push({
            x: x,
            y: y,
            width: 20,
            height: 20,
            type: Math.random() < 0.5 ? 'power' : 'life',
            time: 0
        });
    }
}

function drawPowerUp(powerUp) {
    powerUp.time += 0.1;

    ctx.save();
    ctx.translate(powerUp.x, powerUp.y);
    ctx.rotate(powerUp.time);

    if (powerUp.type === 'power') {
        ctx.fillStyle = '#ffff00';
        ctx.strokeStyle = '#ffaa00';
    } else {
        ctx.fillStyle = '#00ff00';
        ctx.strokeStyle = '#00aa00';
    }

    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 0; i < 5; i++) {
        const angle = (i * 4 * Math.PI) / 5 - Math.PI / 2;
        const x = Math.cos(angle) * 10;
        const y = Math.sin(angle) * 10;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.restore();
}

function updatePowerUps() {
    for (let i = powerUps.length - 1; i >= 0; i--) {
        powerUps[i].x -= 2;

        if (powerUps[i].x < -20) {
            powerUps.splice(i, 1);
        }
    }
}

// Collision detection
function checkCollision(obj1, obj2) {
    return obj1.x - obj1.width / 2 < obj2.x + obj2.width / 2 &&
           obj1.x + obj1.width / 2 > obj2.x - obj2.width / 2 &&
           obj1.y - obj1.height / 2 < obj2.y + obj2.height / 2 &&
           obj1.y + obj1.height / 2 > obj2.y - obj2.height / 2;
}

function checkCircleCollision(obj1, obj2, radius) {
    const dx = obj1.x - obj2.x;
    const dy = obj1.y - obj2.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    return distance < radius + obj1.width / 2;
}

function handleCollisions() {
    // Bullets vs Enemies
    for (let i = bullets.length - 1; i >= 0; i--) {
        for (let j = enemies.length - 1; j >= 0; j--) {
            if (checkCollision(bullets[i], enemies[j])) {
                enemies[j].health--;
                bullets.splice(i, 1);

                if (enemies[j].health <= 0) {
                    createExplosion(enemies[j].x, enemies[j].y, enemies[j].color);
                    playSound('explosion');
                    score += enemies[j].points;
                    spawnPowerUp(enemies[j].x, enemies[j].y);
                    enemies.splice(j, 1);
                }
                break;
            }
        }
    }

    // Bullets vs Asteroids
    for (let i = bullets.length - 1; i >= 0; i--) {
        for (let j = asteroids.length - 1; j >= 0; j--) {
            if (checkCircleCollision(bullets[i], asteroids[j], asteroids[j].size)) {
                bullets.splice(i, 1);

                // Break asteroid into smaller pieces
                if (asteroids[j].size > 25) {
                    const newSize = asteroids[j].size / 2;
                    for (let k = 0; k < 2; k++) {
                        asteroids.push({
                            x: asteroids[j].x,
                            y: asteroids[j].y + (k === 0 ? -20 : 20),
                            size: newSize,
                            speed: asteroids[j].speed * 1.2,
                            rotation: 0,
                            rotationSpeed: (Math.random() - 0.5) * 0.15,
                            vertices: generateAsteroidVertices(newSize)
                        });
                    }
                }

                createExplosion(asteroids[j].x, asteroids[j].y, '#888888', 10);
                playSound('explosion');
                score += 50;
                asteroids.splice(j, 1);
                break;
            }
        }
    }

    // Player vs Enemies
    if (player.invincible <= 0) {
        for (let i = enemies.length - 1; i >= 0; i--) {
            if (checkCollision(player, enemies[i])) {
                createExplosion(player.x, player.y, '#00ffff', 30);
                createExplosion(enemies[i].x, enemies[i].y, enemies[i].color);
                playSound('hit');
                enemies.splice(i, 1);
                playerHit();
                break;
            }
        }

        // Player vs Asteroids
        for (const asteroid of asteroids) {
            if (checkCircleCollision(player, asteroid, asteroid.size)) {
                createExplosion(player.x, player.y, '#00ffff', 30);
                playSound('hit');
                playerHit();
                break;
            }
        }
    }

    // Player vs Power-ups
    for (let i = powerUps.length - 1; i >= 0; i--) {
        if (checkCollision(player, powerUps[i])) {
            playSound('powerup');
            if (powerUps[i].type === 'power') {
                player.powerLevel = Math.min(player.powerLevel + 1, 3);
            } else {
                lives = Math.min(lives + 1, 5);
            }
            powerUps.splice(i, 1);
        }
    }
}

function playerHit() {
    lives--;
    player.invincible = 120; // 2 seconds of invincibility
    player.powerLevel = 1;

    if (lives <= 0) {
        gameOver();
    }
}

// Stars background
function updateStars() {
    for (const star of stars) {
        star.x -= star.speed;
        if (star.x < 0) {
            star.x = canvas.width;
            star.y = Math.random() * canvas.height;
        }
    }
}

function drawStars() {
    for (const star of stars) {
        const flicker = 0.5 + Math.sin(Date.now() * 0.01 + star.brightness * 100) * 0.5;
        ctx.fillStyle = `rgba(255, 255, 255, ${star.brightness * flicker})`;
        ctx.fillRect(star.x, star.y, star.size, star.size);
    }
}

// Ground/terrain (like Parsec's scrolling terrain)
function drawTerrain() {
    const time = Date.now() * 0.001;

    // Top terrain
    ctx.fillStyle = '#004400';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    for (let x = 0; x <= canvas.width; x += 20) {
        const y = 20 + Math.sin((x + time * 50) * 0.02) * 15;
        ctx.lineTo(x, y);
    }
    ctx.lineTo(canvas.width, 0);
    ctx.closePath();
    ctx.fill();

    // Bottom terrain
    ctx.fillStyle = '#004400';
    ctx.beginPath();
    ctx.moveTo(0, canvas.height);
    for (let x = 0; x <= canvas.width; x += 20) {
        const y = canvas.height - 20 - Math.sin((x + time * 50) * 0.02) * 15;
        ctx.lineTo(x, y);
    }
    ctx.lineTo(canvas.width, canvas.height);
    ctx.closePath();
    ctx.fill();
}

// Update player
function updatePlayer() {
    // Check for gamepad input
    const gpInput = getGamepadInput();

    if (gpInput && (gpInput.moveX !== 0 || gpInput.moveY !== 0 || gpInput.fire)) {
        // Gamepad control mode - direct velocity-based movement
        player.x += gpInput.moveX * player.speed;
        player.y += gpInput.moveY * player.speed;

        // Clamp to bounds (left half of screen)
        player.x = Math.max(50, Math.min(player.x, canvas.width / 2));
        player.y = Math.max(50, Math.min(player.y, canvas.height - 50));

        if (gpInput.fire) {
            shoot();
        }
    } else {
        // Mouse control mode - smooth movement towards mouse position
        const targetX = Math.min(mouse.x, canvas.width / 2); // Limit to left half
        const targetY = Math.max(50, Math.min(mouse.y, canvas.height - 50)); // Keep in bounds

        // Smooth interpolation for responsive but not instant movement
        const smoothing = 0.15;
        player.x += (targetX - player.x) * smoothing;
        player.y += (targetY - player.y) * smoothing;

        // Clamp to bounds
        player.x = Math.max(50, Math.min(player.x, canvas.width / 2));
        player.y = Math.max(50, Math.min(player.y, canvas.height - 50));

        if (mouse.firing) {
            shoot();
        }
    }

    if (player.shootCooldown > 0) {
        player.shootCooldown--;
    }

    if (player.invincible > 0) {
        player.invincible--;
    }
}

// Update UI
function updateUI() {
    document.getElementById('score-value').textContent = score;
    document.getElementById('lives-value').textContent = lives;
    document.getElementById('level-value').textContent = level;
}

// Game state functions
function startGame() {
    if (!audioCtx) initAudio();
    gameState = GameState.PLAYING;
    document.getElementById('start-screen').classList.add('hidden');
}

function gameOver() {
    gameState = GameState.GAME_OVER;
    document.getElementById('final-score').textContent = score;
    document.getElementById('game-over').classList.remove('hidden');
}

function resetGame() {
    score = 0;
    lives = 3;
    level = 1;
    player.x = 100;
    player.y = canvas.height / 2;
    player.powerLevel = 1;
    player.invincible = 60;
    enemies = [];
    bullets = [];
    particles = [];
    asteroids = [];
    powerUps = [];
    enemySpawnTimer = 0;
    asteroidSpawnTimer = 0;

    document.getElementById('game-over').classList.add('hidden');
    gameState = GameState.PLAYING;
}

// Main game loop
function gameLoop() {
    // Clear canvas
    ctx.fillStyle = '#000011';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Always draw background
    drawStars();
    updateStars();

    // Handle gamepad input for menu states
    const gpInput = getGamepadInput();
    if (gpInput) {
        if (gpInput.action && !lastGamepadAction) {
            if (gameState === GameState.MENU) {
                startGame();
            } else if (gameState === GameState.GAME_OVER) {
                resetGame();
            }
        }
        lastGamepadAction = gpInput.action;
    }

    if (gameState === GameState.PLAYING) {
        // Draw terrain
        drawTerrain();

        // Spawn enemies
        enemySpawnTimer++;
        if (enemySpawnTimer >= Math.max(60 - level * 5, 20)) {
            spawnEnemy();
            enemySpawnTimer = 0;
        }

        // Spawn asteroids
        asteroidSpawnTimer++;
        if (asteroidSpawnTimer >= Math.max(120 - level * 10, 40)) {
            spawnAsteroid();
            asteroidSpawnTimer = 0;
        }

        // Update level
        const newLevel = Math.floor(score / 2000) + 1;
        if (newLevel > level) {
            level = newLevel;
        }

        // Update game objects
        updatePlayer();
        updateBullets();
        updateEnemies();
        updateAsteroids();
        updatePowerUps();
        updateParticles();
        handleCollisions();

        // Draw game objects
        for (const asteroid of asteroids) {
            drawAsteroid(asteroid);
        }

        for (const enemy of enemies) {
            drawEnemy(enemy);
        }

        for (const bullet of bullets) {
            drawBullet(bullet);
        }

        for (const powerUp of powerUps) {
            drawPowerUp(powerUp);
        }

        drawParticles();
        drawPlayer();

        // Update UI
        updateUI();
    }

    requestAnimationFrame(gameLoop);
}

// Initialize and start
initStars();
gameLoop();
