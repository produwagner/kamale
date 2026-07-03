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

// Autenticação e Apelido do Usuário Logado
let userNickname = '';
function loadUserNickname() {
    if (typeof firebase === 'undefined' || !firebase.auth) return;
    var user = firebase.auth().currentUser;
    if (!user) { userNickname = ''; return; }
    userNickname = user.nickname || localStorage.getItem('kamale_cached_nickname') || user.displayName || '';
    if (userNickname) {
        var db = firebase.database();
        db.ref('users/' + user.uid + '/nickname').once('value', function (snap) {
            userNickname = snap.val() || userNickname;
            localStorage.setItem('kamale_cached_nickname', userNickname);
        });
    }
}
if (typeof firebase !== 'undefined' && firebase.auth) {
    loadUserNickname();
    firebase.auth().onAuthStateChanged(function () { loadUserNickname(); });
}

// Elementos do DOM
const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');
const scoreVal = document.getElementById('score-val');
const linesVal = document.getElementById('lines-val');
const gameOverScreen = document.getElementById('game-over-screen');
const finalScore = document.getElementById('final-score');
const restartBtn = document.getElementById('restart-btn');
const mobilePauseBtn = document.getElementById('mobile-pause-btn');

// Botões direcionais (D-pad)
const dpadUp = document.getElementById('dpad-up');
const dpadDown = document.getElementById('dpad-down');
const dpadLeft = document.getElementById('dpad-left');
const dpadRight = document.getElementById('dpad-right');

// Botões de Ação (Direita - Rotacionar)
const actionA = document.getElementById('action-a'); // Rotacionar

// Configurações do Grid
const COLS = 10;
const ROWS = 15; // 15 linhas para manter proporção 1:1.5 com blocos perfeitamente quadrados
const BLOCK_SIZE = canvas.width / COLS; // 240 / 10 = 24px

// Definições de Formato dos Tetraminós (Formas clássicas)
const SHAPES = [
    [], // Índice 0 vazio
    [[0, 0, 0, 0], [1, 1, 1, 1], [0, 0, 0, 0], [0, 0, 0, 0]], // I
    [[2, 0, 0], [2, 2, 2], [0, 0, 0]],                         // J
    [[0, 0, 3], [3, 3, 3], [0, 0, 0]],                         // L
    [[4, 4], [4, 4]],                                         // O
    [[0, 5, 5], [5, 5, 0], [0, 0, 0]],                         // S
    [[0, 6, 0], [6, 6, 6], [0, 0, 0]],                         // T
    [[7, 7, 0], [0, 7, 7], [0, 0, 0]]                          // Z
];

// Cores dos Blocos (Estilo GameBoy Retrô / Cobra: Verdes Planos)
const COLORS = [
    '#000000', // 0 (vazio)
    '#3acc7a', // I
    '#3acc7a', // J
    '#3acc7a', // L
    '#3acc7a', // O
    '#3acc7a', // S
    '#3acc7a', // T
    '#3acc7a', // Z
    '#666666'  // 8: Garbage block (cinza)
];

// Estado do Jogo
let grid = Array(ROWS).fill(null).map(() => Array(COLS).fill(0));
let score = 0;
let lines = 0;
let activePiece = { matrix: null, x: 0, y: 0, type: 0 };
let gameRunning = false;
let isMoving = false; // Começa estático aguardando primeiro input (Iniciar)
let isPaused = false;
let gameTimeoutId = null;
let gameMode = 'solo'; // 'solo' ou 'online'
let pendingGarbage = 0;
let mpHadOpponent = false;
let mpLobbyAutoStarted = false;

// Sistema de partículas para efeito de linha quebrada
let particles = [];
let particleAnimId = null;

// Inicializa Matriz de Jogo
function initGrid() {
    for (let r = 0; r < ROWS; r++) {
        grid[r].fill(0);
    }
}

// Cria uma nova peça no topo
function spawnPiece() {
    const type = Math.floor(Math.random() * 7) + 1;
    activePiece.matrix = SHAPES[type];
    activePiece.type = type;
    activePiece.x = Math.floor((COLS - activePiece.matrix[0].length) / 2);
    
    // Inicia com apenas ~33% da peça visível: a última linha aparece na borda superior
    // As linhas acima ficam escondidas (y negativo), sem serem renderizadas pelo draw()
    const matrixHeight = activePiece.matrix.length;
    activePiece.y = -(matrixHeight - 1);
    
    // Verifica colisão imediata (Game Over) — checkCollision já ignora células com y < 0
    if (checkCollision(activePiece.x, activePiece.y, activePiece.matrix)) {
        gameOver();
    }
}

// Adiciona linhas de lixo (garbage lines) no fundo do grid
function addGarbageLines(count) {
    for (let i = 0; i < count; i++) {
        grid.shift();
        const garbageRow = Array(COLS).fill(8);
        const holeCol = Math.floor(Math.random() * COLS);
        garbageRow[holeCol] = 0;
        grid.push(garbageRow);
    }
}

function updateGarbageIndicator() {
    const indicator = document.getElementById('garbage-indicator');
    if (!indicator) return;
    if (pendingGarbage > 0) {
        indicator.textContent = `⚠️ +${pendingGarbage} LIXO!`;
        indicator.classList.remove('hidden');
    } else {
        indicator.classList.add('hidden');
    }
}

