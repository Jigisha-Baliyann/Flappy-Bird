// ====== CONFIG ======
const GAME_W = 800, GAME_H = 600;
const GRAVITY = 1100;
const JUMP_VELOCITY = -320;
const BASE_SPEED = 200;
const PIPE_GAP = 170;
const SPAWN_MS = 1400;
const SPEED_STEP = 15;
const MIN_SPAWN_MS = 950;

let config = {
    type: Phaser.AUTO,
    width: GAME_W,
    height: GAME_H,
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 0 },
            debug: false
        }
    },
    scene: { key: 'default', preload, create, update }
};

let game = new Phaser.Game(config);

// ====== GAME STATE ======
let bird, ground, pipes, score = 0, scoreText, bestText, infoText, overText, restartButton;
let isStarted = false, isGameOver = false;
let spawnEvent = null;
let currentSpeed = BASE_SPEED;
let currentSpawnMs = SPAWN_MS;
let bestScore = 0;   // ✅ always reset on page reload

function preload() {
    this.load.image('background', 'assets/background.png');
    this.load.image('road', 'assets/road.png');
    this.load.image('column', 'assets/column.png');
    this.load.spritesheet('bird', 'assets/bird.png', { frameWidth: 64, frameHeight: 96 });
}

function create() {
    // Reset state
    isStarted = false;
    isGameOver = false;
    currentSpeed = BASE_SPEED;
    currentSpawnMs = SPAWN_MS;

    // Background
    this.add.image(0, 0, 'background').setOrigin(0, 0).setDepth(-2);

    // Ground
    const roads = this.physics.add.staticGroup();
    ground = roads.create(400, 568, 'road').setScale(2).refreshBody();

    // Bird
    bird = this.physics.add.sprite(140, GAME_H * 0.45, 'bird').setScale(2);
    bird.setCollideWorldBounds(true);
    bird.body.setAllowGravity(false);

    // Pipes
    pipes = this.physics.add.group({ allowGravity: false, immovable: true });

    // Collisions
    this.physics.add.collider(bird, ground, () => gameOver.call(this));
    this.physics.add.collider(bird, pipes, () => gameOver.call(this));

    // Score & Best
    score = 0;
    scoreText = this.add.text(16, 16, 'Score: 0', {
        fontFamily: 'Arial', fontSize: '28px', color: '#ffffff'
    }).setDepth(10);

    bestText = this.add.text(16, 48, 'Best: ' + bestScore, {
        fontFamily: 'Arial', fontSize: '24px', color: '#ffff00'
    }).setDepth(10);

    // Info text
    infoText = this.add.text(GAME_W / 2, GAME_H / 2, 'Press SPACE or Click to Start', {
        fontFamily: 'Arial', fontSize: '26px', color: '#ffffff',
        backgroundColor: '#000000aa', padding: { x: 12, y: 8 }
    }).setOrigin(0.5).setDepth(10);

    // Game Over text
    overText = this.add.text(GAME_W / 2, GAME_H / 2 + 60, '', {
        fontFamily: 'Arial', fontSize: '32px', color: '#ffffff'
    }).setOrigin(0.5).setDepth(10).setStroke('#000000', 4);

    // Restart button
    restartButton = this.add.text(GAME_W / 2, GAME_H / 2 + 120, '🔄 Restart', {
        fontFamily: 'Arial', fontSize: '28px', color: '#00ff00',
        backgroundColor: '#000000aa', padding: { x: 10, y: 5 }
    }).setOrigin(0.5).setDepth(10).setInteractive();
    restartButton.setVisible(false);
    restartButton.on('pointerdown', restartGame);

    // Input
    this.input.keyboard.on('keydown-SPACE', () => startOrFlap.call(this));
    this.input.on('pointerdown', () => startOrFlap.call(this));
    this.input.keyboard.on('keydown-R', restartGame);
}

function update() {
    if (!isStarted || isGameOver) return;

    pipes.children.iterate(pipe => {
        if (!pipe) return;

        if (pipe.x < -pipe.width) {
            pipe.destroy();
            return;
        }

        if (pipe.scorable && !pipe.scored && pipe.x + pipe.width < bird.x) {
            pipe.scored = true;
            addScore(1);
        }
    });
}

// ====== Helpers ======
function startOrFlap() {
    if (isGameOver) return;
    if (!isStarted) startGame.call(this);
    bird.setVelocityY(JUMP_VELOCITY);
}

function startGame() {
    isStarted = true;
    infoText.setText('');
    bird.body.setAllowGravity(true);
    bird.body.setGravityY(GRAVITY);

    spawnEvent = this.time.addEvent({
        delay: currentSpawnMs,
        loop: true,
        callback: spawnPipePair,
        callbackScope: this
    });
}

function spawnPipePair() {
    const topMargin = 40;
    const bottomMargin = 120;
    const minY = topMargin + PIPE_GAP / 2;
    const maxY = GAME_H - bottomMargin - PIPE_GAP / 2;
    const gapY = Phaser.Math.Between(minY, maxY);

    const topPipe = pipes.create(GAME_W + 40, gapY - PIPE_GAP / 2, 'column');
    topPipe.setOrigin(0.5, 1).setFlipY(true);
    topPipe.body.setVelocityX(-currentSpeed);

    const bottomPipe = pipes.create(GAME_W + 40, gapY + PIPE_GAP / 2, 'column');
    bottomPipe.setOrigin(0.5, 0);
    bottomPipe.body.setVelocityX(-currentSpeed);
    bottomPipe.scorable = true;
}

function addScore(n) {
    score += n;
    scoreText.setText('Score: ' + score);

    if (score > bestScore) {
        bestScore = score;
        bestText.setText('Best: ' + bestScore);
    }

    // difficulty scaling
    if (score % 5 === 0) {
        currentSpeed += SPEED_STEP;
        pipes.children.iterate(p => {
            if (p && p.body) p.body.setVelocityX(-currentSpeed);
        });

        if (spawnEvent) spawnEvent.delay = currentSpawnMs = Math.max(MIN_SPAWN_MS, currentSpawnMs - 60);
    }
}

function gameOver() {
    if (isGameOver) return;
    isGameOver = true;

    if (spawnEvent) spawnEvent.remove(false);
    pipes.children.iterate(p => p?.body?.setVelocityX(0));
    bird.body.setVelocity(0);
    bird.body.setAllowGravity(false);

    overText.setText('Game Over! Press R or Click Restart');
    restartButton.setVisible(true);
}

function restartGame() {
    game.destroy(true);       // kill old game
    game = new Phaser.Game(config);  // start new
}
