// SPACE JUNK BLASTER
// Clean up orbital debris with your plasma torch!

let gameState = 'MENU'; // MENU, PLAYING, GAMEOVER, ENTER_NAME, EDIT_NAME

// Background music
let bgMusic = null;
let musicPlaying = false;
let musicVolume = 0.3; // Quiet so sound effects are audible
let stars = [];
let junk = [];
let hotJunk = []; // Junk being melted
let clumps = []; // Melted clumps falling to Earth
let particles = [];
let sparks = [];

// Player
let satellite = {
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    angle: 0, // Will be set in setup()
    rotSpeed: 0.05,
    thrustPower: 0.15,
    friction: 0.98
};
let torchOn = false;
let torchParticles = [];
let thrusterParticles = [];

// Mouse control
let mouse = {
    x: 0,
    y: 0,
    prevX: 0,
    prevY: 0,
    deltaX: 0,
    deltaY: 0,
    rightDown: false,
    leftDown: false
};

// Gamepad support
let gamepadConnected = false;
let gamepadIndex = -1;
let lastGamepadButtons = {}; // Track previous button states for edge detection

// In-play asteroids
let asteroids = [];

// Background objects (not in play)
let bgAsteroids = [];
let bgPlanets = [];

// Milky Way effect
let milkyWayStars = [];  // Dense star field in the band
let nebulaClouds = [];   // Colorful nebula patches
let dustLanes = [];      // Dark dust lanes

// ISS (International Space Station)
let iss = null;

// Atmospheric burnup
let burningUp = false;
let burnupTimer = 0;
let burnupParticles = [];

// Score system
let score = 0;
let highScores = [];
let playerNames = ['AAA', 'BBB', 'CCC', 'DDD'];
let currentPlayer = 0;
let enteringName = false;
let nameChars = ['A', 'A', 'A'];
let namePos = 0;

// Audio
let audioCtx;
let beepEnabled = true;

// Earth
let earthRadius;
let atmosphereHeight = 40;

function setup() {
    createCanvas(windowWidth, windowHeight);
    satellite.x = width / 2;
    satellite.y = height / 2;
    satellite.angle = -PI / 2; // Point up initially
    earthRadius = width * 1.5;
    mouse.x = width / 2;
    mouse.y = height / 2;

    // Initialize Milky Way starfield
    initMilkyWay();

    // Initialize background asteroids (decorative, not in play)
    for (let i = 0; i < 8; i++) {
        bgAsteroids.push(createBgAsteroid());
    }

    // Initialize background planets (decorative, not in play)
    for (let i = 0; i < 3; i++) {
        bgPlanets.push(createBgPlanet());
    }

    // Load high scores from localStorage
    loadHighScores();

    // Initialize background music
    bgMusic = new Audio('music.mp3');
    bgMusic.loop = true;
    bgMusic.volume = musicVolume;

    textFont('Courier New');
}

function toggleMusic() {
    if (!bgMusic) return;
    if (musicPlaying) {
        bgMusic.pause();
        musicPlaying = false;
    } else {
        bgMusic.play();
        musicPlaying = true;
    }
}

function windowResized() {
    resizeCanvas(windowWidth, windowHeight);
    satellite.x = width / 2;
    satellite.y = height / 2;
    earthRadius = width * 1.5;
}

// Mouse event handlers
function mouseMoved() {
    mouse.prevX = mouse.x;
    mouse.prevY = mouse.y;
    mouse.x = mouseX;
    mouse.y = mouseY;
    mouse.deltaX = mouse.x - mouse.prevX;
    mouse.deltaY = mouse.y - mouse.prevY;
}

function mouseDragged() {
    mouse.prevX = mouse.x;
    mouse.prevY = mouse.y;
    mouse.x = mouseX;
    mouse.y = mouseY;
    mouse.deltaX = mouse.x - mouse.prevX;
    mouse.deltaY = mouse.y - mouse.prevY;
}

function mousePressed() {
    if (mouseButton === RIGHT) {
        mouse.rightDown = true;
    } else if (mouseButton === LEFT) {
        mouse.leftDown = true;
        // Start game on left click from menu
        if (gameState === 'MENU') {
            initAudio();
            startGame();
        } else if (gameState === 'GAMEOVER') {
            // Check if high score
            if (highScores.length < 10 || score > highScores[highScores.length - 1].score) {
                gameState = 'ENTER_NAME';
                nameChars = ['A', 'A', 'A'];
                namePos = 0;
            } else {
                gameState = 'MENU';
            }
        }
    }
}

function mouseReleased() {
    if (mouseButton === RIGHT) {
        mouse.rightDown = false;
    } else if (mouseButton === LEFT) {
        mouse.leftDown = false;
    }
}

// Prevent right-click context menu
document.addEventListener('contextmenu', e => e.preventDefault());

// Gamepad event listeners
window.addEventListener('gamepadconnected', (e) => {
    gamepadConnected = true;
    gamepadIndex = e.gamepad.index;
    console.log('Gamepad connected:', e.gamepad.id);
});

window.addEventListener('gamepaddisconnected', (e) => {
    if (e.gamepad.index === gamepadIndex) {
        gamepadConnected = false;
        gamepadIndex = -1;
        console.log('Gamepad disconnected');
    }
});

// Poll gamepad for input
function pollGamepad() {
    if (!gamepadConnected || gamepadIndex < 0) return null;

    let gamepads = navigator.getGamepads();
    let gp = gamepads[gamepadIndex];
    if (!gp) return null;

    // Standard gamepad mapping:
    // Left stick: axes[0] (X), axes[1] (Y)
    // Right stick: axes[2] (X), axes[3] (Y)
    // Buttons: 0=A, 1=B, 2=X, 3=Y, 4=LB, 5=RB, 6=LT, 7=RT
    // D-pad: buttons 12=up, 13=down, 14=left, 15=right

    let deadzone = 0.15;

    return {
        // Left stick for rotation/aiming
        leftX: abs(gp.axes[0]) > deadzone ? gp.axes[0] : 0,
        leftY: abs(gp.axes[1]) > deadzone ? gp.axes[1] : 0,
        // Right stick for movement
        rightX: gp.axes.length > 2 && abs(gp.axes[2]) > deadzone ? gp.axes[2] : 0,
        rightY: gp.axes.length > 3 && abs(gp.axes[3]) > deadzone ? gp.axes[3] : 0,
        // Buttons
        fire: gp.buttons[0]?.pressed || gp.buttons[5]?.pressed || gp.buttons[7]?.pressed, // A, RB, or RT
        thrust: gp.buttons[1]?.pressed || gp.buttons[4]?.pressed || gp.buttons[6]?.pressed, // B, LB, or LT
        start: gp.buttons[9]?.pressed, // Start button
        // D-pad
        dpadUp: gp.buttons[12]?.pressed,
        dpadDown: gp.buttons[13]?.pressed,
        dpadLeft: gp.buttons[14]?.pressed,
        dpadRight: gp.buttons[15]?.pressed,
        // Extra buttons for menu
        buttonA: gp.buttons[0]?.pressed,
        buttonB: gp.buttons[1]?.pressed,
        buttonX: gp.buttons[2]?.pressed,
        buttonY: gp.buttons[3]?.pressed,
        start: gp.buttons[9]?.pressed,
        back: gp.buttons[8]?.pressed
    };
}

// Check if a gamepad button was just pressed (edge detection)
function gamepadButtonPressed(buttonName) {
    let gp = pollGamepad();
    if (!gp) return false;

    let currentState = gp[buttonName];
    let lastState = lastGamepadButtons[buttonName] || false;

    return currentState && !lastState;
}

// Update gamepad button states (call at end of frame)
function updateGamepadButtonStates() {
    let gp = pollGamepad();
    if (!gp) {
        lastGamepadButtons = {};
        return;
    }

    lastGamepadButtons = {
        dpadUp: gp.dpadUp,
        dpadDown: gp.dpadDown,
        dpadLeft: gp.dpadLeft,
        dpadRight: gp.dpadRight,
        buttonA: gp.buttonA,
        buttonB: gp.buttonB,
        buttonX: gp.buttonX,
        buttonY: gp.buttonY,
        start: gp.start,
        back: gp.back,
        fire: gp.fire,
        thrust: gp.thrust
    };
}

// Handle gamepad input for menu states
function handleGamepadMenu() {
    if (!gamepadConnected) return;

    if (gameState === 'MENU') {
        // D-pad up/down to select player
        if (gamepadButtonPressed('dpadUp')) {
            currentPlayer = (currentPlayer - 1 + 4) % 4;
            playBeep(330, 0.1);
        }
        if (gamepadButtonPressed('dpadDown')) {
            currentPlayer = (currentPlayer + 1) % 4;
            playBeep(330, 0.1);
        }
        // A or Start to begin game
        if (gamepadButtonPressed('buttonA') || gamepadButtonPressed('start')) {
            startGame();
        }
        // Y to edit name
        if (gamepadButtonPressed('buttonY')) {
            gameState = 'EDIT_NAME';
            nameChars = playerNames[currentPlayer].split('');
            while (nameChars.length < 3) nameChars.push('A');
            nameChars = nameChars.slice(0, 3);
            namePos = 0;
            playBeep(550, 0.1);
        }
        // X to reset (with confirmation)
        if (gamepadButtonPressed('buttonX')) {
            gameState = 'RESET_CONFIRM';
            playBeep(200, 0.1);
        }
    } else if (gameState === 'RESET_CONFIRM') {
        // A to confirm reset
        if (gamepadButtonPressed('buttonA')) {
            resetAllData();
            gameState = 'MENU';
        }
        // B to cancel
        if (gamepadButtonPressed('buttonB') || gamepadButtonPressed('back')) {
            gameState = 'MENU';
            playBeep(330, 0.1);
        }
    } else if (gameState === 'EDIT_NAME') {
        // D-pad left/right to move cursor
        if (gamepadButtonPressed('dpadLeft')) {
            namePos = max(0, namePos - 1);
            playBeep(220, 0.05);
        }
        if (gamepadButtonPressed('dpadRight')) {
            namePos = min(2, namePos + 1);
            playBeep(220, 0.05);
        }
        // D-pad up/down to change letter
        if (gamepadButtonPressed('dpadUp')) {
            let c = nameChars[namePos];
            if (c === '_') c = 'A';
            else if (c === 'Z') c = '0';
            else if (c === '9') c = 'A';
            else c = String.fromCharCode(c.charCodeAt(0) + 1);
            nameChars[namePos] = c;
            playBeep(440, 0.05);
        }
        if (gamepadButtonPressed('dpadDown')) {
            let c = nameChars[namePos];
            if (c === '_') c = 'Z';
            else if (c === 'A') c = '9';
            else if (c === '0') c = 'Z';
            else c = String.fromCharCode(c.charCodeAt(0) - 1);
            nameChars[namePos] = c;
            playBeep(440, 0.05);
        }
        // A to confirm
        if (gamepadButtonPressed('buttonA') || gamepadButtonPressed('start')) {
            let name = nameChars.join('');
            playerNames[currentPlayer] = name;
            localStorage.setItem('spaceChunkPlayerNames', JSON.stringify(playerNames));
            playBeep(660, 0.2);
            gameState = 'MENU';
        }
        // B to cancel
        if (gamepadButtonPressed('buttonB') || gamepadButtonPressed('back')) {
            gameState = 'MENU';
            playBeep(220, 0.1);
        }
    } else if (gameState === 'GAMEOVER') {
        // A or Start to continue
        if (gamepadButtonPressed('buttonA') || gamepadButtonPressed('start')) {
            if (highScores.length < 10 || score > highScores[highScores.length - 1].score) {
                gameState = 'ENTER_NAME';
                nameChars = ['A', 'A', 'A'];
                namePos = 0;
            } else {
                gameState = 'MENU';
            }
        }
    } else if (gameState === 'ENTER_NAME') {
        // D-pad left/right to move cursor
        if (gamepadButtonPressed('dpadLeft')) {
            namePos = max(0, namePos - 1);
            playBeep(220, 0.05);
        }
        if (gamepadButtonPressed('dpadRight')) {
            namePos = min(2, namePos + 1);
            playBeep(220, 0.05);
        }
        // D-pad up/down to change letter
        if (gamepadButtonPressed('dpadUp')) {
            let c = nameChars[namePos];
            if (c === '_') c = 'A';
            else if (c === 'Z') c = '0';
            else if (c === '9') c = 'A';
            else c = String.fromCharCode(c.charCodeAt(0) + 1);
            nameChars[namePos] = c;
            playBeep(440, 0.05);
        }
        if (gamepadButtonPressed('dpadDown')) {
            let c = nameChars[namePos];
            if (c === '_') c = 'Z';
            else if (c === 'A') c = '9';
            else if (c === '0') c = 'Z';
            else c = String.fromCharCode(c.charCodeAt(0) - 1);
            nameChars[namePos] = c;
            playBeep(440, 0.05);
        }
        // A to confirm
        if (gamepadButtonPressed('buttonA') || gamepadButtonPressed('start')) {
            let name = nameChars.join('');
            playerNames[currentPlayer] = name;
            localStorage.setItem('spaceChunkPlayerNames', JSON.stringify(playerNames));
            addHighScore(name, score);
            playBeep(660, 0.2);
            gameState = 'MENU';
        }
    }
}

