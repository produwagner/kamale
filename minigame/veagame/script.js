// ═══════════════════════════════════════════════════════════════════════════════
// VEA GAME — Script Principal (Singleplayer CPU + Local + Online Multiplayer)
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

function loadUserNickname() {
    const user = window.KamaleAuth ? window.KamaleAuth.getUser() : firebase.auth().currentUser;
    if (!user) { userNickname = ''; return; }
    
    // Fill immediately from cache if available
    userNickname = user.nickname || localStorage.getItem('kamale_cached_nickname') || user.displayName || '';
    if (userNickname) {
        if (inputCreatePlayerName && !inputCreatePlayerName.value) inputCreatePlayerName.value = userNickname;
        if (inputPlayerName && !inputPlayerName.value) inputPlayerName.value = userNickname;
        if (nameModalInput && !nameModalInput.value) nameModalInput.value = userNickname;
        if (inputRoomName && (!inputRoomName.value || inputRoomName.value === 'Sala de Velha' || inputRoomName.value.startsWith('Sala de '))) {
            inputRoomName.value = 'Sala de ' + userNickname;
        }
    }

    firebase.database().ref('users/' + user.uid + '/nickname').once('value').then(snap => {
        if (snap.exists()) {
            userNickname = snap.val();
            if (inputCreatePlayerName) inputCreatePlayerName.value = userNickname;
            if (inputPlayerName) inputPlayerName.value = userNickname;
            if (nameModalInput) nameModalInput.value = userNickname;
            if (inputRoomName && (!inputRoomName.value || inputRoomName.value === 'Sala de Velha' || inputRoomName.value.startsWith('Sala de '))) {
                inputRoomName.value = 'Sala de ' + userNickname;
            }
            localStorage.setItem('kamale_cached_nickname', userNickname);
        }
    });
}

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

// ─── ELEMENTOS DO DOM ─────────────────────────────────────────────────────────
const cells = document.querySelectorAll('.cell');
const currentPlayerDisplay = document.getElementById('current-player');
const scoreXVal = document.getElementById('score-x-val');
const scoreOVal = document.getElementById('score-o-val');
const gameOverScreen = document.getElementById('game-over-screen');
const gameOverTitle = document.getElementById('game-over-title');
const restartBtn = document.getElementById('restart-btn');
const backToMenuBtn = document.getElementById('back-to-menu-btn');
const statusDisplay = document.getElementById('status-display');
const learnBtn = document.getElementById('learn-btn');
const closeInstructionsBtn = document.getElementById('close-instructions-btn');
const instructionsModal = document.getElementById('instructions-modal');

// Mobile Buttons
const mobilePauseBtn = document.getElementById('mobile-pause-btn');
const mobileResetBtn = document.getElementById('mobile-reset-btn');

// Overlays / Screens
const menuScreen = document.getElementById('menu-screen');
const mpScreen = document.getElementById('multiplayer-screen');
const joinScreen = document.getElementById('join-screen');
const createScreen = document.getElementById('create-screen');
const roomsScreen = document.getElementById('rooms-screen');
const lobbyScreen = document.getElementById('lobby-screen');
const localLobbyScreen = document.getElementById('local-lobby-screen');
const pauseOverlay = document.getElementById('pause-overlay');
const pauseOverlayMp = document.getElementById('pause-overlay-mp');

// Input fields
const inputLocalP1 = document.getElementById('input-local-p1');
const inputLocalP2 = document.getElementById('input-local-p2');
const inputRoomCode = document.getElementById('input-room-code');
const inputPlayerName = document.getElementById('input-player-name');
const inputRoomName = document.getElementById('input-room-name');
const inputCreatePlayerName = document.getElementById('input-create-player-name');
const joinError = document.getElementById('join-error');
const roomsList = document.getElementById('rooms-list');
const lobbyRoomCode = document.getElementById('lobby-room-code');
const lobbyPlayers = document.getElementById('lobby-players');
const lobbyWaiting = document.getElementById('lobby-waiting');

// Name Modal
const nameModal = document.getElementById('name-modal');
const nameModalInput = document.getElementById('name-modal-input');
const nameModalConfirm = document.getElementById('name-modal-confirm');

// Action/Confirm Buttons
const btnShowMultiplayer = document.getElementById('btn-show-multiplayer');
const btnVsCpu = document.getElementById('btn-vs-cpu');
const btnLocalMultiplayer = document.getElementById('btn-local-multiplayer');
const btnCreateRoom = document.getElementById('btn-create-room');
const btnShowRooms = document.getElementById('btn-show-rooms');
const btnShowJoin = document.getElementById('btn-show-join');
const btnBackMultiplayer = document.getElementById('btn-back-multiplayer');
const btnBackJoin = document.getElementById('btn-back-join');
const btnBackCreate = document.getElementById('btn-back-create');
const btnBackRooms = document.getElementById('btn-back-rooms');
const btnLeaveLobby = document.getElementById('btn-leave-lobby');
const btnBackLocalLobby = document.getElementById('btn-back-local-lobby');
const btnStartLocal = document.getElementById('btn-start-local');
const btnStartGame = document.getElementById('btn-start-game');
const btnReady = document.getElementById('btn-ready');
const lobbyReadyStatus = document.getElementById('lobby-ready-status');
const rematchStatus = document.getElementById('rematch-status');
const btnRefreshRooms = document.getElementById('btn-refresh-rooms');
const btnJoinConfirm = document.getElementById('btn-join-confirm');
const btnCreateConfirm = document.getElementById('btn-create-confirm');

