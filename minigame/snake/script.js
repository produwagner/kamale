// ═══════════════════════════════════════════════════════════════════════════════
// SNAKE — Script Principal (Singleplayer + Multiplayer)
// ═══════════════════════════════════════════════════════════════════════════════

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

function drawFoodAsSoccerBall(c, cx, cy, r) {
    if (isDonor && soccerBallImg && soccerBallImg.complete && soccerBallImg.naturalWidth > 0) {
        c.drawImage(soccerBallImg, cx - r, cy - r, r * 2, r * 2);
    } else {
        c.fillStyle = '#ff4a4a';
        c.beginPath();
        c.arc(cx, cy, r, 0, Math.PI * 2);
        c.fill();
    }
}

// ─── ELEMENTOS DO DOM ─────────────────────────────────────────────────────────
const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');
const scoreVal = document.getElementById('score-val');
const highscoreVal = document.getElementById('highscore-val');
const finalScore = document.getElementById('final-score');
const gameOverScreen = document.getElementById('game-over-screen');
const restartBtn = document.getElementById('restart-btn');
const backToMenuBtn = document.getElementById('back-to-menu-btn');
const instructionsModal = document.getElementById('instructions-modal');
const learnBtn = document.getElementById('learn-btn');
const menuLearnBtn = document.getElementById('menu-learn-btn');
const closeInstructionsBtn = document.getElementById('close-instructions-btn');

// Botões D-pad
const dpadUp = document.getElementById('dpad-up');
const dpadDown = document.getElementById('dpad-down');
const dpadLeft = document.getElementById('dpad-left');
const dpadRight = document.getElementById('dpad-right');
const actionA = document.getElementById('action-a');
const mobilePauseBtn = document.getElementById('mobile-pause-btn');

// Telas
const menuScreen = document.getElementById('menu-screen');
const multiplayerScreen = document.getElementById('multiplayer-screen');
const joinScreen = document.getElementById('join-screen');
const createScreen = document.getElementById('create-screen');
const roomsScreen = document.getElementById('rooms-screen');
const localLobbyScreen = document.getElementById('local-lobby-screen');
const gameScreen = document.getElementById('game-screen');
const lobbyScreen = document.getElementById('lobby-screen');
const mpGameScreen = document.getElementById('mp-game-screen');

// Menu
const btnSolo = document.getElementById('btn-solo');
const btnShowMultiplayer = document.getElementById('btn-show-multiplayer');
const btnBackMultiplayer = document.getElementById('btn-back-multiplayer');
const btnLocalMultiplayer = document.getElementById('btn-local-multiplayer');
const btnStartLocal = document.getElementById('btn-start-local');
const btnBackLocalLobby = document.getElementById('btn-back-local-lobby');
const inputLocalP1 = document.getElementById('input-local-p1');
const inputLocalP2 = document.getElementById('input-local-p2');
const btnCreateRoom = document.getElementById('btn-create-room');
const btnShowJoin = document.getElementById('btn-show-join');
const btnShowRooms = document.getElementById('btn-show-rooms');
const btnBackMenu = document.getElementById('btn-back-menu');
const btnJoinConfirm = document.getElementById('btn-join-confirm');
const inputRoomCode = document.getElementById('input-room-code');
const inputPlayerName = document.getElementById('input-player-name');
const joinError = document.getElementById('join-error');

// Criar Sala
const inputRoomName = document.getElementById('input-room-name');
const inputCreatePlayerName = document.getElementById('input-create-player-name');
const btnCreateConfirm = document.getElementById('btn-create-confirm');
const btnBackMenuCreate = document.getElementById('btn-back-menu-create');

// Ver Salas
const roomsList = document.getElementById('rooms-list');
const btnRefreshRooms = document.getElementById('btn-refresh-rooms');
const btnBackMenuRooms = document.getElementById('btn-back-menu-rooms');

// Lobby
const lobbyRoomCode = document.getElementById('lobby-room-code');
const lobbyPlayers = document.getElementById('lobby-players');
const lobbyWaiting = document.getElementById('lobby-waiting');
const btnStartGame = document.getElementById('btn-start-game');
const btnLeaveLobby = document.getElementById('btn-leave-lobby');
const btnReady = document.getElementById('btn-ready');
const lobbyReadyStatus = document.getElementById('lobby-ready-status');

// Multiplayer canvas
const mpCanvas = document.getElementById('mp-game-canvas');
const mpCtx = mpCanvas ? mpCanvas.getContext('2d') : null;
const mpScoreVal = document.getElementById('mp-score-val');
const mpOtherScores = document.getElementById('mp-other-scores');
const mpPlayersBar = document.getElementById('mp-players-bar');
const spectatorOverlay = document.getElementById('spectator-overlay');
const victoryOverlay = document.getElementById('victory-overlay');
const victoryText = document.getElementById('victory-text');
const victoryLeaderboard = document.getElementById('victory-leaderboard');
const spectatorLeaderboard = document.getElementById('spectator-leaderboard');
const btnBackMenuVictory = document.getElementById('btn-back-menu-victory');
const btnLeaveLobby2 = document.getElementById('btn-leave-lobby');
const mpInstructionsModal = document.getElementById('mp-instructions-modal');
const mpCloseInstructionsBtn = document.getElementById('mp-close-instructions-btn');

// ─── CONFIGURAÇÕES ────────────────────────────────────────────────────────────
const GRID_SIZE = 20;
const CELL_SIZE = canvas.width / GRID_SIZE;
const BOOST_HOLD_DELAY = 300;

// ─── ESTADO DO JOGO ───────────────────────────────────────────────────────────
let snake = [];
let food = { x: 0, y: 0 };
let direction = { x: 0, y: 0 };
let nextDirection = { x: 0, y: 0 };
let score = 0;
let highscore = parseInt(localStorage.getItem('snake_highscore'), 10) || 0;
let gameRunning = false;
let isMoving = false;
let isPaused = false;
let isPausedByInstructions = false;
let isBoosting = false;
let boostHoldTimer = null;
let isTongueActive = false;
let gameTimeoutId = null;
let tongueAnim = null;
let tongueAteFood = false;
let ballBubble = null;

// ─── ESTADO MULTIPLAYER ───────────────────────────────────────────────────────
let isMultiplayer = false;
let isLocalMultiplayer = false;
let otherPlayers = {};   // { playerId: { snake, color, name, alive, score } }
let mpFood = { x: 10, y: 10 };
let mpIsSpectating = false;
let mpFoodReady = false;
let mpLobbyAutoStarted = false;
let mpHadOpponent = false;
let otherTongueAnims = {}; // { playerId: { progress, phase, dir, headX, headY } }
let otherTongueTimes = {}; // { playerId: timestamp }

// ─── ESTADO LOCAL MULTIPLAYER ─────────────────────────────────────────────────
let localP1 = { snake: [], direction: { x: 0, y: 0 }, nextDirection: { x: 0, y: 0 }, alive: true, score: 0, isMoving: false, name: '', isTongueActive: false, tongueAnim: null, tongueAteFood: false };
let localP2 = { snake: [], direction: { x: 0, y: 0 }, nextDirection: { x: 0, y: 0 }, alive: true, score: 0, isMoving: false, name: '', isTongueActive: false, tongueAnim: null, tongueAteFood: false };

// ─── CORES DOS JOGADORES ──────────────────────────────────────────────────────
const PLAYER_COLORS = ['#3acc7a', '#00c8ff', '#ff6b6b', '#ffd100'];

// ═══ GERENCIAMENTO DE TELAS ═══════════════════════════════════════════════════

function showScreen(screen) {
    [menuScreen, multiplayerScreen, joinScreen, createScreen, roomsScreen, localLobbyScreen, gameScreen, lobbyScreen, mpGameScreen].forEach(s => {
        if (s) s.classList.add('hidden');
    });
    if (screen) screen.classList.remove('hidden');
    setTimeout(() => updateMenuFocus(0), 50);
}

// ═══ MENU PRINCIPAL ═══════════════════════════════════════════════════════════

function showMenu() {
    isMultiplayer = false;
    gameRunning = false;
    if (gameTimeoutId) clearTimeout(gameTimeoutId);
    showScreen(menuScreen);
}

btnSolo.addEventListener('click', () => {
    isMultiplayer = false;
    showScreen(gameScreen);
    startGame();
});

btnShowMultiplayer.addEventListener('click', () => {
    showScreen(multiplayerScreen);
});

btnBackMultiplayer.addEventListener('click', showMenu);

btnLocalMultiplayer.addEventListener('click', () => {
    inputLocalP1.value = '';
    inputLocalP2.value = '';
    showScreen(localLobbyScreen);
    setTimeout(() => inputLocalP1.focus(), 100);
});

btnBackLocalLobby.addEventListener('click', () => showScreen(multiplayerScreen));

btnStartLocal.addEventListener('click', startLocalMultiplayer);
inputLocalP1.addEventListener('keydown', (e) => { if (e.key === 'Enter') inputLocalP2.focus(); });
inputLocalP2.addEventListener('keydown', (e) => { if (e.key === 'Enter') startLocalMultiplayer(); });

btnCreateRoom.addEventListener('click', () => {
    inputCreatePlayerName.value = userNickname || 'Jogador 1';
    inputRoomName.value = userNickname ? 'Sala de ' + userNickname : 'Sala 1';
    showScreen(createScreen);
    setTimeout(() => inputRoomName.focus(), 100);

    // Busca dinâmica do primeiro nome de sala sequencial livre
    if (typeof firebase !== 'undefined' && firebase.database) {
        firebase.database().ref('rooms').once('value', (snap) => {
            let activeRoomNames = [];
            snap.forEach(child => {
                const r = child.val();
                if (r.roomName && (r.status === 'waiting' || r.status === 'playing')) {
                    activeRoomNames.push(r.roomName);
                }
            });
            let num = 1;
            while (activeRoomNames.includes('Sala ' + num)) {
                num++;
            }
            inputRoomName.value = userNickname ? 'Sala de ' + userNickname : 'Sala ' + num;
        });
    }
});