// In-play asteroid (can be destroyed)
function createAsteroid(size) {
    size = size || random(30, 60);

    // 4 shades of gray only
    let grayShades = [
        { base: 70, name: 'dark' },      // Dark gray
        { base: 100, name: 'medium' },   // Medium gray
        { base: 130, name: 'light' },    // Light gray
        { base: 160, name: 'pale' }      // Pale gray
    ];
    let shade = random(grayShades);

    let a = {
        x: 0,
        y: 0,
        vx: 0,
        vy: 0,
        angle: random(TWO_PI),
        spin: random(-0.02, 0.02),
        size: size,
        heat: 0,
        // Rounder asteroid with subtle variation
        vertices: [],
        craters: [],
        grayBase: shade.base
    };

    // Generate rounder asteroid shape (less variation)
    let numVerts = floor(random(12, 18)); // More vertices = smoother
    for (let i = 0; i < numVerts; i++) {
        let angle = (TWO_PI / numVerts) * i;
        // Much less variation for rounder shape (0.85-1.0 instead of 0.6-1.0)
        let r = size * random(0.85, 1.0);
        a.vertices.push({
            angle: angle,
            r: r
        });
    }

    // Add craters
    let numCraters = floor(random(2, 4));
    for (let i = 0; i < numCraters; i++) {
        let craterAngle = random(TWO_PI);
        let craterDist = random(0.15, 0.5) * size;
        a.craters.push({
            x: cos(craterAngle) * craterDist,
            y: sin(craterAngle) * craterDist,
            size: random(size * 0.1, size * 0.2)
        });
    }

    // Bigger asteroids might have aliens hiding on them!
    a.aliens = [];
    if (size > 40 && random() < 0.6) {
        let numAliens = floor(random(1, 3));
        for (let i = 0; i < numAliens; i++) {
            // Aliens peek from the "back" edge (away from viewer)
            let peekAngle = random(PI * 0.6, PI * 1.4); // Back half
            a.aliens.push({
                angle: peekAngle,
                peekAmount: random(0.3, 0.6), // How much they peek over
                eyeSpread: random(0.15, 0.3),
                eyeSize: random(0.08, 0.14),
                skinColor: random([
                    { r: 80, g: 180, b: 80 },   // Green
                    { r: 100, g: 200, b: 150 }, // Teal
                    { r: 150, g: 100, b: 180 }, // Purple
                    { r: 80, g: 150, b: 200 },  // Blue
                    { r: 180, g: 180, b: 80 }   // Yellow-green
                ]),
                eyeColor: random([
                    { r: 255, g: 50, b: 50 },   // Red
                    { r: 255, g: 200, b: 0 },   // Yellow
                    { r: 255, g: 100, b: 200 }, // Pink
                    { r: 0, g: 255, b: 200 }    // Cyan
                ]),
                blinkTimer: random(100, 200),
                blinking: false,
                wobble: random(TWO_PI),
                wobbleSpeed: random(0.03, 0.08),
                hasAntennae: random() < 0.3 // 30% have antennae
            });
        }
    }

    // Spawn from edges
    let side = floor(random(4));
    if (side === 0) { // Top
        a.x = random(width);
        a.y = -a.size;
        a.vx = random(-0.8, 0.8);
        a.vy = random(0.5, 1.5);
    } else if (side === 1) { // Right
        a.x = width + a.size;
        a.y = random(height * 0.6);
        a.vx = random(-1.5, -0.5);
        a.vy = random(-0.3, 0.8);
    } else if (side === 2) { // Left
        a.x = -a.size;
        a.y = random(height * 0.6);
        a.vx = random(0.5, 1.5);
        a.vy = random(-0.3, 0.8);
    } else { // Diagonal from corners
        a.x = random() < 0.5 ? -a.size : width + a.size;
        a.y = random(height * 0.3);
        a.vx = a.x < 0 ? random(0.7, 1.3) : random(-1.3, -0.7);
        a.vy = random(0.4, 1.0);
    }

    return a;
}

// Draw realistic asteroid (rounder, 4 shades of gray)
function drawAsteroid(a) {
    let heatTint = a.heat * 180;
    let g = a.grayBase; // Base gray value

    // Main asteroid body - rounder shape using curveVertex
    stroke(g * 0.6 + heatTint, g * 0.6 + heatTint * 0.3, g * 0.6);
    strokeWeight(2);
    fill(g + heatTint, g + heatTint * 0.3, g);

    beginShape();
    // Use curveVertex for smoother shape
    let firstV = a.vertices[0];
    let lastV = a.vertices[a.vertices.length - 1];
    curveVertex(cos(lastV.angle) * lastV.r, sin(lastV.angle) * lastV.r);
    for (let v of a.vertices) {
        let px = cos(v.angle) * v.r;
        let py = sin(v.angle) * v.r;
        curveVertex(px, py);
    }
    curveVertex(cos(firstV.angle) * firstV.r, sin(firstV.angle) * firstV.r);
    curveVertex(cos(a.vertices[1].angle) * a.vertices[1].r, sin(a.vertices[1].angle) * a.vertices[1].r);
    endShape(CLOSE);

    // Surface highlight (lighter gray on one side)
    noStroke();
    fill(g + 40 + heatTint, g + 35 + heatTint * 0.3, g + 30, 80);
    arc(0, 0, a.size * 0.8, a.size * 0.8, -PI * 0.7, PI * 0.3);

    // Surface shadow (darker gray on other side)
    fill(g - 30 + heatTint * 0.5, g - 30 + heatTint * 0.2, g - 30, 60);
    arc(0, 0, a.size * 0.9, a.size * 0.9, PI * 0.3, PI * 1.3);

    // Craters (darker gray circles)
    for (let crater of a.craters) {
        // Crater interior (darker)
        fill(g - 25 + heatTint * 0.4, g - 25 + heatTint * 0.2, g - 25, 200);
        ellipse(crater.x, crater.y, crater.size, crater.size);

        // Crater rim highlight (lighter)
        noFill();
        stroke(g + 25 + heatTint, g + 20 + heatTint * 0.3, g + 15, 120);
        strokeWeight(1);
        arc(crater.x, crater.y, crater.size, crater.size, -PI * 0.8, PI * 0.2);
    }

    // Draw aliens peeking over the edge!
    if (a.aliens && a.aliens.length > 0) {
        for (let alien of a.aliens) {
            // Update alien animation
            alien.wobble += alien.wobbleSpeed;
            alien.blinkTimer--;
            if (alien.blinkTimer <= 0) {
                alien.blinking = !alien.blinking;
                alien.blinkTimer = alien.blinking ? random(5, 15) : random(80, 200);
            }

            let wobbleOffset = sin(alien.wobble) * 0.05;
            let peekAngle = alien.angle + wobbleOffset;

            // Position at edge of asteroid
            let edgeX = cos(peekAngle) * a.size * 0.85;
            let edgeY = sin(peekAngle) * a.size * 0.85;

            // Alien head size based on asteroid
            let headSize = a.size * alien.peekAmount * 0.5;

            push();
            translate(edgeX, edgeY);
            // Rotate so alien faces outward from asteroid center
            rotate(peekAngle + HALF_PI);

            // Alien head (peeking up from behind the asteroid edge)
            // Draw as semi-circle since they're hiding behind the rock
            let sc = alien.skinColor;
            noStroke();

            // Fingers gripping the edge (drawn first, behind head)
            fill(sc.r * 0.9, sc.g * 0.9, sc.b * 0.9);
            for (let f = -2; f <= 2; f++) {
                ellipse(f * headSize * 0.12, headSize * 0.35, headSize * 0.1, headSize * 0.15);
            }

            // Head shadow/depth
            fill(sc.r * 0.6, sc.g * 0.6, sc.b * 0.6);
            arc(0, headSize * 0.1, headSize * 1.1, headSize * 1.1, PI, TWO_PI);

            // Main head (round dome peeking up)
            fill(sc.r, sc.g, sc.b);
            arc(0, 0, headSize, headSize * 0.9, PI, TWO_PI);

            // Head highlight
            fill(sc.r + 40, sc.g + 40, sc.b + 40, 100);
            arc(-headSize * 0.15, -headSize * 0.1, headSize * 0.4, headSize * 0.3, PI, TWO_PI);

            // Big alien eyes (if not blinking)
            if (!alien.blinking) {
                let ec = alien.eyeColor;
                let eyeX = headSize * alien.eyeSpread;
                let eyeW = headSize * alien.eyeSize * 1.5;
                let eyeH = headSize * alien.eyeSize * 2;

                // Left eye
                // Eye glow
                fill(ec.r, ec.g, ec.b, 50);
                ellipse(-eyeX, -headSize * 0.15, eyeW * 1.5, eyeH * 1.3);
                // Eye white/outer
                fill(255, 255, 255);
                ellipse(-eyeX, -headSize * 0.15, eyeW, eyeH);
                // Iris
                fill(ec.r, ec.g, ec.b);
                ellipse(-eyeX, -headSize * 0.12, eyeW * 0.7, eyeH * 0.7);
                // Pupil
                fill(0);
                ellipse(-eyeX, -headSize * 0.1, eyeW * 0.35, eyeH * 0.4);
                // Eye shine
                fill(255, 255, 255, 200);
                ellipse(-eyeX - eyeW * 0.15, -headSize * 0.2, eyeW * 0.2, eyeW * 0.2);

                // Right eye
                fill(ec.r, ec.g, ec.b, 50);
                ellipse(eyeX, -headSize * 0.15, eyeW * 1.5, eyeH * 1.3);
                fill(255, 255, 255);
                ellipse(eyeX, -headSize * 0.15, eyeW, eyeH);
                fill(ec.r, ec.g, ec.b);
                ellipse(eyeX, -headSize * 0.12, eyeW * 0.7, eyeH * 0.7);
                fill(0);
                ellipse(eyeX, -headSize * 0.1, eyeW * 0.35, eyeH * 0.4);
                fill(255, 255, 255, 200);
                ellipse(eyeX - eyeW * 0.15, -headSize * 0.2, eyeW * 0.2, eyeW * 0.2);
            } else {
                // Closed eyes (just lines)
                stroke(sc.r * 0.5, sc.g * 0.5, sc.b * 0.5);
                strokeWeight(2);
                let eyeX = headSize * alien.eyeSpread;
                line(-eyeX - headSize * 0.08, -headSize * 0.15, -eyeX + headSize * 0.08, -headSize * 0.15);
                line(eyeX - headSize * 0.08, -headSize * 0.15, eyeX + headSize * 0.08, -headSize * 0.15);
                noStroke();
            }

            // Little antennae on some aliens
            if (alien.hasAntennae) {
                let ec = alien.eyeColor;
                stroke(sc.r, sc.g, sc.b);
                strokeWeight(1.5);
                // Wiggly antennae
                let wiggle = sin(alien.wobble * 2) * 0.1;
                line(-headSize * 0.2, -headSize * 0.35, -headSize * 0.3 + wiggle * headSize, -headSize * 0.55);
                line(headSize * 0.2, -headSize * 0.35, headSize * 0.3 - wiggle * headSize, -headSize * 0.55);
                // Glowing tips
                fill(ec.r, ec.g, ec.b);
                noStroke();
                ellipse(-headSize * 0.3 + wiggle * headSize, -headSize * 0.55, headSize * 0.12, headSize * 0.12);
                ellipse(headSize * 0.3 - wiggle * headSize, -headSize * 0.55, headSize * 0.12, headSize * 0.12);
                // Glow effect
                fill(ec.r, ec.g, ec.b, 50);
                ellipse(-headSize * 0.3 + wiggle * headSize, -headSize * 0.55, headSize * 0.25, headSize * 0.25);
                ellipse(headSize * 0.3 - wiggle * headSize, -headSize * 0.55, headSize * 0.25, headSize * 0.25);
            }

            pop();
        }
    }
}

// Background asteroid (decorative)
function createBgAsteroid() {
    let size = random(8, 25);
    return {
        x: random(width),
        y: random(height * 0.7),
        size: size,
        speed: random(0.2, 0.6),
        rotation: random(TWO_PI),
        rotSpeed: random(-0.01, 0.01),
        alpha: random(30, 60),
        vertices: generateBgAsteroidVerts(size)
    };
}