// ─── ESTADO DO JOGO ───────────────────────────────────────────────────────────
let board = Array(9).fill(null);
let currentPlayer = 'X'; // 'X' ou 'O'
let gameActive = false;
let gameMode = 'vs_cpu'; // 'vs_cpu', 'local', 'online'
let mpHadOpponent = false;
let mpLobbyAutoStarted = false;
let scoreX = parseInt(localStorage.getItem('ttt_score_x') || '0');
let scoreO = parseInt(localStorage.getItem('ttt_score_o') || '0');

let isPaused = false;
let isPausedByInstructions = false;
let player1Name = 'Jogador 1';
let player2Name = 'Jogador 2';

// Combinações vencedoras
const WINNING_COMBINATIONS = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8], // Linhas
    [0, 3, 6], [1, 4, 7], [2, 5, 8], // Colunas
    [0, 4, 8], [2, 4, 6]             // Diagonais
];

// Inicializa o placar
scoreXVal.textContent = scoreX;
scoreOVal.textContent = scoreO;

// ─── GERENCIAMENTO DE TELAS ───────────────────────────────────────────────────

function showScreen(screen) {
    const screens = [
        menuScreen, mpScreen, joinScreen, createScreen, 
        roomsScreen, lobbyScreen, localLobbyScreen
    ];
    screens.forEach(s => {
        if (s) s.classList.add('hidden');
    });
    if (screen) screen.classList.remove('hidden');

    const gridContainer = document.getElementById('grid-container');
    const scoreboard = document.getElementById('scoreboard');
    if (screen) {
        if (gridContainer) gridContainer.classList.add('hidden');
        if (scoreboard) scoreboard.classList.add('hidden');
    } else {
        if (gridContainer) gridContainer.classList.remove('hidden');
        if (scoreboard) scoreboard.classList.remove('hidden');
    }

    setTimeout(() => updateMenuFocus(0), 50);
}

function showMenu() {
    gameActive = false;
    isPaused = false;
    statusDisplay.classList.add('hidden');
    mobileResetBtn.classList.add('hidden');
    updatePauseBtn();
    pauseOverlay.classList.add('hidden');
    pauseOverlayMp.classList.add('hidden');
    gameOverScreen.classList.add('hidden');
    showScreen(menuScreen);
}

// ─── INICIALIZAÇÃO DE PARTIDAS ────────────────────────────────────────────────

function initGame() {
    board.fill(null);
    gameActive = true;
    isPaused = false;
    if (gameMode !== 'online') {
        scoreXVal.textContent = scoreX;
        scoreOVal.textContent = scoreO;
    }
    currentPlayer = 'X';
    dpadActive = false;
    cells.forEach(c => c.classList.remove('dpad-focus'));
    
    // Configura turno e cabeçalho
    statusDisplay.classList.remove('hidden');
    updateTurnIndicator();
    
    // Limpa células
    cells.forEach(cell => {
        cell.innerHTML = '';
        cell.style.pointerEvents = 'auto';
    });
    
    // Limpa overlays
    gameOverScreen.classList.add('hidden');
    pauseOverlay.classList.add('hidden');
    pauseOverlayMp.classList.add('hidden');
    updatePauseBtn();
}

function updateTurnIndicator() {
    let name = currentPlayer === 'X' ? player1Name : player2Name;
    if (gameMode === 'online') {
        const pList = Object.values(Multiplayer.players);
        const pTurn = pList.find(p => p.symbol === currentPlayer);
        if (pTurn) name = pTurn.name;
    }
    const shape = currentPlayer === 'X' ? '■' : '●';
    currentPlayerDisplay.textContent = shape + ' (' + name + ')';
    currentPlayerDisplay.className = currentPlayer === 'X' ? 'x-active' : 'o-active';
}

// ─── EVENTOS DOS MENUS PRINCIPAIS ─────────────────────────────────────────────

btnVsCpu.addEventListener('click', () => {
    gameMode = 'vs_cpu';
    player1Name = 'Você';
    player2Name = 'Computador';
    initGame();
    showScreen(null); // Oculta todas as telas para exibir o tabuleiro
});

btnShowMultiplayer.addEventListener('click', () => {
    showScreen(mpScreen);
});

btnBackMultiplayer.addEventListener('click', showMenu);

btnLocalMultiplayer.addEventListener('click', () => {
    inputLocalP1.value = localStorage.getItem('ttt_local_p1') || 'Jogador 1';
    inputLocalP2.value = localStorage.getItem('ttt_local_p2') || 'Jogador 2';
    showScreen(localLobbyScreen);
});

