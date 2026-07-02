// ─── TOAST NOTIFICATION ────────────────────────────────────────────────────────
function showToast(message, type = 'error', duration = 3000) {
    const container = document.getElementById('toastContainer');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = 'toast toast-' + type;
    toast.textContent = message;
    container.appendChild(toast);
    requestAnimationFrame(() => { toast.classList.add('show'); });
    setTimeout(() => {
        toast.classList.remove('show');
        toast.classList.add('hide');
        setTimeout(() => toast.remove(), 300);
    }, duration);
}

// ─── SURPRISE GIFT — SOCCER BALL ──────────────────────────────────────────────
let isDonor = false;
let soccerBallImg = null;
let userNickname = '';

function loadSoccerBall() {
    var user = window.KamaleAuth ? window.KamaleAuth.getUser() : firebase.auth().currentUser;
    if (!user) { isDonor = false; return; }
    firebase.database().ref('users/' + user.uid + '/items/ball_copa').once('value').then(function (snap) {
        isDonor = snap.val() === true;
        if (isDonor && !soccerBallImg) {
            soccerBallImg = new Image();
            soccerBallImg.src = '../bola-da-copa-26.png';
        }
    });
}

function loadUserNickname() {
    var user = window.KamaleAuth ? window.KamaleAuth.getUser() : firebase.auth().currentUser;
    if (!user) { userNickname = ''; return; }
    
    // Fill immediately from cache if available
    userNickname = user.nickname || localStorage.getItem('kamale_cached_nickname') || user.displayName || '';

    firebase.database().ref('users/' + user.uid + '/nickname').once('value').then(function (snap) {
        if (snap.exists()) {
            userNickname = snap.val();
            localStorage.setItem('kamale_cached_nickname', userNickname);
        }
    });
}

loadSoccerBall();
loadUserNickname();
firebase.auth().onAuthStateChanged(function () { loadSoccerBall(); loadUserNickname(); });

function drawBallAsSoccerBall(c, cx, cy, r) {
    if (isDonor && soccerBallImg && soccerBallImg.complete && soccerBallImg.naturalWidth > 0) {
        c.drawImage(soccerBallImg, cx - r, cy - r, r * 2, r * 2);
    } else {
        c.fillStyle = '#ff4a4a';
        c.beginPath();
        c.arc(cx, cy, r, 0, Math.PI * 2);
        c.fill();
    }
}

// Elementos do DOM
const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');
const playerScoreDisplay = document.getElementById('player-score');
const cpuScoreDisplay = document.getElementById('cpu-score');
const menuScreen = document.getElementById('menu-screen');
const btnSolo = document.getElementById('btn-solo');
const btnVsCpu = document.getElementById('btn-vs-cpu');
const gameOverScreen = document.getElementById('game-over-screen');
const gameOverTitle = document.getElementById('game-over-title');
const restartBtn = document.getElementById('restart-btn');
const mobilePauseBtn = document.getElementById('mobile-pause-btn');
const instructionsModal = document.getElementById('instructions-modal');
const learnBtn = document.getElementById('learn-btn');
const closeInstructionsBtn = document.getElementById('close-instructions-btn');

// Botões direcionais (D-pad)
const dpadUp = document.getElementById('dpad-up');
const dpadDown = document.getElementById('dpad-down');
const dpadLeft = document.getElementById('dpad-left');
const dpadRight = document.getElementById('dpad-right');

// Botão de Power (Direita)
const actionPower = document.getElementById('action-power');

// ─── ELEMENTOS MULTIPLAYER ────────────────────────────────────────────────────
const btnShowMultiplayer = document.getElementById('btn-show-multiplayer');
const mpScreen = document.getElementById('mp-screen');
const btnLocalMultiplayer = document.getElementById('btn-local-multiplayer');
const btnCreateRoom = document.getElementById('btn-create-room');
const btnShowRooms = document.getElementById('btn-show-rooms');
const btnShowJoin = document.getElementById('btn-show-join');
const btnMpBack = document.getElementById('btn-mp-back');

// Local Lobby
const localLobbyScreen = document.getElementById('local-lobby-screen');
const inputLocalP1 = document.getElementById('input-local-p1');
const inputLocalP2 = document.getElementById('input-local-p2');
const btnStartLocal = document.getElementById('btn-start-local');
const btnBackLocalLobby = document.getElementById('btn-back-local-lobby');

// Create Room
const createScreen = document.getElementById('create-screen');
const inputRoomName = document.getElementById('input-room-name');
const inputCreatePlayerName = document.getElementById('input-create-player-name');
const btnCreateConfirm = document.getElementById('btn-create-confirm');
const btnBackMenuCreate = document.getElementById('btn-back-menu-create');

// Rooms List
const roomsScreen = document.getElementById('rooms-screen');
const roomsList = document.getElementById('rooms-list');
const btnRefreshRooms = document.getElementById('btn-refresh-rooms');
const btnBackMenuRooms = document.getElementById('btn-back-menu-rooms');

// Join by Code
const joinScreen = document.getElementById('join-screen');
const inputRoomCode = document.getElementById('input-room-code');
const inputPlayerName = document.getElementById('input-player-name');
const joinError = document.getElementById('join-error');
const btnJoinConfirm = document.getElementById('btn-join-confirm');
const btnBackMenu = document.getElementById('btn-back-menu');

// Lobby (Online)
const lobbyScreen = document.getElementById('lobby-screen');
const lobbyRoomCode = document.getElementById('lobby-room-code');
const lobbyPlayers = document.getElementById('lobby-players');
const lobbyWaitText = document.getElementById('lobby-wait-text');
const btnStartGame = document.getElementById('btn-start-game');
const btnLeaveLobby = document.getElementById('btn-leave-lobby');
const btnReady = document.getElementById('btn-ready');
const lobbyReadyStatus = document.getElementById('lobby-ready-status');

// Configurações do Jogo (Modo Vertical)
const CANVAS_WIDTH = 400;
const CANVAS_HEIGHT = 400;
const PADDLE_WIDTH = 50;
const PADDLE_HEIGHT = 8;
const BALL_SIZE = 24;
const WINNING_SCORE = 10;

// Estado das Entidades
const player = {
    x: CANVAS_WIDTH / 2 - PADDLE_WIDTH / 2,
    y: CANVAS_HEIGHT - 15 - PADDLE_HEIGHT,
    score: 0,
    speed: 5.5,
    direction: 0,
    yDirection: 0
};

const cpu = {
    x: CANVAS_WIDTH / 2 - PADDLE_WIDTH / 2,
    y: 15,
    score: 0,
    speed: 3.8
};

const ball = {
    x: CANVAS_WIDTH / 2,
    y: CANVAS_HEIGHT / 2,
    vx: 0,
    vy: 0,
    speed: 4.5
};

// Estado do Jogo
let gameRunning = false;
let isMoving = false;
let isPaused = false;
let isPausedByInstructions = false;
let gameTimeoutId = null;
let vsCpu = true;

// Poder especial
let power = 0;
let powerReady = false;
let powerFlash = 0;
let spaceHeld = false;
let powerActive = false;
let playerHits = 0;

// Poder da CPU
let cpuPower = 0;
let cpuPowerReady = false;
let cpuPowerFlash = 0;
let cpuPowerActive = false;
let cpuHits = 0;

// ─── ESTADO LOCAL MULTIPLAYER ─────────────────────────────────────────────────
let isLocalMultiplayer = false;
let localP1PowerActive = false;
let localP2PowerActive = false;
const localP1 = {
    x: CANVAS_WIDTH / 2 - PADDLE_WIDTH / 2,
    y: CANVAS_HEIGHT - 15 - PADDLE_HEIGHT,
    score: 0,
    speed: 5.5,
    direction: 0,
    yDirection: 0,
    power: 0,
    powerReady: false,
    powerFlash: 0,
    color: '#3acc7a',
    hits: 0
};
const localP2 = {
    x: CANVAS_WIDTH / 2 - PADDLE_WIDTH / 2,
    y: 15,
    score: 0,
    speed: 5.5,
    direction: 0,
    yDirection: 0,
    power: 0,
    powerReady: false,
    powerFlash: 0,
    color: '#00c8ff',
    hits: 0
};

// ─── ESTADO ONLINE MULTIPLAYER ────────────────────────────────────────────────
let isMultiplayer = false;
let mpHadOpponent = false;
let mpSyncInterval = null;
let opponentPaddle = { x: CANVAS_WIDTH / 2 - PADDLE_WIDTH / 2 };
let opponentScore = 0;
let opponentName = '';
let opponentColor = '';
let isMpGameRunning = false;
let opponentPowerActive = false;
let mpLobbyAutoStarted = false;

// ─── TELAS ────────────────────────────────────────────────────────────────────

function showScreen(screen) {
    [menuScreen, mpScreen, localLobbyScreen, createScreen, roomsScreen, joinScreen, lobbyScreen, gameOverScreen].forEach(s => {
        if (s) s.classList.add('hidden');
    });
    if (screen) screen.classList.remove('hidden');
    setTimeout(() => updateMenuFocus(0), 50);
}

function showMenu() {
    showScreen(menuScreen);
}

// ─── INICIALIZAÇÃO ────────────────────────────────────────────────────────────

function resetBall(dirY) {
    ball.x = CANVAS_WIDTH / 2;
    ball.y = CANVAS_HEIGHT / 2;
    if (isMoving) {
        const angle = (Math.random() * 2 - 1) * (Math.PI / 4);
        ball.vx = ball.speed * Math.sin(angle);
        ball.vy = dirY * ball.speed * Math.cos(angle);
    } else {
        ball.vx = 0;
        ball.vy = 0;
    }
}