btnCreateConfirm.addEventListener('click', createRoomFromScreen);
inputRoomName.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') inputCreatePlayerName.focus();
});
inputCreatePlayerName.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') createRoomFromScreen();
});

function createRoomFromScreen() {
    const name = inputCreatePlayerName.value.trim() || 'Jogador';
    const roomName = inputRoomName.value.trim() || ('Sala do ' + name);
    isMultiplayer = true;
    mpLobbyAutoStarted = false;
    mpHadOpponent = false;
    showScreen(lobbyScreen);
    Multiplayer.createRoom(name, roomName, (code) => {
        lobbyRoomCode.textContent = code;
        updateLobbyPlayers(Multiplayer.players);
        btnStartGame.classList.add('hidden');
    });
}

btnBackMenuCreate.addEventListener('click', () => showScreen(multiplayerScreen));

btnShowJoin.addEventListener('click', () => {
    joinError.classList.add('hidden');
    inputRoomCode.value = '';
    inputPlayerName.value = userNickname || 'Jogador 2';
    showScreen(joinScreen);
    setTimeout(() => inputRoomCode.focus(), 100);
});

btnBackMenu.addEventListener('click', () => showScreen(multiplayerScreen));

// ─── ENTRAR NA SALA ───────────────────────────────────────────────────────────

btnJoinConfirm.addEventListener('click', joinRoom);
inputRoomCode.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') inputPlayerName.focus();
});
inputPlayerName.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') joinRoom();
});

function joinRoom() {
    const code = inputRoomCode.value.trim();
    const name = inputPlayerName.value.trim() || 'Jogador';

    if (code.length < 4) {
        joinError.textContent = 'Código inválido';
        joinError.classList.remove('hidden');
        return;
    }

    Multiplayer.joinRoom(code, name, (roomCode, error) => {
        if (error) {
            joinError.textContent = error;
            joinError.classList.remove('hidden');
            return;
        }
        isMultiplayer = true;
        mpLobbyAutoStarted = false;
        mpHadOpponent = false;
        lobbyRoomCode.textContent = roomCode;
        btnStartGame.classList.add('hidden');
        showScreen(lobbyScreen);
    });
}

// ═══ LOBBY ════════════════════════════════════════════════════════════════════

btnShowRooms.addEventListener('click', () => {
    showScreen(roomsScreen);
    refreshRooms();
});

btnRefreshRooms.addEventListener('click', refreshRooms);
btnBackMenuRooms.addEventListener('click', () => showScreen(multiplayerScreen));

function refreshRooms() {
    roomsList.innerHTML = '<div class="lobby-waiting">Carregando...</div>';
    Multiplayer.getAvailableRooms((rooms) => {
        if (rooms.length === 0) {
            roomsList.innerHTML = '<div class="lobby-waiting">Nenhuma sala disponível</div>';
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
                joinFromRooms(room.code, room.players);
            });
            roomsList.appendChild(item);
        });
    });
}

function joinFromRooms(code, playersCount = 1) {
    const nameModal = document.getElementById('name-modal');
    const nameModalInput = document.getElementById('name-modal-input');
    const nameModalConfirm = document.getElementById('name-modal-confirm');
    if (!nameModal || !nameModalInput || !nameModalConfirm) return;

    nameModalInput.value = userNickname || ('Jogador ' + (playersCount + 1));
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
        doJoinRoom(code, name);
    };

    const onKeyDown = (e) => {
        if (e.key === 'Enter') onConfirm();
    };

    nameModalConfirm.addEventListener('click', onConfirm);
    nameModalInput.addEventListener('keydown', onKeyDown);
}

function doJoinRoom(code, name) {
    Multiplayer.joinRoom(code, name, (roomCode, error) => {
        if (error) {
            showToast(error);
            return;
        }
        isMultiplayer = true;
        mpLobbyAutoStarted = false;
        mpHadOpponent = false;
        lobbyRoomCode.textContent = roomCode;
        btnStartGame.classList.add('hidden');
        showScreen(lobbyScreen);
    });
}

function restoreLobbyCallbacks() {
    Multiplayer.onPlayersUpdate = (players) => {
        updateLobbyPlayers(players);
        updateMpPlayersBar(players);
    };
    Multiplayer.onStatusUpdate = (status) => {
        if (status === 'playing' && isMultiplayer) {
            startMultiplayerGame();
        }
    };
    Multiplayer.onRoomDeleted = () => {
        if (isMultiplayer) {
            leaveMultiplayer();
        }
    };
}
restoreLobbyCallbacks();

function updateLobbyPlayers(players) {
    if (!lobbyPlayers) return;

    const entries = Object.entries(players);

    if (entries.length >= 2) mpHadOpponent = true;

    if (entries.length < 2 && mpHadOpponent && lobbyScreen && !lobbyScreen.classList.contains('hidden')) {
        showToast('O outro jogador saiu da sala');
        setTimeout(() => leaveMultiplayer(), 1000);
        return;
    }

    lobbyPlayers.innerHTML = '';

    let allReady = entries.length >= 2;

    entries.forEach(([id, p]) => {
        const div = document.createElement('div');
        div.className = 'lobby-player';
        div.style.borderColor = p.color;
        const isMe = id === Multiplayer.playerId;
        const readyBadge = p.ready ? '<span style="color:#3acc7a;margin-left:4px;">✓</span>' : '';
        const hostBadge = !isMe && Multiplayer.isHost && p.ready ? '' : '';
        div.innerHTML = `
            <span class="lobby-player-name">${p.name}${readyBadge}</span>
            ${isMe ? '<span class="lobby-player-host">VOCÊ</span>' : ''}
        `;
        lobbyPlayers.appendChild(div);
        if (!p.ready) allReady = false;
    });

    if (lobbyWaiting) {
        if (entries.length < 2) {
            lobbyWaiting.textContent = `Aguardando jogadores... (${entries.length}/4)`;
            lobbyWaiting.style.color = '#888';
        } else if (allReady) {
            lobbyWaiting.textContent = 'Todos prontos! Iniciando...';
            lobbyWaiting.style.color = '#3acc7a';
        } else {
            const notReadyCount = entries.filter(([, p]) => !p.ready).length;
            lobbyWaiting.textContent = `Aguardando ${notReadyCount} jogador(es) ficar(em) pronto(s)...`;
            lobbyWaiting.style.color = '#888';
        }
    }

    // Botão de pronto: todos veem quando há 2 ou mais jogadores
    if (btnReady) {
        if (entries.length >= 2) {
            const myReady = players[Multiplayer.playerId]?.ready;
            if (myReady) {
                btnReady.classList.add('hidden');
                if (lobbyReadyStatus) {
                    lobbyReadyStatus.style.display = 'block';
                    lobbyReadyStatus.textContent = allReady ? 'Todos prontos! ✓' : 'Você está pronto ✓ (Aguardando os outros...)';
                    lobbyReadyStatus.style.color = '#3acc7a';
                }
            } else {
                btnReady.classList.remove('hidden');
                if (lobbyReadyStatus) lobbyReadyStatus.style.display = 'none';
            }
        } else {
            btnReady.classList.add('hidden');
            if (lobbyReadyStatus) lobbyReadyStatus.style.display = 'none';
        }
    }

    // Botão iniciar: sempre escondido (auto-start quando ambos prontos)
    if (btnStartGame) {
        btnStartGame.classList.add('hidden');
    }

    // Auto-iniciar quando todos estiverem prontos (host inicia)
    if (Multiplayer.isHost && entries.length >= 2 && allReady && !mpLobbyAutoStarted) {
        mpLobbyAutoStarted = true;
        const newFood = { x: Math.floor(GRID_SIZE / 2), y: Math.floor(GRID_SIZE * 0.35) };
        Multiplayer.startGame(newFood);
    }
}

btnStartGame.addEventListener('click', () => {
    if (Multiplayer.isHost) {
        const newFood = { x: Math.floor(GRID_SIZE / 2), y: Math.floor(GRID_SIZE * 0.35) };
        Multiplayer.startGame(newFood);
    }
});

if (btnReady) {
    btnReady.addEventListener('click', () => {
        Multiplayer.sendReady(true);
        btnReady.classList.add('hidden');
    });
}

btnLeaveLobby.addEventListener('click', () => {
    Multiplayer.leaveRoom();
    showScreen(multiplayerScreen);
});

// ═══ SINGLEPLAYER ═════════════════════════════════════════════════════════════

function initMatch() {
    snake = [
        { x: Math.floor(GRID_SIZE / 2), y: Math.floor(GRID_SIZE / 2) }
    ];
    direction = { x: 0, y: 0 };
    nextDirection = { x: 0, y: 0 };
    isMoving = false;
    isBoosting = false;
    isTongueActive = false;
    tongueAnim = null;
    tongueAteFood = false;
    cancelBoostTimer();
    generateFood();
}

function generateFood() {
    let foodX, foodY;
    let onSnake = true;
    while (onSnake) {
        foodX = Math.floor(Math.random() * GRID_SIZE);
        foodY = Math.floor(Math.random() * GRID_SIZE);
        onSnake = snake.some(s => s.x === foodX && s.y === foodY);
    }
    food = { x: foodX, y: foodY };
}

function startGame() {
    if (gameRunning) return;
    score = 0;
    scoreVal.textContent = score;
    highscoreVal.textContent = highscore;
    gameOverScreen.classList.add('hidden');
    initMatch();
    isPaused = false;
    updatePauseBtn();
    gameRunning = true;
    if (gameTimeoutId) clearTimeout(gameTimeoutId);
    gameTick();
}