btnBackLocalLobby.addEventListener('click', () => {
    showScreen(mpScreen);
});

btnStartLocal.addEventListener('click', () => {
    player1Name = inputLocalP1.value.trim() || 'Jogador 1';
    player2Name = inputLocalP2.value.trim() || 'Jogador 2';
    localStorage.setItem('ttt_local_p1', player1Name);
    localStorage.setItem('ttt_local_p2', player2Name);
    gameMode = 'local';
    initGame();
    showScreen(null);
});

// ─── JOGABILIDADE OFFLINE E IA CPU ────────────────────────────────────────────

function handleCellClick(e) {
    if (!gameActive || isPaused) return;
    if (gameMode === 'online' && currentPlayer !== Multiplayer.playerSymbol) return;
    if (gameMode === 'vs_cpu' && currentPlayer === 'O') return; // Espera a CPU jogar

    const cell = e.currentTarget;
    const index = parseInt(cell.getAttribute('data-index'));

    if (board[index] !== null) return;

    cells.forEach(c => c.classList.remove('dpad-focus'));
    makeMove(index, currentPlayer);
}

function makeMove(index, symbol) {
    board[index] = symbol;

    const cell = document.querySelector(`.cell[data-index="${index}"]`);
    if (cell) {
        if (symbol === 'O' && isDonor && soccerBallImg && soccerBallImg.complete && soccerBallImg.naturalWidth > 0) {
            const markImg = document.createElement('img');
            markImg.src = soccerBallImg.src;
            markImg.className = 'o-mark';
            markImg.style.width = '3.2rem';
            markImg.style.height = '3.2rem';
            markImg.style.borderRadius = '50%';
            cell.appendChild(markImg);
        } else {
            const markSpan = document.createElement('span');
            markSpan.className = symbol === 'X' ? 'x-mark' : 'o-mark';
            cell.appendChild(markSpan);
        }
        cell.style.pointerEvents = 'none';
    }

    // Verifica vitória ou empate
    if (checkWin(symbol)) {
        if (gameMode === 'online') {
            Multiplayer.sendMove(board.map(c => c || ""), currentPlayer);
        }
        endGame(symbol);
    } else if (checkTie()) {
        if (gameMode === 'online') {
            Multiplayer.sendMove(board.map(c => c || ""), currentPlayer);
        }
        endGame('tie');
    } else {
        // Alterna turno
        currentPlayer = currentPlayer === 'X' ? 'O' : 'X';
        updateTurnIndicator();

        // Se for modo online, envia movimento
        if (gameMode === 'online') {
            Multiplayer.sendMove(board.map(c => c || ""), currentPlayer);
        } else if (gameMode === 'vs_cpu' && currentPlayer === 'O') {
            setTimeout(makeCpuMove, 500);
        }
    }
}

function checkWin(player) {
    return WINNING_COMBINATIONS.some(combination => {
        return combination.every(index => board[index] === player);
    });
}

function checkTie() {
    return board.every(cell => cell !== null);
}

function makeCpuMove() {
    if (!gameActive || isPaused || gameMode !== 'vs_cpu') return;

    let moveIndex = -1;

    // 1. CPU tenta ganhar
    for (let i = 0; i < 9; i++) {
        if (board[i] === null) {
            board[i] = 'O';
            if (checkWin('O')) moveIndex = i;
            board[i] = null;
            if (moveIndex !== -1) break;
        }
    }

    // 2. Bloqueia vitória do jogador
    if (moveIndex === -1) {
        for (let i = 0; i < 9; i++) {
            if (board[i] === null) {
                board[i] = 'X';
                if (checkWin('X')) moveIndex = i;
                board[i] = null;
                if (moveIndex !== -1) break;
            }
        }
    }

    // 3. Pega o centro
    if (moveIndex === -1 && board[4] === null) {
        moveIndex = 4;
    }

    // 4. Pega os cantos
    if (moveIndex === -1) {
        const corners = [0, 2, 6, 8].filter(idx => board[idx] === null);
        if (corners.length > 0) {
            moveIndex = corners[Math.floor(Math.random() * corners.length)];
        }
    }

    // 5. Escolhe qualquer célula livre
    if (moveIndex === -1) {
        const freeCells = [];
        board.forEach((c, idx) => {
            if (c === null) freeCells.push(idx);
        });
        if (freeCells.length > 0) {
            moveIndex = freeCells[Math.floor(Math.random() * freeCells.length)];
        }
    }

    if (moveIndex !== -1) {
        makeMove(moveIndex, 'O');
    }
}