// Inicia o Jogo
function startGame() {
    if (gameRunning) return;
    
    score = 0;
    lines = 0;
    pendingGarbage = 0;
    updateGarbageIndicator();
    
    scoreVal.textContent = score;
    linesVal.textContent = lines;
    
    gameOverScreen.classList.add('hidden');
    
    const opPanel = document.getElementById('opponent-panel');
    if (opPanel) {
        if (gameMode === 'online') opPanel.classList.remove('hidden');
        else opPanel.classList.add('hidden');
    }
    
    initGrid();
    isMoving = true;
    spawnPiece();
    
    isPaused = false;
    if (mobilePauseBtn) {
        mobilePauseBtn.textContent = '⏸';
        mobilePauseBtn.classList.remove('active');
    }
    gameRunning = true;
    
    if (gameTimeoutId) clearTimeout(gameTimeoutId);
    gameTick();
    
    if (gameMode === 'online') {
        Multiplayer.sendGrid(grid, score, lines);
    }
}

// Game Over
function gameOver() {
    gameRunning = false;
    isMoving = false;
    isPaused = false;
    if (gameTimeoutId) clearTimeout(gameTimeoutId);
    if (particleAnimId) { cancelAnimationFrame(particleAnimId); particleAnimId = null; }
    particles = [];
    
    finalScore.textContent = score;
    gameOverScreen.classList.remove('hidden');
    
    if (gameMode === 'online') {
        Multiplayer.sendGameOver();
    }
    
    if (mobilePauseBtn) {
        mobilePauseBtn.textContent = '⏸';
        mobilePauseBtn.classList.remove('active');
    }
    setTimeout(() => updateMenuFocus(0), 50);
}

// Tick loop do jogo
function gameTick() {
    if (!gameRunning || isPaused) return;
    
    if (isMoving) {
        moveDown();
    }
    
    draw();
    
    if (gameMode === 'online' && Math.random() < 0.3) {
        const displayGrid = grid.map(row => [...row]);
        if (activePiece.matrix) {
            for (let r = 0; r < activePiece.matrix.length; r++) {
                for (let c = 0; c < activePiece.matrix[r].length; c++) {
                    if (activePiece.matrix[r][c] !== 0) {
                        const by = activePiece.y + r;
                        const bx = activePiece.x + c;
                        if (by >= 0 && by < ROWS && bx >= 0 && bx < COLS) {
                            displayGrid[by][bx] = activePiece.type;
                        }
                    }
                }
            }
        }
        Multiplayer.sendGrid(displayGrid, score, lines);
    }
    
    // Aumenta a velocidade à medida que o jogador elimina mais linhas
    const interval = Math.max(80, 500 - Math.floor(lines / 2) * 20);
    gameTimeoutId = setTimeout(gameTick, interval);
}

// Verifica colisões contra a parede ou blocos fixos
function checkCollision(x, y, matrix) {
    for (let r = 0; r < matrix.length; r++) {
        for (let c = 0; c < matrix[r].length; c++) {
            if (matrix[r][c] !== 0) {
                const nextX = x + c;
                const nextY = y + r;
                
                // Fora das bordas laterais ou inferiores
                if (nextX < 0 || nextX >= COLS || nextY >= ROWS) {
                    return true;
                }
                
                // Colisão com blocos já colocados no grid (ignora acima do topo)
                if (nextY >= 0 && grid[nextY][nextX] !== 0) {
                    return true;
                }
            }
        }
    }
    return false;
}

// Rotaciona a matriz da peça 90 graus no sentido horário
function rotateMatrix(matrix) {
    const N = matrix.length;
    const rotated = Array(N).fill(null).map(() => Array(N).fill(0));
    for (let r = 0; r < N; r++) {
        for (let c = 0; c < N; c++) {
            rotated[c][N - 1 - r] = matrix[r][c];
        }
    }
    return rotated;
}

// Rotação da peça com ajuste lateral (wall kick)
function rotatePiece() {
    if (!gameRunning || isPaused) return;
    triggerStart();
    
    const rotatedMatrix = rotateMatrix(activePiece.matrix);
    
    // Tenta rotacionar no lugar, ou chuta 1 célula para a esquerda ou direita caso colida na parede
    const kicks = [0, -1, 1, -2, 2];
    for (let i = 0; i < kicks.length; i++) {
        const offset = kicks[i];
        if (!checkCollision(activePiece.x + offset, activePiece.y, rotatedMatrix)) {
            activePiece.x += offset;
            activePiece.matrix = rotatedMatrix;
            draw();
            return;
        }
    }
}

// Inicia movimentação no primeiro input
function triggerStart() {
    if (!isMoving && gameRunning && !isPaused) {
        isMoving = true;
        if (mobilePauseBtn) {
            mobilePauseBtn.textContent = '⏸';
            mobilePauseBtn.classList.remove('active');
        }
    }
}

// Movimentos direcionais
function moveLeft() {
    if (!gameRunning || isPaused) return;
    triggerStart();
    if (!checkCollision(activePiece.x - 1, activePiece.y, activePiece.matrix)) {
        activePiece.x--;
        draw();
    }
}