function initMatch() {
    player.x = CANVAS_WIDTH / 2 - PADDLE_WIDTH / 2;
    player.y = CANVAS_HEIGHT - 15 - PADDLE_HEIGHT;
    cpu.x = CANVAS_WIDTH / 2 - PADDLE_WIDTH / 2;
    player.direction = 0;
    player.yDirection = 0;
    isMoving = false;
    power = 0;
    powerReady = false;
    powerFlash = 0;
    spaceHeld = false;
    powerActive = false;
    playerHits = 0;
    cpuPower = 0;
    cpuPowerReady = false;
    cpuPowerFlash = 0;
    cpuPowerActive = false;
    cpuHits = 0;
    opponentPowerActive = false;
    resetBall(1);
    if (isMultiplayer) {
        Multiplayer.sendMoving(false);
        Multiplayer.sendBallState({ x: ball.x, y: ball.y, vx: ball.vx, vy: ball.vy });
        Multiplayer.sendScores(player.score, opponentScore);
    }
}

// ─── MODO SOLO / VS CPU ──────────────────────────────────────────────────────

function startGame(cpuMode) {
    if (gameRunning) return;
    vsCpu = cpuMode;
    isMultiplayer = false;
    isLocalMultiplayer = false;

    player.score = 0;
    cpu.score = 0;
    playerScoreDisplay.textContent = player.score;
    cpuScoreDisplay.textContent = cpu.score;

    showScreen(null);

    const cpuScoreLabel = document.getElementById('cpu-score-label');
    const cpuScoreVal = document.getElementById('cpu-score');
    if (vsCpu) {
        if (cpuScoreLabel) cpuScoreLabel.textContent = 'CPU';
        if (cpuScoreLabel) cpuScoreLabel.parentElement.style.display = '';
        if (cpuScoreVal) cpuScoreVal.style.display = '';
    } else {
        if (cpuScoreLabel) cpuScoreLabel.parentElement.style.display = 'none';
    }

    initMatch();
    isPaused = false;
    if (mobilePauseBtn) {
        mobilePauseBtn.textContent = '⏸';
        mobilePauseBtn.classList.remove('active');
    }
    gameRunning = true;
    if (gameTimeoutId) clearTimeout(gameTimeoutId);
    gameTick();
}

function gameOver(winner) {
    gameRunning = false;
    isMoving = false;
    isPaused = false;
    if (gameTimeoutId) clearTimeout(gameTimeoutId);

    if (winner === 'player') {
        gameOverTitle.innerHTML = 'Você Venceu! <span class="winner-emoji">🏆</span>';
    } else {
        gameOverTitle.innerHTML = 'CPU Venceu! <span class="skull-emoji">💀</span>';
    }
    gameOverScreen.classList.remove('hidden');
    setTimeout(() => updateMenuFocus(0), 50);
}

function gameTick() {
    if (!gameRunning || isPaused) return;
    update();
    draw();
    gameTimeoutId = setTimeout(gameTick, 16);
}

function update() {
    if (isLocalMultiplayer) { updateLocal(); return; }

    // Move jogador (sempre, mesmo no multiplayer - para input responsivo)
    if (player.direction === -1) {
        player.x = Math.max(5, player.x - player.speed);
    } else if (player.direction === 1) {
        player.x = Math.min(CANVAS_WIDTH - PADDLE_WIDTH - 5, player.x + player.speed);
    }

    if (player.yDirection === -1) {
        player.y = Math.max(CANVAS_HEIGHT / 2, player.y - player.speed);
    } else if (player.yDirection === 1) {
        player.y = Math.min(CANVAS_HEIGHT - 15 - PADDLE_HEIGHT, player.y + player.speed);
    }

    if (powerFlash > 0) powerFlash = Math.max(0, powerFlash - 0.04);
    if (cpuPowerFlash > 0) cpuPowerFlash = Math.max(0, cpuPowerFlash - 0.04);

    // No online multiplayer, cliente não roda física da bola
    if (isMultiplayer && !Multiplayer.isHost) {
        // Guest collision check to update power locally
        const inPlayerArea = ball.y >= CANVAS_HEIGHT / 2;
        if (ball.vy > 0 && ball.y + BALL_SIZE >= player.y && ball.y <= player.y + PADDLE_HEIGHT) {
            if (ball.x + BALL_SIZE >= player.x && ball.x <= player.x + PADDLE_WIDTH) {
                if (powerActive) {
                    powerActive = false;
                    powerReady = false;
                    power = 0;
                    powerFlash = 1;
                    playerHits = 0;
                    Multiplayer.sendState({ powerActive: false });
                } else {
                    if (!player.lastHitBall) {
                        playerHits = Math.min(7, playerHits + 1);
                        power = Math.min(100, Math.floor((playerHits / 7) * 100));
                        if (playerHits >= 7) powerReady = true;
                        player.lastHitBall = true;
                    }
                }
            }
        } else {
            player.lastHitBall = false;
        }
        return;
    }

    if (!isMoving) return;

    ball.x += ball.vx;
    ball.y += ball.vy;

    if (ball.x <= 0) { ball.x = 0; ball.vx = -ball.vx; }
    else if (ball.x >= CANVAS_WIDTH - BALL_SIZE) { ball.x = CANVAS_WIDTH - BALL_SIZE; ball.vx = -ball.vx; }

    // IA da CPU
    if (vsCpu) {
        const cpuCenterX = cpu.x + PADDLE_WIDTH / 2;
        const targetX = ball.x + BALL_SIZE / 2;
        if (cpuCenterX < targetX - 8) cpu.x = Math.min(CANVAS_WIDTH - PADDLE_WIDTH - 5, cpu.x + cpu.speed);
        else if (cpuCenterX > targetX + 8) cpu.x = Math.max(5, cpu.x - cpu.speed);
        
        // CPU ativa power quando bola está em seu campo e ela está pronta
        if (cpuPowerReady && !cpuPowerActive && ball.y <= CANVAS_HEIGHT / 2) {
            cpuPowerActive = true;
        }
    }

    // Colisão raquete jogador (fundo)
    const inPlayerArea = ball.y >= CANVAS_HEIGHT / 2;
    if ((ball.vy > 0 || inPlayerArea) && ball.y + BALL_SIZE >= player.y && ball.y <= player.y + PADDLE_HEIGHT) {
        if (ball.x + BALL_SIZE >= player.x && ball.x <= player.x + PADDLE_WIDTH) {
            const rel = (player.x + PADDLE_WIDTH / 2) - (ball.x + BALL_SIZE / 2);
            const norm = Math.max(-0.85, Math.min(0.85, rel / (PADDLE_WIDTH / 2)));
            const angle = norm * (Math.PI / 4);
            const usePower = powerActive;
            const mult = usePower ? 1.8 : 1.05;
            ball.vx = -ball.speed * Math.sin(angle) * mult;
            ball.vy = -Math.abs(ball.speed * Math.cos(angle)) * mult;
            ball.y = player.y - BALL_SIZE;
            if (usePower) { 
                powerActive = false; 
                powerReady = false; 
                power = 0; 
                powerFlash = 1; 
                playerHits = 0;
                if (isMultiplayer) {
                    Multiplayer.sendState({ powerActive: false });
                }
            }
            else { 
                playerHits = Math.min(7, playerHits + 1);
                power = Math.min(100, Math.floor((playerHits / 7) * 100));
                if (playerHits >= 7) powerReady = true; 
            }
        }
    }

    const hasOpponent = isMultiplayer ? Object.keys(Multiplayer.players).length >= 2 : false;

    // Colisão raquete oponente (topo) - CPU ou Online
    const oppX = isMultiplayer ? opponentPaddle.x : cpu.x;
    const oppY = isMultiplayer ? (opponentPaddle.y !== undefined ? opponentPaddle.y : 15) : cpu.y;
    const oppPowerActiveState = isMultiplayer ? opponentPowerActive : cpuPowerActive;
    const inOpponentArea = ball.y <= CANVAS_HEIGHT / 2;
    if ((vsCpu || hasOpponent) && (ball.vy < 0 || inOpponentArea) && ball.y <= oppY + PADDLE_HEIGHT && ball.y + BALL_SIZE >= oppY) {
        if (ball.x + BALL_SIZE >= oppX && ball.x <= oppX + PADDLE_WIDTH) {
            const rel = (oppX + PADDLE_WIDTH / 2) - (ball.x + BALL_SIZE / 2);
            const norm = Math.max(-0.85, Math.min(0.85, rel / (PADDLE_WIDTH / 2)));
            const angle = norm * (Math.PI / 4);
            const mult = oppPowerActiveState ? 1.8 : 1.05;
            ball.vx = -ball.speed * Math.sin(angle) * mult;
            ball.vy = Math.abs(ball.speed * Math.cos(angle)) * mult;
            ball.y = oppY + PADDLE_HEIGHT;
            if (isMultiplayer) {
                // Online: sem poder da CPU, gerenciado no próprio cliente
            } else {
                if (cpuPowerActive) { 
                    cpuPowerActive = false; 
                    cpuPowerReady = false; 
                    cpuPower = 0; 
                    cpuPowerFlash = 1; 
                    cpuHits = 0;
                }
                else { 
                    cpuHits = Math.min(7, cpuHits + 1);
                    cpuPower = Math.min(100, Math.floor((cpuHits / 7) * 100));
                    if (cpuHits >= 7) cpuPowerReady = true; 
                }
            }
        }
    }

    // Parede superior
    if (ball.vy < 0 && ball.y <= 0) {
        if (vsCpu) {
            player.score++;
            playerScoreDisplay.textContent = player.score;
            if (player.score >= WINNING_SCORE) gameOver('player');
            else initMatch();
        } else if (isMultiplayer) {
            if (hasOpponent) {
                // Oponente errou - jogador ganha ponto
                player.score++;
                playerScoreDisplay.textContent = player.score;
                Multiplayer.sendScores(player.score, opponentScore);
                if (player.score >= WINNING_SCORE) mpGameOver(true);
                else initMatch();
            } else {
                // Solo multiplayer room (wall bounce, gain point)
                ball.y = 0; ball.vy = Math.abs(ball.vy);
                player.score++;
                playerScoreDisplay.textContent = player.score;
                Multiplayer.sendScores(player.score, opponentScore);
                if (player.score >= WINNING_SCORE) mpGameOver(true);
            }
        } else {
            ball.y = 0; ball.vy = Math.abs(ball.vy);
            player.score++; playerScoreDisplay.textContent = player.score;
        }
    }

    // Bola passou do fundo
    if (ball.y > CANVAS_HEIGHT) {
        if (vsCpu) {
            cpu.score++;
            cpuScoreDisplay.textContent = cpu.score;
            if (cpu.score >= WINNING_SCORE) gameOver('cpu');
            else initMatch();
        } else if (isMultiplayer) {
            if (hasOpponent) {
                // Jogador errou - oponente ganha ponto
                opponentScore++;
                cpuScoreDisplay.textContent = opponentScore;
                Multiplayer.sendScores(player.score, opponentScore);
                if (opponentScore >= WINNING_SCORE) mpGameOver(false);
                else initMatch();
            } else {
                // Solo multiplayer room (drops ball = game over!)
                mpGameOver(false);
            }
        } else {
            gameOver('opponent');
        }
    }
}