function endGame(result) {
    gameActive = false;
    cells.forEach(cell => cell.style.pointerEvents = 'none');

    // Manda resultado para o Firebase no modo online
    if (gameMode === 'online') {
        Multiplayer.sendGameOver(result);
    }

    if (result === 'tie') {
        gameOverTitle.innerHTML = 'Empate! <span class="shake-emoji">🤝</span>';
    } else {
        const winnerName = result === 'X' ? player1Name : player2Name;
        const winnerShape = result === 'X' ? '<span class="x-active">■</span>' : '<span class="o-active">●</span>';
        gameOverTitle.innerHTML = `${winnerShape} ${winnerName} Venceu! <span class="skull-emoji">💀</span>`;

        // Incrementa pontuações locais se for offline
        if (gameMode !== 'online') {
            if (result === 'X') {
                scoreX++;
                localStorage.setItem('ttt_score_x', scoreX);
                scoreXVal.textContent = scoreX;
            } else {
                scoreO++;
                localStorage.setItem('ttt_score_o', scoreO);
                scoreOVal.textContent = scoreO;
            }
        }
    }

    // Garante que o botão de jogar novamente esteja visível
    restartBtn.style.display = 'block';
    // Oculta reset button no celular ao acabar o jogo
    mobileResetBtn.classList.add('hidden');
    gameOverScreen.classList.remove('hidden');
    setTimeout(() => updateMenuFocus(0), 50);
}

// ─── MULTIPLAYER ONLINE (FIREBASE) ───────────────────────────────────────────