function generateBgAsteroidVerts(size) {
    let verts = [];
    let numVerts = floor(random(6, 10));
    for (let i = 0; i < numVerts; i++) {
        let angle = (TWO_PI / numVerts) * i;
        let r = size * random(0.6, 1);
        verts.push({ x: cos(angle) * r, y: sin(angle) * r });
    }
    return verts;
}

// Background planet (decorative)
function createBgPlanet() {
    let size = random(30, 80);
    let hue = random([
        { r: 180, g: 120, b: 100 }, // Mars-like
        { r: 200, g: 180, b: 150 }, // Venus-like
        { r: 100, g: 130, b: 180 }, // Neptune-like
        { r: 220, g: 200, b: 170 }, // Saturn-like
        { r: 150, g: 100, b: 80 }   // Brown dwarf
    ]);
    return {
        x: random(width),
        y: random(height * 0.5),
        size: size,
        speed: random(0.1, 0.3),
        color: hue,
        alpha: random(25, 50),
        hasRing: random() < 0.3,
        ringAngle: random(-0.3, 0.3)
    };
}

// Audio functions
function initAudio() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
}

function playBeep(freq, duration, type = 'square') {
    if (!audioCtx || !beepEnabled) return;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.type = type;
    osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
    gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + duration);
    osc.start();
    osc.stop(audioCtx.currentTime + duration);
}

function playTorchSound() {
    if (!audioCtx || !beepEnabled) return;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(80 + random(40), audioCtx.currentTime);
    gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.05);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.05);
}

function playThrusterSound() {
    if (!audioCtx || !beepEnabled) return;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(60 + random(20), audioCtx.currentTime);
    gain.gain.setValueAtTime(0.06, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.08);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.08);
}

function spawnThrusterParticle(angle, intensity) {
    let spread = random(-0.4, 0.4);
    let dist = random(15, 25);
    let speed = random(2, 4) * intensity;
    thrusterParticles.push({
        x: satellite.x + cos(angle) * dist,
        y: satellite.y + sin(angle) * dist,
        vx: cos(angle + spread) * speed,
        vy: sin(angle + spread) * speed,
        life: 15,
        color: random() < 0.5 ? color(255, 150, 50) : color(255, 255, 100)
    });
}

function playMeltSound() {
    playBeep(200, 0.3, 'sawtooth');
    setTimeout(() => playBeep(150, 0.2, 'sawtooth'), 100);
}

function playExplosionSound() {
    if (!audioCtx || !beepEnabled) return;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(200, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(30, audioCtx.currentTime + 0.4);
    gain.gain.setValueAtTime(0.25, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.4);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.4);
}

// High score functions
function loadHighScores() {
    const saved = localStorage.getItem('spaceChunkHighScores');
    if (saved) {
        highScores = JSON.parse(saved);
    } else {
        highScores = [
            { name: 'ACE', score: 5000 },
            { name: 'BOB', score: 3000 },
            { name: 'CAT', score: 1000 },
            { name: 'DAN', score: 500 },
            { name: 'EVE', score: 100 }
        ];
    }

    // Also load player names
    const savedNames = localStorage.getItem('spaceChunkPlayerNames');
    if (savedNames) {
        playerNames = JSON.parse(savedNames);
    }
}

function saveHighScores() {
    localStorage.setItem('spaceChunkHighScores', JSON.stringify(highScores));
}

function addHighScore(name, newScore) {
    highScores.push({ name: name, score: newScore });
    highScores.sort((a, b) => b.score - a.score);
    highScores = highScores.slice(0, 10);
    saveHighScores();
}

function resetAllData() {
    // Reset high scores to defaults
    highScores = [
        { name: 'ACE', score: 5000 },
        { name: 'BOB', score: 3000 },
        { name: 'CAT', score: 1000 },
        { name: 'DAN', score: 500 },
        { name: 'EVE', score: 100 }
    ];
    saveHighScores();

    // Reset player names to defaults
    playerNames = ['AAA', 'BBB', 'CCC', 'DDD'];
    localStorage.setItem('spaceChunkPlayerNames', JSON.stringify(playerNames));

    // Reset current player
    currentPlayer = 0;

    // Play confirmation sound
    playBeep(200, 0.1);
    setTimeout(() => playBeep(300, 0.1), 100);
    setTimeout(() => playBeep(400, 0.2), 200);
}

// Junk generation
// Junk types: 'booster', 'sputnik', 'cubesat'
function createJunk() {
    let types = ['booster', 'sputnik', 'cubesat'];
    let type = types[floor(random(types.length))];

    let size = type === 'booster' ? random(35, 50) : random(20, 30);

    // Determine if this piece is broken (40% chance for boosters)
    let isBroken = type === 'booster' && random() < 0.4;
    let breakType = isBroken ? floor(random(4)) : 0; // 0=intact, 1=bent, 2=missing fin, 3=cracked, 4=torn

    let j = {
        x: 0,
        y: 0,
        vx: 0,
        vy: 0,
        angle: random(TWO_PI),
        spin: random(-0.02, 0.02),
        type: type,
        size: size,
        heat: 0,
        twitch: 0,
        // Type-specific properties
        panelAngle: 0, // For cubesat flapping panels
        panelSpeed: random(0.05, 0.15),
        antennaWobble: 0, // For sputnik
        // Booster damage properties
        isBroken: isBroken,
        breakType: breakType,
        // Booster detail properties
        hasNozzleGlow: random() < 0.2, // Some boosters still have residual glow
        paintWear: random(0.3, 1), // Paint condition
        rustPatches: floor(random(0, 4)), // Number of rust spots
        serialNum: floor(random(100, 999)) // Serial number on side
    };

    // Spawn from edges
    let side = floor(random(4));
    if (side === 0) { // Top
        j.x = random(width);
        j.y = -j.size;
        j.vx = random(-0.5, 0.5);
        j.vy = random(0.3, 1);
    } else if (side === 1) { // Right
        j.x = width + j.size;
        j.y = random(height * 0.7);
        j.vx = random(-1, -0.3);
        j.vy = random(-0.3, 0.5);
    } else if (side === 2) { // Left
        j.x = -j.size;
        j.y = random(height * 0.7);
        j.vx = random(0.3, 1);
        j.vy = random(-0.3, 0.5);
    } else { // Diagonal from corners
        j.x = random() < 0.5 ? -j.size : width + j.size;
        j.y = random(height * 0.3);
        j.vx = j.x < 0 ? random(0.5, 1) : random(-1, -0.5);
        j.vy = random(0.2, 0.6);
    }

    return j;
}

// Draw Soviet booster - detailed with possible damage
function drawBooster(j) {
    let s = j.size;
    let heatTint = j.heat * 200;
    let wear = j.paintWear || 1;

    // Base colors with wear
    let bodyR = (100 + heatTint) * wear + 60 * (1 - wear);
    let bodyG = (95 + heatTint * 0.3) * wear + 55 * (1 - wear);
    let bodyB = 85 * wear + 50 * (1 - wear);

    // Bent body for broken type 1
    let bendAngle = j.isBroken && j.breakType === 1 ? 0.15 : 0;

    // Main cylinder body
    stroke(bodyR * 0.7, bodyG * 0.7, bodyB * 0.8);
    strokeWeight(2);
    fill(bodyR, bodyG, bodyB);

    // Body (elongated) - with possible bend
    if (bendAngle > 0) {
        // Bent in the middle
        push();
        beginShape();
        vertex(-s * 0.15, -s * 0.8);
        vertex(s * 0.15, -s * 0.8);
        vertex(s * 0.15, -s * 0.1);
        vertex(-s * 0.15, -s * 0.1);
        endShape(CLOSE);
        pop();
        push();
        translate(0, -s * 0.1);
        rotate(bendAngle);
        translate(0, s * 0.1);
        beginShape();
        vertex(-s * 0.15, -s * 0.1);
        vertex(s * 0.15, -s * 0.1);
        vertex(s * 0.15, s * 0.5);
        vertex(-s * 0.15, s * 0.5);
        endShape(CLOSE);
        // Crack line at bend
        stroke(40, 35, 30);
        strokeWeight(2);
        line(-s * 0.18, -s * 0.1, s * 0.18, -s * 0.08);
        pop();
    } else {
        beginShape();
        vertex(-s * 0.15, -s * 0.8);
        vertex(s * 0.15, -s * 0.8);
        vertex(s * 0.15, s * 0.5);
        vertex(-s * 0.15, s * 0.5);
        endShape(CLOSE);
    }

    // Cylindrical shading (highlight on left, shadow on right)
    noStroke();
    fill(255, 255, 255, 30 * wear);
    beginShape();
    vertex(-s * 0.15, -s * 0.8);
    vertex(-s * 0.05, -s * 0.8);
    vertex(-s * 0.05, s * 0.5);
    vertex(-s * 0.15, s * 0.5);
    endShape(CLOSE);
    fill(0, 0, 0, 40);
    beginShape();
    vertex(s * 0.05, -s * 0.8);
    vertex(s * 0.15, -s * 0.8);
    vertex(s * 0.15, s * 0.5);
    vertex(s * 0.05, s * 0.5);
    endShape(CLOSE);

    // Nose cone (possibly cracked for breakType 3)
    stroke(bodyR * 0.8, bodyG * 0.8, bodyB * 0.9);
    strokeWeight(2);
    fill(bodyR + 20, bodyG + 15, bodyB + 15);
    beginShape();
    vertex(-s * 0.15, -s * 0.8);
    vertex(0, -s);
    vertex(s * 0.15, -s * 0.8);
    endShape(CLOSE);

    // Crack in nose cone
    if (j.isBroken && j.breakType === 3) {
        stroke(30, 25, 20);
        strokeWeight(1);
        line(0, -s * 0.95, -s * 0.08, -s * 0.82);
        line(-s * 0.08, -s * 0.82, -s * 0.02, -s * 0.85);
    }

    // Engine bell at bottom with detail
    stroke(50, 50, 45);
    strokeWeight(2);
    fill(60 + heatTint * 0.5, 60 + heatTint * 0.2, 55);
    beginShape();
    vertex(-s * 0.15, s * 0.5);
    vertex(-s * 0.25, s * 0.8);
    vertex(s * 0.25, s * 0.8);
    vertex(s * 0.15, s * 0.5);
    endShape(CLOSE);

    // Engine bell interior
    fill(30 + heatTint * 0.3, 30 + heatTint * 0.1, 25);
    ellipse(0, s * 0.78, s * 0.35, s * 0.12);

    // Residual nozzle glow (some boosters)
    if (j.hasNozzleGlow && !j.heat) {
        fill(255, 100, 50, 40);
        ellipse(0, s * 0.8, s * 0.2, s * 0.1);
        fill(255, 150, 100, 20);
        ellipse(0, s * 0.85, s * 0.15, s * 0.08);
    }

    // Fins - check for missing fin (breakType 2)
    fill(90 + heatTint, 85 + heatTint * 0.3, 75);
    stroke(70, 65, 60);
    strokeWeight(1);

    // Left fin (always present)
    beginShape();
    vertex(-s * 0.15, s * 0.3);
    vertex(-s * 0.4, s * 0.7);
    vertex(-s * 0.35, s * 0.75);
    vertex(-s * 0.15, s * 0.5);
    endShape(CLOSE);

    // Right fin (missing if breakType 2)
    if (!(j.isBroken && j.breakType === 2)) {
        beginShape();
        vertex(s * 0.15, s * 0.3);
        vertex(s * 0.4, s * 0.7);
        vertex(s * 0.35, s * 0.75);
        vertex(s * 0.15, s * 0.5);
        endShape(CLOSE);
    } else {
        // Broken fin stub
        fill(70, 65, 60);
        beginShape();
        vertex(s * 0.15, s * 0.35);
        vertex(s * 0.22, s * 0.45);
        vertex(s * 0.18, s * 0.48);
        vertex(s * 0.15, s * 0.42);
        endShape(CLOSE);
        // Jagged edge
        stroke(50, 45, 40);
        strokeWeight(1);
        line(s * 0.22, s * 0.45, s * 0.20, s * 0.47);
    }

    // Red star on body (faded based on wear)
    noStroke();
    fill(150 + heatTint * 0.5, 40, 40, 180 * wear);
    push();
    translate(0, -s * 0.2);
    drawStar(0, 0, s * 0.06, s * 0.12, 5);
    pop();

    // CCCP text or serial number
    fill(180 * wear, 30, 30, 150 * wear);
    textSize(s * 0.08);
    textAlign(CENTER, CENTER);
    text(j.serialNum || '001', 0, s * 0.15);

    // Panel lines on body
    stroke(70 + heatTint, 70 + heatTint * 0.2, 60);
    strokeWeight(1);
    line(-s * 0.15, -s * 0.4, s * 0.15, -s * 0.4);
    line(-s * 0.15, 0, s * 0.15, 0);
    line(-s * 0.15, s * 0.3, s * 0.15, s * 0.3);

    // Rivets along panel lines
    fill(60, 55, 50);
    noStroke();
    for (let rx = -s * 0.12; rx <= s * 0.12; rx += s * 0.08) {
        ellipse(rx, -s * 0.4, 2, 2);
        ellipse(rx, 0, 2, 2);
    }

    // Rust patches
    fill(100, 50, 30, 80);
    noStroke();
    for (let i = 0; i < (j.rustPatches || 0); i++) {
        let rx = random(-s * 0.1, s * 0.1);
        let ry = random(-s * 0.6, s * 0.4);
        ellipse(rx, ry, random(3, 8), random(2, 5));
    }

    // Torn/ripped section for breakType 4
    if (j.isBroken && j.breakType === 0) {
        // Torn metal at bottom
        stroke(40, 35, 30);
        strokeWeight(1);
        fill(50, 45, 40);
        beginShape();
        vertex(-s * 0.15, s * 0.45);
        vertex(-s * 0.12, s * 0.52);
        vertex(-s * 0.08, s * 0.48);
        vertex(-s * 0.03, s * 0.55);
        vertex(s * 0.02, s * 0.47);
        vertex(s * 0.08, s * 0.53);
        vertex(s * 0.12, s * 0.46);
        vertex(s * 0.15, s * 0.5);
        vertex(s * 0.15, s * 0.45);
        endShape(CLOSE);
    }
}