function draw() {
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    ctx.strokeStyle = '#222222';
    ctx.lineWidth = 2;
    ctx.setLineDash([10, 10]);
    ctx.beginPath();
    ctx.moveTo(0, CANVAS_HEIGHT / 2);
    ctx.lineTo(CANVAS_WIDTH, CANVAS_HEIGHT / 2);
    ctx.stroke();
    ctx.setLineDash([]);

    if (isLocalMultiplayer) { drawLocal(); return; }

    // Raquete jogador (fundo)
    if (powerActive) {
        let gradient = ctx.createLinearGradient(player.x, player.y, player.x + PADDLE_WIDTH, player.y);
        gradient.addColorStop(0, '#ffe066');
        gradient.addColorStop(0.5, '#ffd100');
        gradient.addColorStop(1, '#ffe066');
        ctx.fillStyle = gradient;
        ctx.shadowBlur = 15;
        ctx.shadowColor = '#ffd100';
    } else {
        ctx.fillStyle = isMultiplayer ? (Multiplayer.playerColor || '#3acc7a') : '#3acc7a';
    }
    ctx.fillRect(player.x, player.y, PADDLE_WIDTH, PADDLE_HEIGHT);
    ctx.shadowBlur = 0;

    // Raquete oponente (topo) - CPU ou Online
    if (vsCpu) {
        if (cpuPowerActive) {
            let gradient = ctx.createLinearGradient(cpu.x, cpu.y, cpu.x + PADDLE_WIDTH, cpu.y);
            gradient.addColorStop(0, '#ffe066');
            gradient.addColorStop(0.5, '#ffd100');
            gradient.addColorStop(1, '#ffe066');
            ctx.fillStyle = gradient;
            ctx.shadowBlur = 15;
            ctx.shadowColor = '#ffd100';
        } else {
            ctx.fillStyle = '#3acc7a';
        }
        ctx.fillRect(cpu.x, cpu.y, PADDLE_WIDTH, PADDLE_HEIGHT);
        ctx.shadowBlur = 0;
    } else if (isMultiplayer) {
        const hasOpponent = Object.keys(Multiplayer.players).length >= 2;
        if (hasOpponent) {
            if (opponentPowerActive) {
                let gradient = ctx.createLinearGradient(opponentPaddle.x, opponentPaddle.y !== undefined ? opponentPaddle.y : 15, opponentPaddle.x + PADDLE_WIDTH, opponentPaddle.y !== undefined ? opponentPaddle.y : 15);
                gradient.addColorStop(0, '#ffe066');
                gradient.addColorStop(0.5, '#ffd100');
                gradient.addColorStop(1, '#ffe066');
                ctx.fillStyle = gradient;
                ctx.shadowBlur = 15;
                ctx.shadowColor = '#ffd100';
            } else {
                ctx.fillStyle = opponentColor || '#00c8ff';
            }
            ctx.fillRect(opponentPaddle.x, opponentPaddle.y !== undefined ? opponentPaddle.y : 15, PADDLE_WIDTH, PADDLE_HEIGHT);
            ctx.shadowBlur = 0;
        }
    }

    // Bola
    drawBallAsSoccerBall(ctx, ball.x + BALL_SIZE / 2, ball.y + BALL_SIZE / 2, BALL_SIZE / 2);

    drawPowerBars();

    // Glow no botão de power quando pronto
    if (actionPower) {
        if (powerReady) actionPower.classList.add('ready');
        else actionPower.classList.remove('ready');
    }
}

function drawPowerBars() {
    const barWidth = 80;
    const barHeight = 6;
    const barX = CANVAS_WIDTH - barWidth - 10;
    const barY = CANVAS_HEIGHT - 8;

    ctx.font = "9px 'Share Tech Mono', monospace";
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = powerReady ? '#ffd100' : '#555555';
    ctx.fillText('POWER', barX - 6, barY + barHeight / 2);

    ctx.fillStyle = powerReady ? '#2a2200' : '#1a1a1a';
    ctx.fillRect(barX, barY, barWidth, barHeight);

    const fillWidth = (power / 100) * barWidth;
    if (powerFlash > 0) {
        ctx.fillStyle = `rgba(255, 209, 0, ${powerFlash})`;
        ctx.fillRect(barX, barY, barWidth, barHeight);
    }
    ctx.fillStyle = powerReady ? '#ffd100' : '#444444';
    ctx.fillRect(barX, barY, fillWidth, barHeight);

    ctx.strokeStyle = powerReady ? '#ffd100' : '#333333';
    ctx.lineWidth = 1;
    ctx.strokeRect(barX, barY, barWidth, barHeight);
    if (vsCpu || isMultiplayer) {
        const cpuBarX = 10;
        const cpuBarY = 8;
        const oppPow = isMultiplayer ? 0 : cpuPower;
        const oppPowReady = isMultiplayer ? false : cpuPowerReady;
        const oppPowFlash = isMultiplayer ? 0 : cpuPowerFlash;
        ctx.font = "9px 'Share Tech Mono', monospace";
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = oppPowReady ? '#ffd100' : '#555555';
        ctx.fillText('POWER', cpuBarX, cpuBarY + barHeight / 2);
        const cpuBarFillX = cpuBarX + 42;
        ctx.fillStyle = oppPowReady ? '#2a2200' : '#1a1a1a';
        ctx.fillRect(cpuBarFillX, cpuBarY, barWidth, barHeight);
        const cpuFillWidth = (oppPow / 100) * barWidth;
        if (oppPowFlash > 0) {
            ctx.fillStyle = `rgba(255, 209, 0, ${oppPowFlash})`;
            ctx.fillRect(cpuBarFillX, cpuBarY, barWidth, barHeight);
        }
        ctx.fillStyle = oppPowReady ? '#ffd100' : '#444444';
        ctx.fillRect(cpuBarFillX, cpuBarY, cpuFillWidth, barHeight);

        ctx.strokeStyle = oppPowReady ? '#ffd100' : '#333333';
        ctx.lineWidth = 1;
        ctx.strokeRect(cpuBarFillX, cpuBarY, barWidth, barHeight);
    }
}

function triggerStart() {
    if (!isMoving && gameRunning && !isPaused) {
        isMoving = true;
        resetBall(Math.random() > 0.5 ? 1 : -1);
        if (isMultiplayer) {
            Multiplayer.sendMoving(true);
            Multiplayer.sendBallState({ x: ball.x, y: ball.y, vx: ball.vx, vy: ball.vy });
        }
    }
}

function movePlayer(dir) {
    if (isLocalMultiplayer && gameRunning) {
        localP1.direction = dir;
        if (dir !== 0) localTriggerStart();
    } else {
        player.direction = dir;
        if (dir !== 0) triggerStart();
    }
}

function togglePause() {
    if (!gameRunning) return;
    isPaused = !isPaused;
    isPausedByInstructions = false;
    
    const resetBtn = document.getElementById('mobile-reset-btn');
    const pOverlay = document.getElementById('pause-overlay');

    if (isMultiplayer) {
        if (isPaused) {
            Multiplayer.sendPause(Multiplayer.playerName);
        } else {
            Multiplayer.sendUnpause();
        }
        draw();
    } else {
        if (isPaused) {
            if (gameTimeoutId) clearTimeout(gameTimeoutId);
            if (pOverlay && instructionsModal.classList.contains('hidden')) {
                pOverlay.classList.remove('hidden');
            }
            draw();
        } else {
            if (pOverlay) pOverlay.classList.add('hidden');
            gameTick();
        }
    }

    if (mobilePauseBtn) {
        mobilePauseBtn.textContent = isPaused ? '▶' : '⏸';
        mobilePauseBtn.classList.toggle('active', isPaused);
    }
    if (resetBtn) {
        resetBtn.classList.toggle('hidden', !isPaused);
    }
    setTimeout(() => updateMenuFocus(0), 50);
}


// ─── LOCAL MULTIPLAYER ────────────────────────────────────────────────────────