btnCreateRoom.addEventListener('click', () => {
    inputCreatePlayerName.value = userNickname || localStorage.getItem('ttt_player_name') || 'Jogador 1';
    inputRoomName.value = userNickname ? 'Sala de ' + userNickname : 'Sala 1';
    showScreen(createScreen);

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

btnBackCreate.addEventListener('click', () => {
    showScreen(mpScreen);
});

btnCreateConfirm.addEventListener('click', () => {
    const name = inputCreatePlayerName.value.trim();
    const roomName = inputRoomName.value.trim();
    if (!name) return;

    localStorage.setItem('ttt_player_name', name);
    localStorage.setItem('ttt_room_name', roomName);

    mpHadOpponent = false;
    mpLobbyAutoStarted = false;
    Multiplayer.createRoom(name, roomName, (code) => {
        gameMode = 'online';
        lobbyRoomCode.textContent = code;
        updateLobbyPlayers(Multiplayer.players);
        showScreen(lobbyScreen);
    });
});

btnShowRooms.addEventListener('click', () => {
    showScreen(roomsScreen);
    refreshRoomsList();
});

btnRefreshRooms.addEventListener('click', refreshRoomsList);

btnBackRooms.addEventListener('click', () => {
    showScreen(mpScreen);
});

btnShowJoin.addEventListener('click', () => {
    inputPlayerName.value = userNickname || localStorage.getItem('ttt_player_name') || 'Jogador 2';
    inputRoomCode.value = '';
    joinError.classList.add('hidden');
    showScreen(joinScreen);
});

btnBackJoin.addEventListener('click', () => {
    showScreen(mpScreen);
});

btnJoinConfirm.addEventListener('click', () => {
    const code = inputRoomCode.value.trim();
    const name = inputPlayerName.value.trim();
    if (!code || !name) return;

    localStorage.setItem('ttt_player_name', name);
    joinError.classList.add('hidden');

    mpHadOpponent = false;
    mpLobbyAutoStarted = false;
    Multiplayer.joinRoom(code, name, (roomCode, err) => {
        if (err) {
            joinError.textContent = err;
            joinError.classList.remove('hidden');
            return;
        }
        gameMode = 'online';
        lobbyRoomCode.textContent = roomCode;
        updateLobbyPlayers(Multiplayer.players);
        showScreen(lobbyScreen);
    });
});

function handleLeaveRoom() {
    Multiplayer.leaveRoom();
    mpHadOpponent = false;
    mpLobbyAutoStarted = false;
    showMenu();
}

btnLeaveLobby.addEventListener('click', handleLeaveRoom);

if (btnStartGame) {
    btnStartGame.addEventListener('click', () => {
        if (Multiplayer.isHost) {
            Multiplayer.startGame();
        }
    });
}

function updateLobbyPlayers(playersObj) {
    lobbyPlayers.innerHTML = '';
    const plist = Object.entries(playersObj);
    plist.forEach(([id, p]) => {
        const card = document.createElement('div');
        card.className = 'lobby-player-card';
        card.style.borderColor = p.color;
        
        const readyBadge = p.ready ? '<span style="color:#3acc7a;margin-left:4px;">✓</span>' : '';
        const nameSpan = document.createElement('span');
        nameSpan.style.color = p.color;
        nameSpan.innerHTML = `${p.symbol === 'X' ? '■' : '●'} ${p.name}${readyBadge}`;
        if (id === Multiplayer.playerId) {
            nameSpan.innerHTML += ' <span class="lobby-player-host">VOCÊ</span>';
        }
        card.appendChild(nameSpan);
        lobbyPlayers.appendChild(card);
    });

    const isFull = plist.length >= 2;
    if (isFull) {
        lobbyWaiting.textContent = 'Aguardando jogadores ficarem prontos...';
        btnReady.classList.remove('hidden');
        
        const myReady = playersObj[Multiplayer.playerId]?.ready;
        const other = plist.find(([id]) => id !== Multiplayer.playerId);
        const otherReady = other && other[1]?.ready;

        if (myReady && otherReady) {
            btnReady.classList.add('hidden');
            lobbyReadyStatus.style.display = 'block';
            lobbyReadyStatus.textContent = 'Ambos estão prontos ✓';
            lobbyReadyStatus.style.color = '#3acc7a';
        } else if (myReady) {
            btnReady.classList.add('hidden');
            lobbyReadyStatus.style.display = 'block';
            lobbyReadyStatus.textContent = 'Você está pronto ✓';
            lobbyReadyStatus.style.color = '#3acc7a';
        } else if (otherReady) {
            btnReady.classList.remove('hidden');
            lobbyReadyStatus.style.display = 'block';
            lobbyReadyStatus.textContent = `${other[1].name} está pronto ✓`;
            lobbyReadyStatus.style.color = '#3acc7a';
        } else {
            btnReady.classList.remove('hidden');
            lobbyReadyStatus.style.display = 'none';
        }

        const allReady = plist.every(([, p]) => p.ready);
        if (allReady && Multiplayer.isHost && !mpLobbyAutoStarted) {
            mpLobbyAutoStarted = true;
            Multiplayer.startGame();
        }
    } else {
        lobbyWaiting.textContent = 'Aguardando adversário...';
        btnReady.classList.add('hidden');
        lobbyReadyStatus.style.display = 'none';
    }
}

function refreshRoomsList() {
    roomsList.innerHTML = '<div class="lobby-waiting" style="color:#888;font-size:0.85rem;text-align:center;">Buscando salas...</div>';
    Multiplayer.getAvailableRooms((rooms) => {
        roomsList.innerHTML = '';
        if (rooms.length === 0) {
            roomsList.innerHTML = '<div class="lobby-waiting" style="color:#888;font-size:0.85rem;text-align:center;">Nenhuma sala aberta. Crie uma!</div>';
            return;
        }
        rooms.forEach(r => {
            const item = document.createElement('div');
            item.className = 'room-item';
            item.innerHTML = `
                <div class="room-item-info">
                    <div class="room-item-name">${r.name}</div>
                    <div class="room-item-code">Código: ${r.code}</div>
                </div>
                <div class="room-item-players">${r.playersCount}/2</div>
                <button class="room-item-join menu-btn menu-btn-primary">Entrar</button>
            `;
            item.querySelector('.room-item-join').addEventListener('click', (e) => {
                e.stopPropagation();
                joinFromRooms(r.code, r.playersCount);
            });
            roomsList.appendChild(item);
        });
        setTimeout(() => updateMenuFocus(0), 50);
    });
}

function joinFromRooms(code, playersCount = 1) {
    const storedName = userNickname || localStorage.getItem('ttt_player_name') || ('Jogador ' + (playersCount + 1));
    nameModalInput.value = storedName;
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
        
        localStorage.setItem('ttt_player_name', name);
        
        Multiplayer.joinRoom(code, name, (roomCode, err) => {
            if (err) {
                showToast(err);
                return;
            }
            gameMode = 'online';
            lobbyRoomCode.textContent = roomCode;
            updateLobbyPlayers(Multiplayer.players);
            showScreen(lobbyScreen);
        });
    };
    
    const onKeyDown = (e) => {
        if (e.key === 'Enter') onConfirm();
    };
    
    nameModalConfirm.addEventListener('click', onConfirm);
    nameModalInput.addEventListener('keydown', onKeyDown);
}

// Configura callbacks do Multiplayer
Multiplayer.onPlayersUpdate = (p) => {
    if (gameMode === 'online') {
        const plist = Object.keys(p);
        if (plist.length >= 2) mpHadOpponent = true;
        
        if (plist.length < 2 && mpHadOpponent) {
            mpHadOpponent = false;
            gameActive = false;
            gameOverScreen.classList.add('hidden');
            showToast('O outro jogador saiu da sala');
            setTimeout(() => {
                handleLeaveRoom();
            }, 1000);
            return;
        }
        updateLobbyPlayers(p);
        updateRematchStatus(p);
        const pList = Object.values(p);
        const pX = pList.find(player => player.symbol === 'X');
        const pO = pList.find(player => player.symbol === 'O');
        if (pX && scoreXVal) scoreXVal.textContent = pX.score || 0;
        if (pO && scoreOVal) scoreOVal.textContent = pO.score || 0;
    }
};

Multiplayer.onStatusUpdate = (status, winner) => {
    if (gameMode === 'online') {
        if (status === 'playing') {
            // Usar nomes reais dos jogadores do Firebase
            const pList = Object.values(Multiplayer.players);
            const pX = pList.find(p => p.symbol === 'X');
            const pO = pList.find(p => p.symbol === 'O');
            player1Name = pX ? pX.name : 'Jogador 1';
            player2Name = pO ? pO.name : 'Jogador 2';
            initGame();
            showScreen(null);
            document.getElementById('rematch-status').style.display = 'none';
        } else if (status === 'finished') {
            gameActive = false;
            cells.forEach(function (cell) { cell.style.pointerEvents = 'none'; });
            mobileResetBtn.classList.add('hidden');

            if (winner === 'tie') {
                gameOverTitle.innerHTML = 'Empate! <span class="shake-emoji">🤝</span>';
            } else if (winner) {
                var winnerName = winner === 'X' ? player1Name : player2Name;
                var winnerShape = winner === 'X' ? '<span class="x-active">■</span>' : '<span class="o-active">●</span>';
                gameOverTitle.innerHTML = winnerShape + ' ' + winnerName + ' Venceu! <span class="skull-emoji">💀</span>';
            }
            gameOverScreen.classList.remove('hidden');
        }
    }
};

Multiplayer.onBoardUpdate = (fbBoard, fbCurrentPlayer) => {
    if (gameMode === 'online' && gameActive) {
        currentPlayer = fbCurrentPlayer;
        updateTurnIndicator();

        // Renderiza tabuleiro local sincronizado
        fbBoard.forEach((val, idx) => {
            board[idx] = val || null;
            const cell = document.querySelector(`.cell[data-index="${idx}"]`);
            if (cell) {
                cell.innerHTML = '';
                if (val) {
                    if (val === 'O' && isDonor && soccerBallImg && soccerBallImg.complete && soccerBallImg.naturalWidth > 0) {
                        const markImg = document.createElement('img');
                        markImg.src = soccerBallImg.src;
                        markImg.className = 'o-mark';
                        markImg.style.width = '3.2rem';
                        markImg.style.height = '3.2rem';
                        markImg.style.borderRadius = '50%';
                        cell.appendChild(markImg);
                    } else {
                        const markSpan = document.createElement('span');
                        markSpan.className = val === 'X' ? 'x-mark' : 'o-mark';
                        cell.appendChild(markSpan);
                    }
                    cell.style.pointerEvents = 'none';
                } else {
                    cell.style.pointerEvents = 'auto';
                }
            }
        });
    }
};

Multiplayer.onRoomDeleted = () => {
    if (gameMode === 'online') {
        showToast('A sala foi desfeita pelo host.', 'info');
        showMenu();
    }
};

Multiplayer.onPauseUpdate = (pauser) => {
    if (gameMode === 'online' && gameActive) {
        if (pauser) {
            isPaused = true;
            document.getElementById('pause-text-mp').textContent = `Pausado por: ${pauser}`;
            pauseOverlayMp.classList.remove('hidden');
        } else {
            isPaused = false;
            pauseOverlayMp.classList.add('hidden');
        }
        updatePauseBtn();
    }
};

// ─── CONTROLES DE PAUSA E SAÍDA ───────────────────────────────────────────────

function togglePause() {
    if (!gameActive) return;

    if (gameMode === 'online') {
        if (isPaused) {
            Multiplayer.sendUnpause();
        } else {
            Multiplayer.sendPause(Multiplayer.playerName);
        }
    } else {
        isPaused = !isPaused;
        if (isPaused) {
            if (instructionsModal.classList.contains('hidden')) {
                pauseOverlay.classList.remove('hidden');
            }
            mobileResetBtn.classList.remove('hidden');
        } else {
            pauseOverlay.classList.add('hidden');
            mobileResetBtn.classList.add('hidden');
        }
        updatePauseBtn();
    }
    setTimeout(() => updateMenuFocus(0), 50);
}

function updatePauseBtn() {
    if (!mobilePauseBtn) return;
    if (!instructionsModal.classList.contains('hidden')) {
        mobilePauseBtn.textContent = '✕';
        mobilePauseBtn.classList.remove('active');
        return;
    }
    if (isPaused) {
        mobilePauseBtn.textContent = '▶';
        mobilePauseBtn.classList.add('active');
    } else {
        mobilePauseBtn.textContent = '⏸';
        mobilePauseBtn.classList.remove('active');
    }
}

if (mobilePauseBtn) {
    const handlePauseTrigger = (e) => {
        e.preventDefault();
        togglePause();
    };
    mobilePauseBtn.addEventListener('touchstart', handlePauseTrigger, { passive: false });
    mobilePauseBtn.addEventListener('click', handlePauseTrigger);
}

if (mobileResetBtn) {
    const handleReset = (e) => {
        e.preventDefault();
        if (gameMode === 'online') {
            handleLeaveRoom();
        } else {
            showMenu();
        }
    };
    mobileResetBtn.addEventListener('touchstart', handleReset, { passive: false });
    mobileResetBtn.addEventListener('click', handleReset);
}

// ─── INSTRUÇÕES DO JOGO ───────────────────────────────────────────────────────

function openInstructions() {
    if (gameActive && !isPaused) {
        isPaused = true;
        isPausedByInstructions = true;
    }
    instructionsModal.classList.remove('hidden');
    updatePauseBtn();
    setTimeout(() => updateMenuFocus(0), 50);
}

function closeInstructions() {
    instructionsModal.classList.add('hidden');
    if (gameActive && isPaused && isPausedByInstructions) {
        isPaused = false;
        isPausedByInstructions = false;
        updatePauseBtn();
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

// ─── REINICIALIZAÇÃO APÓS GAME OVER ──────────────────────────────────────────

function handleRematchClick() {
    if (gameMode !== 'online') {
        initGame();
        return;
    }
    Multiplayer.sendRematch(true);
    
    // Oculta o botão e exibe status de espera
    restartBtn.style.display = 'none';
    if (rematchStatus) {
        rematchStatus.style.display = 'block';
        rematchStatus.textContent = 'Aguardando o outro jogador...';
        rematchStatus.style.color = '#3acc7a';
    }

    if (Multiplayer.isHost) {
        const myId = Multiplayer.playerId;
        const players = Multiplayer.players;
        const allWantsRematch = Object.keys(players).length >= 2 && Object.values(players).every(p => p.wantsRematch);
        if (allWantsRematch) {
            Multiplayer.restartGame();
        }
    }
}

function updateRematchStatus(players) {
    if (gameMode !== 'online') return;
    const myId = Multiplayer.playerId;
    const otherEntries = Object.entries(players).filter(([id]) => id !== myId);
    const otherWants = otherEntries.length > 0 && otherEntries.some(([, p]) => p.wantsRematch);
    const allWantRematch = Object.keys(players).length >= 2 && Object.values(players).every(p => p.wantsRematch);

    if (allWantRematch && Multiplayer.isHost && !gameActive) {
        Multiplayer.restartGame();
        return;
    }

    const myReady = players[myId]?.wantsRematch;
    if (myReady) {
        if (restartBtn) restartBtn.style.display = 'none';
        if (rematchStatus) {
            rematchStatus.style.display = 'block';
            rematchStatus.textContent = 'Aguardando o outro jogador...';
            rematchStatus.style.color = '#3acc7a';
        }
    } else {
        if (restartBtn) restartBtn.style.display = '';
        if (otherWants) {
            if (rematchStatus) {
                rematchStatus.style.display = 'block';
                rematchStatus.textContent = 'O outro jogador quer jogar novamente!';
                rematchStatus.style.color = '#ffd100';
            }
        } else {
            if (rematchStatus) rematchStatus.style.display = 'none';
        }
    }
}

restartBtn.addEventListener('click', handleRematchClick);

backToMenuBtn.addEventListener('click', () => {
    if (gameMode === 'online') {
        handleLeaveRoom();
    } else {
        showMenu();
    }
});

if (btnReady) {
    btnReady.addEventListener('click', () => {
        if (gameMode === 'online') {
            Multiplayer.sendReady(true);
        }
    });
}

// ─── NAVEGAÇÃO DE MENU POR CONTROLES (TECLADO) ────────────────────────────────

let menuFocusIndex = 0;
let lastActiveScreen = null;

function getActiveMenuScreen() {
    const screens = [
        menuScreen, mpScreen, joinScreen, createScreen, 
        roomsScreen, lobbyScreen, localLobbyScreen,
        instructionsModal, pauseOverlay, pauseOverlayMp, gameOverScreen
    ];
    return screens.find(s => s && !s.classList.contains('hidden') && s.offsetParent !== null);
}

function getFocusableElements(screen) {
    if (!screen) return [];
    // Captura botões, links, inputs e itens de sala
    const elements = Array.from(screen.querySelectorAll('button, input, .room-item, a'));
    return elements.filter(el => {
        const style = window.getComputedStyle(el);
        return style.display !== 'none' && style.visibility !== 'hidden' && !el.disabled && el.offsetParent !== null && !el.classList.contains('modal-close-btn');
    });
}

function updateMenuFocus(direction = 0) {
    const activeScreen = getActiveMenuScreen();
    if (!activeScreen) {
        lastActiveScreen = null;
        document.querySelectorAll('.menu-btn, .menu-btn-secondary, .menu-btn-back, .mp-input, .room-item').forEach(el => el.classList.remove('focused'));
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
        // Se for input de texto, foca nativamente
        if (currentEl.tagName === 'INPUT' && direction !== 0) {
            currentEl.focus();
        }
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

// Captura keydown para navegar nos menus e no tabuleiro
window.addEventListener('keydown', (e) => {
    const tag = document.activeElement?.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA') return;

    const isMenuFocused = getActiveMenuScreen() !== undefined;
    if (isMenuFocused) {
        if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
            e.preventDefault();
            updateMenuFocus(-1);
        } else if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') {
            e.preventDefault();
            updateMenuFocus(1);
        } else if (e.key === ' ' || e.key === 'Enter' || e.key === 'z' || e.key === 'Z' || e.key === 'x' || e.key === 'X') {
            e.preventDefault();
            activateFocusedElement();
        }
        return;
    }

    // Navegar células do tabuleiro durante o jogo
    if (gameActive) {
        if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
            e.preventDefault();
            moveDpad(-1, 0);
        } else if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') {
            e.preventDefault();
            moveDpad(1, 0);
        } else if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
            e.preventDefault();
            moveDpad(0, -1);
        } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
            e.preventDefault();
            moveDpad(0, 1);
        } else if (e.key === ' ' || e.key === 'Enter' || e.key === 'z' || e.key === 'Z' || e.key === 'x' || e.key === 'X') {
            e.preventDefault();
            confirmDpadMove();
        }
    }

    // Tecla P pausa o jogo
    if ((e.key === 'p' || e.key === 'P') && gameActive) {
        e.preventDefault();
        togglePause();
    }
});