function togglePause() {
    if (!gameRunning) return;
    isPaused = !isPaused;
    updatePauseBtn();
    
    const resetBtn = document.getElementById('mobile-reset-btn');
    const pOverlay = document.getElementById('pause-overlay');
    
    if (isMultiplayer) {
        const mpOverlay = document.getElementById('pause-overlay-mp');
        const mpResetBtn = document.getElementById('mobile-reset-btn');
        if (isPaused) {
            Multiplayer.sendPause(Multiplayer.playerName);
            if (mpOverlay) mpOverlay.classList.remove('hidden');
            if (mpResetBtn) mpResetBtn.classList.remove('hidden');
        } else {
            Multiplayer.sendUnpause();
            if (mpOverlay) mpOverlay.classList.add('hidden');
            if (mpResetBtn) mpResetBtn.classList.add('hidden');
            if (gameTimeoutId) clearTimeout(gameTimeoutId);
        }
        mpDraw();
        if (!isPaused) mpGameTick();
    } else {
        if (isPaused) {
            if (pOverlay && instructionsModal.classList.contains('hidden')) {
                pOverlay.classList.remove('hidden');
            }
            draw();
        } else {
            if (pOverlay) pOverlay.classList.add('hidden');
            gameTick();
        }
    }
    
    if (resetBtn) {
        resetBtn.classList.toggle('hidden', !isPaused);
    }
    setTimeout(() => updateMenuFocus(0), 50);
}

function updatePauseBtn() {
    if (!mobilePauseBtn) return;
    const activeModal = isMultiplayer ? mpInstructionsModal : instructionsModal;
    if (!activeModal.classList.contains('hidden')) {
        mobilePauseBtn.textContent = '✕';
        mobilePauseBtn.classList.remove('active');
        return;
    }
    mobilePauseBtn.textContent = isPaused ? '▶' : '⏸';
    mobilePauseBtn.classList.toggle('active', isPaused);
}

function gameOver() {
    gameRunning = false;
    isMoving = false;
    isPaused = false;
    isBoosting = false;
    isTongueActive = false;
    tongueAnim = null;
    tongueAteFood = false;
    cancelBoostTimer();
    if (gameTimeoutId) clearTimeout(gameTimeoutId);

    if (score > highscore) {
        highscore = score;
        localStorage.setItem('snake_highscore', highscore);
    }
    finalScore.textContent = score;
    gameOverScreen.classList.remove('hidden');
    setTimeout(() => updateMenuFocus(0), 50);
}

backToMenuBtn.addEventListener('click', () => {
    gameOverScreen.classList.add('hidden');
    gameRunning = false;
    showMenu();
});

function gameTick() {
    if (!gameRunning || isPaused) return;
    update();
    draw();
    const normalInterval = Math.max(80, 200 - Math.floor(score / 3) * 10);
    const interval = isBoosting ? 60 : normalInterval;
    gameTimeoutId = setTimeout(gameTick, interval);
}

function update() {
    if (!isMoving) return;
    direction = nextDirection;

    const head = snake[0];
    const newHead = { x: head.x + direction.x, y: head.y + direction.y };

    // Colisão com parede
    if (newHead.x < 0 || newHead.x >= GRID_SIZE || newHead.y < 0 || newHead.y >= GRID_SIZE) {
        gameOver();
        return;
    }

    // Colisão com próprio corpo
    if (snake.some(s => s.x === newHead.x && s.y === newHead.y)) {
        gameOver();
        return;
    }

    snake.unshift(newHead);

    // Contador do balão
    if (ballBubble && ballBubble.show) {
        ballBubble.cellsMoved++;
        if (ballBubble.cellsMoved >= 20) {
            ballBubble.show = false;
            ballBubble = null;
        }
    }

    // Comer comida normal
    const isDirectlyAhead = (food.x === newHead.x + direction.x && food.y === newHead.y + direction.y);
    const ateFood = (newHead.x === food.x && newHead.y === food.y);
    const tongueTouchesFood = (isTongueActive && isDirectlyAhead);

    if (ateFood) {
        tongueAteFood = false;
        score++;
        scoreVal.textContent = score;
        if (score === 10 && isDonor) {
            ballBubble = { text: '10x Eu tô comendo a bola 😜', show: true, cellsMoved: 0 };
        }
        generateFood();
        isTongueActive = false;
        tongueAnim = null;
        if (actionA) actionA.classList.remove('active');
    } else if (tongueTouchesFood && !tongueAteFood) {
        tongueAteFood = true;
    } else {
        snake.pop();
    }
}

// ═══ ANIMAÇÃO DA LÍNGUA ═══════════════════════════════════════════════════════

// ═══ ANIMAÇÃO DA LÍNGUA ═══════════════════════════════════════════════════════

let animationRafId = null;

function checkStartAnimationLoop() {
    if (!animationRafId && (tongueAnim || Object.keys(otherTongueAnims).length > 0 || (isLocalMultiplayer && (localP1.tongueAnim || localP2.tongueAnim)))) {
        animationLoop();
    }
}

function animationLoop() {
    let hasActiveAnim = false;
    
    // Atualiza a língua do jogador principal (Single ou Online)
    if (tongueAnim) {
        tongueAnim.progress += 0.06;
        if (tongueAnim.progress >= 1) {
            if (tongueAnim.phase === 'out') {
                tongueAnim.phase = 'in';
                tongueAnim.progress = 0;
            } else {
                if (tongueAteFood) {
                    tongueAteFood = false;
                    if (isMultiplayer) {
                        score++;
                        if (mpScoreVal) mpScoreVal.textContent = score;
                        Multiplayer.sendScore(score);
                        if (Multiplayer.isHost) {
                            food = generateMultiplayerFood();
                            Multiplayer.setFood(food);
                        } else {
                            Multiplayer.notifyFoodEaten();
                        }
                    } else {
                        score++;
                        scoreVal.textContent = score;
                        generateFood();
                    }
                    if (actionA) actionA.classList.remove('active');
                }
                tongueAnim = null;
                isTongueActive = false;
            }
        }
        if (tongueAnim) hasActiveAnim = true;
    }

    // Atualiza a língua de outros jogadores (Online Multiplayer)
    if (isMultiplayer) {
        Object.keys(otherTongueAnims).forEach(id => {
            const anim = otherTongueAnims[id];
            anim.progress += 0.06;
            if (anim.progress >= 1) {
                if (anim.phase === 'out') {
                    anim.phase = 'in';
                    anim.progress = 0;
                } else {
                    delete otherTongueAnims[id];
                }
            }
            if (otherTongueAnims[id]) hasActiveAnim = true;
        });
    }

    // Atualiza línguas no Multiplayer Local
    if (isLocalMultiplayer) {
        [localP1, localP2].forEach(p => {
            if (p.tongueAnim) {
                p.tongueAnim.progress += 0.06;
                if (p.tongueAnim.progress >= 1) {
                    if (p.tongueAnim.phase === 'out') {
                        p.tongueAnim.phase = 'in';
                        p.tongueAnim.progress = 0;
                    } else {
                        if (p.tongueAteFood) {
                            p.tongueAteFood = false;
                            p.score++;
                            localGenerateFood();
                        }
                        p.tongueAnim = null;
                        p.isTongueActive = false;
                    }
                }
                if (p.tongueAnim) hasActiveAnim = true;
            }
        });
    }

    // Redesenha a tela correta
    if (isMultiplayer) {
        mpDraw();
    } else if (isLocalMultiplayer) {
        localDraw();
    } else {
        draw();
    }

    if (hasActiveAnim && gameRunning && !isPaused) {
        animationRafId = requestAnimationFrame(animationLoop);
    } else {
        animationRafId = null;
    }
}

function triggerTongueAnimation() {
    if (!isMoving || !gameRunning || isPaused) return;
    const dir = { ...direction };
    if (dir.x === 0 && dir.y === 0) return;

    const head = snake[0];
    tongueAnim = { progress: 0, phase: 'out', dir, headX: head.x, headY: head.y };
    isTongueActive = true;
    tongueAteFood = false;
    
    if (isMultiplayer) {
        Multiplayer.sendState({
            tongue: {
                dir: dir,
                t: Date.now()
            }
        });
    }
    
    checkStartAnimationLoop();
}

function triggerLocalTongueAnimation(player) {
    if (!player.alive || !player.isMoving || !gameRunning || isPaused) return;
    const dir = { ...player.direction };
    if (dir.x === 0 && dir.y === 0) return;

    player.tongueAnim = { progress: 0, phase: 'out', dir, headX: player.snake[0].x, headY: player.snake[0].y };
    player.isTongueActive = true;
    player.tongueAteFood = false;
    
    checkStartAnimationLoop();
}

// ═══ DESENHO (SINGLEPLAYER) ══════════════════════════════════════════════════

function draw() {
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Comida (círculo)
    const foodCx = food.x * CELL_SIZE + CELL_SIZE / 2;
    const foodCy = food.y * CELL_SIZE + CELL_SIZE / 2;
    const foodR = CELL_SIZE / 2 + 2;
    if (tongueAteFood && tongueAnim) {
        const head = snake[0];
        const cx = head.x * CELL_SIZE + CELL_SIZE / 2;
        const cy = head.y * CELL_SIZE + CELL_SIZE / 2;
        const maxLen = CELL_SIZE * 0.65;
        const t = tongueAnim.phase === 'out' ? tongueAnim.progress : (1 - tongueAnim.progress);
        const len = maxLen * t;
        const startX = cx + tongueAnim.dir.x * (CELL_SIZE / 2 - 1);
        const startY = cy + tongueAnim.dir.y * (CELL_SIZE / 2 - 1);
        const tipX = startX + tongueAnim.dir.x * len;
        const tipY = startY + tongueAnim.dir.y * len;

        if (tongueAnim.phase === 'in') {
            drawFoodAsSoccerBall(ctx, tipX, tipY, foodR);
        } else {
            drawFoodAsSoccerBall(ctx, foodCx, foodCy, foodR);
        }
    } else {
        drawFoodAsSoccerBall(ctx, foodCx, foodCy, foodR);
    }

    // Cobra
    ctx.fillStyle = '#3acc7a';
    snake.forEach(seg => ctx.fillRect(seg.x * CELL_SIZE + 1, seg.y * CELL_SIZE + 1, CELL_SIZE - 2, CELL_SIZE - 2));

    // Balão da bola da copa
    if (ballBubble && ballBubble.show) {
        drawBallBubble(ctx, snake[0].x, snake[0].y, CELL_SIZE);
    }

    // Língua
    if (tongueAnim) drawSnakeTongue(ctx, snake[0], tongueAnim, CELL_SIZE);
}