function startLocalMultiplayer() {
    if (gameRunning) return;
    isLocalMultiplayer = true;
    isMultiplayer = false;
    vsCpu = false;

    const p1Name = inputLocalP1.value.trim() || 'Jogador 1';
    const p2Name = inputLocalP2.value.trim() || 'Jogador 2';

    localP1.x = CANVAS_WIDTH / 2 - PADDLE_WIDTH / 2;
    localP1.y = CANVAS_HEIGHT - 15 - PADDLE_HEIGHT;
    localP1.score = 0;
    localP1.direction = 0;
    localP1.power = 0;
    localP1.powerReady = false;
    localP1.powerFlash = 0;
    localP1PowerActive = false;
    localP1.hits = 0;

    localP2.x = CANVAS_WIDTH / 2 - PADDLE_WIDTH / 2;
    localP2.y = 15;
    localP2.score = 0;
    localP2.direction = 0;
    localP2.power = 0;
    localP2.powerReady = false;
    localP2.powerFlash = 0;
    localP2PowerActive = false;
    localP2.hits = 0;

    player.score = 0;
    cpu.score = 0;
    playerScoreDisplay.textContent = '0';

    const cpuScoreLabel = document.getElementById('cpu-score-label');
    const cpuScoreVal = document.getElementById('cpu-score');
    if (cpuScoreLabel) cpuScoreLabel.textContent = p2Name;
    if (cpuScoreVal) { cpuScoreVal.textContent = '0'; cpuScoreVal.style.display = ''; }

    ball.x = CANVAS_WIDTH / 2;
    ball.y = CANVAS_HEIGHT / 2;
    ball.vx = 0;
    ball.vy = 0;
    ball.speed = 4.5;
    isMoving = false;

    showScreen(null);
    isPaused = false;
    if (mobilePauseBtn) { mobilePauseBtn.textContent = '⏸'; mobilePauseBtn.classList.remove('active'); }
    gameRunning = true;
    if (gameTimeoutId) clearTimeout(gameTimeoutId);
    gameTick();
}

function localResetBall() {
    ball.x = CANVAS_WIDTH / 2;
    ball.y = CANVAS_HEIGHT / 2;
    const angle = (Math.random() * 2 - 1) * (Math.PI / 4);
    const dirY = Math.random() > 0.5 ? 1 : -1;
    ball.vx = ball.speed * Math.sin(angle);
    ball.vy = dirY * ball.speed * Math.cos(angle);
}

function localTriggerStart() {
    if (!isMoving && gameRunning && !isPaused) {
        isMoving = true;
        localResetBall();
    }
}

function updateLocal() {
    // Move P1 (fundo - setas)
    if (localP1.direction === -1) localP1.x = Math.max(5, localP1.x - localP1.speed);
    else if (localP1.direction === 1) localP1.x = Math.min(CANVAS_WIDTH - PADDLE_WIDTH - 5, localP1.x + localP1.speed);

    if (localP1.yDirection === -1) localP1.y = Math.max(CANVAS_HEIGHT / 2, localP1.y - localP1.speed);
    else if (localP1.yDirection === 1) localP1.y = Math.min(CANVAS_HEIGHT - 15 - PADDLE_HEIGHT, localP1.y + localP1.speed);

    // Move P2 (topo - A/D)
    if (localP2.direction === -1) localP2.x = Math.max(5, localP2.x - localP2.speed);
    else if (localP2.direction === 1) localP2.x = Math.min(CANVAS_WIDTH - PADDLE_WIDTH - 5, localP2.x + localP2.speed);

    if (localP2.yDirection === -1) localP2.y = Math.max(15, localP2.y - localP2.speed);
    else if (localP2.yDirection === 1) localP2.y = Math.min(CANVAS_HEIGHT / 2 - PADDLE_HEIGHT, localP2.y + localP2.speed);

    if (localP1.powerFlash > 0) localP1.powerFlash = Math.max(0, localP1.powerFlash - 0.04);
    if (localP2.powerFlash > 0) localP2.powerFlash = Math.max(0, localP2.powerFlash - 0.04);

    if (!isMoving) return;

    ball.x += ball.vx;
    ball.y += ball.vy;

    if (ball.x <= 0) { ball.x = 0; ball.vx = -ball.vx; }
    else if (ball.x >= CANVAS_WIDTH - BALL_SIZE) { ball.x = CANVAS_WIDTH - BALL_SIZE; ball.vx = -ball.vx; }

    // Colisão P1 (fundo)
    const inP1Area = ball.y >= CANVAS_HEIGHT / 2;
    if ((ball.vy > 0 || inP1Area) && ball.y + BALL_SIZE >= localP1.y && ball.y <= localP1.y + PADDLE_HEIGHT) {
        if (ball.x + BALL_SIZE >= localP1.x && ball.x <= localP1.x + PADDLE_WIDTH) {
            const rel = (localP1.x + PADDLE_WIDTH / 2) - (ball.x + BALL_SIZE / 2);
            const norm = Math.max(-0.85, Math.min(0.85, rel / (PADDLE_WIDTH / 2)));
            const angle = norm * (Math.PI / 4);
            const usePower = localP1PowerActive;
            const mult = usePower ? 1.8 : 1.05;
            ball.vx = -ball.speed * Math.sin(angle) * mult;
            ball.vy = -Math.abs(ball.speed * Math.cos(angle)) * mult;
            ball.y = localP1.y - BALL_SIZE;
            if (usePower) { 
                localP1PowerActive = false; 
                localP1.powerReady = false; 
                localP1.power = 0; 
                localP1.powerFlash = 1; 
                localP1.hits = 0;
            }
            else { 
                localP1.hits = Math.min(7, localP1.hits + 1);
                localP1.power = Math.min(100, Math.floor((localP1.hits / 7) * 100));
                if (localP1.hits >= 7) localP1.powerReady = true; 
            }
        }
    }

    // Colisão P2 (topo)
    const inP2Area = ball.y <= CANVAS_HEIGHT / 2;
    if ((ball.vy < 0 || inP2Area) && ball.y <= localP2.y + PADDLE_HEIGHT && ball.y + BALL_SIZE >= localP2.y) {
        if (ball.x + BALL_SIZE >= localP2.x && ball.x <= localP2.x + PADDLE_WIDTH) {
            const rel = (localP2.x + PADDLE_WIDTH / 2) - (ball.x + BALL_SIZE / 2);
            const norm = Math.max(-0.85, Math.min(0.85, rel / (PADDLE_WIDTH / 2)));
            const angle = norm * (Math.PI / 4);
            const usePower = localP2PowerActive;
            const mult = usePower ? 1.8 : 1.05;
            ball.vx = -ball.speed * Math.sin(angle) * mult;
            ball.vy = Math.abs(ball.speed * Math.cos(angle)) * mult;
            ball.y = localP2.y + PADDLE_HEIGHT;
            if (usePower) { 
                localP2PowerActive = false; 
                localP2.powerReady = false; 
                localP2.power = 0; 
                localP2.powerFlash = 1; 
                localP2.hits = 0;
            }
            else { 
                localP2.hits = Math.min(7, localP2.hits + 1);
                localP2.power = Math.min(100, Math.floor((localP2.hits / 7) * 100));
                if (localP2.hits >= 7) localP2.powerReady = true; 
            }
        }
    }

    // Parede superior = P2 perde ponto
    if (ball.vy < 0 && ball.y <= 0) {
        localP1.score++;
        playerScoreDisplay.textContent = localP1.score;
        if (localP1.score >= WINNING_SCORE) localGameOver(1);
        else localResetBall();
    }

    // Bola passou do fundo = P1 perde ponto
    if (ball.y > CANVAS_HEIGHT) {
        localP2.score++;
        cpuScoreDisplay.textContent = localP2.score;
        if (localP2.score >= WINNING_SCORE) localGameOver(2);
        else localResetBall();
    }
}

function drawLocal() {
    // Raquete P1 (fundo)
    if (localP1PowerActive) {
        let gradient = ctx.createLinearGradient(localP1.x, localP1.y, localP1.x + PADDLE_WIDTH, localP1.y);
        gradient.addColorStop(0, '#ffe066');
        gradient.addColorStop(0.5, '#ffd100');
        gradient.addColorStop(1, '#ffe066');
        ctx.fillStyle = gradient;
        ctx.shadowBlur = 15;
        ctx.shadowColor = '#ffd100';
    } else {
        ctx.fillStyle = localP1.color;
    }
    ctx.fillRect(localP1.x, localP1.y, PADDLE_WIDTH, PADDLE_HEIGHT);
    ctx.shadowBlur = 0;

    // Raquete P2 (topo)
    if (localP2PowerActive) {
        let gradient = ctx.createLinearGradient(localP2.x, localP2.y, localP2.x + PADDLE_WIDTH, localP2.y);
        gradient.addColorStop(0, '#ffe066');
        gradient.addColorStop(0.5, '#ffd100');
        gradient.addColorStop(1, '#ffe066');
        ctx.fillStyle = gradient;
        ctx.shadowBlur = 15;
        ctx.shadowColor = '#ffd100';
    } else {
        ctx.fillStyle = localP2.color;
    }
    ctx.fillRect(localP2.x, localP2.y, PADDLE_WIDTH, PADDLE_HEIGHT);
    ctx.shadowBlur = 0;

    // Bola
    drawBallAsSoccerBall(ctx, ball.x + BALL_SIZE / 2, ball.y + BALL_SIZE / 2, BALL_SIZE / 2);

    // Power bar P1 (inferior direito)
    const barWidth = 80;
    const barHeight = 6;
    const barX = CANVAS_WIDTH - barWidth - 10;
    const barY = CANVAS_HEIGHT - 8;

    ctx.font = "9px 'Share Tech Mono', monospace";
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = localP1.powerReady ? '#ffd100' : '#555555';
    ctx.fillText('POWER', barX - 6, barY + barHeight / 2);
    ctx.fillStyle = localP1.powerReady ? '#2a2200' : '#1a1a1a';
    ctx.fillRect(barX, barY, barWidth, barHeight);
    const fillW1 = (localP1.power / 100) * barWidth;
    if (localP1.powerFlash > 0) {
        ctx.fillStyle = `rgba(255, 209, 0, ${localP1.powerFlash})`;
        ctx.fillRect(barX, barY, barWidth, barHeight);
    }
    ctx.fillStyle = localP1.powerReady ? '#ffd100' : '#444444';
    ctx.fillRect(barX, barY, fillW1, barHeight);
    ctx.strokeStyle = localP1.powerReady ? '#ffd100' : '#333333';
    ctx.lineWidth = 1;
    ctx.strokeRect(barX, barY, barWidth, barHeight);

    // Power bar P2 (superior esquerdo)
    const cpuBarX = 10;
    const cpuBarY = 8;
    ctx.font = "9px 'Share Tech Mono', monospace";
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = localP2.powerReady ? '#ffd100' : '#555555';
    ctx.fillText('POWER', cpuBarX, cpuBarY + barHeight / 2);
    const cpuBarFillX = cpuBarX + 42;
    ctx.fillStyle = localP2.powerReady ? '#2a2200' : '#1a1a1a';
    ctx.fillRect(cpuBarFillX, cpuBarY, barWidth, barHeight);
    const fillW2 = (localP2.power / 100) * barWidth;
    if (localP2.powerFlash > 0) {
        ctx.fillStyle = `rgba(255, 209, 0, ${localP2.powerFlash})`;
        ctx.fillRect(cpuBarFillX, cpuBarY, barWidth, barHeight);
    }
    ctx.fillStyle = localP2.powerReady ? '#ffd100' : '#444444';
    ctx.fillRect(cpuBarFillX, cpuBarY, fillW2, barHeight);
    ctx.strokeStyle = localP2.powerReady ? '#ffd100' : '#333333';
    ctx.lineWidth = 1;
    ctx.strokeRect(cpuBarFillX, cpuBarY, barWidth, barHeight);
}