// ─── INICIALIZAÇÃO GERAL ─────────────────────────────────────────────────────

// Associa cliques na grade 3x3
cells.forEach(cell => {
    cell.addEventListener('click', handleCellClick);
});

// ─── CONTROLES D-PAD E TECLADO ──────────────────────────────────────────────

const dpadUp = document.getElementById('dpad-up');
const dpadDown = document.getElementById('dpad-down');
const dpadLeft = document.getElementById('dpad-left');
const dpadRight = document.getElementById('dpad-right');
const actionA = document.getElementById('action-a');
const actionShape = document.getElementById('action-shape');

let dpadIndex = 4; // Centro do tabuleiro
let dpadActive = false;

function updateDpadFocus() {
    cells.forEach((c, i) => {
        c.classList.toggle('dpad-focus', dpadActive && i === dpadIndex);
    });
}

function updateActionShape() {
    if (!actionShape) return;
    const isX = currentPlayer === 'X';
    actionShape.textContent = isX ? '■' : '●';
    actionShape.style.color = isX ? '#3acc7a' : '#ff4a4a';
    actionShape.style.fontSize = '1.4rem';
}

function moveDpad(dr, dc) {
    const row = Math.floor(dpadIndex / 3);
    const col = dpadIndex % 3;
    const nr = row + dr;
    const nc = col + dc;
    if (nr < 0 || nr > 2 || nc < 0 || nc > 2) return;
    dpadIndex = nr * 3 + nc;
    dpadActive = true;
    updateDpadFocus();
}