// Draw Sputnik - sphere with 4 antennas
function drawSputnik(j) {
    let s = j.size;
    let heatTint = j.heat * 200;
    let wobble = sin(j.antennaWobble) * 0.1;

    // Main sphere body - silvery white metal
    stroke(180 + heatTint * 0.3, 180 + heatTint * 0.2, 190);
    strokeWeight(2);
    fill(220 + heatTint * 0.2, 220 + heatTint * 0.15, 230);
    ellipse(0, 0, s * 0.7, s * 0.7);

    // Bright highlight (polished metal reflection)
    noStroke();
    fill(255, 255, 255, 180);
    ellipse(-s * 0.12, -s * 0.12, s * 0.25, s * 0.2);
    // Secondary softer highlight
    fill(240, 240, 250, 100);
    ellipse(-s * 0.05, -s * 0.18, s * 0.15, s * 0.1);

    // Four antennas - silvery metal
    stroke(160 + heatTint * 0.3, 160 + heatTint * 0.2, 170);
    strokeWeight(2);

    // Antenna 1 (back-left)
    let a1 = -PI * 0.75 + wobble;
    line(cos(a1) * s * 0.3, sin(a1) * s * 0.3, cos(a1) * s, sin(a1) * s);

    // Antenna 2 (back-right)
    let a2 = -PI * 0.25 - wobble;
    line(cos(a2) * s * 0.3, sin(a2) * s * 0.3, cos(a2) * s, sin(a2) * s);

    // Antenna 3 (front-left)
    let a3 = PI * 0.75 - wobble;
    line(cos(a3) * s * 0.3, sin(a3) * s * 0.3, cos(a3) * s * 0.9, sin(a3) * s * 0.9);

    // Antenna 4 (front-right)
    let a4 = PI * 0.25 + wobble;
    line(cos(a4) * s * 0.3, sin(a4) * s * 0.3, cos(a4) * s * 0.9, sin(a4) * s * 0.9);

    // Seam line on sphere (subtle dark line)
    stroke(150 + heatTint * 0.2, 150 + heatTint * 0.15, 160);
    strokeWeight(1);
    noFill();
    arc(0, 0, s * 0.6, s * 0.6, -PI * 0.4, PI * 0.4);
}

// Draw CubeSat - boxy with flapping solar panels and tangled wires
function drawCubesat(j) {
    let s = j.size;
    let heatTint = j.heat * 200;
    let panelFlap = sin(j.panelAngle) * 0.3;

    // Tangled wires behind
    stroke(60 + heatTint, 60 + heatTint * 0.2, 55);
    strokeWeight(1);
    noFill();
    // Wire 1
    beginShape();
    vertex(-s * 0.3, -s * 0.2);
    curveVertex(-s * 0.3, -s * 0.2);
    curveVertex(-s * 0.5, 0);
    curveVertex(-s * 0.4, s * 0.3);
    curveVertex(-s * 0.6, s * 0.4);
    curveVertex(-s * 0.6, s * 0.4);
    endShape();
    // Wire 2
    beginShape();
    vertex(s * 0.2, -s * 0.3);
    curveVertex(s * 0.2, -s * 0.3);
    curveVertex(s * 0.4, -s * 0.1);
    curveVertex(s * 0.3, s * 0.2);
    curveVertex(s * 0.5, s * 0.3);
    curveVertex(s * 0.5, s * 0.3);
    endShape();

    // Main cube body
    stroke(70 + heatTint, 70 + heatTint * 0.2, 65);
    strokeWeight(2);
    fill(90 + heatTint, 90 + heatTint * 0.3, 85);
    rect(-s * 0.25, -s * 0.25, s * 0.5, s * 0.5);

    // Inner detail lines
    stroke(60 + heatTint, 60 + heatTint * 0.2, 55);
    strokeWeight(1);
    line(-s * 0.15, -s * 0.25, -s * 0.15, s * 0.25);
    line(s * 0.1, -s * 0.25, s * 0.1, s * 0.25);

    // Left solar panel (flapping)
    push();
    translate(-s * 0.25, 0);
    rotate(-HALF_PI + panelFlap);
    stroke(50 + heatTint, 50 + heatTint * 0.2, 80);
    strokeWeight(1);
    fill(30 + heatTint * 0.5, 30 + heatTint * 0.2, 60);
    rect(0, -s * 0.15, s * 0.5, s * 0.3);
    // Panel grid lines
    stroke(40 + heatTint * 0.5, 40 + heatTint * 0.2, 70);
    for (let i = 1; i < 4; i++) {
        line(i * s * 0.125, -s * 0.15, i * s * 0.125, s * 0.15);
    }
    line(0, 0, s * 0.5, 0);
    pop();

    // Right solar panel (flapping opposite)
    push();
    translate(s * 0.25, 0);
    rotate(HALF_PI - panelFlap);
    stroke(50 + heatTint, 50 + heatTint * 0.2, 80);
    strokeWeight(1);
    fill(30 + heatTint * 0.5, 30 + heatTint * 0.2, 60);
    rect(0, -s * 0.15, s * 0.5, s * 0.3);
    // Panel grid lines
    stroke(40 + heatTint * 0.5, 40 + heatTint * 0.2, 70);
    for (let i = 1; i < 4; i++) {
        line(i * s * 0.125, -s * 0.15, i * s * 0.125, s * 0.15);
    }
    line(0, 0, s * 0.5, 0);
    pop();

    // Small antenna on top
    stroke(80 + heatTint, 80 + heatTint * 0.2, 75);
    strokeWeight(1);
    line(0, -s * 0.25, 0, -s * 0.45);
    fill(100 + heatTint, 95 + heatTint * 0.2, 90);
    noStroke();
    ellipse(0, -s * 0.45, s * 0.08, s * 0.08);
}

// Clump (melted junk falling to Earth)
function createClump(x, y, totalSize) {
    return {
        x: x,
        y: y,
        vy: 2,
        size: totalSize * 0.6,
        heat: 1,
        trail: []
    };
}

function draw() {
    background(0);

    // Handle gamepad menu navigation
    handleGamepadMenu();

    // Draw starfield
    drawStars();

    // Draw ISS passing through
    drawISS();

    // Draw background asteroids and planets (decorative, not in play)
    updateAndDrawBackground();

    // Draw Earth
    drawEarth();

    if (gameState === 'MENU') {
        drawMenu();
    } else if (gameState === 'PLAYING') {
        updateGame();
        drawGame();
    } else if (gameState === 'GAMEOVER') {
        drawGame();
        drawGameOver();
    } else if (gameState === 'ENTER_NAME') {
        drawGame();
        drawEnterName();
    } else if (gameState === 'EDIT_NAME') {
        drawMenu();
        drawEditName();
    } else if (gameState === 'RESET_CONFIRM') {
        drawMenu();
        drawResetConfirm();
    }

    // Update gamepad button states at end of frame (for edge detection)
    updateGamepadButtonStates();
}

// Initialize Milky Way galaxy background
function initMilkyWay() {
    stars = [];
    milkyWayStars = [];
    nebulaClouds = [];
    dustLanes = [];

    // Milky Way band runs diagonally across screen (like night sky photos)
    let bandAngle = -0.3; // Slight diagonal
    let bandCenterY = height * 0.35; // Upper portion of screen
    let bandWidth = height * 0.4;

    // Sparse background stars (outside the band)
    for (let i = 0; i < 150; i++) {
        stars.push({
            x: random(width),
            y: random(height * 0.85),
            size: random(0.5, 2),
            twinkle: random(TWO_PI),
            twinkleSpeed: random(0.02, 0.08),
            color: random() < 0.1 ?
                { r: 255, g: random(200, 255), b: random(180, 220) } : // Warm stars
                { r: random(200, 255), g: random(220, 255), b: 255 }   // Cool stars
        });
    }

    // Dense Milky Way band stars
    for (let i = 0; i < 800; i++) {
        // Gaussian-ish distribution for band density
        let bandOffset = (random() + random() + random()) / 3 - 0.5;
        let x = random(width);
        let y = bandCenterY + bandOffset * bandWidth + x * sin(bandAngle) * 0.15;

        // More stars near center of band
        let density = 1 - abs(bandOffset) * 1.5;
        if (random() > density * 0.7) continue;

        milkyWayStars.push({
            x: x,
            y: constrain(y, 0, height * 0.8),
            size: random(0.3, 1.5) * (random() < 0.05 ? 2 : 1), // Occasional bright stars
            twinkle: random(TWO_PI),
            twinkleSpeed: random(0.01, 0.05),
            brightness: random(0.3, 1),
            // Star colors - mix of blue, white, yellow, orange, red
            color: random([
                { r: 255, g: 255, b: 255 },       // White
                { r: 200, g: 220, b: 255 },       // Blue-white
                { r: 255, g: 240, b: 200 },       // Yellow-white
                { r: 255, g: 200, b: 150 },       // Orange
                { r: 255, g: 150, b: 150 },       // Red giant
                { r: 180, g: 200, b: 255 }        // Blue
            ])
        });
    }

    // Nebula clouds (colorful patches in the Milky Way)
    for (let i = 0; i < 12; i++) {
        let x = random(width);
        let y = bandCenterY + random(-bandWidth * 0.4, bandWidth * 0.4) + x * sin(bandAngle) * 0.15;
        nebulaClouds.push({
            x: x,
            y: constrain(y, 20, height * 0.7),
            size: random(80, 200),
            color: random([
                { r: 100, g: 50, b: 80 },    // Magenta/pink nebula
                { r: 50, g: 80, b: 120 },    // Blue nebula
                { r: 80, g: 100, b: 60 },    // Green tint
                { r: 120, g: 80, b: 60 },    // Orange/brown
                { r: 60, g: 60, b: 100 }     // Purple
            ]),
            alpha: random(8, 20),
            drift: random(-0.02, 0.02)
        });
    }

    // Dark dust lanes (silhouettes against the bright band)
    for (let i = 0; i < 6; i++) {
        let x = random(width);
        let y = bandCenterY + random(-bandWidth * 0.2, bandWidth * 0.2) + x * sin(bandAngle) * 0.15;
        dustLanes.push({
            x: x,
            y: constrain(y, 30, height * 0.6),
            width: random(60, 150),
            height: random(20, 50),
            angle: random(-0.5, 0.5),
            alpha: random(15, 35)
        });
    }
}