function localGameOver(winner) {
    gameRunning = false;
    isMoving = false;
    isPaused = false;
    if (gameTimeoutId) clearTimeout(gameTimeoutId);

    const p1Name = inputLocalP1.value.trim() || 'Jogador 1';
    const p2Name = inputLocalP2.value.trim() || 'Jogador 2';

    if (winner === 1) {
        gameOverTitle.innerHTML = `${p1Name} Venceu! <span class="winner-emoji">🏆</span>`;
    } else {
        gameOverTitle.innerHTML = `${p2Name} Venceu! <span class="winner-emoji">🏆</span>`;
    }
    gameOverScreen.classList.remove('hidden');
    setTimeout(() => updateMenuFocus(0), 50);
}

// ─── ONLINE MULTIPLAYER ───────────────────────────────────────────────────────

function openMpWaitScreen(roomCode, isHostPlayer) {
    showScreen(lobbyScreen);
    lobbyRoomCode.textContent = roomCode;
    lobbyWaitText.textContent = 'Aguardando jogador...';
    lobbyPlayers.innerHTML = '';
    btnStartGame.style.display = 'none';
    if (btnReady) btnReady.classList.add('hidden');
    if (lobbyReadyStatus) lobbyReadyStatus.style.display = 'none';
}

function handleCreateRoom() {
    const name = inputCreatePlayerName.value.trim() || 'Jogador';
    const roomName = inputRoomName.value.trim() || ('Sala do ' + name);
    btnCreateConfirm.disabled = true;
    mpHadOpponent = false;
    mpLobbyAutoStarted = false;
    Multiplayer.createRoom(name, roomName, (code) => {
        btnCreateConfirm.disabled = false;
        openMpWaitScreen(code, true);
        setupMpListeners();
    });
}

function handleJoinRoom() {
    const code = inputRoomCode.value.trim().toUpperCase();
    const name = inputPlayerName.value.trim() || 'Jogador';
    if (!code || code.length < 4) {
        joinError.textContent = 'Código muito curto';
        inputRoomCode.style.borderColor = '#ff4a4a';
        setTimeout(() => { inputRoomCode.style.borderColor = ''; joinError.textContent = ''; }, 2000);
        return;
    }
    btnJoinConfirm.disabled = true;
    mpHadOpponent = false;
    mpLobbyAutoStarted = false;
    Multiplayer.joinRoom(code, name, (roomCode, error) => {
        btnJoinConfirm.disabled = false;
        if (error) {
            joinError.textContent = error;
            inputRoomCode.style.borderColor = '#ff4a4a';
            setTimeout(() => { inputRoomCode.style.borderColor = ''; joinError.textContent = ''; }, 2500);
            return;
        }
        openMpWaitScreen(roomCode, false);
        setupMpListeners();
    });
}

function handleShowRooms() {
    showScreen(roomsScreen);
    roomsList.innerHTML = '<div style="color:#555;font-size:0.85rem;">Carregando...</div>';
    Multiplayer.getAvailableRooms((rooms) => {
        if (rooms.length === 0) {
            roomsList.innerHTML = '<div style="color:#555;font-size:0.85rem;">Nenhuma sala disponível</div>';
            return;
        }
        roomsList.innerHTML = '';
        rooms.forEach(room => {
            const item = document.createElement('div');
            item.className = 'room-item';
            item.innerHTML = `
                <div class="room-item-info">
                    <div class="room-item-name">${room.roomName}</div>
                    <div class="room-item-code">${room.code}</div>
                </div>
                <div class="room-item-players">${room.players}/${room.maxPlayers}</div>
                <button class="room-item-join menu-btn menu-btn-primary">Entrar</button>
            `;
            item.querySelector('.room-item-join').addEventListener('click', () => {
                joinFromRooms(room.code);
            });
            roomsList.appendChild(item);
        });
    });
}

function joinFromRooms(code) {
    const nameModal = document.getElementById('name-modal');
    const nameModalInput = document.getElementById('name-modal-input');
    const nameModalConfirm = document.getElementById('name-modal-confirm');
    if (!nameModal || !nameModalInput || !nameModalConfirm) return;

    nameModalInput.value = userNickname;
    nameModal.classList.remove('hidden');
    setTimeout(() => nameModalInput.focus(), 100);

    const cleanup = () => {
        nameModalConfirm.removeEventListener('click', onConfirm);
        nameModalInput.removeEventListener('keydown', onKeyDown);
    };

    const onConfirm = () => {
        cleanup();
        nameModal.classList.add('hidden');
        const name = nameModalInput.value.trim() || 'Jogador';
        Multiplayer.joinRoom(code, name, (roomCode, error) => {
            if (error) { showToast(error); return; }
            openMpWaitScreen(roomCode, false);
            setupMpListeners();
        });
    };

    const onKeyDown = (e) => {
        if (e.key === 'Enter') onConfirm();
    };

    nameModalConfirm.addEventListener('click', onConfirm);
    nameModalInput.addEventListener('keydown', onKeyDown);
}

function handleLeaveRoom() {
    Multiplayer.leaveRoom();
    stopMpSync();
    isMultiplayer = false;
    isMpGameRunning = false;
    mpHadOpponent = false;
    mpLobbyAutoStarted = false;
    showScreen(mpScreen);
}