function drawSnakeTongue(c, head, anim, cellSize) {
    if (!head) return;
    const cx = head.x * cellSize + cellSize / 2;
    const cy = head.y * cellSize + cellSize / 2;
    const maxLen = cellSize * 0.65;
    const t = anim.phase === 'out' ? anim.progress : (1 - anim.progress);
    const len = maxLen * t;
    const dx = anim.dir.x;
    const dy = anim.dir.y;
    const startX = cx + dx * (cellSize / 2 - 1);
    const startY = cy + dy * (cellSize / 2 - 1);
    const forkX = startX + dx * len * 0.7;
    const forkY = startY + dy * len * 0.7;
    const perpX = -dy;
    const perpY = dx;
    const forkSpread = cellSize * 0.18 * t;
    const tip1X = startX + dx * len + perpX * forkSpread;
    const tip1Y = startY + dy * len + perpY * forkSpread;
    const tip2X = startX + dx * len - perpX * forkSpread;
    const tip2Y = startY + dy * len - perpY * forkSpread;

    c.save();
    c.strokeStyle = '#ff6666';
    c.lineWidth = 2.5;
    c.lineCap = 'round';
    c.lineJoin = 'round';
    c.beginPath(); c.moveTo(startX, startY); c.lineTo(forkX, forkY); c.stroke();
    c.beginPath(); c.moveTo(forkX, forkY); c.lineTo(tip1X, tip1Y); c.stroke();
    c.beginPath(); c.moveTo(forkX, forkY); c.lineTo(tip2X, tip2Y); c.stroke();
    c.restore();
}

function drawBallBubble(c, headX, headY, cellSize) {
    if (!ballBubble || !ballBubble.show) return;
    const cx = headX * cellSize + cellSize / 2;
    const cy = headY * cellSize;
    const text = ballBubble.text;
    c.save();
    c.font = `bold ${Math.max(11, cellSize * 0.7)}px 'Share Tech Mono', monospace`;
    c.textAlign = 'center';
    c.textBaseline = 'bottom';
    const metrics = c.measureText(text);
    const tw = metrics.width;
    const padX = 12, padY = 8;
    const bw = tw + padX * 2;
    const bh = cellSize * 1.0 + padY * 2;
    const bx = cx - bw / 2;
    const by = cy - bh - 10;
    c.save();
    c.fillStyle = '#ffffff';
    c.beginPath();
    c.roundRect(bx, by, bw, bh, 8);
    c.fill();
    c.strokeStyle = '#ffd100';
    c.lineWidth = 2;
    c.stroke();
    c.beginPath();
    c.moveTo(cx - 4, by + bh);
    c.lineTo(cx, by + bh + 7);
    c.lineTo(cx + 4, by + bh);
    c.fillStyle = '#ffffff';
    c.fill();
    c.strokeStyle = '#ffd100';
    c.lineWidth = 2;
    c.beginPath();
    c.moveTo(cx - 4, by + bh - 1);
    c.lineTo(cx, by + bh + 7);
    c.stroke();
    c.beginPath();
    c.moveTo(cx + 4, by + bh - 1);
    c.lineTo(cx, by + bh + 7);
    c.stroke();
    c.fillStyle = '#1a1a1a';
    c.fillText(text, cx, by + bh - padY);
    c.restore();
}

// ═══ CONTROLES ════════════════════════════════════════════════════════════════

function changeDirection(newDir) {
    if (!gameRunning || isPaused) return;
    if (snake.length > 1) {
        if (newDir.x !== 0 && direction.x === -newDir.x) return;
        if (newDir.y !== 0 && direction.y === -newDir.y) return;
    }
    nextDirection = newDir;
    isMoving = true;

    if (isMultiplayer) {
        Multiplayer.sendDirection(newDir);
        Multiplayer.sendMoving(true);
    }
}

function startBoostWithDelay() {
    if (boostHoldTimer !== null) return;
    boostHoldTimer = setTimeout(() => {
        if (gameRunning && !isPaused && isMoving) isBoosting = true;
        boostHoldTimer = null;
    }, BOOST_HOLD_DELAY);
}

function cancelBoostTimer() {
    if (boostHoldTimer !== null) { clearTimeout(boostHoldTimer); boostHoldTimer = null; }
    isBoosting = false;
}

// Teclado
window.addEventListener('keydown', (e) => {
    const tag = document.activeElement?.tagName;
    const isInput = (tag === 'INPUT' || tag === 'TEXTAREA');
    if (isInput) return;

    const activeMenu = getActiveMenuScreen();
    if (activeMenu) {
        let menuHandled = false;
        switch (e.key) {
            case 'ArrowUp': case 'w': case 'W':
                updateMenuFocus(-1);
                highlightDpadBtn(dpadUp);
                menuHandled = true; break;
            case 'ArrowDown': case 's': case 'S':
                updateMenuFocus(1);
                highlightDpadBtn(dpadDown);
                menuHandled = true; break;
            case 'ArrowLeft': case 'a': case 'A':
                updateMenuFocus(-1);
                highlightDpadBtn(dpadLeft);
                menuHandled = true; break;
            case 'ArrowRight': case 'd': case 'D':
                updateMenuFocus(1);
                highlightDpadBtn(dpadRight);
                menuHandled = true; break;
            case ' ': case 'Enter': case 'z': case 'Z': case 'x': case 'X':
                activateFocusedElement();
                highlightDpadBtn(actionA);
                menuHandled = true; break;
        }
        if (menuHandled) {
            e.preventDefault();
            return;
        }
    }

    // Local multiplayer: WASD para jogador 2
    if (isLocalMultiplayer && gameRunning && !isPaused) {
        const p2d = localP2.direction;
        switch (e.key) {
            case 'w': case 'W':
                if (!(p2d.y === 1 && localP2.snake.length > 1)) { localP2.nextDirection = { x: 0, y: -1 }; localP2.isMoving = true; }
                e.preventDefault(); return;
            case 's': case 'S':
                if (!(p2d.y === -1 && localP2.snake.length > 1)) { localP2.nextDirection = { x: 0, y: 1 }; localP2.isMoving = true; }
                e.preventDefault(); return;
            case 'a': case 'A':
                if (!(p2d.x === 1 && localP2.snake.length > 1)) { localP2.nextDirection = { x: -1, y: 0 }; localP2.isMoving = true; }
                e.preventDefault(); return;
            case 'd': case 'D':
                if (!(p2d.x === -1 && localP2.snake.length > 1)) { localP2.nextDirection = { x: 1, y: 0 }; localP2.isMoving = true; }
                e.preventDefault(); return;
            case 'q': case 'Q': case 'e': case 'E':
                if (localP2.alive && localP2.isMoving && !localP2.tongueAnim) { triggerLocalTongueAnimation(localP2); } e.preventDefault(); return;
        }
    }

    let handled = false;
    switch (e.key) {
        case 'ArrowUp':
            if (!isInput) {
                if (isLocalMultiplayer && gameRunning && !isPaused) {
                    const p1d = localP1.direction;
                    if (!(p1d.y === 1 && localP1.snake.length > 1)) { localP1.nextDirection = { x: 0, y: -1 }; localP1.isMoving = true; }
                } else {
                    changeDirection({ x: 0, y: -1 }); highlightDpadBtn(dpadUp); startBoostWithDelay();
                }
                handled = true;
            } break;
        case 'ArrowDown':
            if (!isInput) {
                if (isLocalMultiplayer && gameRunning && !isPaused) {
                    const p1d = localP1.direction;
                    if (!(p1d.y === -1 && localP1.snake.length > 1)) { localP1.nextDirection = { x: 0, y: 1 }; localP1.isMoving = true; }
                } else {
                    changeDirection({ x: 0, y: 1 }); highlightDpadBtn(dpadDown); startBoostWithDelay();
                }
                handled = true;
            } break;
        case 'ArrowLeft':
            if (!isInput) {
                if (isLocalMultiplayer && gameRunning && !isPaused) {
                    const p1d = localP1.direction;
                    if (!(p1d.x === 1 && localP1.snake.length > 1)) { localP1.nextDirection = { x: -1, y: 0 }; localP1.isMoving = true; }
                } else {
                    changeDirection({ x: -1, y: 0 }); highlightDpadBtn(dpadLeft); startBoostWithDelay();
                }
                handled = true;
            } break;
        case 'ArrowRight':
            if (!isInput) {
                if (isLocalMultiplayer && gameRunning && !isPaused) {
                    const p1d = localP1.direction;
                    if (!(p1d.x === -1 && localP1.snake.length > 1)) { localP1.nextDirection = { x: 1, y: 0 }; localP1.isMoving = true; }
                } else {
                    changeDirection({ x: 1, y: 0 }); highlightDpadBtn(dpadRight); startBoostWithDelay();
                }
                handled = true;
            } break;
        case 'z': case 'Z': case 'x': case 'X':
            if (!isInput && gameRunning && !isPaused) {
                if (isLocalMultiplayer) {
                    if (localP1.alive && localP1.isMoving && !localP1.tongueAnim) { triggerLocalTongueAnimation(localP1); }
                } else if (isMoving) {
                    isTongueActive = true; highlightDpadBtn(actionA); triggerTongueAnimation();
                }
                handled = true;
            } break;
        case ' ':
            if (isInput) break;
            if (!gameRunning) { startGame(); }
            else if (gameRunning && !isPaused) {
                if (isLocalMultiplayer) {
                    if (localP1.alive && localP1.isMoving && !localP1.tongueAnim) { triggerLocalTongueAnimation(localP1); }
                } else if (isMoving) {
                    isTongueActive = true; highlightDpadBtn(actionA); triggerTongueAnimation();
                }
            } handled = true; break;
        case 'Enter':
            if (isInput) break;
            if (!gameRunning) { startGame(); } handled = true; break;
        case 'p': case 'P':
            if (!isInput && !isLocalMultiplayer) { togglePause(); handled = true; } break;
    }
    if (handled) e.preventDefault();
});