// Movimentos direcionais
function moveRight() {
    if (!gameRunning || isPaused) return;
    triggerStart();
    if (!checkCollision(activePiece.x + 1, activePiece.y, activePiece.matrix)) {
        activePiece.x++;
        draw();
    }
}

function moveDown() {
    if (!gameRunning || isPaused) return;
    triggerStart();
    
    if (!checkCollision(activePiece.x, activePiece.y + 1, activePiece.matrix)) {
        activePiece.y++;
        draw();
        return true;
    } else {
        lockPiece();
        return false;
    }
}

// Desce a peça rapidamente (Soft Drop)
function softDrop() {
    if (!gameRunning || isPaused) return;
    triggerStart();
    if (moveDown()) {
        score += 1; // Bônus por descer rápido
        scoreVal.textContent = score;
    }
}

// Trava a peça no grid quando atinge o chão/obstáculo
function lockPiece() {
    const matrix = activePiece.matrix;
    for (let r = 0; r < matrix.length; r++) {
        for (let c = 0; c < matrix[r].length; c++) {
            if (matrix[r][c] !== 0) {
                const boardY = activePiece.y + r;
                const boardX = activePiece.x + c;
                
                // Trava no grid
                if (boardY >= 0) {
                    grid[boardY][boardX] = activePiece.type;
                }
            }
        }
    }
    
    // Verifica e elimina linhas
    const clearedCount = clearLines();
    if (gameMode === 'online' && clearedCount >= 2) {
        const attackLines = clearedCount === 2 ? 1 : (clearedCount === 3 ? 2 : 4);
        Multiplayer.sendAttack(attackLines);
        showToast('⚔️ ' + attackLines + ' LINHA(S) ENVIADA(S)!', 'success');
    }
    
    // Inserir linhas de lixo pendentes ANTES de spawnar a nova peça
    if (pendingGarbage > 0) {
        addGarbageLines(pendingGarbage);
        pendingGarbage = 0;
        updateGarbageIndicator();
    }
    
    // Spawna próxima peça
    spawnPiece();
    draw();
    
    if (gameMode === 'online') {
        Multiplayer.sendGrid(grid, score, lines);
    }
}

// Limpa as linhas completas do grid
function clearLines() {
    let clearedCount = 0;
    
    for (let r = ROWS - 1; r >= 0; r--) {
        if (grid[r].every(val => val !== 0)) {
            for (let c = 0; c < COLS; c++) {
                createLineParticles(c, r);
            }
            grid.splice(r, 1);
            grid.unshift(Array(COLS).fill(0));
            clearedCount++;
            r++;
        }
    }
    
    if (clearedCount > 0) {
        startParticleAnimation();
        lines += clearedCount;
        linesVal.textContent = lines;
        
        const linePoints = [0, 100, 300, 500, 800];
        score += linePoints[clearedCount] || 1000;
        scoreVal.textContent = score;
    }
    return clearedCount;
}

// Cria partículas para um bloco em uma posição do grid
function createLineParticles(col, row) {
    const cx = col * BLOCK_SIZE + BLOCK_SIZE / 2;
    const cy = row * BLOCK_SIZE + BLOCK_SIZE / 2;
    const count = 6; // partículas por bloco
    
    for (let i = 0; i < count; i++) {
        const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.5;
        const speed = 1.5 + Math.random() * 2.5;
        particles.push({
            x: cx,
            y: cy,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            size: 3 + Math.random() * 3,
            life: 1.0, // 1.0 → 0.0
            decay: 0.025 + Math.random() * 0.015
        });
    }
}

// Inicia loop de animação das partículas
function startParticleAnimation() {
    if (particleAnimId) return; // já rodando
    animateParticles();
}

// Loop de animação das partículas via requestAnimationFrame
function animateParticles() {
    // Atualiza partículas
    particles = particles.filter(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.08; // gravidade leve
        p.life -= p.decay;
        return p.life > 0;
    });

    // Desenha frame com partículas
    draw();
    drawParticles();

    if (particles.length > 0) {
        particleAnimId = requestAnimationFrame(animateParticles);
    } else {
        particleAnimId = null;
    }
}

// Renderiza as partículas sobre o canvas
function drawParticles() {
    particles.forEach(p => {
        ctx.fillStyle = `rgba(255, 74, 74, ${p.life})`;
        ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
    });
}

// Renderiza o grid e a peça ativa no Canvas (Sem divisões, ocupando toda a largura horizontalmente)
function draw() {
    // Limpa com fundo preto
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // 1. Desenha blocos fixos do grid
    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
            if (grid[r][c] !== 0) {
                ctx.fillStyle = COLORS[grid[r][c]];
                ctx.fillRect(c * BLOCK_SIZE + 1, r * BLOCK_SIZE + 1, BLOCK_SIZE - 2, BLOCK_SIZE - 2);
            }
        }
    }
    
    // 2. Desenha a peça ativa caindo
    if (activePiece.matrix) {
        ctx.fillStyle = COLORS[activePiece.type];
        for (let r = 0; r < activePiece.matrix.length; r++) {
            for (let c = 0; c < activePiece.matrix[r].length; c++) {
                if (activePiece.matrix[r][c] !== 0) {
                    const blockY = activePiece.y + r;
                    const blockX = activePiece.x + c;
                    
                    if (blockY >= 0) {
                        ctx.fillRect(blockX * BLOCK_SIZE + 1, blockY * BLOCK_SIZE + 1, BLOCK_SIZE - 2, BLOCK_SIZE - 2);
                    }
                }
            }
        }
    }
}