function drawStars() {
    noStroke();

    // Draw nebula clouds first (behind everything)
    for (let n of nebulaClouds) {
        n.x += n.drift;
        if (n.x < -n.size) n.x = width + n.size;
        if (n.x > width + n.size) n.x = -n.size;

        // Multiple layered ellipses for soft cloud effect
        for (let layer = 3; layer >= 0; layer--) {
            let size = n.size * (1 + layer * 0.3);
            let alpha = n.alpha * (1 - layer * 0.2);
            fill(n.color.r, n.color.g, n.color.b, alpha);
            ellipse(n.x, n.y, size, size * 0.6);
        }
    }

    // Draw dark dust lanes
    fill(0, 0, 0);
    for (let d of dustLanes) {
        push();
        translate(d.x, d.y);
        rotate(d.angle);
        fill(0, 0, 0, d.alpha);
        // Irregular dust lane shape
        beginShape();
        for (let a = 0; a < TWO_PI; a += 0.3) {
            let r = (d.width / 2) * (0.7 + 0.3 * noise(a * 2 + d.x * 0.01));
            let ry = (d.height / 2) * (0.7 + 0.3 * noise(a * 2 + d.y * 0.01));
            vertex(cos(a) * r, sin(a) * ry);
        }
        endShape(CLOSE);
        pop();
    }

    // Draw Milky Way band stars (dense field)
    for (let s of milkyWayStars) {
        s.twinkle += s.twinkleSpeed;
        let twinkleFactor = 0.6 + 0.4 * sin(s.twinkle);
        let bright = s.brightness * twinkleFactor;

        fill(s.color.r * bright, s.color.g * bright, s.color.b * bright);

        if (s.size > 1.2) {
            // Larger stars get a soft glow
            fill(s.color.r * bright, s.color.g * bright, s.color.b * bright, 100);
            ellipse(s.x, s.y, s.size * 3, s.size * 3);
            fill(s.color.r * bright, s.color.g * bright, s.color.b * bright);
        }
        ellipse(s.x, s.y, s.size, s.size);
    }

    // Draw sparse background stars (outside band)
    for (let s of stars) {
        s.twinkle += s.twinkleSpeed;
        let bright = 0.5 + 0.5 * sin(s.twinkle);
        fill(s.color.r * bright, s.color.g * bright, s.color.b * bright);
        ellipse(s.x, s.y, s.size, s.size);
    }

    // Occasional shooting star / meteor
    if (random() < 0.002) {
        drawShootingStar();
    }
}

function drawShootingStar() {
    let x = random(width);
    let y = random(height * 0.5);
    let angle = random(PI * 0.1, PI * 0.4);
    let len = random(30, 80);

    // Meteor streak
    for (let i = 0; i < len; i++) {
        let alpha = 255 * (1 - i / len);
        let thickness = 2 * (1 - i / len);
        stroke(255, 255, 255, alpha);
        strokeWeight(thickness);
        point(x + cos(angle) * i, y + sin(angle) * i);
    }
    noStroke();
}

// Create ISS
function createISS() {
    return {
        x: -200,
        y: random(height * 0.15, height * 0.35),
        speed: random(0.8, 1.2),
        angle: random(-0.05, 0.05),
        scale: random(0.8, 1.2)
    };
}

// Draw detailed ISS
function drawISS() {
    if (!iss) {
        // Spawn ISS occasionally
        if (random() < 0.001) {
            iss = createISS();
        }
        return;
    }

    // Update position
    iss.x += iss.speed;
    iss.y += sin(frameCount * 0.02) * 0.1; // Slight orbital wobble

    // Remove when off screen
    if (iss.x > width + 200) {
        iss = null;
        return;
    }

    push();
    translate(iss.x, iss.y);
    rotate(iss.angle);
    scale(iss.scale);

    // ISS is bright white/silver
    let brightness = 220 + sin(frameCount * 0.1) * 20;

    // Main truss (horizontal backbone)
    stroke(brightness, brightness, brightness * 0.95);
    strokeWeight(3);
    line(-60, 0, 60, 0);

    // Central modules (Destiny, Unity, etc.)
    noStroke();
    // Main module
    fill(brightness, brightness, brightness * 0.9);
    rect(-12, -6, 24, 12, 2);
    // Node module
    fill(brightness * 0.95, brightness * 0.95, brightness * 0.9);
    rect(-25, -5, 13, 10, 2);
    rect(12, -5, 13, 10, 2);

    // Russian segment (left side)
    fill(brightness * 0.9, brightness * 0.85, brightness * 0.8);
    rect(-45, -4, 20, 8, 1);
    // Zarya module
    fill(brightness * 0.85, brightness * 0.8, brightness * 0.75);
    ellipse(-55, 0, 12, 8);

    // Solar panels - 4 pairs (the distinctive feature)
    fill(40, 50, 120); // Dark blue solar cells
    stroke(brightness * 0.7, brightness * 0.7, brightness * 0.6);
    strokeWeight(1);

    // Left panels (2 pairs)
    for (let i = 0; i < 2; i++) {
        let px = -35 - i * 20;
        // Top panel
        push();
        translate(px, -4);
        rotate(-0.1);
        rect(-2, -25, 8, 22);
        // Panel lines (cells)
        stroke(60, 70, 140);
        for (let j = 0; j < 5; j++) {
            line(-1, -23 + j * 4, 5, -23 + j * 4);
        }
        pop();
        // Bottom panel
        push();
        translate(px, 4);
        rotate(0.1);
        fill(40, 50, 120);
        stroke(brightness * 0.7, brightness * 0.7, brightness * 0.6);
        rect(-2, 3, 8, 22);
        stroke(60, 70, 140);
        for (let j = 0; j < 5; j++) {
            line(-1, 5 + j * 4, 5, 5 + j * 4);
        }
        pop();
    }

    // Right panels (2 pairs)
    for (let i = 0; i < 2; i++) {
        let px = 35 + i * 20;
        // Top panel
        push();
        translate(px, -4);
        rotate(0.1);
        fill(40, 50, 120);
        stroke(brightness * 0.7, brightness * 0.7, brightness * 0.6);
        rect(-6, -25, 8, 22);
        stroke(60, 70, 140);
        for (let j = 0; j < 5; j++) {
            line(-5, -23 + j * 4, 1, -23 + j * 4);
        }
        pop();
        // Bottom panel
        push();
        translate(px, 4);
        rotate(-0.1);
        fill(40, 50, 120);
        stroke(brightness * 0.7, brightness * 0.7, brightness * 0.6);
        rect(-6, 3, 8, 22);
        stroke(60, 70, 140);
        for (let j = 0; j < 5; j++) {
            line(-5, 5 + j * 4, 1, 5 + j * 4);
        }
        pop();
    }

    // Radiator panels (smaller white panels)
    noStroke();
    fill(brightness, brightness, brightness);
    rect(-8, -15, 4, 8);
    rect(4, -15, 4, 8);
    rect(-8, 7, 4, 8);
    rect(4, 7, 4, 8);

    // Cupola (observation dome) - small bump
    fill(180, 200, 220);
    ellipse(5, 8, 5, 4);

    // Docking ports (small circles)
    fill(brightness * 0.8, brightness * 0.8, brightness * 0.75);
    ellipse(-60, 0, 4, 4);
    ellipse(60, 0, 4, 4);

    // Bright glow effect (ISS is very bright in the sky)
    noFill();
    stroke(255, 255, 240, 30);
    strokeWeight(8);
    ellipse(0, 0, 100, 40);
    stroke(255, 255, 240, 15);
    strokeWeight(15);
    ellipse(0, 0, 130, 50);

    pop();
}

// Update and draw background objects (not in play)
function updateAndDrawBackground() {
    // Draw and update background planets (behind asteroids)
    for (let p of bgPlanets) {
        // Slowly drift left
        p.x -= p.speed;
        if (p.x < -p.size) {
            p.x = width + p.size;
            p.y = random(height * 0.5);
        }

        // Draw planet
        push();
        translate(p.x, p.y);

        // Planet body
        noStroke();
        fill(p.color.r, p.color.g, p.color.b, p.alpha);
        ellipse(0, 0, p.size, p.size);

        // Subtle shading
        fill(0, 0, 0, p.alpha * 0.3);
        arc(0, 0, p.size, p.size, -HALF_PI, HALF_PI);

        // Ring if applicable
        if (p.hasRing) {
            push();
            rotate(p.ringAngle);
            noFill();
            stroke(p.color.r + 30, p.color.g + 30, p.color.b + 30, p.alpha * 0.8);
            strokeWeight(p.size * 0.08);
            ellipse(0, 0, p.size * 1.8, p.size * 0.3);
            pop();
        }

        pop();
    }

    // Draw and update background asteroids
    for (let a of bgAsteroids) {
        // Slowly drift left
        a.x -= a.speed;
        a.rotation += a.rotSpeed;

        if (a.x < -a.size) {
            a.x = width + a.size;
            a.y = random(height * 0.7);
        }

        // Draw asteroid
        push();
        translate(a.x, a.y);
        rotate(a.rotation);

        fill(80, 75, 70, a.alpha);
        stroke(60, 55, 50, a.alpha);
        strokeWeight(1);

        beginShape();
        for (let v of a.vertices) {
            vertex(v.x, v.y);
        }
        endShape(CLOSE);

        pop();
    }
}

function drawEarth() {
    // Earth curve at bottom
    let earthY = height + earthRadius - 80;
    let r = earthRadius;

    // Outer atmosphere glow (multiple layers)
    noFill();
    for (let i = 0; i < 8; i++) {
        stroke(0, 100 + i * 15, 255 - i * 20, 30);
        strokeWeight(4 - i * 0.3);
        arc(width / 2, earthY, r * 2 + 30 - i * 8, r * 2 + 30 - i * 8, PI, TWO_PI);
    }

    // Ocean base
    fill(15, 45, 100);
    noStroke();
    arc(width / 2, earthY, r * 2, r * 2, PI, TWO_PI);

    // Deep ocean variation
    fill(20, 55, 115);
    arc(width / 2 + r * 0.3, earthY, r * 0.8, r * 0.3, PI + 0.2, TWO_PI - 0.4);

    // Continents with detail
    // North America
    fill(35, 85, 45);
    beginShape();
    vertex(width / 2 - r * 0.35, earthY);
    curveVertex(width / 2 - r * 0.35, earthY);
    curveVertex(width / 2 - r * 0.4, earthY - 15);
    curveVertex(width / 2 - r * 0.32, earthY - 25);
    curveVertex(width / 2 - r * 0.2, earthY - 20);
    curveVertex(width / 2 - r * 0.15, earthY - 10);
    curveVertex(width / 2 - r * 0.18, earthY);
    curveVertex(width / 2 - r * 0.18, earthY);
    endShape(CLOSE);

    // South America
    fill(40, 90, 50);
    beginShape();
    vertex(width / 2 - r * 0.12, earthY);
    curveVertex(width / 2 - r * 0.12, earthY);
    curveVertex(width / 2 - r * 0.15, earthY - 8);
    curveVertex(width / 2 - r * 0.1, earthY - 18);
    curveVertex(width / 2 - r * 0.05, earthY - 12);
    curveVertex(width / 2 - r * 0.02, earthY);
    curveVertex(width / 2 - r * 0.02, earthY);
    endShape(CLOSE);

    // Europe/Africa
    fill(45, 95, 55);
    beginShape();
    vertex(width / 2 + r * 0.05, earthY);
    curveVertex(width / 2 + r * 0.05, earthY);
    curveVertex(width / 2 + r * 0.02, earthY - 12);
    curveVertex(width / 2 + r * 0.08, earthY - 22);
    curveVertex(width / 2 + r * 0.15, earthY - 18);
    curveVertex(width / 2 + r * 0.18, earthY - 8);
    curveVertex(width / 2 + r * 0.2, earthY);
    curveVertex(width / 2 + r * 0.2, earthY);
    endShape(CLOSE);

    // Asia/Australia region
    fill(38, 88, 48);
    beginShape();
    vertex(width / 2 + r * 0.28, earthY);
    curveVertex(width / 2 + r * 0.28, earthY);
    curveVertex(width / 2 + r * 0.3, earthY - 15);
    curveVertex(width / 2 + r * 0.38, earthY - 20);
    curveVertex(width / 2 + r * 0.42, earthY - 12);
    curveVertex(width / 2 + r * 0.45, earthY);
    curveVertex(width / 2 + r * 0.45, earthY);
    endShape(CLOSE);

    // Small island
    fill(42, 92, 52);
    ellipse(width / 2 + r * 0.5, earthY - 5, 15, 8);

    // Cloud wisps
    fill(255, 255, 255, 40);
    noStroke();
    arc(width / 2 - r * 0.25, earthY - 5, 80, 15, PI + 0.3, TWO_PI - 0.3);
    arc(width / 2 + r * 0.1, earthY - 12, 60, 10, PI + 0.2, TWO_PI - 0.2);
    arc(width / 2 + r * 0.35, earthY - 8, 70, 12, PI + 0.4, TWO_PI - 0.4);

    // Atmosphere edge highlight
    noFill();
    stroke(100, 180, 255, 80);
    strokeWeight(2);
    arc(width / 2, earthY, r * 2, r * 2, PI, TWO_PI);

    // Thin bright atmosphere line
    stroke(150, 220, 255, 120);
    strokeWeight(1);
    arc(width / 2, earthY, r * 2 + 4, r * 2 + 4, PI + 0.1, TWO_PI - 0.1);
}