window.addEventListener('keyup', (e) => {
    switch (e.key) {
        case 'ArrowUp': case 'w': case 'W': removeHighlightDpadBtn(dpadUp); cancelBoostTimer(); break;
        case 'ArrowDown': case 's': case 'S': removeHighlightDpadBtn(dpadDown); cancelBoostTimer(); break;
        case 'ArrowLeft': case 'a': case 'A': removeHighlightDpadBtn(dpadLeft); cancelBoostTimer(); break;
        case 'ArrowRight': case 'd': case 'D': removeHighlightDpadBtn(dpadRight); cancelBoostTimer(); break;
        case 'z': case 'Z': case 'x': case 'X': removeHighlightDpadBtn(actionA); break;
    }
});

function highlightDpadBtn(btn) { if (btn) btn.classList.add('active'); }
function removeHighlightDpadBtn(btn) { if (btn) btn.classList.remove('active'); }

// D-PAD MOBILE
function setupDpadButton(btn, dir) {
    if (!btn) return;
    const trigger = (e) => {
        e.preventDefault();
        btn.classList.add('active');
        if (updateMenuFocus(0)) {
            if (dir.y === -1) updateMenuFocus(-1);
            else if (dir.y === 1) updateMenuFocus(1);
            else if (dir.x === -1) updateMenuFocus(-1);
            else if (dir.x === 1) updateMenuFocus(1);
            return;
        }
        if (isLocalMultiplayer && gameRunning && !isPaused) {
            if (dir.y === -1 && !(localP1.direction.y === 1 && localP1.snake.length > 1)) { localP1.nextDirection = dir; localP1.isMoving = true; }
            else if (dir.y === 1 && !(localP1.direction.y === -1 && localP1.snake.length > 1)) { localP1.nextDirection = dir; localP1.isMoving = true; }
            else if (dir.x === -1 && !(localP1.direction.x === 1 && localP1.snake.length > 1)) { localP1.nextDirection = dir; localP1.isMoving = true; }
            else if (dir.x === 1 && !(localP1.direction.x === -1 && localP1.snake.length > 1)) { localP1.nextDirection = dir; localP1.isMoving = true; }
        } else {
            changeDirection(dir);
            startBoostWithDelay();
        }
    };
    const release = () => { btn.classList.remove('active'); cancelBoostTimer(); };
    btn.addEventListener('touchstart', trigger, { passive: false });
    btn.addEventListener('touchend', release, { passive: true });
    btn.addEventListener('touchcancel', release, { passive: true });
    btn.addEventListener('mousedown', trigger);
    btn.addEventListener('mouseup', release);
    btn.addEventListener('mouseleave', release);
}

function setupTongueButton(btn) {
    if (!btn) return;
    const activate = (e) => {
        e.preventDefault();
        btn.classList.add('active');
        if (activateFocusedElement()) return;
        if (isLocalMultiplayer) {
            if (localP1.alive && localP1.isMoving && !localP1.tongueAnim) { triggerLocalTongueAnimation(localP1); }
        } else if (gameRunning && !isPaused && isMoving) {
            isTongueActive = true; triggerTongueAnimation();
        }
    };
    const deactivate = () => btn.classList.remove('active');
    btn.addEventListener('touchstart', activate, { passive: false });
    btn.addEventListener('touchend', deactivate, { passive: true });
    btn.addEventListener('touchcancel', deactivate, { passive: true });
    btn.addEventListener('mousedown', activate);
    btn.addEventListener('mouseup', deactivate);
    btn.addEventListener('mouseleave', deactivate);
}

setupDpadButton(dpadUp, { x: 0, y: -1 });
setupDpadButton(dpadDown, { x: 0, y: 1 });
setupDpadButton(dpadLeft, { x: -1, y: 0 });
setupDpadButton(dpadRight, { x: 1, y: 0 });
setupTongueButton(actionA);

// Botão de pause
restartBtn.addEventListener('click', startGame);

if (mobilePauseBtn) {
    const handlePauseTrigger = (e) => {
        e.preventDefault();
        const activeInstructions = isMultiplayer ? mpInstructionsModal : instructionsModal;
        if (!activeInstructions.classList.contains('hidden')) {
            if (isMultiplayer) closeMpInstructions();
            else closeInstructions();
        } else {
            togglePause();
        }
    };
    mobilePauseBtn.addEventListener('touchstart', handlePauseTrigger, { passive: false });
    mobilePauseBtn.addEventListener('click', handlePauseTrigger);
}

document.getElementById('app-container').addEventListener('touchmove', (e) => e.preventDefault(), { passive: false });

// ═══ INSTRUÇÕES ══════════════════════════════════════════════════════════════

function openInstructions() {
    if (gameRunning && !isPaused) { isPaused = true; isPausedByInstructions = true; if (gameTimeoutId) clearTimeout(gameTimeoutId); }
    
    const activeScreen = [menuScreen, multiplayerScreen, joinScreen, createScreen, roomsScreen, localLobbyScreen, gameScreen, lobbyScreen, mpGameScreen].find(s => s && !s.classList.contains('hidden'));
    if (activeScreen) {
        const board = activeScreen.querySelector('#game-board');
        if (board && instructionsModal.parentNode !== board) {
            board.appendChild(instructionsModal);
        }
    }
    
    instructionsModal.classList.remove('hidden');
    updatePauseBtn();
    setTimeout(() => updateMenuFocus(0), 50);
}

function closeInstructions() {
    instructionsModal.classList.add('hidden');
    if (gameRunning && isPaused && isPausedByInstructions) { isPaused = false; isPausedByInstructions = false; updatePauseBtn(); gameTick(); }
    setTimeout(() => updateMenuFocus(0), 50);
}