function confirmDpadMove() {
    if (!gameActive || isPaused) return;
    if (gameMode === 'online' && currentPlayer !== Multiplayer.playerSymbol) return;
    if (gameMode === 'vs_cpu' && currentPlayer === 'O') return;
    if (board[dpadIndex] !== null) return;
    makeMove(dpadIndex, currentPlayer);
    updateActionShape();
}

function setupDpadButton(btn, dir) {
    if (!btn) return;
    const press = (e) => {
        e.preventDefault();
        btn.classList.add('active');
        // Se um menu/overlay estiver aberto, navega por ele
        if (updateMenuFocus(0)) {
            if (dir.y === -1) updateMenuFocus(-1);
            else if (dir.y === 1) updateMenuFocus(1);
            else if (dir.x === -1) updateMenuFocus(-1);
            else if (dir.x === 1) updateMenuFocus(1);
            return;
        }
        // Caso contrário, move no tabuleiro
        if (dir.y === -1) moveDpad(-1, 0);
        else if (dir.y === 1) moveDpad(1, 0);
        else if (dir.x === -1) moveDpad(0, -1);
        else if (dir.x === 1) moveDpad(0, 1);
    };
    const release = () => btn.classList.remove('active');
    btn.addEventListener('touchstart', press, { passive: false });
    btn.addEventListener('touchend', release, { passive: true });
    btn.addEventListener('touchcancel', release, { passive: true });
    btn.addEventListener('mousedown', press);
    btn.addEventListener('mouseup', release);
    btn.addEventListener('mouseleave', release);
}