function drawMenu() {
    // Title
    textAlign(CENTER, CENTER);
    textSize(min(width / 10, 60));
    fill(0, 255, 255);
    text('SPACE JUNK', width / 2, height * 0.15);
    fill(255, 150, 0);
    text('BLASTER', width / 2, height * 0.25);

    // High scores
    textSize(min(width / 25, 24));
    fill(255, 255, 0);
    text('HIGH SCORES', width / 2, height * 0.38);

    textSize(min(width / 30, 18));
    fill(0, 255, 0);
    for (let i = 0; i < min(5, highScores.length); i++) {
        let hs = highScores[i];
        text(`${i + 1}. ${hs.name} - ${hs.score}`, width / 2, height * 0.45 + i * 30);
    }

    // Player select
    textSize(min(width / 25, 24));
    fill(255, 0, 255);
    if (gamepadConnected) {
        text('D-PAD: SELECT | Y: EDIT | A: START', width / 2, height * 0.7);
    } else {
        text('SELECT PLAYER (1-4) | E: EDIT NAME', width / 2, height * 0.7);
    }

    textSize(min(width / 30, 20));
    for (let i = 0; i < 4; i++) {
        if (i === currentPlayer) {
            fill(255, 255, 0);
            text(`> P${i + 1}: ${playerNames[i]} <`, width / 2, height * 0.76 + i * 28);
        } else {
            fill(150);
            text(`P${i + 1}: ${playerNames[i]}`, width / 2, height * 0.76 + i * 28);
        }
    }

    // Instructions
    textSize(min(width / 35, 14));
    fill(255);
    if (gamepadConnected) {
        text('LEFT STICK: AIM | RIGHT STICK: MOVE', width / 2, height * 0.90);
        text('A/RT: FIRE PLASMA | B/LT: THRUST', width / 2, height * 0.925);
    } else {
        text('MOUSE DIRECTION: AIM SATELLITE', width / 2, height * 0.90);
        text('LEFT CLICK: FIRE PLASMA | RIGHT CLICK: THRUST', width / 2, height * 0.925);
    }

    // Music toggle
    fill(0, 255, 0);
    text('M: MUSIC ' + (musicPlaying ? 'ON' : 'OFF'), width / 2, height * 0.95);

    fill(0, 255, 255);
    let blink = sin(frameCount * 0.1) > 0;
    if (blink) {
        if (gamepadConnected) {
            text('PRESS A TO START', width / 2, height * 0.98);
        } else {
            text('CLICK TO START', width / 2, height * 0.98);
        }
    }
}

function drawResetConfirm() {
    // Darken background
    fill(0, 0, 0, 180);
    rect(0, 0, width, height);

    // Confirmation box
    fill(40, 0, 0);
    stroke(255, 0, 0);
    strokeWeight(3);
    rectMode(CENTER);
    rect(width / 2, height / 2, width * 0.6, height * 0.35, 10);
    rectMode(CORNER);
    noStroke();

    textAlign(CENTER, CENTER);
    textSize(min(width / 15, 36));
    fill(255, 50, 50);
    text('RESET ALL DATA?', width / 2, height * 0.4);

    textSize(min(width / 25, 20));
    fill(255, 200, 200);
    text('This will delete all high scores', width / 2, height * 0.48);
    text('and reset player names to defaults.', width / 2, height * 0.52);

    textSize(min(width / 20, 28));
    fill(255, 100, 100);
    let blink = sin(frameCount * 0.15) > 0;
    if (blink) {
        if (gamepadConnected) {
            text('A: CONFIRM  |  B: CANCEL', width / 2, height * 0.6);
        } else {
            text('Y: CONFIRM  |  N: CANCEL', width / 2, height * 0.6);
        }
    }
}

function drawEnterName() {
    fill(0, 0, 0, 200);
    rect(width / 4, height / 3, width / 2, height / 3);

    stroke(0, 255, 255);
    strokeWeight(2);
    noFill();
    rect(width / 4, height / 3, width / 2, height / 3);

    noStroke();
    textAlign(CENTER, CENTER);
    textSize(min(width / 20, 30));
    fill(255, 255, 0);
    text('ENTER YOUR NAME', width / 2, height * 0.38);

    textSize(min(width / 10, 60));
    fill(0, 255, 0);
    let nameStr = nameChars.join('');
    text(nameStr, width / 2, height / 2);

    // Cursor
    let cursorX = width / 2 - 40 + namePos * 40;
    if (frameCount % 30 < 15) {
        stroke(255);
        strokeWeight(3);
        line(cursorX - 15, height / 2 + 35, cursorX + 15, height / 2 + 35);
    }

    noStroke();
    textSize(min(width / 35, 16));
    fill(255);
    if (gamepadConnected) {
        text('D-PAD: SELECT LETTER | A: CONFIRM', width / 2, height * 0.6);
    } else {
        text('TYPE TO ENTER NAME | BACKSPACE: DELETE | ENTER: CONFIRM', width / 2, height * 0.6);
    }
}

function drawEditName() {
    fill(0, 0, 0, 200);
    rect(width / 4, height / 3, width / 2, height / 3);

    stroke(255, 0, 255);
    strokeWeight(2);
    noFill();
    rect(width / 4, height / 3, width / 2, height / 3);

    noStroke();
    textAlign(CENTER, CENTER);
    textSize(min(width / 20, 30));
    fill(255, 0, 255);
    text('EDIT PLAYER ' + (currentPlayer + 1) + ' NAME', width / 2, height * 0.38);

    textSize(min(width / 10, 60));
    fill(0, 255, 0);
    let nameStr = nameChars.join('');
    text(nameStr, width / 2, height / 2);

    // Cursor
    let cursorX = width / 2 - 40 + namePos * 40;
    if (frameCount % 30 < 15) {
        stroke(255);
        strokeWeight(3);
        line(cursorX - 15, height / 2 + 35, cursorX + 15, height / 2 + 35);
    }

    noStroke();
    textSize(min(width / 35, 16));
    fill(255);
    if (gamepadConnected) {
        text('D-PAD: SELECT LETTER | A: OK | B: CANCEL', width / 2, height * 0.6);
    } else {
        text('TYPE NAME | BACKSPACE: DELETE | ENTER: OK | ESC: CANCEL', width / 2, height * 0.6);
    }
}

function drawGameOver() {
    fill(0, 0, 0, 180);
    rect(0, height / 3, width, height / 3);

    textAlign(CENTER, CENTER);
    textSize(min(width / 8, 70));
    fill(255, 0, 0);
    text('GAME OVER', width / 2, height * 0.42);

    textSize(min(width / 15, 40));
    fill(255, 255, 0);
    text(`SCORE: ${score}`, width / 2, height * 0.52);

    textSize(min(width / 30, 20));
    fill(255);
    let blink = sin(frameCount * 0.1) > 0;
    if (blink) {
        if (gamepadConnected) {
            text('PRESS A TO CONTINUE', width / 2, height * 0.6);
        } else {
            text('PRESS ENTER TO CONTINUE', width / 2, height * 0.6);
        }
    }
}

