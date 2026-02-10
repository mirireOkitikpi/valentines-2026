const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');

// Game Constants
const GRAVITY = 0.8;
const JUMP_FORCE = -12;
const GROUND_Y = 220;
const GAME_SPEED = 6;
const OBSTACLE_INTERVAL_MIN = 1200; // ms
const OBSTACLE_INTERVAL_MAX = 2500; // ms

// Game State
let gameState = 'START'; // START, PLAYING, PROPOSAL, ENDED, SUCCESS
let frames = 0;
let cactiJumped = 0;
let lastObstacleTime = 0;
let gameSpeed = GAME_SPEED;

// Proposal Words
const proposalWords = ["Rachel,", "will", "you", "be", "my", "valentine?", "<3"];
let currentWordIndex = 0;
let displayedWords = [];

// Particles
let particles = [];

// Entities
let dino = {
    x: 50,
    y: GROUND_Y,
    width: 40,
    height: 40,
    dy: 0,
    grounded: true,
    jump: function () {
        if (this.grounded) {
            this.dy = JUMP_FORCE;
            this.grounded = false;
        }
    },
    update: function () {
        if (gameState !== 'PLAYING') return;

        this.dy += GRAVITY;
        this.y += this.dy;

        if (this.y > GROUND_Y) {
            this.y = GROUND_Y;
            this.dy = 0;
            this.grounded = true;
        }

        // Ceiling collision (optional, mostly for sanity)
        if (this.y < 0) {
            this.y = 0;
            this.dy = 0;
        }
    },
    draw: function () {
        // Simple Dino Placeholder (Green Box) - Replace with Sprite if available
        ctx.fillStyle = '#535353';
        ctx.fillRect(this.x, this.y, this.width, this.height);

        // Eye
        ctx.fillStyle = '#fff';
        ctx.fillRect(this.x + 25, this.y + 5, 5, 5);
    }
};

let obstacles = [];

function init() {
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    document.addEventListener('keydown', handleInput);
    document.addEventListener('touchstart', handleInput, { passive: false });

    // UI Buttons
    document.getElementById('start-btn').addEventListener('click', startGame);
    document.getElementById('restart-btn').addEventListener('click', resetGame);
    document.getElementById('yes-btn').addEventListener('click', (e) => handleProposalResponse('Yes', e));
    document.getElementById('no-btn').addEventListener('click', () => handleProposalResponse('No'));
    // Mobile touch for buttons
    document.getElementById('start-btn').addEventListener('touchstart', startGame);

    requestAnimationFrame(gameLoop);
}

function resizeCanvas() {
    const container = document.getElementById('game-container');
    if (container) {
        canvas.width = container.offsetWidth;
        canvas.height = container.offsetHeight;
    }
}

function handleInput(e) {
    if (e.type === 'touchstart') {
        // Prevent default double-tap zoom etc, but allow button clicks
        if (e.target.tagName !== 'BUTTON') {
            e.preventDefault();
        }
    }

    if ((e.code === 'Space' || e.type === 'touchstart') && gameState === 'PLAYING') {
        dino.jump();
    }
}

function startGame() {
    if (gameState === 'PLAYING') return;
    gameState = 'PLAYING';
    document.getElementById('start-screen').classList.add('hidden');
    document.getElementById('game-over-screen').classList.add('hidden');
    document.getElementById('retry-screen').classList.add('hidden');
    document.getElementById('success-screen').classList.add('hidden');
    resetGameLogic();
}

function resetGame() {
    gameState = 'START';
    document.getElementById('game-over-screen').classList.add('hidden');
    document.getElementById('start-screen').classList.remove('hidden');
    document.getElementById('proposal-screen').classList.add('hidden');
    resetGameLogic();
}

function resetGameLogic() {
    obstacles = [];
    particles = [];
    cactiJumped = 0;
    currentWordIndex = 0;
    displayedWords = [];
    dino.y = GROUND_Y;
    dino.dy = 0;
    dino.grounded = true;
    lastObstacleTime = Date.now();
    ctx.clearRect(0, 0, canvas.width, canvas.height); // Clear screen immediately
}

function spawnObstacle() {
    // Stop spawning if we have enough obstacles for the words
    // We need exactly proposalWords.length obstacles.
    // currentWordIndex counts how many we HAVE spawned.

    if (currentWordIndex >= proposalWords.length) return;

    const now = Date.now();
    const timeSinceLast = now - lastObstacleTime;

    // Randomize interval slightly, but ensure enough space
    if (timeSinceLast > OBSTACLE_INTERVAL_MIN + Math.random() * (OBSTACLE_INTERVAL_MAX - OBSTACLE_INTERVAL_MIN)) {
        obstacles.push({
            x: canvas.width,
            y: GROUND_Y, // Cactus sits on ground
            width: 25,
            height: 40,
            passed: false,
            word: proposalWords[currentWordIndex]
        });
        currentWordIndex++;
        lastObstacleTime = now;
    }
}

function createParticles(x, y) {
    for (let i = 0; i < 50; i++) {
        particles.push({
            x: x,
            y: y,
            vx: (Math.random() - 0.5) * 10,
            vy: (Math.random() - 0.5) * 10 - 5,
            life: 1.0,
            color: `hsl(${330 + Math.random() * 30}, 100%, 70%)` // Pinks
        });
    }
}