// Alternar Pause
function togglePause() {
    if (!gameRunning) return;
    isPaused = !isPaused;
    
    const pOverlay = document.getElementById('pause-overlay');
    const resetBtn = document.getElementById('mobile-reset-btn');
    
    if (isPaused) {
        if (gameTimeoutId) clearTimeout(gameTimeoutId);
        if (pOverlay) pOverlay.classList.remove('hidden');
        if (mobilePauseBtn) {
            mobilePauseBtn.textContent = '▶';
            mobilePauseBtn.classList.add('active');
        }
    } else {
        if (pOverlay) pOverlay.classList.add('hidden');
        if (mobilePauseBtn) {
            mobilePauseBtn.textContent = '⏸';
            mobilePauseBtn.classList.remove('active');
        }
        gameTick();
    }
    
    if (resetBtn) {
        resetBtn.classList.toggle('hidden', !isPaused);
    }
    setTimeout(() => updateMenuFocus(0), 50);
}

// Eventos de Teclado
window.addEventListener('keydown', (e) => {
    const tag = document.activeElement?.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA') return;

    try { var _s = getActiveMenuScreen(), _e = _s ? getFocusableElements(_s) : []; window.parent.postMessage({ type: 'KAMALE_MENU_STATE', onMenu: !!_s, focusIndex: _s ? menuFocusIndex : 0, totalItems: _e.length }, '*'); } catch(ex) {}

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
                if (actionA) actionA.classList.add('active');
                menuHandled = true; break;
        }
        if (menuHandled) {
            e.preventDefault();
            return;
        }
    }
    
    switch (e.key) {
        case 'ArrowLeft':
        case 'a':
        case 'A':
            moveLeft();
            if (dpadLeft) dpadLeft.classList.add('active');
            keyHandled = true;
            break;
        case 'ArrowRight':
        case 'd':
        case 'D':
            moveRight();
            if (dpadRight) dpadRight.classList.add('active');
            keyHandled = true;
            break;
        case 'ArrowDown':
        case 's':
        case 'S':
            softDrop();
            if (dpadDown) dpadDown.classList.add('active');
            keyHandled = true;
            break;
        case 'ArrowUp':
        case 'w':
        case 'W':
        case 'z':
        case 'Z':
        case 'x':
        case 'X':
            rotatePiece();
            if (dpadUp) dpadUp.classList.add('active');
            if (actionA) actionA.classList.add('active');
            keyHandled = true;
            break;
        case ' ':
            if (!gameRunning) {
                startGame();
                keyHandled = true;
            } else {
                if (!isMoving) {
                    triggerStart();
                } else {
                    togglePause();
                }
                keyHandled = true;
            }
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
    switch (e.key) {
        case 'ArrowLeft': case 'a': case 'A':
            if (dpadLeft) dpadLeft.classList.remove('active');
            break;
        case 'ArrowRight': case 'd': case 'D':
            if (dpadRight) dpadRight.classList.remove('active');
            break;
        case 'ArrowDown': case 's': case 'S':
            if (dpadDown) dpadDown.classList.remove('active');
            break;
        case 'ArrowUp': case 'w': case 'W': case 'z': case 'Z': case 'x': case 'X':
            if (dpadUp) dpadUp.classList.remove('active');
            if (actionA) actionA.classList.remove('active');
            break;
    }
});

// Setup dos botões móveis
function setupButton(btn, actionFunc) {
    if (!btn) return;
    
    let intervalId = null;
    
    const startAction = (e) => {
        e.preventDefault();
        btn.classList.add('active');
        if (updateMenuFocus(0)) {
            if (btn.id === 'action-a') activateFocusedElement();
            else if (btn.id === 'dpad-up') updateMenuFocus(-1);
            else if (btn.id === 'dpad-down') updateMenuFocus(1);
            return;
        }
        actionFunc();
        
        // Repete ação continuamente se for segurada
        if (actionFunc === moveLeft || actionFunc === moveRight || actionFunc === softDrop) {
            if (intervalId) clearInterval(intervalId);
            intervalId = setInterval(actionFunc, 90);
        }
    };
    
    const stopAction = () => {
        btn.classList.remove('active');
        if (intervalId) {
            clearInterval(intervalId);
            intervalId = null;
        }
    };
    
    btn.addEventListener('touchstart', startAction, { passive: false });
    btn.addEventListener('touchend', stopAction, { passive: true });
    btn.addEventListener('touchcancel', stopAction, { passive: true });
    
    btn.addEventListener('mousedown', (e) => {
        btn.classList.add('active');
        if (updateMenuFocus(0)) {
            if (btn.id === 'action-a') activateFocusedElement();
            else if (btn.id === 'dpad-up') updateMenuFocus(-1);
            else if (btn.id === 'dpad-down') updateMenuFocus(1);
            return;
        }
        actionFunc();
        if (actionFunc === moveLeft || actionFunc === moveRight || actionFunc === softDrop) {
            if (intervalId) clearInterval(intervalId);
            intervalId = setInterval(actionFunc, 90);
        }
    });
    btn.addEventListener('mouseup', stopAction);
    btn.addEventListener('mouseleave', stopAction);
}