function updateGame() {
    // Handle atmospheric burnup
    if (burningUp) {
        burnupTimer--;

        // Create intense fire/plasma particles
        for (let i = 0; i < 5; i++) {
            burnupParticles.push({
                x: satellite.x + random(-20, 20),
                y: satellite.y + random(-15, 15),
                vx: random(-3, 3),
                vy: random(-5, -1),
                life: random(20, 40),
                maxLife: 40,
                size: random(8, 20),
                color: random() < 0.3 ? 'white' : (random() < 0.5 ? 'yellow' : 'orange')
            });
        }

        // Update burnup particles
        for (let i = burnupParticles.length - 1; i >= 0; i--) {
            let p = burnupParticles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.vy -= 0.1; // Rise upward
            p.life--;
            p.size *= 0.95;
            if (p.life <= 0) {
                burnupParticles.splice(i, 1);
            }
        }

        // Satellite falls and tumbles
        satellite.vy += 0.3;
        satellite.y += satellite.vy * 0.5;
        satellite.angle += 0.15;

        // Play crackling sounds
        if (frameCount % 8 === 0) {
            playExplosionSound();
        }

        // Game over after burnup animation
        if (burnupTimer <= 0) {
            burningUp = false;
            gameState = 'GAMEOVER';
        }
        return; // Skip normal game update during burnup
    }

    // Spawn junk
    if (frameCount % 90 === 0 || (junk.length < 3 && frameCount % 30 === 0)) {
        junk.push(createJunk());
    }

    // Spawn asteroids (less frequently than junk)
    if (frameCount % 180 === 0 || (asteroids.length < 2 && frameCount % 60 === 0)) {
        asteroids.push(createAsteroid());
    }

    // Player rotation
    if (keyIsDown(LEFT_ARROW)) {
        satellite.angle -= satellite.rotSpeed;
    }
    if (keyIsDown(RIGHT_ARROW)) {
        satellite.angle += satellite.rotSpeed;
    }

    // Thrusters (WASD or arrow keys for movement)
    let thrusting = false;

    // Forward thrust (W or UP)
    if (keyIsDown(87) || keyIsDown(UP_ARROW)) {
        satellite.vx += cos(satellite.angle) * satellite.thrustPower;
        satellite.vy += sin(satellite.angle) * satellite.thrustPower;
        spawnThrusterParticle(satellite.angle + PI, 1); // Back thruster
        thrusting = true;
    }
    // Backward thrust (S or DOWN)
    if (keyIsDown(83) || keyIsDown(DOWN_ARROW)) {
        satellite.vx -= cos(satellite.angle) * satellite.thrustPower * 0.5;
        satellite.vy -= sin(satellite.angle) * satellite.thrustPower * 0.5;
        spawnThrusterParticle(satellite.angle, 0.5); // Front thruster
        thrusting = true;
    }
    // Left strafe (A)
    if (keyIsDown(65)) {
        let strafeAngle = satellite.angle - HALF_PI;
        satellite.vx += cos(strafeAngle) * satellite.thrustPower * 0.7;
        satellite.vy += sin(strafeAngle) * satellite.thrustPower * 0.7;
        spawnThrusterParticle(satellite.angle + HALF_PI, 0.7); // Right thruster
        thrusting = true;
    }
    // Right strafe (D)
    if (keyIsDown(68)) {
        let strafeAngle = satellite.angle + HALF_PI;
        satellite.vx += cos(strafeAngle) * satellite.thrustPower * 0.7;
        satellite.vy += sin(strafeAngle) * satellite.thrustPower * 0.7;
        spawnThrusterParticle(satellite.angle - HALF_PI, 0.7); // Left thruster
        thrusting = true;
    }

    // Mouse control - direction-based
    // Satellite faces direction of mouse movement
    let moveSpeed = sqrt(mouse.deltaX * mouse.deltaX + mouse.deltaY * mouse.deltaY);
    if (moveSpeed > 3) { // Dead zone
        // Set satellite angle to mouse movement direction
        let targetAngle = atan2(mouse.deltaY, mouse.deltaX);
        // Smooth rotation toward target
        let angleDiff = targetAngle - satellite.angle;
        // Normalize angle difference
        while (angleDiff > PI) angleDiff -= TWO_PI;
        while (angleDiff < -PI) angleDiff += TWO_PI;
        satellite.angle += angleDiff * 0.15; // Smooth turn
    }

    // Reset mouse delta each frame
    mouse.deltaX *= 0.5;
    mouse.deltaY *= 0.5;

    // Right mouse = thrust forward
    if (mouse.rightDown) {
        satellite.vx += cos(satellite.angle) * satellite.thrustPower * 1.2;
        satellite.vy += sin(satellite.angle) * satellite.thrustPower * 1.2;
        spawnThrusterParticle(satellite.angle + PI, 1.2);
        spawnThrusterParticle(satellite.angle + PI + random(-0.2, 0.2), 1.0);
        thrusting = true;
    }

    // Left mouse = fire plasma torch (always 2x power now)
    if (mouse.leftDown) {
        torchOn = true;
    }

    // Gamepad controls
    let gp = pollGamepad();
    if (gp) {
        // Left stick for aiming/rotation
        if (abs(gp.leftX) > 0 || abs(gp.leftY) > 0) {
            let targetAngle = atan2(gp.leftY, gp.leftX);
            let angleDiff = targetAngle - satellite.angle;
            while (angleDiff > PI) angleDiff -= TWO_PI;
            while (angleDiff < -PI) angleDiff += TWO_PI;
            satellite.angle += angleDiff * 0.1;
        }

        // Right stick for movement/strafe
        if (abs(gp.rightX) > 0 || abs(gp.rightY) > 0) {
            satellite.vx += gp.rightX * satellite.thrustPower * 0.8;
            satellite.vy += gp.rightY * satellite.thrustPower * 0.8;
            // Thruster particles based on movement direction
            if (abs(gp.rightX) > 0.3 || abs(gp.rightY) > 0.3) {
                let thrustDir = atan2(-gp.rightY, -gp.rightX);
                spawnThrusterParticle(thrustDir, 0.8);
                thrusting = true;
            }
        }

        // D-pad for digital movement
        if (gp.dpadUp) {
            satellite.vx += cos(satellite.angle) * satellite.thrustPower;
            satellite.vy += sin(satellite.angle) * satellite.thrustPower;
            spawnThrusterParticle(satellite.angle + PI, 1);
            thrusting = true;
        }
        if (gp.dpadDown) {
            satellite.vx -= cos(satellite.angle) * satellite.thrustPower * 0.5;
            satellite.vy -= sin(satellite.angle) * satellite.thrustPower * 0.5;
            spawnThrusterParticle(satellite.angle, 0.5);
            thrusting = true;
        }
        if (gp.dpadLeft) {
            satellite.angle -= satellite.rotSpeed * 1.5;
        }
        if (gp.dpadRight) {
            satellite.angle += satellite.rotSpeed * 1.5;
        }

        // Thrust button (B, LB, LT)
        if (gp.thrust) {
            satellite.vx += cos(satellite.angle) * satellite.thrustPower * 1.2;
            satellite.vy += sin(satellite.angle) * satellite.thrustPower * 1.2;
            spawnThrusterParticle(satellite.angle + PI, 1.2);
            spawnThrusterParticle(satellite.angle + PI + random(-0.2, 0.2), 1.0);
            thrusting = true;
        }

        // Fire button (A, RB, RT)
        if (gp.fire) {
            torchOn = true;
        }
    }

    // Apply velocity and friction
    satellite.x += satellite.vx;
    satellite.y += satellite.vy;
    satellite.vx *= satellite.friction;
    satellite.vy *= satellite.friction;

    // Keep satellite in bounds (sides and top)
    let margin = 50;
    let atmosphereTop = height - 80; // Atmosphere starts here
    satellite.x = constrain(satellite.x, margin, width - margin);
    satellite.y = constrain(satellite.y, margin, height);

    // Bounce off left/right/top edges
    if (satellite.x <= margin || satellite.x >= width - margin) satellite.vx *= -0.5;
    if (satellite.y <= margin) satellite.vy *= -0.5;

    // Check for atmospheric entry (too close to Earth = burnup!)
    if (satellite.y > atmosphereTop && !burningUp) {
        burningUp = true;
        burnupTimer = 180; // 3 seconds at 60fps
        burnupParticles = [];
        playExplosionSound();
    }

    // Thruster sound
    if (thrusting && frameCount % 5 === 0) {
        playThrusterSound();
    }

    // Torch (spacebar or left mouse)
    torchOn = keyIsDown(32) || mouse.leftDown;
    if (torchOn && frameCount % 3 === 0) {
        playTorchSound();
    }

    // Update junk
    for (let i = junk.length - 1; i >= 0; i--) {
        let j = junk[i];

        // Random twitch
        if (random() < 0.02) {
            j.twitch = random(-0.5, 0.5);
        }
        j.vx += j.twitch * 0.01;
        j.twitch *= 0.95;

        j.x += j.vx;
        j.y += j.vy;
        j.angle += j.spin;

        // Animate type-specific properties
        if (j.type === 'cubesat') {
            j.panelAngle += j.panelSpeed;
        } else if (j.type === 'sputnik') {
            j.antennaWobble += 0.08;
        }

        // Cool down if not being torched
        j.heat = max(0, j.heat - 0.01);

        // Check torch collision
        if (torchOn) {
            // Always 2x plasma power now
            let torchPower = 2;
            let torchDist = 180;
            let torchArc = 0.5;
            let torchAngle = satellite.angle;
            let torchX = satellite.x + cos(torchAngle) * torchDist / 2;
            let torchY = satellite.y + sin(torchAngle) * torchDist / 2;

            // Check if junk is in torch arc
            let dx = j.x - satellite.x;
            let dy = j.y - satellite.y;
            let dist = sqrt(dx * dx + dy * dy);
            let angleToJunk = atan2(dy, dx);
            let angleDiff = abs(angleToJunk - torchAngle);
            if (angleDiff > PI) angleDiff = TWO_PI - angleDiff;

            if (dist < torchDist + j.size && angleDiff < torchArc) {
                j.heat += 0.03 * torchPower; // 2x heat with right click

                // Spawn heat particles
                if (frameCount % 2 === 0) {
                    particles.push({
                        x: j.x + random(-j.size / 2, j.size / 2),
                        y: j.y + random(-j.size / 2, j.size / 2),
                        vx: random(-1, 1),
                        vy: random(-2, 0),
                        life: 30,
                        color: color(255, random(100, 200), 0)
                    });
                }

                // Junk is fully heated
                if (j.heat >= 1) {
                    hotJunk.push(j);
                    junk.splice(i, 1);
                    playMeltSound();
                    score += 50;
                    continue;
                }
            }
        }

        // Check collision with satellite
        let dx = j.x - satellite.x;
        let dy = j.y - satellite.y;
        let dist = sqrt(dx * dx + dy * dy);
        if (dist < j.size / 2 + 25) {
            gameOver();
            return;
        }

        // Remove if off screen
        if (j.y > height + j.size || j.x < -j.size * 2 || j.x > width + j.size * 2) {
            junk.splice(i, 1);
        }
    }

    // Update asteroids
    for (let i = asteroids.length - 1; i >= 0; i--) {
        let a = asteroids[i];

        a.x += a.vx;
        a.y += a.vy;
        a.angle += a.spin;

        // Cool down if not being torched
        a.heat = max(0, a.heat - 0.008);

        // Check torch collision
        if (torchOn) {
            // Always 2x plasma power now
            let torchPower = 2;
            let torchDist = 180;
            let torchArc = 0.5;
            let torchAngle = satellite.angle;

            let dx = a.x - satellite.x;
            let dy = a.y - satellite.y;
            let dist = sqrt(dx * dx + dy * dy);
            let angleToAst = atan2(dy, dx);
            let angleDiff = abs(angleToAst - torchAngle);
            if (angleDiff > PI) angleDiff = TWO_PI - angleDiff;

            if (dist < torchDist + a.size && angleDiff < torchArc) {
                a.heat += 0.02 * torchPower; // Asteroids heat slower than junk

                // Spawn heat particles
                if (frameCount % 3 === 0) {
                    particles.push({
                        x: a.x + random(-a.size / 2, a.size / 2),
                        y: a.y + random(-a.size / 2, a.size / 2),
                        vx: random(-1, 1),
                        vy: random(-2, 0),
                        life: 25,
                        color: color(255, random(80, 150), 0)
                    });
                }

                // Asteroid destroyed
                if (a.heat >= 1) {
                    // Spawn smaller asteroids if big enough
                    if (a.size > 25) {
                        let numFragments = floor(random(2, 4));
                        for (let f = 0; f < numFragments; f++) {
                            let frag = createAsteroid(a.size * random(0.3, 0.5));
                            frag.x = a.x + random(-10, 10);
                            frag.y = a.y + random(-10, 10);
                            frag.vx = a.vx + random(-1, 1);
                            frag.vy = a.vy + random(-0.5, 0.5);
                            asteroids.push(frag);
                        }
                    }

                    // Explosion sparks
                    for (let s = 0; s < 15; s++) {
                        sparks.push({
                            x: a.x,
                            y: a.y,
                            vx: random(-3, 3),
                            vy: random(-3, 3),
                            life: random(15, 30),
                            color: random() < 0.5 ? color(200, 150, 100) : color(255, 200, 150)
                        });
                    }

                    playBeep(300, 0.15);
                    score += floor(a.size) * 2; // More points for bigger asteroids
                    asteroids.splice(i, 1);
                    continue;
                }
            }
        }

        // Check collision with satellite
        let dx = a.x - satellite.x;
        let dy = a.y - satellite.y;
        let dist = sqrt(dx * dx + dy * dy);
        if (dist < a.size / 2 + 25) {
            gameOver();
            return;
        }

        // Remove if off screen
        if (a.y > height + a.size || a.x < -a.size * 2 || a.x > width + a.size * 2) {
            asteroids.splice(i, 1);
        }
    }

    // Hot junk clustering
    if (hotJunk.length >= 3) {
        // Find center of hot junk
        let cx = 0, cy = 0, totalSize = 0;
        for (let h of hotJunk) {
            cx += h.x;
            cy += h.y;
            totalSize += h.size;
        }
        cx /= hotJunk.length;
        cy /= hotJunk.length;

        // Create clump
        clumps.push(createClump(cx, cy, totalSize));
        hotJunk = [];
        playBeep(400, 0.2);
        score += 200;
    }

    // Update hot junk (drift together)
    for (let h of hotJunk) {
        h.x += h.vx * 0.5;
        h.y += h.vy * 0.5;
        h.angle += h.spin;
    }

    // Update clumps (fall to Earth)
    for (let i = clumps.length - 1; i >= 0; i--) {
        let c = clumps[i];
        c.vy += 0.1; // Gravity
        c.y += c.vy;

        // Trail
        c.trail.push({ x: c.x, y: c.y, life: 30 });
        if (c.trail.length > 20) c.trail.shift();

        // Update trail
        for (let t of c.trail) {
            t.life--;
        }
        c.trail = c.trail.filter(t => t.life > 0);

        // Hit atmosphere
        let earthY = height - 80;
        if (c.y > earthY - atmosphereHeight) {
            // Explosion!
            playExplosionSound();
            score += 500;

            // Create sparks
            for (let s = 0; s < 30; s++) {
                sparks.push({
                    x: c.x,
                    y: c.y,
                    vx: random(-5, 5),
                    vy: random(-8, 2),
                    life: random(20, 50),
                    color: random() < 0.5 ? color(255, 200, 50) : color(255, 100, 0)
                });
            }

            // Smoke
            for (let s = 0; s < 10; s++) {
                particles.push({
                    x: c.x + random(-20, 20),
                    y: c.y,
                    vx: random(-1, 1),
                    vy: random(-2, 0),
                    life: 60,
                    color: color(100, 100, 100, 150),
                    size: random(10, 25)
                });
            }

            clumps.splice(i, 1);
        }
    }

    // Update particles
    for (let i = particles.length - 1; i >= 0; i--) {
        let p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.life--;
        if (p.life <= 0) particles.splice(i, 1);
    }

    // Update thruster particles
    for (let i = thrusterParticles.length - 1; i >= 0; i--) {
        let tp = thrusterParticles[i];
        tp.x += tp.vx;
        tp.y += tp.vy;
        tp.vx *= 0.95;
        tp.vy *= 0.95;
        tp.life--;
        if (tp.life <= 0) thrusterParticles.splice(i, 1);
    }

    // Update sparks
    for (let i = sparks.length - 1; i >= 0; i--) {
        let s = sparks[i];
        s.x += s.vx;
        s.y += s.vy;
        s.vy += 0.2;
        s.life--;
        if (s.life <= 0) sparks.splice(i, 1);
    }

    // Torch particles
    if (torchOn) {
        for (let t = 0; t < 3; t++) {
            let spread = random(-0.3, 0.3);
            let dist = random(20, 120);
            torchParticles.push({
                x: satellite.x + cos(satellite.angle + spread) * dist,
                y: satellite.y + sin(satellite.angle + spread) * dist,
                life: 15,
                color: random() < 0.5 ? color(0, 200, 255) : color(255, 255, 255)
            });
        }
    }

    for (let i = torchParticles.length - 1; i >= 0; i--) {
        torchParticles[i].life--;
        if (torchParticles[i].life <= 0) torchParticles.splice(i, 1);
    }
}