function setupActionButton(btn) {
    if (!btn) return;
    const press = (e) => {
        e.preventDefault();
        btn.classList.add('active');
        if (activateFocusedElement()) return;
        confirmDpadMove();
    };
    const release = () => btn.classList.remove('active');
    btn.addEventListener('touchstart', press, { passive: false });
    btn.addEventListener('touchend', release, { passive: true });
    btn.addEventListener('touchcancel', release, { passive: true });
    btn.addEventListener('mousedown', press);
    btn.addEventListener('mouseup', release);
    btn.addEventListener('mouseleave', release);
}

setupDpadButton(dpadUp, { x: 0, y: -1 });
setupDpadButton(dpadDown, { x: 0, y: 1 });
setupDpadButton(dpadLeft, { x: -1, y: 0 });
setupDpadButton(dpadRight, { x: 1, y: 0 });
setupActionButton(actionA);

// Atualiza shape do botão A no turno
const origUpdateTurn = updateTurnIndicator;
updateTurnIndicator = function() {
    origUpdateTurn();
    updateActionShape();
    updateDpadFocus();
};

// Evita rolar no mobile
document.getElementById('app-container').addEventListener('touchmove', (e) => {
    e.preventDefault();
}, { passive: false });

// Inicializa autenticação e estado do usuário
loadSoccerBall();
loadUserNickname();
firebase.auth().onAuthStateChanged(function () { loadSoccerBall(); loadUserNickname(); });

// Inicializa no menu principal
showMenu();