function setupMpListeners() {
    Multiplayer.onPlayersUpdate = (players) => {
        const ids = Object.keys(players);
        const count = ids.length;

        if (count >= 2) mpHadOpponent = true;

        if (count < 2 && mpHadOpponent && isMultiplayer) {
            mpHadOpponent = false;
            if (gameRunning) {
                gameRunning = false;
                if (gameTimeoutId) clearTimeout(gameTimeoutId);
            }
            isMpGameRunning = false;
            gameOverScreen.classList.add('hidden');
            showToast('O outro jogador saiu da sala');
            setTimeout(() => handleLeaveRoom(), 1000);
            return;
        }

        // Render players in lobby
        lobbyPlayers.innerHTML = ids.map(id => {
            const p = players[id];
            const readyBadge = p.ready ? '<span style="color:#3acc7a;margin-left:4px;">✓</span>' : '';
            return `<div class="mp-player-chip" style="border-color:${p.color}"><span class="mp-dot" style="background:${p.color}"></span> ${p.name}${readyBadge}</div>`;
        }).join('');

        let allReady = count >= 2;
        ids.forEach(id => {
            if (!players[id].ready) allReady = false;
        });

        if (count < 2) {
            lobbyWaitText.textContent = 'Aguardando jogador...';
            lobbyWaitText.style.color = '#888';
        } else {
            if (allReady) {
                lobbyWaitText.textContent = 'Prontos! Iniciando...';
                lobbyWaitText.style.color = '#3acc7a';
            } else {
                const notReadyCount = ids.filter(id => !players[id].ready).length;
                lobbyWaitText.textContent = `Aguardando ${notReadyCount} jogador(es) ficar(em) pronto(s)...`;
                lobbyWaitText.style.color = '#888';
            }
        }

        // Hide start game button always (starts automatically when ready)
        if (btnStartGame) btnStartGame.style.display = 'none';

        // Show/hide ready button for both players
        const myId = Multiplayer.playerId;
        const myReadyState = players[myId]?.ready;
        if (btnReady) {
            if (count >= 2) {
                if (myReadyState) {
                    btnReady.classList.add('hidden');
                } else {
                    btnReady.classList.remove('hidden');
                }
            } else {
                btnReady.classList.add('hidden');
            }
        }

        // Ready status UI without overwrite collision
        if (lobbyReadyStatus) {
            if (count >= 2) {
                const other = ids.find(id => id !== myId);
                const otherReady = other ? players[other].ready : false;
                if (allReady) {
                    lobbyReadyStatus.style.display = 'block';
                    lobbyReadyStatus.textContent = 'Todos prontos! ✓';
                    lobbyReadyStatus.style.color = '#3acc7a';
                } else if (myReadyState && !otherReady) {
                    lobbyReadyStatus.style.display = 'block';
                    lobbyReadyStatus.textContent = `Você está pronto ✓ (Aguardando ${players[other]?.name || 'oponente'}...)`;
                    lobbyReadyStatus.style.color = '#3acc7a';
                } else if (!myReadyState && otherReady) {
                    lobbyReadyStatus.style.display = 'block';
                    lobbyReadyStatus.textContent = `${players[other]?.name || 'Oponente'} está pronto ✓ (Sua vez!)`;
                    lobbyReadyStatus.style.color = '#ffd100';
                } else {
                    lobbyReadyStatus.style.display = 'none';
                }
            } else {
                lobbyReadyStatus.style.display = 'none';
            }
        }

        // Auto-start when all ready
        if (Multiplayer.isHost && count >= 2 && allReady && !mpLobbyAutoStarted) {
            mpLobbyAutoStarted = true;
            Multiplayer.startGame();
        }

        const otherEntries = Object.entries(players).filter(([id]) => id !== myId);
        const otherWants = otherEntries.length > 0 && otherEntries.some(([, p]) => p.wantsRematch);
        const allWantsRematch = Object.values(players).length >= 2 && Object.values(players).every(p => p.wantsRematch);

        if (allWantsRematch && Multiplayer.isHost && !gameRunning) {
            Multiplayer.clearRematch();
            Multiplayer.startGame();
            return;
        }

        const rematchStatus = document.getElementById('rematch-status');
        const myReady = players[myId]?.wantsRematch;
        if (isMultiplayer && !gameRunning) {
            if (myReady) {
                if (restartBtn) restartBtn.style.display = 'none';
                if (rematchStatus) {
                    rematchStatus.style.display = 'block';
                    rematchStatus.textContent = 'Aguardando o outro jogador...';
                    rematchStatus.style.color = '#3acc7a';
                }
            } else {
                if (restartBtn) restartBtn.style.display = 'block';
                if (otherWants) {
                    if (rematchStatus) {
                        rematchStatus.style.display = 'block';
                        rematchStatus.textContent = 'O outro jogador quer jogar novamente!';
                        rematchStatus.style.color = '#3acc7a';
                    }
                } else {
                    if (rematchStatus) rematchStatus.style.display = 'none';
                }
            }
        }
    };

    Multiplayer.onStatusUpdate = (status) => {
        if (status === 'playing') {
            gameOverScreen.classList.add('hidden');
            const rematchStatus = document.getElementById('rematch-status');
            if (rematchStatus) rematchStatus.style.display = 'none';
            if (!isMpGameRunning) startMultiplayerGame();
        } else if (status === 'gameover' && !Multiplayer.isHost) {
            stopMpSync();
            isMpGameRunning = false;
            gameRunning = false;
            isMoving = false;
            if (gameTimeoutId) clearTimeout(gameTimeoutId);

            // Determinar se ganhou ou perdeu comparando scores
            const won = player.score > opponentScore;

            const totalPlayers = Object.keys(Multiplayer.players).length;
            if (totalPlayers <= 1) {
                gameOverTitle.innerHTML = `Fim de Jogo! Pontuação: ${player.score}`;
            } else {
                gameOverTitle.innerHTML = won
                    ? 'Você Venceu! <span class="winner-emoji">🏆</span>'
                    : 'Você Perdeu! <span class="skull-emoji">💀</span>';
            }

            restartBtn.style.display = 'block';
            restartBtn.innerHTML = 'Jogar novamente <span class="btn-emoji-restart">🔄</span>';
            const rematchStatus = document.getElementById('rematch-status');
            if (rematchStatus) rematchStatus.style.display = 'none';
            gameOverScreen.classList.remove('hidden');
        } else if (status === 'ended') {
            Multiplayer.leaveRoom();
            stopMpSync();
            isMultiplayer = false;
            isMpGameRunning = false;
            gameOverScreen.classList.add('hidden');
            showScreen(mpScreen);
        }
    };

    Multiplayer.onPauseUpdate = (pausedBy) => {
        const overlay = document.getElementById('pause-overlay-mp');
        const text = document.getElementById('pause-text-mp');
        const resetBtn = document.getElementById('mobile-reset-btn');
        if (pausedBy) {
            isPaused = true;
            if (gameTimeoutId) clearTimeout(gameTimeoutId);
            if (text) text.textContent = pausedBy + ' pausou o jogo';
            if (overlay) overlay.classList.remove('hidden');
            if (resetBtn) resetBtn.classList.remove('hidden');
            if (mobilePauseBtn) {
                mobilePauseBtn.textContent = '▶';
                mobilePauseBtn.classList.add('active');
            }
        } else {
            isPaused = false;
            if (overlay) overlay.classList.add('hidden');
            if (resetBtn && !isPaused) resetBtn.classList.add('hidden');
            if (mobilePauseBtn) {
                mobilePauseBtn.textContent = '⏸';
                mobilePauseBtn.classList.remove('active');
            }
            gameTick();
        }
        setTimeout(() => updateMenuFocus(0), 50);
    };

    Multiplayer.onBallUpdate = (ballState) => {
        if (!Multiplayer.isHost && isMpGameRunning) {
            // Espelhar bola: cliente vê de perspectiva invertida (sempre控制底部)
            ball.x = ballState.x;
            ball.y = CANVAS_HEIGHT - ballState.y - BALL_SIZE;
            ball.vx = ballState.vx;
            ball.vy = -ballState.vy;
        }
    };

    Multiplayer.onRoomDeleted = () => {
        Multiplayer.leaveRoom();
        stopMpSync();
        isMultiplayer = false;
        isMpGameRunning = false;
        showScreen(mpScreen);
    };

    Multiplayer.onScoresUpdate = (scores) => {
        if (Multiplayer.isHost) {
            player.score = scores.host;
            opponentScore = scores.guest;
        } else {
            player.score = scores.guest;
            opponentScore = scores.host;
        }
        playerScoreDisplay.textContent = player.score;
        cpuScoreDisplay.textContent = opponentScore;
    };
}

function startMpSync() {
    stopMpSync();
    mpSyncInterval = setInterval(() => {
        if (!isMpGameRunning || !Multiplayer.roomCode) return;

        Multiplayer.sendPaddle(player.x, player.y);
        Multiplayer.sendDirection(player.direction);

        if (Multiplayer.isHost) {
            Multiplayer.sendBallState({ x: ball.x, y: ball.y, vx: ball.vx, vy: ball.vy });

            // Host envia ambos os scores
            Multiplayer.sendScores(player.score, opponentScore);

            // Host detecta se o oponente pressionou uma tecla e inicia a bola
            if (!isMoving && gameRunning) {
                const ids = Object.keys(Multiplayer.players);
                for (let i = 0; i < ids.length; i++) {
                    if (ids[i] !== Multiplayer.playerId) {
                        const opp = Multiplayer.players[ids[i]];
                        if (opp && opp.isMoving) {
                            triggerStart();
                            break;
                        }
                    }
                }
            }
        }

        updateOpponentState();
    }, 50);
}

function stopMpSync() {
    if (mpSyncInterval) { clearInterval(mpSyncInterval); mpSyncInterval = null; }
}

function updateOpponentState() {
    const ids = Object.keys(Multiplayer.players);
    const myId = Multiplayer.playerId;
    for (let i = 0; i < ids.length; i++) {
        if (ids[i] !== myId) {
            const opp = Multiplayer.players[ids[i]];
            opponentPaddle.x = opp.paddle?.x !== undefined ? opp.paddle.x : (opp.paddle || CANVAS_WIDTH / 2 - PADDLE_WIDTH / 2);
            const rawY = opp.paddle?.y !== undefined ? opp.paddle.y : (CANVAS_HEIGHT - 15 - PADDLE_HEIGHT);
            opponentPaddle.y = CANVAS_HEIGHT - rawY - PADDLE_HEIGHT;
            opponentName = opp.name || 'Oponente';
            opponentColor = opp.color || '#00c8ff';
            opponentPowerActive = opp.powerActive || false;
            return;
        }
    }
}

function startMultiplayerGame() {
    if (gameRunning) return;
    isMultiplayer = true;
    isMpGameRunning = true;
    isLocalMultiplayer = false;
    vsCpu = false;

    player.score = 0;
    opponentScore = 0;
    playerScoreDisplay.textContent = '0';

    const cpuScoreLabel = document.getElementById('cpu-score-label');
    const cpuScoreVal = document.getElementById('cpu-score');
    if (cpuScoreLabel) cpuScoreLabel.textContent = 'OPP';
    if (cpuScoreVal) { cpuScoreVal.textContent = '0'; cpuScoreVal.style.display = ''; }

    gameOverScreen.classList.add('hidden');
    showScreen(null);
    player.x = CANVAS_WIDTH / 2 - PADDLE_WIDTH / 2;
    opponentPaddle.x = CANVAS_WIDTH / 2 - PADDLE_WIDTH / 2;
    player.direction = 0;
    isMoving = false;
    power = 0;
    powerReady = false;
    powerFlash = 0;
    spaceHeld = false;
    isPaused = false;
    if (mobilePauseBtn) { mobilePauseBtn.textContent = '⏸'; mobilePauseBtn.classList.remove('active'); }
    gameRunning = true;
    startMpSync();
    Multiplayer.sendScores(player.score, opponentScore);
    if (gameTimeoutId) clearTimeout(gameTimeoutId);
    gameTick();
}