function drawGame() {
    // Draw clump trails
    for (let c of clumps) {
        for (let i = 0; i < c.trail.length; i++) {
            let t = c.trail[i];
            let alpha = (t.life / 30) * 255;
            fill(255, 150, 50, alpha);
            noStroke();
            let size = (c.size * 0.5) * (t.life / 30);
            ellipse(t.x, t.y, size, size * 2);
        }
    }

    // Draw clumps
    for (let c of clumps) {
        // Glow
        fill(255, 100, 0, 100);
        noStroke();
        ellipse(c.x, c.y, c.size * 2, c.size * 2);

        // Hot clump
        fill(255, 200, 100);
        ellipse(c.x, c.y, c.size, c.size);
        fill(255, 255, 200);
        ellipse(c.x, c.y, c.size * 0.5, c.size * 0.5);
    }

    // Draw particles
    noStroke();
    for (let p of particles) {
        fill(p.color);
        let size = p.size || 5;
        ellipse(p.x, p.y, size * (p.life / 60), size * (p.life / 60));
    }

    // Draw sparks
    for (let s of sparks) {
        fill(s.color);
        rect(s.x, s.y, 3, 3);
    }

    // Draw torch (always 2x power)
    if (torchOn) {
        let torchLen = 150;

        // Outer glow
        stroke(0, 200, 255, 200);
        strokeWeight(16);
        line(
            satellite.x + cos(satellite.angle) * 30,
            satellite.y + sin(satellite.angle) * 30,
            satellite.x + cos(satellite.angle) * torchLen,
            satellite.y + sin(satellite.angle) * torchLen
        );

        // Middle beam
        stroke(150, 230, 255, 250);
        strokeWeight(8);
        line(
            satellite.x + cos(satellite.angle) * 30,
            satellite.y + sin(satellite.angle) * 30,
            satellite.x + cos(satellite.angle) * torchLen,
            satellite.y + sin(satellite.angle) * torchLen
        );

        // Core beam
        stroke(255, 255, 255);
        strokeWeight(4);
        line(
            satellite.x + cos(satellite.angle) * 30,
            satellite.y + sin(satellite.angle) * 30,
            satellite.x + cos(satellite.angle) * torchLen,
            satellite.y + sin(satellite.angle) * torchLen
        );

        // Side beams
        stroke(0, 180, 255, 120);
        strokeWeight(4);
        let sideAngle = 0.15;
        line(
            satellite.x + cos(satellite.angle) * 30,
            satellite.y + sin(satellite.angle) * 30,
            satellite.x + cos(satellite.angle + sideAngle) * (torchLen * 0.8),
            satellite.y + sin(satellite.angle + sideAngle) * (torchLen * 0.8)
        );
        line(
            satellite.x + cos(satellite.angle) * 30,
            satellite.y + sin(satellite.angle) * 30,
            satellite.x + cos(satellite.angle - sideAngle) * (torchLen * 0.8),
            satellite.y + sin(satellite.angle - sideAngle) * (torchLen * 0.8)
        );
    }

    // Draw torch particles
    noStroke();
    for (let tp of torchParticles) {
        fill(tp.color);
        let size = 4 * (tp.life / 15);
        rect(tp.x - size / 2, tp.y - size / 2, size, size);
    }

    // Draw thruster particles
    noStroke();
    for (let tp of thrusterParticles) {
        fill(tp.color);
        let alpha = (tp.life / 15) * 255;
        fill(red(tp.color), green(tp.color), blue(tp.color), alpha);
        let size = 5 * (tp.life / 15);
        ellipse(tp.x, tp.y, size, size);
    }

    // Draw hot junk (glowing)
    for (let h of hotJunk) {
        push();
        translate(h.x, h.y);
        rotate(h.angle);

        // Intense glow
        fill(255, 150, 0, 120);
        noStroke();
        ellipse(0, 0, h.size * 2.5, h.size * 2.5);
        fill(255, 200, 100, 80);
        ellipse(0, 0, h.size * 3, h.size * 3);

        // Draw the shape (heat is maxed at 1)
        h.heat = 1;
        if (h.type === 'booster') {
            drawBooster(h);
        } else if (h.type === 'sputnik') {
            drawSputnik(h);
        } else if (h.type === 'cubesat') {
            drawCubesat(h);
        }
        pop();
    }

    // Draw junk
    for (let j of junk) {
        push();
        translate(j.x, j.y);
        rotate(j.angle);

        // Heat glow
        if (j.heat > 0) {
            fill(255, 150, 0, j.heat * 150);
            noStroke();
            ellipse(0, 0, j.size * 2.5, j.size * 2.5);
        }

        // Draw based on type
        if (j.type === 'booster') {
            drawBooster(j);
        } else if (j.type === 'sputnik') {
            drawSputnik(j);
        } else if (j.type === 'cubesat') {
            drawCubesat(j);
        }

        pop();
    }

    // Draw asteroids
    for (let a of asteroids) {
        push();
        translate(a.x, a.y);
        rotate(a.angle);

        // Heat glow
        if (a.heat > 0) {
            fill(255, 100, 0, a.heat * 150);
            noStroke();
            ellipse(0, 0, a.size * 2.2, a.size * 2.2);
        }

        drawAsteroid(a);
        pop();
    }

    // Draw burnup particles (behind satellite)
    if (burningUp) {
        noStroke();
        for (let p of burnupParticles) {
            let alpha = (p.life / p.maxLife) * 255;
            if (p.color === 'white') {
                fill(255, 255, 255, alpha);
            } else if (p.color === 'yellow') {
                fill(255, 220, 50, alpha);
            } else {
                fill(255, 120, 30, alpha);
            }
            ellipse(p.x, p.y, p.size, p.size * 1.5);
        }

        // Draw flames around satellite
        for (let i = 0; i < 8; i++) {
            let flameAngle = random(TWO_PI);
            let flameDist = random(15, 40);
            let flameSize = random(10, 25);
            fill(255, random(100, 200), 0, 150);
            ellipse(
                satellite.x + cos(flameAngle) * flameDist,
                satellite.y + sin(flameAngle) * flameDist,
                flameSize, flameSize * 1.5
            );
        }
    }

    // Draw satellite
    push();
    translate(satellite.x, satellite.y);
    rotate(satellite.angle);

    // Apply burnup effect (satellite glowing hot)
    let heatTint = burningUp ? 150 : 0;
    let panelDamage = burningUp ? (180 - burnupTimer) / 180 : 0;

    // Solar panels (may be burning off)
    if (panelDamage < 0.5) {
        fill(40 + heatTint, 40, 80 - panelDamage * 80);
        stroke(100 + heatTint, 100, 150 - panelDamage * 100);
        strokeWeight(1);
        rect(-8, -35, 16, 25 * (1 - panelDamage));
        rect(-8, 10, 16, 25 * (1 - panelDamage));

        // Panel lines
        stroke(60 + heatTint * 0.5, 60, 100);
        for (let py = -33; py < -10 - panelDamage * 20; py += 5) {
            line(-6, py, 6, py);
        }
        for (let py = 12; py < 33 - panelDamage * 20; py += 5) {
            line(-6, py, 6, py);
        }
    }

    // Body (glows hot during burnup)
    fill(180 + heatTint * 0.5, 180 - heatTint * 0.5, 180 - heatTint);
    stroke(100 + heatTint, 100 - heatTint * 0.3, 100 - heatTint * 0.5);
    strokeWeight(2);
    ellipse(0, 0, 30, 30);

    // Hot glow during burnup
    if (burningUp) {
        noStroke();
        fill(255, 100, 0, 100);
        ellipse(0, 0, 50, 50);
        fill(255, 200, 100, 50);
        ellipse(0, 0, 70, 70);
    }

    // Torch nozzle
    fill(80 + heatTint);
    stroke(60 + heatTint * 0.5);
    rect(12, -5, 15, 10);
    fill(40 + heatTint);
    rect(25, -6, 5, 12);

    // Antenna (may break off during burnup)
    if (panelDamage < 0.7) {
        stroke(150 + heatTint);
        strokeWeight(1);
        line(-10, 0, -20, -10);
        fill(200 + heatTint * 0.3);
        noStroke();
        ellipse(-20, -10, 4, 4);
    }

    pop();

    // UI
    textAlign(LEFT, TOP);
    textSize(min(width / 30, 24));
    fill(0, 255, 0);
    text(`SCORE: ${score}`, 20, 20);

    fill(255, 255, 0);
    text(`PLAYER: ${playerNames[currentPlayer]}`, 20, 50);

    // Hot junk counter
    if (hotJunk.length > 0) {
        fill(255, 150, 0);
        text(`MELTING: ${hotJunk.length}/3`, 20, 80);
    }
}

function drawStar(x, y, radius1, radius2, npoints) {
    let angle = TWO_PI / npoints;
    let halfAngle = angle / 2.0;
    beginShape();
    for (let a = -PI / 2; a < TWO_PI - PI / 2; a += angle) {
        let sx = x + cos(a) * radius2;
        let sy = y + sin(a) * radius2;
        vertex(sx, sy);
        sx = x + cos(a + halfAngle) * radius1;
        sy = y + sin(a + halfAngle) * radius1;
        vertex(sx, sy);
    }
    endShape(CLOSE);
}

function gameOver() {
    gameState = 'GAMEOVER';
    playBeep(200, 0.5);
    setTimeout(() => playBeep(150, 0.5), 200);
    setTimeout(() => playBeep(100, 0.8), 400);
}

function startGame() {
    score = 0;
    junk = [];
    hotJunk = [];
    clumps = [];
    asteroids = [];
    particles = [];
    sparks = [];
    torchParticles = [];
    thrusterParticles = [];
    burnupParticles = [];
    burningUp = false;
    burnupTimer = 0;
    satellite.x = width / 2;
    satellite.y = height / 2;
    satellite.vx = 0;
    satellite.vy = 0;
    satellite.angle = -PI / 2;
    gameState = 'PLAYING';
    playBeep(440, 0.1);
    playBeep(660, 0.1);
}

function keyPressed() {
    initAudio();

    // Music toggle works in any state
    if (key === 'm' || key === 'M') {
        toggleMusic();
        return;
    }

    if (gameState === 'MENU') {
        if (keyCode === UP_ARROW) {
            currentPlayer = (currentPlayer - 1 + 4) % 4;
            playBeep(330, 0.1);
        } else if (keyCode === DOWN_ARROW) {
            currentPlayer = (currentPlayer + 1) % 4;
            playBeep(330, 0.1);
        } else if (keyCode === ENTER) {
            startGame();
        } else if (key >= '1' && key <= '4') {
            currentPlayer = int(key) - 1;
            playBeep(440, 0.1);
        } else if (key === 'e' || key === 'E') {
            // Edit current player name
            gameState = 'EDIT_NAME';
            nameChars = playerNames[currentPlayer].split('');
            // Ensure 3 characters
            while (nameChars.length < 3) nameChars.push('A');
            nameChars = nameChars.slice(0, 3);
            namePos = 0;
            playBeep(550, 0.1);
        } else if (key === 'r' || key === 'R') {
            // Open reset confirmation
            gameState = 'RESET_CONFIRM';
            playBeep(200, 0.1);
        }
    } else if (gameState === 'RESET_CONFIRM') {
        if (key === 'y' || key === 'Y') {
            // Confirm reset
            resetAllData();
            gameState = 'MENU';
        } else if (key === 'n' || key === 'N' || keyCode === ESCAPE) {
            // Cancel reset
            gameState = 'MENU';
            playBeep(330, 0.1);
        }
    } else if (gameState === 'EDIT_NAME') {
        if (keyCode === LEFT_ARROW) {
            namePos = max(0, namePos - 1);
            playBeep(220, 0.05);
        } else if (keyCode === RIGHT_ARROW) {
            namePos = min(2, namePos + 1);
            playBeep(220, 0.05);
        } else if (keyCode === ENTER) {
            let name = nameChars.join('');
            playerNames[currentPlayer] = name;
            localStorage.setItem('spaceChunkPlayerNames', JSON.stringify(playerNames));
            playBeep(660, 0.2);
            gameState = 'MENU';
        } else if (keyCode === ESCAPE) {
            gameState = 'MENU';
            playBeep(220, 0.1);
        } else if (keyCode === BACKSPACE) {
            // Backspace deletes current and moves back
            nameChars[namePos] = '_';
            if (namePos > 0) namePos--;
            playBeep(200, 0.05);
        } else if (key.length === 1 && key.match(/[a-zA-Z0-9]/)) {
            // Type a letter or number directly
            nameChars[namePos] = key.toUpperCase();
            playBeep(440, 0.05);
            if (namePos < 2) namePos++;
        }
    } else if (gameState === 'GAMEOVER') {
        if (keyCode === ENTER) {
            // Check if high score
            if (highScores.length < 10 || score > highScores[highScores.length - 1].score) {
                gameState = 'ENTER_NAME';
                nameChars = ['A', 'A', 'A'];
                namePos = 0;
            } else {
                gameState = 'MENU';
            }
        }
    } else if (gameState === 'ENTER_NAME') {
        if (keyCode === LEFT_ARROW) {
            namePos = max(0, namePos - 1);
            playBeep(220, 0.05);
        } else if (keyCode === RIGHT_ARROW) {
            namePos = min(2, namePos + 1);
            playBeep(220, 0.05);
        } else if (keyCode === ENTER) {
            let name = nameChars.join('');
            playerNames[currentPlayer] = name;
            localStorage.setItem('spaceChunkPlayerNames', JSON.stringify(playerNames));
            addHighScore(name, score);
            playBeep(660, 0.2);
            gameState = 'MENU';
        } else if (keyCode === BACKSPACE) {
            nameChars[namePos] = '_';
            if (namePos > 0) namePos--;
            playBeep(200, 0.05);
        } else if (key.length === 1 && key.match(/[a-zA-Z0-9]/)) {
            nameChars[namePos] = key.toUpperCase();
            playBeep(440, 0.05);
            if (namePos < 2) namePos++;
        }
    }
}