setupButton(dpadLeft, moveLeft);
setupButton(dpadRight, moveRight);
setupButton(dpadDown, softDrop);
setupButton(dpadUp, rotatePiece);

setupButton(actionA, rotatePiece); // Botão de ação rotaciona a peça

// Evento de Pause e Reiniciar
restartBtn.addEventListener('click', () => {
    if (gameMode === 'online') {
        const myPlayer = Multiplayer.players[Multiplayer.playerId];
        const wants = !(myPlayer && myPlayer.wantsRematch);
        Multiplayer.sendRematch(wants);
    } else {
        gameRunning = false;
        startGame();
    }
});

document.getElementById('back-to-menu-btn').addEventListener('click', () => {
    gameRunning = false;
    if (gameTimeoutId) clearTimeout(gameTimeoutId);
    if (gameMode === 'online') {
        Multiplayer.leaveRoom();
        gameMode = 'solo';
        const opPanel = document.getElementById('opponent-panel');
        if (opPanel) opPanel.classList.add('hidden');
    }
    gameOverScreen.classList.add('hidden');
    menuScreen.classList.remove('hidden');
    setTimeout(() => updateMenuFocus(0), 50);
});

if (mobilePauseBtn) {
    const handlePauseTrigger = (e) => {
        e.preventDefault();
        if (!isMoving) {
            triggerStart();
        } else {
            togglePause();
        }
    };
    mobilePauseBtn.addEventListener('touchstart', handlePauseTrigger, { passive: false });
    mobilePauseBtn.addEventListener('click', handlePauseTrigger);
}

// Reset Button (mobile)
const mobileResetBtn = document.getElementById('mobile-reset-btn');
if (mobileResetBtn) {
    const handleReset = (e) => {
        e.preventDefault();
        window.location.href = '../index.html';
    };
    mobileResetBtn.addEventListener('touchstart', handleReset, { passive: false });
    mobileResetBtn.addEventListener('click', handleReset);
}

// ─── BOTÕES DO PAUSE OVERLAY ──────────────────────────────────────────────────
const pauseResetBtn = document.getElementById('pause-reset-btn');
const pauseMenuBtn = document.getElementById('pause-menu-btn');

if (pauseResetBtn) {
    const handlePauseReset = (e) => {
        e.preventDefault();
        const pOverlay = document.getElementById('pause-overlay');
        if (pOverlay) pOverlay.classList.add('hidden');
        isPaused = false;
        gameRunning = false;
        if (gameTimeoutId) clearTimeout(gameTimeoutId);
        startGame();
    };
    pauseResetBtn.addEventListener('click', handlePauseReset);
    pauseResetBtn.addEventListener('touchstart', handlePauseReset, { passive: false });
}

if (pauseMenuBtn) {
    const handlePauseMenu = (e) => {
        e.preventDefault();
        const pOverlay = document.getElementById('pause-overlay');
        if (pOverlay) pOverlay.classList.add('hidden');
        isPaused = false;
        gameRunning = false;
        if (gameTimeoutId) clearTimeout(gameTimeoutId);
        showMenu();
    };
    pauseMenuBtn.addEventListener('click', handlePauseMenu);
    pauseMenuBtn.addEventListener('touchstart', handlePauseMenu, { passive: false });
}

// ─── NAVEGAÇÃO DE MENU VIA CONTROLES ──────────────────────────────────────────
let menuFocusIndex = 0;
let lastActiveScreen = null;

function getActiveMenuScreen() {
    const screens = [
        document.getElementById('menu-screen'),
        document.getElementById('game-over-screen'),
        document.getElementById('multiplayer-screen'),
        document.getElementById('join-screen'),
        document.getElementById('create-screen'),
        document.getElementById('rooms-screen'),
        document.getElementById('lobby-screen'),
        document.getElementById('name-modal'),
        document.getElementById('pause-overlay')
    ];
    return screens.find(s => s && !s.classList.contains('hidden') && s.offsetParent !== null);
}

function getFocusableElements(screen) {
    if (!screen) return [];
    const elements = Array.from(screen.querySelectorAll('button, input, a')).filter(el => {
        return !el.classList.contains('modal-close-btn');
    });

    const topRow = document.querySelector('.game-top-row');
    if (topRow) {
        // Adiciona em ordem fixa: Entrar → apoie → voltar (home)
        const loginBtn = topRow.querySelector('#google-login-btn');
        const apoieBtn = topRow.querySelector('.apoie-btn');
        const homeBtn = topRow.querySelector('.home-btn');
        [loginBtn, apoieBtn, homeBtn].forEach(el => {
            if (el && !elements.includes(el)) elements.push(el);
        });
    }

    return elements.filter(el => {
        const style = window.getComputedStyle(el);
        return style.display !== 'none' && style.visibility !== 'hidden' && !el.disabled && el.offsetParent !== null && !el.classList.contains('modal-close-btn');
    });
}