function mpGameOver(won) {
    gameRunning = false;
    isMoving = false;
    isPaused = false;
    if (gameTimeoutId) clearTimeout(gameTimeoutId);

    // Enviar scores finais antes de parar sync
    if (Multiplayer.isHost) {
        Multiplayer.sendScores(player.score, opponentScore);
    }
    stopMpSync();
    isMpGameRunning = false;

    const totalPlayers = Object.keys(Multiplayer.players).length;
    if (totalPlayers === 1) {
        gameOverTitle.innerHTML = `Fim de Jogo! Pontuação: ${player.score}`;
    } else {
        gameOverTitle.innerHTML = won
            ? 'Você Venceu! <span class="winner-emoji">🏆</span>'
            : 'Você Perdeu! <span class="skull-emoji">💀</span>';
    }

    restartBtn.style.display = 'block';
    restartBtn.innerHTML = 'Jogar novamente <span class="btn-emoji-restart">🔄</span>';

    const rematchStatus = document.getElementById('rematch-status');
    if (rematchStatus) rematchStatus.style.display = 'none';

    gameOverScreen.classList.remove('hidden');

    // Host: atualizar status e quem venceu no Firebase
    if (Multiplayer.isHost && Multiplayer.roomRef) {
        Multiplayer.roomRef.child('winner').set(won ? Multiplayer.playerId : '');
        Multiplayer.roomRef.child('status').set('gameover');
    }
}

function triggerStartMp() {
    if (!isMoving && gameRunning && !isPaused) {
        isMoving = true;
        const dirY = Math.random() > 0.5 ? 1 : -1;
        const angle = (Math.random() * 2 - 1) * (Math.PI / 4);
        ball.vx = ball.speed * Math.sin(angle);
        ball.vy = dirY * ball.speed * Math.cos(angle);
        Multiplayer.sendMoving(true);
        Multiplayer.sendBallState({ x: ball.x, y: ball.y, vx: ball.vx, vy: ball.vy });
    }
}

// ─── CONTROLES ────────────────────────────────────────────────────────────────

let localP2SpaceHeld = false;

window.addEventListener('keydown', (e) => {
    const tag = document.activeElement?.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA') return;

    let keyHandled = false;

    const activeMenu = getActiveMenuScreen();
    if (activeMenu) {
        let menuHandled = false;
        switch (e.key) {
            case 'ArrowUp': case 'w': case 'W':
                updateMenuFocus(-1);
                if (dpadUp) dpadUp.classList.add('active');
                menuHandled = true; break;
            case 'ArrowDown': case 's': case 'S':
                updateMenuFocus(1);
                if (dpadDown) dpadDown.classList.add('active');
                menuHandled = true; break;
            case ' ': case 'Enter': case 'z': case 'Z': case 'x': case 'X':
                activateFocusedElement();
                if (actionPower) actionPower.classList.add('active');
                menuHandled = true; break;
        }
        if (menuHandled) {
            e.preventDefault();
            return;
        }
    }

    if (isLocalMultiplayer && gameRunning) {
        // P2: A/D
        if (e.key === 'a' || e.key === 'A') { localP2.direction = -1; localTriggerStart(); keyHandled = true; }
        if (e.key === 'd' || e.key === 'D') { localP2.direction = 1; localTriggerStart(); keyHandled = true; }
        // P2 vertical: W/S
        if (e.key === 'w' || e.key === 'W') { localP2.yDirection = -1; localTriggerStart(); keyHandled = true; }
        if (e.key === 's' || e.key === 'S') { localP2.yDirection = 1; localTriggerStart(); keyHandled = true; }
        // P2 poder: Q/E
        if (e.key === 'q' || e.key === 'Q' || e.key === 'e' || e.key === 'E') { 
            if (localP2.powerReady && !localP2PowerActive) {
                localP2PowerActive = true;
            }
            localP2SpaceHeld = true; 
            keyHandled = true; 
        }
    }

    switch (e.key) {
        case 'ArrowLeft':
            if (isLocalMultiplayer && gameRunning) { localP1.direction = -1; localTriggerStart(); }
            else movePlayer(-1);
            if (dpadLeft) dpadLeft.classList.add('active');
            keyHandled = true;
            break;
        case 'ArrowRight':
            if (isLocalMultiplayer && gameRunning) { localP1.direction = 1; localTriggerStart(); }
            else movePlayer(1);
            if (dpadRight) dpadRight.classList.add('active');
            keyHandled = true;
            break;
        case 'ArrowUp':
            if (isLocalMultiplayer && gameRunning) { localP1.yDirection = -1; localTriggerStart(); }
            else movePlayerY(-1);
            if (dpadUp) dpadUp.classList.add('active');
            keyHandled = true;
            break;
        case 'ArrowDown':
            if (isLocalMultiplayer && gameRunning) { localP1.yDirection = 1; localTriggerStart(); }
            else movePlayerY(1);
            if (dpadDown) dpadDown.classList.add('active');
            keyHandled = true;
            break;
        case ' ':
            if (isLocalMultiplayer && gameRunning) {
                if (localP1.powerReady && !localP1PowerActive) {
                    localP1PowerActive = true;
                }
            } else {
                if (powerReady && !powerActive) {
                    powerActive = true;
                    if (isMultiplayer) {
                        Multiplayer.sendState({ powerActive: true });
                    }
                }
            }
            spaceHeld = true;
            if (actionPower) actionPower.classList.add('active');
            if (!gameRunning && !menuScreen.classList.contains('hidden')) startGame(vsCpu);
            keyHandled = true;
            break;
        case 'p':
        case 'P':
            togglePause();
            keyHandled = true;
            break;
    }

    if (keyHandled) e.preventDefault();
});

window.addEventListener('keyup', (e) => {
    if (isLocalMultiplayer && gameRunning) {
        if ((e.key === 'a' || e.key === 'A') && localP2.direction === -1) localP2.direction = 0;
        if ((e.key === 'd' || e.key === 'D') && localP2.direction === 1) localP2.direction = 0;
        if ((e.key === 'w' || e.key === 'W') && localP2.yDirection === -1) localP2.yDirection = 0;
        if ((e.key === 's' || e.key === 'S') && localP2.yDirection === 1) localP2.yDirection = 0;
        if (e.key === 'q' || e.key === 'Q' || e.key === 'e' || e.key === 'E') localP2SpaceHeld = false;
    }

    switch (e.key) {
        case 'ArrowLeft':
            if (isLocalMultiplayer && gameRunning) { if (localP1.direction === -1) localP1.direction = 0; }
            else { if (player.direction === -1) movePlayer(0); }
            if (dpadLeft) dpadLeft.classList.remove('active');
            break;
        case 'ArrowRight':
            if (isLocalMultiplayer && gameRunning) { if (localP1.direction === 1) localP1.direction = 0; }
            else { if (player.direction === 1) movePlayer(0); }
            if (dpadRight) dpadRight.classList.remove('active');
            break;
        case 'ArrowUp':
            if (isLocalMultiplayer && gameRunning) { if (localP1.yDirection === -1) localP1.yDirection = 0; }
            else { if (player.yDirection === -1) movePlayerY(0); }
            if (dpadUp) dpadUp.classList.remove('active');
            break;
        case 'ArrowDown':
            if (isLocalMultiplayer && gameRunning) { if (localP1.yDirection === 1) localP1.yDirection = 0; }
            else { if (player.yDirection === 1) movePlayerY(0); }
            if (dpadDown) dpadDown.classList.remove('active');
            break;
        case ' ':
            spaceHeld = false;
            if (actionPower) actionPower.classList.remove('active');
            break;
    }
});

// Botões móveis
function movePlayerY(dir) {
    if (isLocalMultiplayer && gameRunning) {
        localP1.yDirection = dir;
        if (dir !== 0) localTriggerStart();
    } else {
        player.yDirection = dir;
        if (dir !== 0) triggerStart();
    }
}

function setupMobileButton(btn, dir, isY = false) {
    if (!btn) return;
    const triggerDir = (e) => { 
        e.preventDefault(); 
        btn.classList.add('active');
        if (updateMenuFocus(0)) {
            if (isY) {
                if (dir === -1) updateMenuFocus(-1);
                else if (dir === 1) updateMenuFocus(1);
            }
            return;
        }
        if (isY) movePlayerY(dir); 
        else movePlayer(dir); 
    };
    const releaseDir = () => { 
        if (isY) movePlayerY(0); 
        else movePlayer(0); 
        btn.classList.remove('active'); 
    };
    btn.addEventListener('touchstart', triggerDir, { passive: false });
    btn.addEventListener('touchend', releaseDir, { passive: true });
    btn.addEventListener('touchcancel', releaseDir, { passive: true });
    btn.addEventListener('mousedown', (e) => { 
        btn.classList.add('active'); 
        if (updateMenuFocus(0)) {
            if (isY) {
                if (dir === -1) updateMenuFocus(-1);
                else if (dir === 1) updateMenuFocus(1);
            }
            return;
        }
        if (isY) movePlayerY(dir); 
        else movePlayer(dir); 
    });
    btn.addEventListener('mouseup', releaseDir);
    btn.addEventListener('mouseleave', releaseDir);
}

setupMobileButton(dpadLeft, -1, false);
setupMobileButton(dpadRight, 1, false);
setupMobileButton(dpadUp, -1, true);
setupMobileButton(dpadDown, 1, true);

// Botão power mobile
if (actionPower) {
    const triggerPower = (e) => { 
        e.preventDefault(); 
        actionPower.classList.add('active');
        if (activateFocusedElement()) return;
        spaceHeld = true; 
    };
    const releasePower = () => { spaceHeld = false; actionPower.classList.remove('active'); };
    actionPower.addEventListener('touchstart', triggerPower, { passive: false });
    actionPower.addEventListener('touchend', releasePower, { passive: true });
    actionPower.addEventListener('touchcancel', releasePower, { passive: true });
    actionPower.addEventListener('mousedown', (e) => {
        actionPower.classList.add('active');
        if (activateFocusedElement()) return;
        spaceHeld = true;
    });
    actionPower.addEventListener('mouseup', releasePower);
    actionPower.addEventListener('mouseleave', releasePower);
}