function closeMpInstructions() {
    mpInstructionsModal.classList.add('hidden');
    if (gameRunning && isPaused && isPausedByInstructions) {
        isPaused = false;
        isPausedByInstructions = false;
        if (!mpIsSpectating) mpGameTick();
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

if (menuLearnBtn) {
    const toggleInstructions = () => {
        if (instructionsModal.classList.contains('hidden')) openInstructions();
        else closeInstructions();
    };
    menuLearnBtn.addEventListener('click', toggleInstructions);
    menuLearnBtn.addEventListener('touchstart', (e) => { e.preventDefault(); toggleInstructions(); }, { passive: false });
}

if (closeInstructionsBtn) {
    closeInstructionsBtn.addEventListener('click', closeInstructions);
    closeInstructionsBtn.addEventListener('touchstart', (e) => { e.preventDefault(); closeInstructions(); }, { passive: false });
}

if (mpCloseInstructionsBtn) {
    mpCloseInstructionsBtn.addEventListener('click', closeMpInstructions);
}

if (instructionsModal) {
    instructionsModal.addEventListener('click', (e) => { if (e.target === instructionsModal) closeInstructions(); });
}

if (mpInstructionsModal) {
    mpInstructionsModal.addEventListener('click', (e) => { if (e.target === mpInstructionsModal) closeMpInstructions(); });
}

// ═══ MULTIPLAYER — LÓGICA ═════════════════════════════════════════════════════

function startMultiplayerGame() {
    isMultiplayer = true;
    mpIsSpectating = false;
    score = 0;
    if (mpScoreVal) mpScoreVal.textContent = '0';

    // Resetar estado do jogo PRIMEIRO
    if (gameTimeoutId) clearTimeout(gameTimeoutId);
    gameRunning = true;
    mpFoodReady = false;
    Multiplayer.clearRematch();

    // Posição inicial: host = esquerda, joiner = direita
    const startX = Multiplayer.isHost ? 3 : GRID_SIZE - 4;
    const startY = Math.floor(GRID_SIZE / 2);
    snake = [{ x: startX, y: startY }];
    direction = { x: 0, y: 0 };
    nextDirection = { x: 0, y: 0 };
    isMoving = false;
    isBoosting = false;
    isTongueActive = false;
    tongueAnim = null;
    tongueAteFood = false;
    otherTongueAnims = {};
    otherTongueTimes = {};

    // Comida: host gera no btnStartGame, todos recebem via listener
    Multiplayer.onFoodUpdate = (newFood) => {
        food = newFood;
        mpFood = newFood;
        if (!mpFoodReady) {
            mpFoodReady = true;
            if (!Multiplayer.isHost && gameRunning && !isPaused) {
                updateOtherPlayers(Multiplayer.players);
                updateMpScoreboard(Multiplayer.players);
                mpGameTick();
            }
        }
    };

    // Non-host: ler comida atual do Firebase (já atualizada pelo listener anterior)
    if (!Multiplayer.isHost) {
        const currentFood = Multiplayer.food;
        if (currentFood) {
            food = currentFood;
            mpFood = currentFood;
            mpFoodReady = true;
        }
    }

    // Host: quando alguém come, regenerar comida
    Multiplayer.onFoodEaten = () => {
        if (Multiplayer.isHost) {
            const newFood = generateMultiplayerFood();
            Multiplayer.setFood(newFood);
        }
    };

    // Jogadores mudaram
    Multiplayer.onPlayersUpdate = (players) => {
        updateOtherPlayers(players);
        updateMpScoreboard(players);
        checkMultiplayerGameEnd(players);
        updateRematchStatus(players);
    };

    // Pausa
    Multiplayer.onPauseUpdate = (pausedBy) => {
        const overlay = document.getElementById('pause-overlay-mp');
        const text = document.getElementById('pause-text-mp');
        const resetBtn = document.getElementById('mobile-reset-btn');
        if (pausedBy) {
            if (text) text.textContent = pausedBy + ' pausou o jogo';
            if (overlay) overlay.classList.remove('hidden');
            if (resetBtn) resetBtn.classList.remove('hidden');
        } else {
            if (overlay) overlay.classList.add('hidden');
            if (resetBtn && !isPaused) resetBtn.classList.add('hidden');
        }
        setTimeout(() => updateMenuFocus(0), 50);
    };

    showScreen(mpGameScreen);
    spectatorOverlay.classList.add('hidden');
    victoryOverlay.classList.add('hidden');

    const btnSpectator = document.getElementById('btn-rematch-spectator');
    const btnVictory = document.getElementById('btn-rematch-victory');
    const statusSpectator = document.getElementById('rematch-status-spectator');
    const statusVictory = document.getElementById('rematch-status-victory');
    if (btnSpectator) btnSpectator.style.display = '';
    if (btnVictory) btnVictory.style.display = '';
    if (statusSpectator) statusSpectator.style.display = 'none';
    if (statusVictory) statusVictory.style.display = 'none';

    // Enviar estado inicial DEPOIS de callbacks (garante que dados chegam ao outro jogador)
    Multiplayer.sendSnake(snake);
    Multiplayer.sendState({ score: 0, alive: true, isMoving: false, ready: false });

    // Host inicia imediatamente; non-host aguarda dados do Firebase
    if (Multiplayer.isHost) {
        // Host: usar a comida que foi enviada ao Firebase (já atualizada pelo listener)
        food = Multiplayer.food;
        mpFood = Multiplayer.food;
        mpFoodReady = true;
        mpGameTick();
    } else if (mpFoodReady) {
        // Non-host: ler jogadores atuais do Firebase e iniciar
        updateOtherPlayers(Multiplayer.players);
        updateMpScoreboard(Multiplayer.players);
        mpGameTick();
    }
}

function mpGameTick() {
    if (!gameRunning || isPaused || mpIsSpectating) return;

    mpUpdate();
    mpDraw();

    // Enviar estado para Firebase
    Multiplayer.sendSnake(snake);

    const normalInterval = Math.max(80, 200 - Math.floor(score / 3) * 10);
    const interval = isBoosting ? 60 : normalInterval;
    gameTimeoutId = setTimeout(mpGameTick, interval);
}

function mpUpdate() {
    if (!isMoving) return;
    direction = nextDirection;

    const head = snake[0];
    const newHead = { x: head.x + direction.x, y: head.y + direction.y };

    // Colisão com parede = MORTE
    if (newHead.x < 0 || newHead.x >= GRID_SIZE || newHead.y < 0 || newHead.y >= GRID_SIZE) {
        mpGameOver();
        return;
    }

    // Colisão com próprio corpo = MORTE
    if (snake.some(s => s.x === newHead.x && s.y === newHead.y)) {
        mpGameOver();
        return;
    }

    // Colisão com outras cobras = PERDE 1 TAMANHO
    let hitOtherSnake = false;
    Object.entries(otherPlayers).forEach(([id, p]) => {
        if (id !== Multiplayer.playerId && p.alive && p.snake) {
            if (p.snake.some(s => s.x === newHead.x && s.y === newHead.y)) {
                hitOtherSnake = true;
            }
        }
    });

    snake.unshift(newHead);

    // Comer comida
    const isDirectlyAhead = (food.x === newHead.x + direction.x && food.y === newHead.y + direction.y);
    const ateFood = (newHead.x === food.x && newHead.y === food.y);
    const tongueTouchesFood = (isTongueActive && isDirectlyAhead);

    if (ateFood) {
        tongueAteFood = false;
        score++;
        if (mpScoreVal) mpScoreVal.textContent = score;
        Multiplayer.sendScore(score);
        if (Multiplayer.isHost) {
            food = generateMultiplayerFood();
            Multiplayer.setFood(food);
        } else {
            Multiplayer.notifyFoodEaten();
        }
        isTongueActive = false;
        tongueAnim = null;
        if (actionA) actionA.classList.remove('active');
    } else if (tongueTouchesFood && !tongueAteFood) {
        tongueAteFood = true;
    } else {
        snake.pop();
    }

    if (hitOtherSnake && snake.length > 1) {
        // Perde 1 tamanho
        snake.pop();
    }
}

function generateMultiplayerFood() {
    let fx, fy;
    let onSnake = true;
    while (onSnake) {
        fx = Math.floor(Math.random() * GRID_SIZE);
        fy = Math.floor(Math.random() * GRID_SIZE);
        onSnake = snake.some(s => s.x === fx && s.y === fy);
        if (!onSnake) {
            Object.values(otherPlayers).forEach(p => {
                if (p.alive && p.snake) {
                    if (p.snake.some(s => s.x === fx && s.y === fy)) onSnake = true;
                }
            });
        }
    }
    return { x: fx, y: fy };
}

function mpGameOver() {
    isMoving = false;
    isBoosting = false;
    isTongueActive = false;
    tongueAnim = null;
    tongueAteFood = false;
    cancelBoostTimer();
    if (gameTimeoutId) clearTimeout(gameTimeoutId);

    Multiplayer.markDead();
    mpIsSpectating = true;
}
function checkMultiplayerGameEnd(players) {
    if (!isMultiplayer) return;

    const totalPlayers = Object.keys(players).length;
    const alive = Object.entries(players).filter(([, p]) => p.alive);
    const myAlive = players[Multiplayer.playerId]?.alive;

    // Se o outro jogador saiu, ambos saem
    if (totalPlayers < 2) {
        if (gameRunning || mpIsSpectating) {
            gameRunning = false;
            mpIsSpectating = false;
            if (gameTimeoutId) clearTimeout(gameTimeoutId);
            if (Multiplayer.isHost) Multiplayer.resetStatus();
            showToast('O outro jogador saiu da sala');
            setTimeout(() => leaveMultiplayer(), 1000);
            return;
        }
        if (!victoryOverlay.classList.contains('hidden') || !spectatorOverlay.classList.contains('hidden')) {
            showToast('O outro jogador saiu da sala');
            setTimeout(() => leaveMultiplayer(), 1000);
            return;
        }
    }

    if (!myAlive && gameRunning) {
        gameRunning = false;
        if (gameTimeoutId) clearTimeout(gameTimeoutId);
        if (Multiplayer.isHost) Multiplayer.resetStatus();
        mpIsSpectating = true;
        spectatorOverlay.classList.remove('hidden');
        updateSpectatorLeaderboard();
        return;
    }

    const isGameEnded = totalPlayers >= 2 && alive.length <= 1;

    if (isGameEnded && (gameRunning || mpIsSpectating)) {
        gameRunning = false;
        mpIsSpectating = false;
        if (gameTimeoutId) clearTimeout(gameTimeoutId);
        if (Multiplayer.isHost) Multiplayer.resetStatus();

        const winner = alive.length === 1 ? alive[0] : null;
        const winnerName = winner ? winner[1].name : 'Ninguém';

        const btnRestartMp = document.getElementById('btn-restart-mp');
        if (btnRestartMp) btnRestartMp.classList.add('hidden');

        spectatorOverlay.classList.add('hidden');
        victoryOverlay.classList.remove('hidden');

        if (totalPlayers < 2) {
            victoryText.textContent = 'Seu adversário saiu!';
        } else if (winner) {
            victoryText.textContent = `${winnerName} venceu!`;
        } else {
            victoryText.textContent = 'Fim de Jogo!';
        }

        const sorted = Object.entries(players)
            .map(([id, p]) => ({ id, ...p }))
            .sort((a, b) => b.score - a.score);

        victoryLeaderboard.innerHTML = sorted.map((p) => `
            <div class="lb-entry">
                <span class="lb-dot" style="background:${p.color}"></span>
                <span class="lb-name">${p.id === Multiplayer.playerId ? 'Você' : p.name}</span>
                <span class="lb-score">${p.score}</span>
            </div>
        `).join('');
    }
}

// ═══ MULTIPLAYER — DESENHO ════════════════════════════════════════════════════

function mpDraw() {
    if (!mpCtx) return;
    const c = mpCtx;
    const cv = mpCanvas;

    c.fillStyle = '#000000';
    c.fillRect(0, 0, cv.width, cv.height);

    // Comida (círculo)
    const foodCx = food.x * CELL_SIZE + CELL_SIZE / 2;
    const foodCy = food.y * CELL_SIZE + CELL_SIZE / 2;
    const foodR = CELL_SIZE / 2 + 2;
    
    if (tongueAteFood && tongueAnim) {
        const head = snake[0];
        const cx = head.x * CELL_SIZE + CELL_SIZE / 2;
        const cy = head.y * CELL_SIZE + CELL_SIZE / 2;
        const maxLen = CELL_SIZE * 0.65;
        const t = tongueAnim.phase === 'out' ? tongueAnim.progress : (1 - tongueAnim.progress);
        const len = maxLen * t;
        const startX = cx + tongueAnim.dir.x * (CELL_SIZE / 2 - 1);
        const startY = cy + tongueAnim.dir.y * (CELL_SIZE / 2 - 1);
        const tipX = startX + tongueAnim.dir.x * len;
        const tipY = startY + tongueAnim.dir.y * len;

        if (tongueAnim.phase === 'in') {
            drawFoodAsSoccerBall(c, tipX, tipY, foodR);
        } else {
            drawFoodAsSoccerBall(c, foodCx, foodCy, foodR);
        }
    } else {
        drawFoodAsSoccerBall(c, foodCx, foodCy, foodR);
    }

    // Outras cobras
    Object.entries(otherPlayers).forEach(([id, p]) => {
        if (id === Multiplayer.playerId || !p.alive || !p.snake) return;
        c.fillStyle = p.color;
        p.snake.forEach(seg => {
            c.fillRect(seg.x * CELL_SIZE + 1, seg.y * CELL_SIZE + 1, CELL_SIZE - 2, CELL_SIZE - 2);
        });
        
        // Desenha a língua da outra cobra se estiver ativa
        const anim = otherTongueAnims[id];
        if (anim && p.snake && p.snake[0]) {
            drawSnakeTongue(c, p.snake[0], anim, CELL_SIZE);
        }
    });

    // Cobra local (por cima)
    const myColor = Multiplayer.playerColor;
    c.fillStyle = myColor;
    snake.forEach(seg => {
        c.fillRect(seg.x * CELL_SIZE + 1, seg.y * CELL_SIZE + 1, CELL_SIZE - 2, CELL_SIZE - 2);
    });

    // Língua local
    if (tongueAnim) {
        drawSnakeTongue(c, snake[0], tongueAnim, CELL_SIZE);
    }
}

function updateOtherPlayers(players) {
    otherPlayers = {};
    Object.entries(players).forEach(([id, p]) => {
        if (id !== Multiplayer.playerId) {
            otherPlayers[id] = p;
            if (p.tongue && p.tongue.t && p.tongue.t > (otherTongueTimes[id] || 0)) {
                otherTongueTimes[id] = p.tongue.t;
                otherTongueAnims[id] = {
                    progress: 0,
                    phase: 'out',
                    dir: p.tongue.dir,
                    headX: p.snake && p.snake[0] ? p.snake[0].x : 0,
                    headY: p.snake && p.snake[0] ? p.snake[0].y : 0
                };
                checkStartAnimationLoop();
            }
        }
    });
}

function updateMpScoreboard(players) {
    if (!mpOtherScores) return;
    mpOtherScores.innerHTML = '';
    Object.entries(players).forEach(([id, p]) => {
        if (id === Multiplayer.playerId) return;
        const div = document.createElement('div');
        div.className = 'mp-other-score-item';
        div.innerHTML = `
            <span class="mp-other-score-dot" style="background:${p.color};opacity:${p.alive ? 1 : 0.3}"></span>
            <span style="color:${p.alive ? '#fff' : '#555'}">${p.name}: ${p.score}</span>
        `;
        mpOtherScores.appendChild(div);
    });
}

function updateMpPlayersBar(players) {
    if (!mpPlayersBar) return;
    mpPlayersBar.innerHTML = '';
    Object.entries(players).forEach(([id, p]) => {
        const dot = document.createElement('span');
        dot.className = 'mp-player-dot' + (p.alive ? '' : ' dead');
        dot.style.background = p.color;
        mpPlayersBar.appendChild(dot);
    });
}

function updateSpectatorLeaderboard() {
    if (!spectatorLeaderboard) return;
    const sorted = Multiplayer.getSortedPlayers();
    spectatorLeaderboard.innerHTML = sorted.map(p => `
        <div class="lb-entry">
            <span class="lb-dot" style="background:${p.color}"></span>
            <span class="lb-name">${p.id === Multiplayer.playerId ? 'Você' : p.name}</span>
            <span class="lb-score">${p.score}</span>
        </div>
    `).join('');
}

function leaveMultiplayer() {
    gameRunning = false;
    isMultiplayer = false;
    mpIsSpectating = false;
    mpFoodReady = false;
    mpHadOpponent = false;
    if (gameTimeoutId) clearTimeout(gameTimeoutId);
    
    if (victoryOverlay) victoryOverlay.classList.add('hidden');
    if (spectatorOverlay) spectatorOverlay.classList.add('hidden');
    
    Multiplayer.leaveRoom();
    showMenu();
    restoreLobbyCallbacks();
}

function returnToLobby() {
    gameRunning = false;
    isMultiplayer = true;
    mpIsSpectating = false;
    mpFoodReady = false;
    mpLobbyAutoStarted = false;
    if (gameTimeoutId) clearTimeout(gameTimeoutId);
    victoryOverlay.classList.add('hidden');
    spectatorOverlay.classList.add('hidden');
    Multiplayer.resetToLobby();
    showScreen(lobbyScreen);
    if (Multiplayer.isHost) {
        btnStartGame.classList.add('hidden');
    }
    updateLobbyPlayers(Multiplayer.players);
    restoreLobbyCallbacks();
}

// ═══ REMATCH ═══════════════════════════════════════════════════════════════════

function handleRematchClick() {
    Multiplayer.sendRematch(true);

    const btnSpectator = document.getElementById('btn-rematch-spectator');
    const btnVictory = document.getElementById('btn-rematch-victory');
    const statusSpectator = document.getElementById('rematch-status-spectator');
    const statusVictory = document.getElementById('rematch-status-victory');

    if (btnSpectator) btnSpectator.style.display = 'none';
    if (btnVictory) btnVictory.style.display = 'none';
    if (statusSpectator) {
        statusSpectator.style.display = 'block';
        statusSpectator.textContent = 'Aguardando o outro jogador...';
        statusSpectator.style.color = '#3acc7a';
    }
    if (statusVictory) {
        statusVictory.style.display = 'block';
        statusVictory.textContent = 'Aguardando o outro jogador...';
        statusVictory.style.color = '#3acc7a';
    }

    if (Multiplayer.isHost) {
        const myId = Multiplayer.playerId;
        const players = Multiplayer.players;
        const allWantsRematch = Object.keys(players).length >= 2 && Object.values(players).every(p => p.wantsRematch);
        if (allWantsRematch) {
            Multiplayer.clearRematch();
            const newFood = { x: Math.floor(GRID_SIZE / 2), y: Math.floor(GRID_SIZE * 0.35) };
            Multiplayer.startGame(newFood);
        }
    }
}

function updateRematchStatus(players) {
    const myId = Multiplayer.playerId;
    const otherEntries = Object.entries(players).filter(([id]) => id !== myId);
    const otherWants = otherEntries.length > 0 && otherEntries.some(([, p]) => p.wantsRematch);
    const allWantRematch = Object.keys(players).length >= 2 && Object.values(players).every(p => p.wantsRematch);

    if (allWantRematch && Multiplayer.isHost && !gameRunning) {
        Multiplayer.clearRematch();
        const newFood = { x: Math.floor(GRID_SIZE / 2), y: Math.floor(GRID_SIZE * 0.35) };
        Multiplayer.startGame(newFood);
        return;
    }

    const statusSpectator = document.getElementById('rematch-status-spectator');
    const statusVictory = document.getElementById('rematch-status-victory');
    const btnSpectator = document.getElementById('btn-rematch-spectator');
    const btnVictory = document.getElementById('btn-rematch-victory');
    const myReady = players[myId]?.wantsRematch;

    if (myReady) {
        if (btnSpectator) btnSpectator.style.display = 'none';
        if (btnVictory) btnVictory.style.display = 'none';
        if (statusSpectator) {
            statusSpectator.style.display = 'block';
            statusSpectator.textContent = 'Aguardando o outro jogador...';
            statusSpectator.style.color = '#3acc7a';
        }
        if (statusVictory) {
            statusVictory.style.display = 'block';
            statusVictory.textContent = 'Aguardando o outro jogador...';
            statusVictory.style.color = '#3acc7a';
        }
    } else {
        if (btnSpectator) btnSpectator.style.display = '';
        if (btnVictory) btnVictory.style.display = '';
        if (otherWants) {
            if (statusSpectator) { statusSpectator.style.display = 'block'; statusSpectator.textContent = 'O outro jogador quer jogar novamente!'; statusSpectator.style.color = '#3acc7a'; }
            if (statusVictory) { statusVictory.style.display = 'block'; statusVictory.textContent = 'O outro jogador quer jogar novamente!'; statusVictory.style.color = '#3acc7a'; }
        } else {
            if (statusSpectator) statusSpectator.style.display = 'none';
            if (statusVictory) statusVictory.style.display = 'none';
        }
    }
}

const btnRematchSpectator = document.getElementById('btn-rematch-spectator');
if (btnRematchSpectator) {
    btnRematchSpectator.addEventListener('click', handleRematchClick);
}

const btnRematchVictory = document.getElementById('btn-rematch-victory');
if (btnRematchVictory) {
    btnRematchVictory.addEventListener('click', handleRematchClick);
}

const btnBackMenuSpectator = document.getElementById('btn-back-menu-spectator');
if (btnBackMenuSpectator) {
    btnBackMenuSpectator.addEventListener('click', leaveMultiplayer);
}

btnBackMenuVictory.addEventListener('click', leaveMultiplayer);
btnLeaveLobby2.addEventListener('click', leaveMultiplayer);

// Botão de ajuda no multiplayer
const mpLearnBtn = document.getElementById('mp-learn-btn');
if (mpLearnBtn) {
    const toggleMpInstructions = () => {
        if (mpInstructionsModal.classList.contains('hidden')) {
            if (gameRunning && !isPaused) { isPaused = true; isPausedByInstructions = true; if (gameTimeoutId) clearTimeout(gameTimeoutId); }
            mpInstructionsModal.classList.remove('hidden');
        } else {
            closeMpInstructions();
            if (gameRunning && isPaused && isPausedByInstructions) { isPaused = false; isPausedByInstructions = false; mpGameTick(); }
        }
    };
    mpLearnBtn.addEventListener('click', toggleMpInstructions);
    mpLearnBtn.addEventListener('touchstart', (e) => { e.preventDefault(); toggleMpInstructions(); }, { passive: false });
}

// ═══ LOCAL MULTIPLAYER (NA MESMA MÁQUINA) ═════════════════════════════════════

function startLocalMultiplayer() {
    const name1 = inputLocalP1.value.trim() || 'Jogador 1';
    const name2 = inputLocalP2.value.trim() || 'Jogador 2';

    isLocalMultiplayer = true;
    isMultiplayer = false;
    gameRunning = true;
    isPaused = false;
    score = 0;

    // Cobra 1 (esquerda) — setas
    localP1.name = name1;
    localP1.snake = [{ x: Math.floor(GRID_SIZE / 4), y: Math.floor(GRID_SIZE / 2) }];
    localP1.direction = { x: 0, y: 0 };
    localP1.nextDirection = { x: 0, y: 0 };
    localP1.alive = true;
    localP1.score = 0;
    localP1.isMoving = false;
    localP1.isTongueActive = false;

    // Cobra 2 (direita) — WASD
    localP2.name = name2;
    localP2.snake = [{ x: Math.floor(GRID_SIZE * 3 / 4), y: Math.floor(GRID_SIZE / 2) }];
    localP2.direction = { x: 0, y: 0 };
    localP2.nextDirection = { x: 0, y: 0 };
    localP2.alive = true;
    localP2.score = 0;
    localP2.isMoving = false;
    localP2.isTongueActive = false;

    localGenerateFood();

    // Esconder overlays
    gameOverScreen.classList.add('hidden');
    spectatorOverlay.classList.add('hidden');
    victoryOverlay.classList.add('hidden');

    showScreen(mpGameScreen);
    if (gameTimeoutId) clearTimeout(gameTimeoutId);
    localGameTick();
}

function localGenerateFood() {
    let fx, fy, onSnake;
    do {
        fx = Math.floor(Math.random() * GRID_SIZE);
        fy = Math.floor(Math.random() * GRID_SIZE);
        onSnake = localP1.snake.some(s => s.x === fx && s.y === fy) ||
                  localP2.snake.some(s => s.x === fx && s.y === fy);
    } while (onSnake);
    food = { x: fx, y: fy };
}

function localGameTick() {
    if (!gameRunning || isPaused || !isLocalMultiplayer) return;

    localUpdate();
    localDraw();

    // Verificar vitória
    const p1Alive = localP1.alive;
    const p2Alive = localP2.alive;

    if (!p1Alive && !p2Alive) {
        gameRunning = false;
        localShowResult('Empate!');
        return;
    }
    if (!p1Alive) {
        gameRunning = false;
        localShowResult(localP2.name + ' Venceu!', localP2.name);
        return;
    }
    if (!p2Alive) {
        gameRunning = false;
        localShowResult(localP1.name + ' Venceu!', localP1.name);
        return;
    }

    gameTimeoutId = setTimeout(localGameTick, 150);
}

function localUpdate() {
    if (localP1.alive) localUpdateSnake(localP1);
    if (localP2.alive) localUpdateSnake(localP2);

    // Colisão entre cobras: perde 1 tamanho
    localCheckCollision(localP1, localP2);
    localCheckCollision(localP2, localP1);
}

function localUpdateSnake(player) {
    if (!player.isMoving) return;
    player.direction = player.nextDirection;
    const head = player.snake[0];
    const newHead = { x: head.x + player.direction.x, y: head.y + player.direction.y };

    // Parede = MORTE
    if (newHead.x < 0 || newHead.x >= GRID_SIZE || newHead.y < 0 || newHead.y >= GRID_SIZE) {
        player.alive = false;
        return;
    }

    // Próprio corpo = MORTE
    if (player.snake.some(s => s.x === newHead.x && s.y === newHead.y)) {
        player.alive = false;
        return;
    }

    player.snake.unshift(newHead);

    const ate = (newHead.x === food.x && newHead.y === food.y);
    const isDirectlyAhead = (food.x === newHead.x + player.direction.x && food.y === newHead.y + player.direction.y);
    const tongueTouchesFood = (player.isTongueActive && isDirectlyAhead);

    if (ate) {
        player.score++;
        player.isTongueActive = false;
        player.tongueAnim = null;
        localGenerateFood();
    } else if (tongueTouchesFood && !player.tongueAteFood) {
        player.tongueAteFood = true;
    } else {
        if (player.tongueAteFood) {
            // Mantém a cauda
        } else {
            player.snake.pop();
        }
    }
}

function localCheckCollision(self, other) {
    if (!self.alive || !other.alive) return;
    const head = self.snake[0];
    if (other.snake.some(s => s.x === head.x && s.y === head.y)) {
        if (self.snake.length > 1) self.snake.pop();
    }
}

function localDraw() {
    if (!mpCtx) return;
    const c = mpCtx;

    c.fillStyle = '#000';
    c.fillRect(0, 0, mpCanvas.width, mpCanvas.height);

    const localCell = mpCanvas.width / GRID_SIZE;

    // Comida (círculo)
    const foodCx = food.x * localCell + localCell / 2;
    const foodCy = food.y * localCell + localCell / 2;
    const foodR = localCell / 2 + 2;

    let activeTongue = null;
    if (localP1.tongueAteFood && localP1.tongueAnim) activeTongue = localP1;
    else if (localP2.tongueAteFood && localP2.tongueAnim) activeTongue = localP2;

    if (activeTongue) {
        const head = activeTongue.snake[0];
        const cx = head.x * localCell + localCell / 2;
        const cy = head.y * localCell + localCell / 2;
        const maxLen = localCell * 0.65;
        const t = activeTongue.tongueAnim.phase === 'out' ? activeTongue.tongueAnim.progress : (1 - activeTongue.tongueAnim.progress);
        const len = maxLen * t;
        const startX = cx + activeTongue.tongueAnim.dir.x * (localCell / 2 - 1);
        const startY = cy + activeTongue.tongueAnim.dir.y * (localCell / 2 - 1);
        const tipX = startX + activeTongue.tongueAnim.dir.x * len;
        const tipY = startY + activeTongue.tongueAnim.dir.y * len;

        if (activeTongue.tongueAnim.phase === 'in') {
            drawFoodAsSoccerBall(c, tipX, tipY, foodR);
        } else {
            drawFoodAsSoccerBall(c, foodCx, foodCy, foodR);
        }
    } else {
        drawFoodAsSoccerBall(c, foodCx, foodCy, foodR);
    }

    // Cobra 1 (verde)
    if (localP1.alive) {
        localDrawSnake(c, localP1, '#3acc7a', localCell);
        if (localP1.tongueAnim) drawSnakeTongue(c, localP1.snake[0], localP1.tongueAnim, localCell);
    }

    // Cobra 2 (azul)
    if (localP2.alive) {
        localDrawSnake(c, localP2, '#00c8ff', localCell);
        if (localP2.tongueAnim) drawSnakeTongue(c, localP2.snake[0], localP2.tongueAnim, localCell);
    }

    // Atualizar placar
    if (mpScoreVal) mpScoreVal.textContent = localP1.score;
    if (mpOtherScores) {
        mpOtherScores.innerHTML = `
            <div class="mp-score-entry" style="color:#00c8ff;">● ${localP2.name}: ${localP2.score}${localP2.alive ? '' : ' 💀'}</div>
        `;
    }
    if (mpPlayersBar) {
        mpPlayersBar.innerHTML = `
            <div class="mp-player-chip" style="background:#3acc7a;">${localP1.name}${localP1.alive ? '' : ' 💀'}</div>
            <div class="mp-player-chip" style="background:#00c8ff;">${localP2.name}${localP2.alive ? '' : ' 💀'}</div>
        `;
    }
}

function localDrawSnake(c, player, color, cellSize) {
    c.fillStyle = color;
    player.snake.forEach((segment) => {
        c.fillRect(segment.x * cellSize + 1, segment.y * cellSize + 1, cellSize - 2, cellSize - 2);
    });
}

function localShowResult(text, winnerName) {
    // Usar overlay de vitória do multiplayer
    victoryText.textContent = text;
    victoryLeaderboard.innerHTML = `
        <div class="lb-entry" style="color:${localP1.alive ? '#3acc7a' : '#888'};">
            <span>${localP1.name}</span><span>${localP1.score}</span>
        </div>
        <div class="lb-entry" style="color:${localP2.alive ? '#00c8ff' : '#888'};">
            <span>${localP2.name}</span><span>${localP2.score}</span>
        </div>
    `;
    victoryOverlay.classList.remove('hidden');
}

// ═══ INICIALIZAÇÃO ═════════════════════════════════════════════════════════════

if (!localStorage.getItem('snake_has_played')) {
    localStorage.setItem('snake_has_played', '1');
}

// ─── NAVEGAÇÃO DE MENU VIA CONTROLES ──────────────────────────────────────────
let menuFocusIndex = 0;
let lastActiveScreen = null;

function getActiveMenuScreen() {
    const screens = [
        document.getElementById('menu-screen'),
        document.getElementById('multiplayer-screen'),
        document.getElementById('join-screen'),
        document.getElementById('create-screen'),
        document.getElementById('rooms-screen'),
        document.getElementById('local-lobby-screen'),
        document.getElementById('lobby-screen'),
        document.getElementById('game-over-screen'),
        document.getElementById('instructions-modal'),
        document.getElementById('mp-instructions-modal'),
        document.getElementById('spectator-overlay'),
        document.getElementById('victory-overlay'),
        document.getElementById('pause-overlay-mp')
    ];
    return screens.find(s => s && !s.classList.contains('hidden') && s.offsetParent !== null);
}

function getFocusableElements(screen) {
    if (!screen) return [];
    const elements = Array.from(screen.querySelectorAll('button, input, a')).filter(el => {
        return !el.classList.contains('modal-close-btn');
    });

    const gameScreen = document.getElementById('game-screen');
    const mpGameScreen = document.getElementById('mp-game-screen');
    [gameScreen, mpGameScreen].forEach(gs => {
        if (gs && !gs.classList.contains('hidden') && gs.offsetParent !== null) {
            const topRow = gs.querySelector('.game-top-row');
            if (topRow && screen !== topRow) {
                const topRowEls = Array.from(topRow.querySelectorAll('button, input, a')).filter(el => {
                    return !el.classList.contains('modal-close-btn');
                });
                topRowEls.forEach(el => { if (!elements.includes(el)) elements.push(el); });
            }
        }
    });

    return elements.filter(el => {
        const style = window.getComputedStyle(el);
        return style.display !== 'none' && style.visibility !== 'hidden' && !el.disabled && el.offsetParent !== null && !el.classList.contains('modal-close-btn');
    });
}

function updateMenuFocus(direction = 0) {
    const activeScreen = getActiveMenuScreen();
    if (!activeScreen) {
        lastActiveScreen = null;
        document.querySelectorAll('.menu-btn, .menu-btn-secondary, .menu-btn-back, .room-input, .mp-input, .name-input').forEach(el => el.classList.remove('focused'));
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
            leaveMultiplayer();
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

showMenu();