function updateMenuFocus(direction = 0) {
    const activeScreen = getActiveMenuScreen();
    if (!activeScreen) {
        lastActiveScreen = null;
        document.querySelectorAll('.menu-btn, .menu-btn-secondary, .menu-btn-back').forEach(el => el.classList.remove('focused'));
        try { window.parent.postMessage({ type: 'KAMALE_MENU_STATE', onMenu: false }, '*'); } catch(e) {}
        return false;
    }

    const elements = getFocusableElements(activeScreen);
    if (elements.length === 0) {
        try { window.parent.postMessage({ type: 'KAMALE_MENU_STATE', onMenu: true, focusIndex: 0, totalItems: 0 }, '*'); } catch(e) {}
        return false;
    }

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
    try { window.parent.postMessage({ type: 'KAMALE_MENU_STATE', onMenu: true, focusIndex: menuFocusIndex, totalItems: elements.length }, '*'); } catch(e) {}
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

document.getElementById('app-container').addEventListener('touchmove', (e) => e.preventDefault(), { passive: false });

// Menu Principal
const menuScreen = document.getElementById('menu-screen');
const btnPlay = document.getElementById('btn-play');

btnPlay.addEventListener('click', () => {
    menuScreen.classList.add('hidden');
    startGame();
});

// ─── GERENCIAMENTO DE TELAS MULTIPLAYER ───────────────────────────────────────
const mpScreen = document.getElementById('multiplayer-screen');
const joinScreen = document.getElementById('join-screen');
const createScreen = document.getElementById('create-screen');
const roomsScreen = document.getElementById('rooms-screen');
const lobbyScreen = document.getElementById('lobby-screen');
const nameModal = document.getElementById('name-modal');
const nameModalInput = document.getElementById('name-modal-input');
const nameModalConfirm = document.getElementById('name-modal-confirm');

const btnFriends = document.getElementById('btn-friends');
const btnCreateRoom = document.getElementById('btn-create-room');
const btnShowRooms = document.getElementById('btn-show-rooms');
const btnShowJoin = document.getElementById('btn-show-join');
const btnBackMultiplayer = document.getElementById('btn-back-multiplayer');
const btnBackJoin = document.getElementById('btn-back-join');
const btnBackCreate = document.getElementById('btn-back-create');
const btnBackRooms = document.getElementById('btn-back-rooms');
const btnLeaveLobby = document.getElementById('btn-leave-lobby');
const btnReady = document.getElementById('btn-ready');
const btnRefreshRooms = document.getElementById('btn-refresh-rooms');
const btnJoinConfirm = document.getElementById('btn-join-confirm');
const btnCreateConfirm = document.getElementById('btn-create-confirm');

const inputPlayerName = document.getElementById('input-player-name');
const inputRoomCode = document.getElementById('input-room-code');
const inputRoomName = document.getElementById('input-room-name');
const inputCreatePlayerName = document.getElementById('input-create-player-name');
const joinError = document.getElementById('join-error');
const roomsList = document.getElementById('rooms-list');
const lobbyRoomCode = document.getElementById('lobby-room-code');
const lobbyPlayers = document.getElementById('lobby-players');
const lobbyWaiting = document.getElementById('lobby-waiting');
const lobbyReadyStatus = document.getElementById('lobby-ready-status');
const rematchStatus = document.getElementById('rematch-status');

const opponentPanel = document.getElementById('opponent-panel');
const opponentCanvas = document.getElementById('opponent-canvas');
const opponentCtx = opponentCanvas ? opponentCanvas.getContext('2d') : null;
const opponentName = document.getElementById('opponent-name');
const opponentScore = document.getElementById('opponent-score');
const opponentLines = document.getElementById('opponent-lines');

function showScreen(screen) {
    const screens = [
        menuScreen, mpScreen, joinScreen, createScreen, 
        roomsScreen, lobbyScreen, nameModal, gameOverScreen
    ];
    screens.forEach(s => {
        if (s) s.classList.add('hidden');
    });
    if (screen) screen.classList.remove('hidden');
    setTimeout(() => updateMenuFocus(0), 50);
}

function showMenu() {
    gameRunning = false;
    isPaused = false;
    if (gameTimeoutId) clearTimeout(gameTimeoutId);
    if (opponentPanel) opponentPanel.classList.add('hidden');
    showScreen(menuScreen);
}

btnFriends.addEventListener('click', () => {
    showScreen(mpScreen);
});

btnBackMultiplayer.addEventListener('click', showMenu);

btnCreateRoom.addEventListener('click', () => {
    if (inputCreatePlayerName) inputCreatePlayerName.value = userNickname || localStorage.getItem('block_player_name') || 'Jogador 1';
    if (inputRoomName) inputRoomName.value = userNickname ? 'Sala de ' + userNickname : 'Sala 1';
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
            if (inputRoomName) inputRoomName.value = userNickname ? 'Sala de ' + userNickname : 'Sala ' + num;
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

    localStorage.setItem('block_player_name', name);
    localStorage.setItem('block_room_name', roomName);

    mpHadOpponent = false;
    mpLobbyAutoStarted = false;
    Multiplayer.createRoom(name, roomName, (code) => {
        gameMode = 'online';
        if (lobbyRoomCode) lobbyRoomCode.textContent = code;
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
    if (inputPlayerName) inputPlayerName.value = userNickname || localStorage.getItem('block_player_name') || 'Jogador 2';
    if (inputRoomCode) inputRoomCode.value = '';
    if (joinError) joinError.classList.add('hidden');
    showScreen(joinScreen);
});

btnBackJoin.addEventListener('click', () => {
    showScreen(mpScreen);
});

btnJoinConfirm.addEventListener('click', () => {
    const code = inputRoomCode.value.trim();
    const name = inputPlayerName.value.trim();
    if (!code || !name) return;

    localStorage.setItem('block_player_name', name);
    if (joinError) joinError.classList.add('hidden');

    mpHadOpponent = false;
    mpLobbyAutoStarted = false;
    Multiplayer.joinRoom(code, name, (roomCode, err) => {
        if (err) {
            if (joinError) {
                joinError.textContent = err;
                joinError.classList.remove('hidden');
            }
            return;
        }
        gameMode = 'online';
        if (lobbyRoomCode) lobbyRoomCode.textContent = roomCode;
        updateLobbyPlayers(Multiplayer.players);
        showScreen(lobbyScreen);
    });
});

function handleLeaveRoom() {
    Multiplayer.leaveRoom();
    gameMode = 'solo';
    mpHadOpponent = false;
    mpLobbyAutoStarted = false;
    showMenu();
}

btnLeaveLobby.addEventListener('click', handleLeaveRoom);

function updateLobbyPlayers(playersObj) {
    if (!lobbyPlayers) return;
    lobbyPlayers.innerHTML = '';
    const plist = Object.entries(playersObj || {});
    plist.forEach(([id, p]) => {
        const card = document.createElement('div');
        card.className = 'lobby-player-card';
        card.style.borderColor = p.color || '#ffd100';
        
        const readyBadge = p.ready ? '<span style="color:#3acc7a;margin-left:4px;">✓</span>' : '';
        const nameSpan = document.createElement('span');
        nameSpan.style.color = p.color || '#ffd100';
        nameSpan.innerHTML = `${p.symbol === 'P1' ? '■' : '●'} ${p.name}${readyBadge}`;
        if (id === Multiplayer.playerId) {
            nameSpan.innerHTML += ' <span class="lobby-player-host">VOCÊ</span>';
        }
        card.appendChild(nameSpan);
        lobbyPlayers.appendChild(card);
    });

    const isFull = plist.length >= 2;
    if (isFull) {
        if (lobbyWaiting) lobbyWaiting.textContent = 'Aguardando jogadores ficarem prontos...';
        if (btnReady) btnReady.classList.remove('hidden');
        
        const myReady = playersObj[Multiplayer.playerId]?.ready;
        const other = plist.find(([id]) => id !== Multiplayer.playerId);
        const otherReady = other && other[1]?.ready;

        if (myReady && otherReady) {
            if (btnReady) btnReady.classList.add('hidden');
            if (lobbyReadyStatus) {
                lobbyReadyStatus.style.display = 'block';
                lobbyReadyStatus.textContent = 'Ambos estão prontos ✓';
                lobbyReadyStatus.style.color = '#3acc7a';
            }
        } else if (myReady) {
            if (btnReady) btnReady.classList.add('hidden');
            if (lobbyReadyStatus) {
                lobbyReadyStatus.style.display = 'block';
                lobbyReadyStatus.textContent = 'Você está pronto ✓';
                lobbyReadyStatus.style.color = '#3acc7a';
            }
        } else if (otherReady) {
            if (btnReady) btnReady.classList.remove('hidden');
            if (lobbyReadyStatus) {
                lobbyReadyStatus.style.display = 'block';
                lobbyReadyStatus.textContent = `${other[1].name} está pronto ✓`;
                lobbyReadyStatus.style.color = '#3acc7a';
            }
        } else {
            if (btnReady) btnReady.classList.remove('hidden');
            if (lobbyReadyStatus) lobbyReadyStatus.style.display = 'none';
        }

        const allReady = plist.every(([, p]) => p.ready);
        if (allReady && Multiplayer.isHost && !mpLobbyAutoStarted) {
            mpLobbyAutoStarted = true;
            Multiplayer.startGame();
        }
    } else {
        if (lobbyWaiting) lobbyWaiting.textContent = 'Aguardando adversário...';
        if (btnReady) btnReady.classList.add('hidden');
        if (lobbyReadyStatus) lobbyReadyStatus.style.display = 'none';
        mpLobbyAutoStarted = false;
    }

    if (!mpHadOpponent && plist.length >= 2) {
        mpHadOpponent = true;
        showToast('Adversário entrou na sala! Prepare-se!', 'success');
    } else if (mpHadOpponent && plist.length < 2) {
        mpHadOpponent = false;
        mpLobbyAutoStarted = false;
        showToast('O adversário saiu da sala.', 'error');
    }
}

btnReady.addEventListener('click', () => {
    Multiplayer.sendReady(true);
    btnReady.classList.add('hidden');
});

function refreshRoomsList() {
    if (!roomsList) return;
    roomsList.innerHTML = '<div style="color: #888; font-size: 0.9rem; padding: 20px 0;">Carregando salas...</div>';
    Multiplayer.getAvailableRooms((rooms) => {
        roomsList.innerHTML = '';
        if (rooms.length === 0) {
            roomsList.innerHTML = '<div style="color: #888; font-size: 0.9rem; padding: 20px 0;">Nenhuma sala disponível no momento.</div>';
            return;
        }

        rooms.forEach(room => {
            const item = document.createElement('div');
            item.className = 'room-item';
            
            const info = document.createElement('div');
            info.className = 'room-item-info';
            
            const nameEl = document.createElement('span');
            nameEl.className = 'room-item-name';
            nameEl.textContent = room.name || `Sala ${room.code}`;
            
            const codeEl = document.createElement('span');
            codeEl.className = 'room-item-code';
            codeEl.textContent = `CÓDIGO: ${room.code}`;
            
            info.appendChild(nameEl);
            info.appendChild(codeEl);
            
            const playersEl = document.createElement('div');
            playersEl.className = 'room-item-players';
            playersEl.textContent = `${room.playerCount}/2`;
            
            item.appendChild(info);
            item.appendChild(playersEl);
            
            item.addEventListener('click', () => {
                if (inputRoomCode) inputRoomCode.value = room.code;
                if (inputPlayerName) inputPlayerName.value = userNickname || localStorage.getItem('block_player_name') || ('Jogador ' + (room.playerCount + 1));
                showScreen(joinScreen);
                if (inputPlayerName) inputPlayerName.focus();
            });
            
            roomsList.appendChild(item);
        });
    });
}

// ─── CALLBACKS MULTIPLAYER ────────────────────────────────────────────────────
Multiplayer.onPlayersUpdate = (players) => {
    updateLobbyPlayers(players);
    const plist = Object.entries(players || {});
    const opp = plist.find(([id]) => id !== Multiplayer.playerId);
    if (opp && opp[1] && opponentName) {
        opponentName.textContent = opp[1].name;
    }
    
    if (!gameRunning && gameOverScreen && !gameOverScreen.classList.contains('hidden')) {
        const p1 = plist[0]?.[1];
        const p2 = plist[1]?.[1];
        if (rematchStatus) {
            if (p1?.wantsRematch && p2?.wantsRematch) {
                rematchStatus.textContent = 'Ambos querem revanche! Reiniciando...';
                rematchStatus.style.color = '#3acc7a';
            } else if (p1?.wantsRematch || p2?.wantsRematch) {
                const who = p1?.wantsRematch ? p1.name : p2?.name;
                rematchStatus.textContent = `${who} quer revanche!`;
                rematchStatus.style.color = '#ffd100';
            } else {
                rematchStatus.textContent = '';
            }
        }
    }
};

Multiplayer.onStatusUpdate = (status, winner) => {
    if (status === 'playing') {
        showScreen(null);
        if (rematchStatus) rematchStatus.textContent = '';
        startGame();
    } else if (status === 'finished') {
        handleOnlineGameOver(winner);
    } else if (status === 'waiting') {
        if (gameMode === 'online' && !lobbyScreen.classList.contains('hidden')) {
            updateLobbyPlayers(Multiplayer.players);
        }
    }
};

function handleOnlineGameOver(winnerSymbol) {
    gameRunning = false;
    isMoving = false;
    isPaused = false;
    if (gameTimeoutId) clearTimeout(gameTimeoutId);
    if (particleAnimId) { cancelAnimationFrame(particleAnimId); particleAnimId = null; }
    particles = [];
    
    finalScore.textContent = score;
    const gameOverTitle = document.querySelector('#game-over-screen .game-over-title');
    if (gameOverTitle) {
        if (!winnerSymbol) {
            gameOverTitle.innerHTML = 'Fim de Jogo <span class="skull-emoji">💀</span>';
        } else if (winnerSymbol === Multiplayer.playerSymbol) {
            gameOverTitle.innerHTML = 'Você Venceu! <span class="shake-emoji">🏆</span>';
        } else {
            gameOverTitle.innerHTML = 'Você Perdeu! <span class="skull-emoji">💀</span>';
        }
    }
    
    gameOverScreen.classList.remove('hidden');
    if (mobilePauseBtn) {
        mobilePauseBtn.textContent = '⏸';
        mobilePauseBtn.classList.remove('active');
    }
    setTimeout(() => updateMenuFocus(0), 50);
}

Multiplayer.onOpponentGridUpdate = (data) => {
    if (!opponentCtx || !data || !data.grid) return;
    const opGrid = data.grid;
    const w = opponentCanvas.width / COLS;
    const h = opponentCanvas.height / ROWS;
    
    opponentCtx.fillStyle = '#000000';
    opponentCtx.fillRect(0, 0, opponentCanvas.width, opponentCanvas.height);
    
    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
            const idx = r * COLS + c;
            const val = Array.isArray(opGrid[r]) ? opGrid[r][c] : opGrid[idx];
            if (val !== 0) {
                opponentCtx.fillStyle = val === 8 ? '#666666' : '#ff4a4a';
                opponentCtx.fillRect(c * w + 1, r * h + 1, w - 2, h - 2);
            }
        }
    }
    
    if (opponentScore) opponentScore.textContent = (data.score || 0) + ' pts';
    if (opponentLines) opponentLines.textContent = (data.lines || 0) + ' linhas';
};

Multiplayer.onAttackReceived = (linesCount) => {
    if (gameMode === 'online' && gameRunning) {
        pendingGarbage += linesCount;
        updateGarbageIndicator();
        showToast('⚠️ ADVERSÁRIO MANDOU +' + linesCount + ' LIXO!', 'error');
    }
};

menuScreen.classList.remove('hidden');
setTimeout(() => updateMenuFocus(0), 50);