// ─── EVENT LISTENERS ──────────────────────────────────────────────────────────

// Menu principal
if (btnSolo) btnSolo.addEventListener('click', () => startGame(false));
if (btnVsCpu) btnVsCpu.addEventListener('click', () => startGame(true));
if (btnShowMultiplayer) btnShowMultiplayer.addEventListener('click', () => showScreen(mpScreen));
if (btnMpBack) btnMpBack.addEventListener('click', showMenu);

// Local multiplayer
if (btnLocalMultiplayer) btnLocalMultiplayer.addEventListener('click', () => showScreen(localLobbyScreen));
if (btnStartLocal) btnStartLocal.addEventListener('click', startLocalMultiplayer);
if (btnBackLocalLobby) btnBackLocalLobby.addEventListener('click', () => showScreen(mpScreen));

// Criar sala
if (btnCreateRoom) btnCreateRoom.addEventListener('click', () => {
    inputCreatePlayerName.value = userNickname;
    inputRoomName.value = userNickname ? 'Sala de ' + userNickname : '';
    showScreen(createScreen);
});
if (btnCreateConfirm) btnCreateConfirm.addEventListener('click', handleCreateRoom);
if (btnBackMenuCreate) btnBackMenuCreate.addEventListener('click', () => showScreen(mpScreen));

// Ver salas
if (btnShowRooms) btnShowRooms.addEventListener('click', handleShowRooms);
if (btnRefreshRooms) btnRefreshRooms.addEventListener('click', handleShowRooms);
if (btnBackMenuRooms) btnBackMenuRooms.addEventListener('click', () => showScreen(mpScreen));

// Entrar com código
if (btnShowJoin) btnShowJoin.addEventListener('click', () => {
    inputPlayerName.value = userNickname;
    showScreen(joinScreen);
});
if (btnJoinConfirm) btnJoinConfirm.addEventListener('click', handleJoinRoom);
if (btnBackMenu) btnBackMenu.addEventListener('click', () => showScreen(mpScreen));

// Lobby online
if (btnStartGame) btnStartGame.style.display = 'none';
if (btnLeaveLobby) btnLeaveLobby.addEventListener('click', handleLeaveRoom);
if (btnReady) {
    btnReady.addEventListener('click', () => {
        Multiplayer.sendReady(true);
        btnReady.classList.add('hidden');
    });
}

// Restart e pause
if (restartBtn) restartBtn.addEventListener('click', () => {
    if (isLocalMultiplayer) {
        startLocalMultiplayer();
    } else if (isMultiplayer) {
        Multiplayer.sendRematch(true);
        restartBtn.style.display = 'none';
        const rematchStatus = document.getElementById('rematch-status');
        if (rematchStatus) {
            rematchStatus.style.display = 'block';
            rematchStatus.textContent = 'Aguardando o outro jogador...';
        }
        if (Multiplayer.isHost) {
            const myId = Multiplayer.playerId;
            const players = Multiplayer.players;
            const otherEntries = Object.entries(players).filter(([id]) => id !== myId);
            const allWantsRematch = Object.values(players).length >= 2 && Object.values(players).every(p => p.wantsRematch);
            if (allWantsRematch) {
                Multiplayer.clearRematch();
                Multiplayer.startGame();
            }
        }
    } else {
        startGame(vsCpu);
    }
});

const btnBackMenuGo = document.getElementById('btn-back-menu-go');
if (btnBackMenuGo) {
    btnBackMenuGo.addEventListener('click', () => {
        gameOverScreen.classList.add('hidden');
        if (isMultiplayer) {
            handleLeaveRoom();
        } else {
            showMenu();
        }
    });
}

if (mobilePauseBtn) {
    const handlePauseTrigger = (e) => {
        e.preventDefault();
        if (!instructionsModal.classList.contains('hidden')) closeInstructions();
        else togglePause();
    };
    mobilePauseBtn.addEventListener('touchstart', handlePauseTrigger, { passive: false });
    mobilePauseBtn.addEventListener('click', handlePauseTrigger);
}

// Impede rolagem
document.getElementById('app-container').addEventListener('touchmove', (e) => e.preventDefault(), { passive: false });

// ─── MODAL DE INSTRUÇÕES ─────────────────────────────────────────────────────

function openInstructions() {
    if (gameRunning && !isPaused) {
        isPaused = true;
        isPausedByInstructions = true;
        if (gameTimeoutId) clearTimeout(gameTimeoutId);
    }
    instructionsModal.classList.remove('hidden');
    draw();
    if (mobilePauseBtn) { mobilePauseBtn.textContent = '✕'; mobilePauseBtn.classList.add('active'); }
    setTimeout(() => updateMenuFocus(0), 50);
}

function closeInstructions() {
    instructionsModal.classList.add('hidden');
    if (mobilePauseBtn) { mobilePauseBtn.textContent = '⏸'; mobilePauseBtn.classList.remove('active'); }
    if (gameRunning && isPaused && isPausedByInstructions) {
        isPaused = false;
        isPausedByInstructions = false;
        gameTick();
    }
    setTimeout(() => updateMenuFocus(0), 50);
}

if (learnBtn) {
    const toggleInstructions = () => {
        if (instructionsModal.classList.contains('hidden')) openInstructions();
        else closeInstructions();
    };
    learnBtn.addEventListener('click', toggleInstructions);
    learnBtn.addEventListener('touchstart', (e) => { e.preventDefault(); toggleInstructions(); }, { passive: false });
}

if (closeInstructionsBtn) {
    closeInstructionsBtn.addEventListener('click', closeInstructions);
    closeInstructionsBtn.addEventListener('touchstart', (e) => { e.preventDefault(); closeInstructions(); }, { passive: false });
}

if (instructionsModal) {
    instructionsModal.addEventListener('click', (e) => {
        if (e.target === instructionsModal) closeInstructions();
    });
}

// Enter nos inputs
if (inputLocalP2) inputLocalP2.addEventListener('keydown', (e) => { if (e.key === 'Enter') startLocalMultiplayer(); });
if (inputCreatePlayerName) inputCreatePlayerName.addEventListener('keydown', (e) => { if (e.key === 'Enter') handleCreateRoom(); });
if (inputPlayerName) inputPlayerName.addEventListener('keydown', (e) => { if (e.key === 'Enter') handleJoinRoom(); });
if (inputRoomCode) inputRoomCode.addEventListener('keydown', (e) => { if (e.key === 'Enter') handleJoinRoom(); });

// ─── NAVEGAÇÃO DE MENU VIA CONTROLES ──────────────────────────────────────────
let menuFocusIndex = 0;
let lastActiveScreen = null;

function getActiveMenuScreen() {
    const screens = [
        document.getElementById('menu-screen'),
        document.getElementById('mp-screen'),
        document.getElementById('local-lobby-screen'),
        document.getElementById('create-screen'),
        document.getElementById('rooms-screen'),
        document.getElementById('join-screen'),
        document.getElementById('lobby-screen'),
        document.getElementById('game-over-screen'),
        document.getElementById('instructions-modal'),
        document.getElementById('pause-overlay-mp')
    ];
    return screens.find(s => s && !s.classList.contains('hidden') && s.offsetParent !== null);
}

function getFocusableElements(screen) {
    if (!screen) return [];
    const elements = Array.from(screen.querySelectorAll('button, input, a'));
    return elements.filter(el => {
        const style = window.getComputedStyle(el);
        return style.display !== 'none' && style.visibility !== 'hidden' && !el.disabled && el.offsetParent !== null && !el.classList.contains('modal-close-btn');
    });
}

function updateMenuFocus(direction = 0) {
    const activeScreen = getActiveMenuScreen();
    if (!activeScreen) {
        lastActiveScreen = null;
        document.querySelectorAll('.menu-btn, .menu-btn-secondary, .menu-btn-back, .room-input, .mp-input').forEach(el => el.classList.remove('focused'));
        return false;
    }

    const elements = getFocusableElements(activeScreen);
    if (elements.length === 0) return false;

    if (activeScreen !== lastActiveScreen) {
        lastActiveScreen = activeScreen;
        menuFocusIndex = 0;
    }

    elements.forEach(el => el.classList.remove('focused'));
    menuFocusIndex = (menuFocusIndex + direction + elements.length) % elements.length;

    const currentEl = elements[menuFocusIndex];
    if (currentEl) {
        currentEl.classList.add('focused');
    }
    return true;
}

function activateFocusedElement() {
    const activeScreen = getActiveMenuScreen();
    if (!activeScreen) return false;

    const elements = getFocusableElements(activeScreen);
    const currentEl = elements[menuFocusIndex];
    if (currentEl) {
        if (currentEl.tagName === 'INPUT') {
            currentEl.focus();
        } else {
            currentEl.click();
        }
        return true;
    }
    return false;
}

// Reset Button
const mobileResetBtn = document.getElementById('mobile-reset-btn');
if (mobileResetBtn) {
    const handleReset = (e) => {
        e.preventDefault();
        mobileResetBtn.classList.add('hidden');
        if (isMultiplayer) {
            handleLeaveRoom();
        } else {
            isPaused = false;
            gameRunning = false;
            if (gameTimeoutId) clearTimeout(gameTimeoutId);
            const pOverlay = document.getElementById('pause-overlay');
            if (pOverlay) pOverlay.classList.add('hidden');
            showMenu();
        }
    };
    mobileResetBtn.addEventListener('touchstart', handleReset, { passive: false });
    mobileResetBtn.addEventListener('click', handleReset);
}
showMenu(); // Ensure menu is initialized with focus on load