function updateParticles() {
    for (let i = 0; i < particles.length; i++) {
        let p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.2; // Gravity
        p.life -= 0.02;
    }
    particles = particles.filter(p => p.life > 0);
}

function drawParticles() {
    for (let p of particles) {
        ctx.fillStyle = p.color;

        // Draw Heart Shape approximation
        ctx.beginPath();
        const size = 5 * p.life;
        ctx.moveTo(p.x, p.y);
        ctx.bezierCurveTo(p.x - size, p.y - size, p.x - 2 * size, p.y + size / 2, p.x, p.y + 2 * size);
        ctx.bezierCurveTo(p.x + 2 * size, p.y + size / 2, p.x + size, p.y - size, p.x, p.y);
        ctx.fill();
    }
}

function update() {
    if (gameState === 'SUCCESS') {
        updateParticles();
        return;
    }

    if (gameState !== 'PLAYING') return;

    frames++;
    dino.update();

    spawnObstacle();

    // Update obstacles
    for (let i = 0; i < obstacles.length; i++) {
        let obs = obstacles[i];
        obs.x -= gameSpeed;

        // Collision detection (Simple AABB)
        // Tune hitbox slightly to be forgiving
        if (
            dino.x + 5 < obs.x + obs.width - 5 &&
            dino.x + dino.width - 5 > obs.x + 5 &&
            dino.y + 5 < obs.y + obs.height &&
            dino.y + dino.height > obs.y
        ) {
            // Game Over
            gameState = 'ENDED';
            document.getElementById('game-over-screen').classList.remove('hidden');
        }

        // Passed logic
        // If the obstacle is behind the dino and hasn't been marked yet
        if (!obs.passed && obs.x + obs.width < dino.x) {
            obs.passed = true;
            cactiJumped++;
            // The word is already assigned to the obstacle, we just push it to displayed list
            displayedWords.push(obs.word);

            // Check if this was the last word
            if (formattedWordsString() === proposalWords.join(' ')) {
                // Wait a moment for the user to land and read it
                setTimeout(() => {
                    gameState = 'PROPOSAL';
                    document.getElementById('proposal-screen').classList.remove('hidden');
                }, 500);
            }
        }
    }

    // Remove off-screen obstacles
    obstacles = obstacles.filter(obs => obs.x + obs.width > -100);
}

function formattedWordsString() {
    return displayedWords.join(' ');
}

function draw() {
    // Always clear
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw Ground Line
    ctx.beginPath();
    ctx.moveTo(0, GROUND_Y + 40);
    ctx.lineTo(canvas.width, GROUND_Y + 40);
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#535353';
    ctx.stroke();

    // Draw Dino
    dino.draw();

    // Draw Obstacles
    ctx.fillStyle = '#535353';
    for (let obs of obstacles) {
        // Draw Cactus (Simple Shape)
        ctx.fillRect(obs.x + 5, obs.y, 15, obs.height); // Main Stalk
        ctx.fillRect(obs.x, obs.y + 10, 5, 10); // Left arm
        ctx.fillRect(obs.x + 20, obs.y + 5, 5, 10); // Right arm
    }

    // Draw Revealled Words
    // We want to draw them nicely at the top
    if (displayedWords.length > 0) {
        ctx.fillStyle = '#ff4081'; // Accent color for text
        ctx.font = '20px "Press Start 2P"';
        ctx.textAlign = 'center';

        const text = formattedWordsString();
        ctx.fillText(text, canvas.width / 2, 50);
    }

    if (gameState === 'SUCCESS') {
        drawParticles();
    }
}

function gameLoop() {
    update();
    draw();
    requestAnimationFrame(gameLoop);
}

function handleProposalResponse(response, event) {
    document.getElementById('proposal-screen').classList.add('hidden');

    if (response === 'Yes') {
        gameState = 'SUCCESS';
        document.getElementById('success-screen').classList.remove('hidden');

        // Explosion center
        const rect = canvas.getBoundingClientRect();
        // If event provided, use click coords, else center
        let x = canvas.width / 2;
        let y = canvas.height / 2;

        createParticles(x, y);
        createParticles(x - 50, y - 20);
        createParticles(x + 50, y - 20);

        // Example Celebration GIF embed (replace with actual URL)
        const gifContainer = document.getElementById('celebration-gif');
        gifContainer.innerHTML = '<img src="https://media1.tenor.com/m/s43Jgh0jekAAAAAC/gif.gif" alt="Happy Dance" style="max-width: 100%; border-radius: 8px;">';
    } else {
        document.getElementById('retry-screen').classList.remove('hidden');
        const gifContainer = document.getElementById('sad-gif');
        gifContainer.innerHTML = '<img src="https://media.tenor.com/2sZYV3zXw8MAAAAC/sad-pikachu.gif" alt="Sad" style="max-width: 100%; border-radius: 8px;">';
    }

    // Call Backend
    const backendUrl = 'https://us-central1-valentinesday-487020.cloudfunctions.net/valentineResponse';

    fetch(backendUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ response: response, timestamp: new Date().toISOString() })
    }).catch(err => console.log('Mock email sent (backend not connected):', response));
}

init();
