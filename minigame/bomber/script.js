// ═══════════════════════════════════════════════════════════════════════════════
// BOMBERMAN — Script Principal (Singleplayer vs Bot + Local Multiplayer 2P)
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

// ─── ELEMENTOS DO DOM ─────────────────────────────────────────────────────────
const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');
const menuScreen = document.getElementById('menu-screen');
const gameScreen = document.getElementById('game-screen');
const pauseOverlay = document.getElementById('pause-overlay');
const gameOverScreen = document.getElementById('game-over-screen');
const goTitle = document.getElementById('go-title');
const goSubtitle = document.getElementById('go-subtitle');
const goEmoji = document.getElementById('go-emoji');

const hudP1 = document.getElementById('hud-p1');
const hudP2 = document.getElementById('hud-p2');
const hudSep = document.getElementById('hud-sep');
const hudP1Bombs = document.getElementById('hud-p1-bombs');
const hudP1Fire = document.getElementById('hud-p1-fire');
const hudP1Shield = document.getElementById('hud-p1-shield');
const hudP2Bombs = document.getElementById('hud-p2-bombs');
const hudP2Fire = document.getElementById('hud-p2-fire');
const hudP2Shield = document.getElementById('hud-p2-shield');

// Botões do Menu
const btnSolo = document.getElementById('btn-solo');
const btnVsCpu = document.getElementById('btn-vs-cpu');
const btnLocal2p = document.getElementById('btn-local-2p');
const btnRestart = document.getElementById('restart-btn');
const btnBackToMenu = document.getElementById('back-to-menu-btn');
const btnResume = document.getElementById('resume-btn');
const btnPauseMenu = document.getElementById('pause-menu-btn');
const btnPauseReset = document.getElementById('pause-reset-btn');
const btnHelpMenu = document.getElementById('menu-learn-btn');
const btnHelpGame = document.getElementById('learn-btn');

// Telas extras
const levelScreen = document.getElementById('level-screen');
const btnBackLevels = document.getElementById('btn-back-levels');

// Elementos de Ajuda / Instruções
const instructionsModal = document.getElementById('instructions-modal');
const instructionsModalGame = document.getElementById('instructions-modal-game');
const closeInstructionsBtn = document.getElementById('close-instructions-btn');
const closeInstructionsBtnGame = document.getElementById('close-instructions-btn-game');

// Controles Móveis (D-pad)
const dpadUp = document.getElementById('dpad-up');
const dpadDown = document.getElementById('dpad-down');
const dpadLeft = document.getElementById('dpad-left');
const dpadRight = document.getElementById('dpad-right');
const btnMobilePause = document.getElementById('mobile-pause-btn');
const btnActionA = document.getElementById('action-a'); // Botão de Bomba

// ─── CONFIGURAÇÕES DO GRID E CANVAS ──────────────────────────────────────────
const COLS = 13;
const ROWS = 13;
const TILE_SIZE = 30; // 13 * 30 = 390px
const PLAYER_SIZE = 20; // Tamanho do triângulo (delimitador menor para caber nos caminhos)

// ─── ESTADO DO JOGO ──────────────────────────────────────────────────────────
let grid = [];
let players = [];
let bombs = [];
let explosions = [];
let items = {}; // key: "col,row", value: "fire" | "bomb" | "speed" | "shield"
let gameMode = 'vs_cpu'; // 'levels', 'vs_cpu' ou '2p'
let isPaused = false;
let isGameOver = false;
let gameLoopId = null;
let lastTime = 0;

// Estado de Níveis / Campanha
let currentLevel = 1;
let unlockedLevel = parseInt(localStorage.getItem('bomber_unlocked_level')) || 1;
let enemies = [];
let doorPos = { r: -1, c: -1 };
let doorRevealed = false;
let doorActive = false;

// Configurações de Teclas Pressionadas
const keys = {};

// ─── CONFIGURAÇÃO DE CONTROLES DO JOGADOR ─────────────────────────────────────
const CONTROLS = {
    P1: {
        up: 'ArrowUp',
        down: 'ArrowDown',
        left: 'ArrowLeft',
        right: 'ArrowRight',
        bomb: ' ' // Barra de espaço
    },
    P2: {
        up: 'KeyW',
        down: 'KeyS',
        left: 'KeyA',
        right: 'KeyRight', // WASD (W, A, S, D) e F
        bomb: 'KeyF'
    }
};

// ─── AJUDA E DIÁLOGOS ─────────────────────────────────────────────────────────
function openInstructions() {
    instructionsModal.classList.remove('hidden');
    setTimeout(() => updateMenuFocus(0), 50);
}
function closeInstructions() {
    instructionsModal.classList.add('hidden');
    setTimeout(() => updateMenuFocus(0), 50);
}
function openInstructionsGame() {
    instructionsModalGame.classList.remove('hidden');
    pauseGame();
    setTimeout(() => updateMenuFocus(0), 50);
}
function closeInstructionsGame() {
    instructionsModalGame.classList.add('hidden');
    resumeGame();
    setTimeout(() => updateMenuFocus(0), 50);
}

if (btnHelpMenu) btnHelpMenu.onclick = openInstructions;
if (btnHelpGame) btnHelpGame.onclick = openInstructionsGame;
if (closeInstructionsBtn) closeInstructionsBtn.onclick = closeInstructions;
if (closeInstructionsBtnGame) closeInstructionsBtnGame.onclick = closeInstructionsGame;

window.closeInstructions = closeInstructions;
window.closeInstructionsGame = closeInstructionsGame;

// ─── CONTROLES MÓVEIS (D-PAD) E ENTRADA DE DADOS ──────────────────────────────
let activeDpadDirections = new Set();

function setupDpad() {
    const dpadButtons = [
        { btn: dpadUp, dir: 'up', key: 'ArrowUp' },
        { btn: dpadDown, dir: 'down', key: 'ArrowDown' },
        { btn: dpadLeft, dir: 'left', key: 'ArrowLeft' },
        { btn: dpadRight, dir: 'right', key: 'ArrowRight' }
    ];

    dpadButtons.forEach(({ btn, key }) => {
        if (!btn) return;
        
        // Touch events
        btn.addEventListener('touchstart', (e) => {
            e.preventDefault();
            keys[key] = true;
            btn.classList.add('active');
        });
        btn.addEventListener('touchend', (e) => {
            e.preventDefault();
            keys[key] = false;
            btn.classList.remove('active');
        });

        // Mouse click simulations (for testing on desktop resizing)
        btn.addEventListener('mousedown', () => {
            keys[key] = true;
            btn.classList.add('active');
        });
        btn.addEventListener('mouseup', () => {
            keys[key] = false;
            btn.classList.remove('active');
        });
        btn.addEventListener('mouseleave', () => {
            keys[key] = false;
            btn.classList.remove('active');
        });
    });

    if (btnActionA) {
        btnActionA.addEventListener('touchstart', (e) => {
            e.preventDefault();
            keys[' '] = true; // Simula barra de espaço (bomba do P1)
            btnActionA.classList.add('active');
        });
        btnActionA.addEventListener('touchend', (e) => {
            e.preventDefault();
            keys[' '] = false;
            btnActionA.classList.remove('active');
        });
        btnActionA.addEventListener('mousedown', () => {
            keys[' '] = true;
            btnActionA.classList.add('active');
        });
        btnActionA.addEventListener('mouseup', () => {
            keys[' '] = false;
            btnActionA.classList.remove('active');
        });
    }

    if (btnMobilePause) {
        btnMobilePause.onclick = () => {
            if (isPaused) {
                resumeGame();
            } else {
                pauseGame();
            }
        };
    }
}

// ─── ESCUTA DE TECLADO ────────────────────────────────────────────────────────
window.addEventListener('keydown', (e) => {
    const tag = document.activeElement?.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA') return;

    const activeMenu = getActiveMenuScreen();
    if (activeMenu) {
        let menuHandled = false;
        switch (e.key) {
            case 'ArrowUp': case 'w': case 'W':
                updateMenuFocus(-1);
                menuHandled = true; break;
            case 'ArrowDown': case 's': case 'S':
                updateMenuFocus(1);
                menuHandled = true; break;
            case ' ': case 'Enter': case 'z': case 'Z': case 'x': case 'X':
                activateFocusedElement();
                menuHandled = true; break;
        }
        if (menuHandled) {
            e.preventDefault();
            return;
        }
    }

    // Evita scroll por padrão para teclas úteis do jogo
    if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key) || e.code === 'Space') {
        e.preventDefault();
    }
    
    // Suporte para KeyW, KeyS, etc. via code
    keys[e.code] = true;
    keys[e.key] = true;
 
    if (e.key.toLowerCase() === 'p') {
        if (isPaused) resumeGame();
        else pauseGame();
    }
});

window.addEventListener('keyup', (e) => {
    keys[e.code] = false;
    keys[e.key] = false;
});

// ─── GERADORES DE MAPA E REINICIALIZAÇÃO ──────────────────────────────────────
function buildMap() {
    grid = [];
    items = {};
    for (let r = 0; r < ROWS; r++) {
        let rowData = [];
        for (let c = 0; c < COLS; c++) {
            // Paredes das bordas são indestrutíveis
            if (r === 0 || r === ROWS - 1 || c === 0 || c === COLS - 1) {
                rowData.push(1); // 1 = Indestrutível
            }
            // Checkerboard interno de indestrutíveis
            else if (r % 2 === 0 && c % 2 === 0) {
                rowData.push(1);
            }
            // Espaço vazio padrão
            else {
                rowData.push(0);
            }
        }
        grid.push(rowData);
    }

    // Colocar blocos destrutíveis de forma semi-aleatória (45% de chance)
    // Evitando as áreas de spawn dos jogadores
    const spawns = [
        // Spawn P1 (superior esquerdo)
        { r: 1, c: 1 }, { r: 1, c: 2 }, { r: 2, c: 1 },
        // Spawn P2 / Bot (inferior direito)
        { r: 11, c: 11 }, { r: 11, c: 10 }, { r: 10, c: 11 }
    ];

    for (let r = 1; r < ROWS - 1; r++) {
        for (let c = 1; c < COLS - 1; c++) {
            // Ignora se for checkerboard indestrutível ou zona de spawn
            if (grid[r][c] === 1) continue;
            if (spawns.some(s => s.r === r && s.c === c)) continue;

            if (Math.random() < 0.45) {
                grid[r][c] = 2; // 2 = Destrutível
            }
        }
    }
}

// ─── INICIALIZAÇÃO DE ENTIDADES ───────────────────────────────────────────────
function initGame(mode) {
    // Se o modo de jogo for solo, mudamos internamente para campanha de fases
    if (mode === 'solo') {
        mode = 'levels';
    }
    gameMode = mode;
    isPaused = false;
    isGameOver = false;
    bombs = [];
    explosions = [];
    
    buildMap();

    // Player 1 (Verde) - Inicia no Canto Superior Esquerdo (1,1)
    const p1 = {
        id: 'p1',
        x: TILE_SIZE + 5, // centraliza triângulo de 20px no tile de 30px
        y: TILE_SIZE + 5,
        w: PLAYER_SIZE,
        h: PLAYER_SIZE,
        speed: 2,
        bombLimit: 1,
        bombCount: 0,
        fireRange: 2,
        shield: false,
        alive: true,
        direction: 'down',
        color: '#3acc7a',
        isBot: false,
        invulTimer: 0
    };

    if (mode === 'levels') {
        players = [p1];
    } else {
        // Player 2 ou Bot (Vermelho) - Inicia no Canto Inferior Direito (11,11)
        const p2 = {
            id: 'p2',
            x: (COLS - 2) * TILE_SIZE + 5,
            y: (ROWS - 2) * TILE_SIZE + 5,
            w: PLAYER_SIZE,
            h: PLAYER_SIZE,
            speed: 2,
            bombLimit: 1,
            bombCount: 0,
            fireRange: 2,
            shield: false,
            alive: true,
            direction: 'up',
            color: '#ff6b6b',
            isBot: (mode === 'vs_cpu'),
            invulTimer: 0,
            // Estado específico para Bot AI
            aiState: 'idle',
            aiTarget: null,
            aiPath: [],
            aiDecisionTimer: 0
        };
        players = [p1, p2];
    }

    selectDoorPosition();
    spawnEnemiesForLevel(currentLevel);

    // Ocultar o HUD externo conforme solicitação para desenhar na arena
    const hudBar = document.getElementById('hud-bar');
    if (hudBar) hudBar.style.display = 'none';

    // Trocar de telas
    menuScreen.classList.add('hidden');
    if (levelScreen) levelScreen.classList.add('hidden');
    gameScreen.classList.remove('hidden');
    pauseOverlay.classList.add('hidden');
    gameOverScreen.classList.add('hidden');

    if (gameLoopId) cancelAnimationFrame(gameLoopId);
    lastTime = performance.now();
    gameLoopId = requestAnimationFrame(update);
    setTimeout(() => updateMenuFocus(0), 50);
}

// ─── SELEÇÃO DE FASES E INIMIGOS ──────────────────────────────────────────────
function showLevelsScreen() {
    menuScreen.classList.add('hidden');
    if (levelScreen) {
        levelScreen.classList.remove('hidden');
        renderLevels();
    }
    setTimeout(() => updateMenuFocus(0), 50);
}

function backFromLevels() {
    if (levelScreen) levelScreen.classList.add('hidden');
    menuScreen.classList.remove('hidden');
    setTimeout(() => updateMenuFocus(0), 50);
}

if (btnBackLevels) btnBackLevels.onclick = backFromLevels;

function renderLevels() {
    unlockedLevel = parseInt(localStorage.getItem('bomber_unlocked_level')) || 1;
    if (!levelScreen) return;
    const levelBtns = levelScreen.querySelectorAll('.level-btn');
    levelBtns.forEach(btn => {
        const lvl = parseInt(btn.getAttribute('data-level'));
        if (lvl <= unlockedLevel) {
            btn.classList.remove('locked');
            btn.innerHTML = `${lvl}`;
            btn.onclick = () => {
                currentLevel = lvl;
                initGame('levels');
            };
        } else {
            btn.classList.add('locked');
            btn.innerHTML = '🔒';
            btn.onclick = null;
        }
    });
}

function getRandomDirection() {
    const dirs = ['up', 'down', 'left', 'right'];
    return dirs[Math.floor(Math.random() * dirs.length)];
}

function selectDoorPosition() {
    const destBlocks = [];
    for (let r = 1; r < ROWS - 1; r++) {
        for (let c = 1; c < COLS - 1; c++) {
            if (grid[r][c] === 2) {
                destBlocks.push({ r, c });
            }
        }
    }
    
    if (destBlocks.length > 0) {
        doorPos = destBlocks[Math.floor(Math.random() * destBlocks.length)];
    } else {
        doorPos = { r: 5, c: 5 };
    }
    doorRevealed = false;
    doorActive = false;
}

function spawnEnemiesForLevel(level) {
    enemies = [];
    
    let types = [];
    if (level === 1) {
        types = ['circle', 'circle', 'square'];
    } else if (level === 2) {
        types = ['circle', 'square', 'mamona', 'rat'];
    } else if (level === 3) {
        types = ['circle', 'square', 'mamona', 'rat', 'pepper'];
    } else if (level === 4) {
        types = ['square', 'mamona', 'rat', 'pepper', 'pepper'];
    } else {
        types = ['mamona', 'mamona', 'rat', 'rat', 'pepper', 'pepper'];
    }
    
    const validCells = [];
    for (let r = 1; r < ROWS - 1; r++) {
        for (let c = 1; c < COLS - 1; c++) {
            if (grid[r][c] === 0 && (r > 3 || c > 3)) {
                validCells.push({ r, c });
            }
        }
    }
    
    types.forEach(type => {
        let cellIndex = Math.floor(Math.random() * validCells.length);
        let cell = validCells.splice(cellIndex, 1)[0] || { r: 11, c: 11 };
        
        let color = '#ffffff';
        let speed = 1.0;
        if (type === 'circle') {
            color = '#ffffff';
            speed = 0.8;
        } else if (type === 'square') {
            color = '#333333';
            speed = 1.2;
        } else if (type === 'mamona') {
            color = '#8ee5b8';
            speed = 0.7;
        } else if (type === 'rat') {
            color = '#757575';
            speed = 1.1;
        } else if (type === 'pepper') {
            color = '#d50000';
            speed = 1.4;
        }
        
        enemies.push({
            type,
            x: cell.c * TILE_SIZE + 5,
            y: cell.r * TILE_SIZE + 5,
            w: PLAYER_SIZE,
            h: PLAYER_SIZE,
            speed,
            direction: getRandomDirection(),
            color,
            alive: true,
            changeDirTimer: Math.random() * 1000 + 1000
        });
    });
}

// ─── HUD E ESTATÍSTICAS ───────────────────────────────────────────────────────
function updateHUD() {
    const p1 = players[0];
    const p2 = players[1];

    if (p1) {
        hudP1Bombs.textContent = `💣×${p1.bombLimit}`;
        hudP1Fire.textContent = `🔥×${p1.fireRange}`;
        hudP1Shield.style.display = p1.shield ? 'inline' : 'none';
    }

    if (p2) {
        hudP2Bombs.textContent = `💣×${p2.bombLimit}`;
        hudP2Fire.textContent = `🔥×${p2.fireRange}`;
        hudP2Shield.style.display = p2.shield ? 'inline' : 'none';
    }
}

// ─── COLISÕES E MOVIMENTAÇÃO FINA ──────────────────────────────────────────────
function getTileAt(x, y) {
    return {
        col: Math.floor(x / TILE_SIZE),
        row: Math.floor(y / TILE_SIZE)
    };
}

function rectsOverlap(x1, y1, w1, h1, x2, y2, w2, h2) {
    return x1 < x2 + w2 && x1 + w1 > x2 && y1 < y2 + h2 && y1 + h1 > y2;
}

// Verifica colisão de caixa delimitadora com o grid ou com bombas ativas
function checkCollision(x, y, w, h, player) {
    const tilesToCheck = [
        getTileAt(x + 1, y + 1), // Top-left inset
        getTileAt(x + w - 1, y + 1), // Top-right inset
        getTileAt(x + 1, y + h - 1), // Bottom-left inset
        getTileAt(x + w - 1, y + h - 1) // Bottom-right inset
    ];

    // Verifica limites e blocos sólidos no grid
    for (let tile of tilesToCheck) {
        if (tile.col < 0 || tile.col >= COLS || tile.row < 0 || tile.row >= ROWS) {
            return true;
        }
        const cell = grid[tile.row][tile.col];
        if (cell === 1 || cell === 2) {
            return true; // Colidiu com bloco sólido
        }
    }

    // Verifica colisão com bombas ativas
    for (let bomb of bombs) {
        const bombX = bomb.col * TILE_SIZE;
        const bombY = bomb.row * TILE_SIZE;

        if (player) {
            // Se a posição atual do player se sobrepõe à bomba, ele pode continuar se movendo sobre ela (para sair de cima)
            const currentlyOverlaps = rectsOverlap(player.x, player.y, player.w, player.h, bombX, bombY, TILE_SIZE, TILE_SIZE);
            if (currentlyOverlaps) {
                continue;
            }
        }

        // Caso contrário, a bomba age como um bloco sólido
        if (rectsOverlap(x, y, w, h, bombX, bombY, TILE_SIZE, TILE_SIZE)) {
            return true;
        }
    }

    return false;
}

// Alinhamento de canto automático (Corner Sliding) para fluidez nos corredores
function movePlayer(player, dx, dy) {
    if (!player.alive) return;

    let targetX = player.x + dx * player.speed;
    let targetY = player.y + dy * player.speed;

    // Atualiza a direção do triângulo
    if (dx > 0) player.direction = 'right';
    else if (dx < 0) player.direction = 'left';
    else if (dy > 0) player.direction = 'down';
    else if (dy < 0) player.direction = 'up';

    let collision = checkCollision(targetX, targetY, player.w, player.h, player);

    if (!collision) {
        player.x = targetX;
        player.y = targetY;
    } else {
        // Se bateu, tenta realizar alinhamento automático
        if (dx !== 0 && dy === 0) {
            // Movimento horizontal bloqueado, tenta alinhar verticalmente
            const currentTileY = Math.floor((player.y + player.h / 2) / TILE_SIZE) * TILE_SIZE + 5;
            const diff = player.y - currentTileY;
            const threshold = 10; // Sensibilidade de alinhamento
            if (Math.abs(diff) <= threshold && diff !== 0) {
                const step = Math.sign(diff) * -1 * Math.min(Math.abs(diff), player.speed);
                if (!checkCollision(targetX, player.y + step, player.w, player.h, player)) {
                    player.x = targetX;
                    player.y += step;
                }
            }
        } else if (dy !== 0 && dx === 0) {
            // Movimento vertical bloqueado, tenta alinhar horizontalmente
            const currentTileX = Math.floor((player.x + player.w / 2) / TILE_SIZE) * TILE_SIZE + 5;
            const diff = player.x - currentTileX;
            const threshold = 10;
            if (Math.abs(diff) <= threshold && diff !== 0) {
                const step = Math.sign(diff) * -1 * Math.min(Math.abs(diff), player.speed);
                if (!checkCollision(player.x + step, targetY, player.w, player.h, player)) {
                    player.x += step;
                    player.y = targetY;
                }
            }
        }
    }

    // Verifica coleta de cartas (Power-up) no centro do jogador
    const px = player.x + player.w / 2;
    const py = player.y + player.h / 2;
    const playerCol = Math.floor(px / TILE_SIZE);
    const playerRow = Math.floor(py / TILE_SIZE);
    const key = `${playerCol},${playerRow}`;

    if (items[key]) {
        const itemType = items[key];
        delete items[key]; // consome
        grid[playerRow][playerCol] = 0; // limpa o grid

        if (itemType === 'fire') {
            player.fireRange++;
            showToast('🔥 Fogo aumentado!', 'success');
        } else if (itemType === 'bomb') {
            player.bombLimit++;
            showToast('💣 Capacidade de Bombas +1!', 'success');
        } else if (itemType === 'speed') {
            player.speed = Math.min(player.speed + 0.5, 4.0);
            showToast('⚡ Velocidade aumentada!', 'success');
        } else if (itemType === 'shield') {
            player.shield = true;
            showToast('🛡 Escudo Ativo!', 'success');
        }
        updateHUD();
    }
}

// ─── BOMBAS E EXPLOSÕES ───────────────────────────────────────────────────────
function placeBomb(player) {
    if (!player.alive || isPaused || isGameOver) return;
    
    // Identifica o centro do player
    const px = player.x + player.w / 2;
    const py = player.y + player.h / 2;
    const col = Math.floor(px / TILE_SIZE);
    const row = Math.floor(py / TILE_SIZE);

    // Limites de bomba ativa e checagem de espaço ocupado
    if (player.bombCount >= player.bombLimit) return;
    
    const tileOccupied = bombs.some(b => b.col === col && b.row === row);
    if (tileOccupied) return;

    bombs.push({
        col: col,
        row: row,
        timer: 2000, // 2 segundos
        range: player.fireRange,
        owner: player
    });
    player.bombCount++;
}

function triggerExplosion(bomb) {
    const range = bomb.range;
    const centerCol = bomb.col;
    const centerRow = bomb.row;
    
    const affectedCells = [{ col: centerCol, row: centerRow }];
    const directions = [
        { dc: 0, dr: -1 }, // Cima
        { dc: 0, dr: 1 },  // Baixo
        { dc: -1, dr: 0 }, // Esquerda
        { dc: 1, dr: 0 }   // Direita
    ];

    directions.forEach(({ dc, dr }) => {
        for (let i = 1; i <= range; i++) {
            const col = centerCol + dc * i;
            const row = centerRow + dr * i;

            // Limites de mapa
            if (col < 0 || col >= COLS || row < 0 || row >= ROWS) break;

            const cell = grid[row][col];
            
            // Bateu em parede indestrutível: para a propagação na hora
            if (cell === 1) {
                break;
            }
            
            // Bateu em parede destrutível: quebra o bloco e para a propagação
            if (cell === 2) {
                affectedCells.push({ col, row, breaks: true });
                break;
            }

            // Caminho aberto
            affectedCells.push({ col, row });

            // Se atingir outra bomba ativa, faz ela detonar antes do tempo
            const hitBomb = bombs.find(b => b.col === col && b.row === row);
            if (hitBomb && hitBomb.timer > 0) {
                hitBomb.timer = 0; // detona no próximo tick
            }
        }
    });

    // Cria a explosão física
    explosions.push({
        cells: affectedCells,
        timer: 400 // dura 400ms
    });

    // Remove blocos atingidos e rola chance de spawnar itens
    affectedCells.forEach(cell => {
        if (cell.breaks) {
            grid[cell.row][cell.col] = 0; // Abre espaço
            
            const isDoorTile = (gameMode === 'levels' && doorPos.c === cell.col && doorPos.r === cell.row);

            // 35% de chance de spawnar cartas de poder (evita o bloco da porta)
            if (!isDoorTile && Math.random() < 0.35) {
                const rand = Math.random();
                let type = 'fire';
                if (rand < 0.25) type = 'shield';
                else if (rand < 0.50) type = 'speed';
                else if (rand < 0.75) type = 'bomb';

                items[`${cell.col},${cell.row}`] = type;
                grid[cell.row][cell.col] = 3; // registra item no grid
            }
        }
    });

    // Devolve bomba ao player dono
    if (bomb.owner) {
        bomb.owner.bombCount = Math.max(0, bomb.owner.bombCount - 1);
    }
}

function simulateBombDanger(bombCol, bombRow, range) {
    const dangerGrid = Array(ROWS).fill(null).map(() => Array(COLS).fill(false));
    
    bombs.forEach(bomb => {
        dangerGrid[bomb.row][bomb.col] = true;
        const dirs = [{x:0, y:-1}, {x:0, y:1}, {x:-1, y:0}, {x:1, y:0}];
        dirs.forEach(d => {
            for (let i = 1; i <= bomb.range; i++) {
                const c = bomb.col + d.x * i;
                const r = bomb.row + d.y * i;
                if (c < 0 || c >= COLS || r < 0 || r >= ROWS) break;
                if (grid[r][c] === 1) break;
                dangerGrid[r][c] = true;
                if (grid[r][c] === 2) break;
            }
        });
    });

    // Adiciona perigo das explosões ativas
    explosions.forEach(exp => {
        exp.cells.forEach(cell => {
            dangerGrid[cell.row][cell.col] = true;
        });
    });
    
    dangerGrid[bombRow][bombCol] = true;
    const dirs = [{x:0, y:-1}, {x:0, y:1}, {x:-1, y:0}, {x:1, y:0}];
    dirs.forEach(d => {
        for (let i = 1; i <= range; i++) {
            const c = bombCol + d.x * i;
            const r = bombRow + d.y * i;
            if (c < 0 || c >= COLS || r < 0 || r >= ROWS) break;
            if (grid[r][c] === 1) break;
            dangerGrid[r][c] = true;
            if (grid[r][c] === 2) break;
        }
    });
    
    return dangerGrid;
}

// ─── INTELIGÊNCIA ARTIFICIAL (BOT) ────────────────────────────────────────────
function runBotAI(bot, dt) {
    bot.aiDecisionTimer -= dt;
    
    const botCol = Math.floor((bot.x + bot.w / 2) / TILE_SIZE);
    const botRow = Math.floor((bot.y + bot.h / 2) / TILE_SIZE);

    // 1. Gera mapa de perigo atualizado
    const dangerGrid = Array(ROWS).fill(null).map(() => Array(COLS).fill(false));
    
    bombs.forEach(bomb => {
        dangerGrid[bomb.row][bomb.col] = true;
        
        const dirs = [{x:0, y:-1}, {x:0, y:1}, {x:-1, y:0}, {x:1, y:0}];
        dirs.forEach(d => {
            for (let i = 1; i <= bomb.range; i++) {
                const c = bomb.col + d.x * i;
                const r = bomb.row + d.y * i;
                if (c < 0 || c >= COLS || r < 0 || r >= ROWS) break;
                if (grid[r][c] === 1) break;
                dangerGrid[r][c] = true;
                if (grid[r][c] === 2) break;
            }
        });
    });

    // Adiciona perigo das explosões ativas (fogo)
    explosions.forEach(exp => {
        exp.cells.forEach(cell => {
            dangerGrid[cell.row][cell.col] = true;
        });
    });

    const inDanger = dangerGrid[botRow][botCol];

    if (inDanger) {
        bot.aiState = 'escape';
    } else if (bot.aiState === 'escape') {
        bot.aiState = 'idle';
        bot.aiPath = [];
    }

    if (bot.aiDecisionTimer <= 0 || bot.aiPath.length === 0) {
        bot.aiDecisionTimer = 200;

        if (bot.aiState === 'escape') {
            // Busca o local seguro mais próximo usando BFS
            const safeTile = findClosestSafeTile(botCol, botRow, dangerGrid);
            if (safeTile) {
                bot.aiPath = findPath(botCol, botRow, safeTile.col, safeTile.row);
            }
        } else {
            // Estado padrão: destruir blocos ou caçar P1
            // Busca o bloco destrutível mais próximo
            const blockTile = findClosestDestructible(botCol, botRow);
            if (blockTile) {
                bot.aiState = 'destroy';
                bot.aiPath = findPath(botCol, botRow, blockTile.col, blockTile.row, true, dangerGrid);
                
                // Se já estiver na posição correta de ataque, solta bomba e foge apenas se houver escape seguro
                if (isAdjacent(botCol, botRow, blockTile.col, blockTile.row) && bot.bombCount < bot.bombLimit) {
                    const tempDanger = simulateBombDanger(botCol, botRow, bot.fireRange);
                    const safeTile = findClosestSafeTile(botCol, botRow, tempDanger);
                    if (safeTile) {
                        placeBomb(bot);
                        bot.aiState = 'escape';
                        bot.aiDecisionTimer = 0; // Força escape imediato
                    }
                }
            } else {
                // Sem blocos: Caça o inimigo mais próximo de forma cooperativa!
                const activeEnemies = (enemies || []).filter(e => e.alive);
                if (activeEnemies.length > 0) {
                    let closestEnemy = activeEnemies[0];
                    let minDist = Infinity;
                    activeEnemies.forEach(e => {
                        const ec = Math.floor((e.x + e.w/2)/TILE_SIZE);
                        const er = Math.floor((e.y + e.h/2)/TILE_SIZE);
                        const dist = Math.abs(botCol - ec) + Math.abs(botRow - er);
                        if (dist < minDist) {
                            minDist = dist;
                            closestEnemy = e;
                        }
                    });

                    const eCol = Math.floor((closestEnemy.x + closestEnemy.w/2)/TILE_SIZE);
                    const eRow = Math.floor((closestEnemy.y + closestEnemy.h/2)/TILE_SIZE);

                    bot.aiState = 'hunt';
                    bot.aiPath = findPath(botCol, botRow, eCol, eRow, true, dangerGrid);

                    if (isAdjacent(botCol, botRow, eCol, eRow) && bot.bombCount < bot.bombLimit) {
                        const tempDanger = simulateBombDanger(botCol, botRow, bot.fireRange);
                        const safeTile = findClosestSafeTile(botCol, botRow, tempDanger);
                        if (safeTile) {
                            placeBomb(bot);
                            bot.aiState = 'escape';
                            bot.aiDecisionTimer = 0;
                        }
                    }
                } else {
                    // Sem inimigos: vai para a porta se estiver ativa
                    if (doorActive) {
                        bot.aiState = 'exit';
                        bot.aiPath = findPath(botCol, botRow, doorPos.c, doorPos.r, false, dangerGrid);
                    } else {
                        bot.aiState = 'idle';
                        bot.aiPath = [];
                    }
                }
            }
        }
    }

    // Segue o caminho traçado
    if (bot.aiPath && bot.aiPath.length > 0) {
        const nextTarget = bot.aiPath[0];
        const targetX = nextTarget.col * TILE_SIZE + 5;
        const targetY = nextTarget.row * TILE_SIZE + 5;

        // Tolerância de aproximação
        const diffX = targetX - bot.x;
        const diffY = targetY - bot.y;

        if (Math.abs(diffX) < bot.speed && Math.abs(diffY) < bot.speed) {
            bot.x = targetX;
            bot.y = targetY;
            bot.aiPath.shift(); // Remove nó concluído
        } else {
            // Move suave, priorizando um eixo por vez para evitar diagonal
            let dx = 0;
            let dy = 0;
            if (Math.abs(diffX) >= bot.speed) {
                dx = Math.sign(diffX);
            } else if (Math.abs(diffY) >= bot.speed) {
                dy = Math.sign(diffY);
            }
            movePlayer(bot, dx, dy);
        }
    }
}

// Algoritmos auxiliares de Pathfinding BFS
function isAdjacent(c1, r1, c2, r2) {
    return Math.abs(c1 - c2) + Math.abs(r1 - r2) === 1;
}

function isTileWalkable(col, row, checkBombs = true, currentCol = -1, currentRow = -1) {
    if (col < 0 || col >= COLS || row < 0 || row >= ROWS) return false;
    const val = grid[row][col];
    if (val === 1 || val === 2) return false;
    
    if (checkBombs) {
        const hasBomb = bombs.some(b => b.col === col && b.row === row);
        if (hasBomb) {
            if (col === currentCol && row === currentRow) {
                return true;
            }
            return false;
        }
    }
    return true;
}

function findClosestSafeTile(startCol, startRow, dangerGrid) {
    const queue = [{ col: startCol, row: startRow }];
    const visited = new Set([`${startCol},${startRow}`]);

    while (queue.length > 0) {
        const curr = queue.shift();
        
        if (!dangerGrid[curr.row][curr.col]) {
            return curr; // Encontrou bloco seguro
        }

        const neighbors = [
            { col: curr.col, row: curr.row - 1 },
            { col: curr.col, row: curr.row + 1 },
            { col: curr.col - 1, row: curr.row },
            { col: curr.col + 1, row: curr.row }
        ];

        for (let n of neighbors) {
            if (!isTileWalkable(n.col, n.row, true, startCol, startRow)) continue;
            
            const key = `${n.col},${n.row}`;
            if (!visited.has(key)) {
                visited.add(key);
                queue.push(n);
            }
        }
    }
    return null;
}

function findClosestDestructible(startCol, startRow) {
    const queue = [{ col: startCol, row: startRow }];
    const visited = new Set([`${startCol},${startRow}`]);

    while (queue.length > 0) {
        const curr = queue.shift();
        
        if (grid[curr.row][curr.col] === 2) {
            return curr;
        }

        const neighbors = [
            { col: curr.col, row: curr.row - 1 },
            { col: curr.col, row: curr.row + 1 },
            { col: curr.col - 1, row: curr.row },
            { col: curr.col + 1, row: curr.row }
        ];

        for (let n of neighbors) {
            if (n.col < 0 || n.col >= COLS || n.row < 0 || n.row >= ROWS) continue;
            
            // Só caminha por blocos vazios ou itens
            if (grid[n.row][n.col] === 1) continue; 
            
            const key = `${n.col},${n.row}`;
            if (!visited.has(key)) {
                visited.add(key);
                queue.push(n);
            }
        }
    }
    return null;
}

function findPath(startCol, startRow, targetCol, targetRow, stopAdjacent = false, dangerGrid = null) {
    const queue = [[{ col: startCol, row: startRow }]];
    const visited = new Set([`${startCol},${startRow}`]);

    while (queue.length > 0) {
        const path = queue.shift();
        const curr = path[path.length - 1];

        if (stopAdjacent && isAdjacent(curr.col, curr.row, targetCol, targetRow)) {
            return path.slice(1);
        }
        if (!stopAdjacent && curr.col === targetCol && curr.row === targetRow) {
            return path.slice(1);
        }

        const neighbors = [
            { col: curr.col, row: curr.row - 1 },
            { col: curr.col, row: curr.row + 1 },
            { col: curr.col - 1, row: curr.row },
            { col: curr.col + 1, row: curr.row }
        ];

        for (let n of neighbors) {
            const isTargetBlock = (stopAdjacent && n.col === targetCol && n.row === targetRow);
            if (isTargetBlock) {
                if (grid[n.row][n.col] !== 2) continue;
            } else {
                if (!isTileWalkable(n.col, n.row, true, startCol, startRow)) continue;
                
                // Evita entrar em áreas sob ameaça de bombas se fornecido
                if (dangerGrid && dangerGrid[n.row][n.col]) {
                    // Permite apenas se for o tile atual do bot (se ele já iniciar no perigo)
                    if (n.col !== startCol || n.row !== startRow) {
                        continue;
                    }
                }
            }

            const key = `${n.col},${n.row}`;
            if (!visited.has(key)) {
                visited.add(key);
                queue.push([...path, n]);
            }
        }
    }
    return [];
}

// ─── DESENHO DE COMPONENTES GEOMÉTRICOS SIMPLES (REQUISITOS) ───────────────────
function drawRoundedRect(cContext, x, y, size, radius, color) {
    cContext.fillStyle = color;
    cContext.beginPath();
    cContext.moveTo(x + radius, y);
    cContext.lineTo(x + size - radius, y);
    cContext.quadraticCurveTo(x + size, y, x + size, y + radius);
    cContext.lineTo(x + size, y + size - radius);
    cContext.quadraticCurveTo(x + size, y + size, x + size - radius, y + size);
    cContext.lineTo(x + radius, y + size);
    cContext.quadraticCurveTo(x, y + size, x, y + size - radius);
    cContext.lineTo(x, y + radius);
    cContext.quadraticCurveTo(x, y, x + radius, y);
    cContext.closePath();
    cContext.fill();
}

function drawTriangle(cContext, x, y, w, h, direction, color) {
    cContext.fillStyle = color;
    cContext.beginPath();

    // Calcula pontos do triângulo com base na orientação
    if (direction === 'up') {
        cContext.moveTo(x + w / 2, y); // Topo centro
        cContext.lineTo(x, y + h);     // Esquerda baixo
        cContext.lineTo(x + w, y + h); // Direita baixo
    } else if (direction === 'down') {
        cContext.moveTo(x + w / 2, y + h); // Baixo centro
        cContext.lineTo(x, y);             // Esquerda topo
        cContext.lineTo(x + w, y);         // Direita topo
    } else if (direction === 'left') {
        cContext.moveTo(x, y + h / 2);     // Esquerda centro
        cContext.lineTo(x + w, y);         // Direita topo
        cContext.lineTo(x + w, y + h);     // Direita baixo
    } else if (direction === 'right') {
        cContext.moveTo(x + w, y + h / 2); // Direita centro
        cContext.lineTo(x, y);             // Esquerda topo
        cContext.lineTo(x, y + h);         // Esquerda baixo
    }

    cContext.closePath();
    cContext.fill();
}

function drawShieldIcon(ctx, x, y, size) {
    ctx.save();
    ctx.fillStyle = '#00c8ff';
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    // Move ao topo centralizado
    ctx.moveTo(x + size / 2, y + 4);
    // Canto direito superior
    ctx.lineTo(x + size - 5, y + 4);
    // Curva direita inferior
    ctx.quadraticCurveTo(x + size - 5, y + size / 2, x + size / 2, y + size - 4);
    // Curva esquerda inferior
    ctx.quadraticCurveTo(x + 5, y + size / 2, x + 5, y + 4);
    // Fecha
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
}

function drawEnemy(ctx, enemy) {
    const cx = enemy.x + enemy.w / 2;
    const cy = enemy.y + enemy.h / 2;
    const r = enemy.w / 2 - 2;

    ctx.save();
    if (enemy.type === 'circle') {
        // Círculo branco com olhos vermelhos
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.fill();
        
        // Olhos vermelhos
        ctx.fillStyle = '#ff0000';
        ctx.beginPath();
        ctx.arc(cx - 3, cy - 2, 2, 0, Math.PI * 2);
        ctx.arc(cx + 3, cy - 2, 2, 0, Math.PI * 2);
        ctx.fill();
    } else if (enemy.type === 'square') {
        // Quadrado preto com borda laranja/vermelha neon
        ctx.fillStyle = '#050505';
        ctx.strokeStyle = '#ff3300';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(enemy.x + 2, enemy.y + 2, enemy.w - 4, enemy.h - 4, 3);
        ctx.fill();
        ctx.stroke();
        
        // Olhos brilhantes
        ctx.fillStyle = '#ffcc00';
        ctx.fillRect(cx - 4, cy - 1, 3, 2);
        ctx.fillRect(cx + 1, cy - 1, 3, 2);
    } else if (enemy.type === 'mamona') {
        // Verde espinhoso (Mamona)
        ctx.fillStyle = '#2e7d32';
        ctx.beginPath();
        ctx.arc(cx, cy, r - 3, 0, Math.PI * 2);
        ctx.fill();
        
        // Desenha espinhos
        ctx.strokeStyle = '#2e7d32';
        ctx.lineWidth = 2;
        const spikes = 8;
        for (let i = 0; i < spikes; i++) {
            const angle = (i / spikes) * Math.PI * 2;
            const x1 = cx + Math.cos(angle) * (r - 3);
            const y1 = cy + Math.sin(angle) * (r - 3);
            const x2 = cx + Math.cos(angle) * r;
            const y2 = cy + Math.sin(angle) * r;
            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.stroke();
        }
        // Centro amarelo brilhante
        ctx.fillStyle = '#ffd100';
        ctx.beginPath();
        ctx.arc(cx, cy, 2, 0, Math.PI * 2);
        ctx.fill();
    } else if (enemy.type === 'rat') {
        // Rato cinza
        ctx.fillStyle = '#757575';
        ctx.beginPath();
        ctx.ellipse(cx, cy + 2, r - 1, r - 3, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // Orelhas
        ctx.beginPath();
        ctx.arc(cx - 4, cy - 3, 3, 0, Math.PI * 2);
        ctx.arc(cx + 4, cy - 3, 3, 0, Math.PI * 2);
        ctx.fill();
        
        // Olhos
        ctx.fillStyle = '#000000';
        ctx.beginPath();
        ctx.arc(cx - 3, cy + 1, 1, 0, Math.PI * 2);
        ctx.arc(cx + 3, cy + 1, 1, 0, Math.PI * 2);
        ctx.fill();
        
        // Nariz rosa
        ctx.fillStyle = '#ff80ab';
        ctx.beginPath();
        ctx.arc(cx, cy + 5, 1.5, 0, Math.PI * 2);
        ctx.fill();
    } else if (enemy.type === 'pepper') {
        // Pimenta vermelha
        ctx.fillStyle = '#d50000';
        ctx.beginPath();
        ctx.ellipse(cx, cy + 1, r - 3, r - 1, 0.1, 0, Math.PI * 2);
        ctx.fill();
        
        // Ponta inferior
        ctx.beginPath();
        ctx.moveTo(cx - 2, cy + 5);
        ctx.quadraticCurveTo(cx, cy + 8, cx + 1, cy + 9);
        ctx.quadraticCurveTo(cx + 1, cy + 5, cx + 2, cy + 5);
        ctx.fill();
        
        // Cabo verde
        ctx.strokeStyle = '#4caf50';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(cx, cy - 5);
        ctx.quadraticCurveTo(cx - 2, cy - 8, cx - 4, cy - 7);
        ctx.stroke();
    }
    ctx.restore();
}

function drawCard(cContext, x, y, size, type) {
    // Fundo da carta (Bordas brilhantes tecnológicas retrô)
    cContext.fillStyle = '#222';
    cContext.strokeStyle = '#ff6400';
    cContext.lineWidth = 1.5;
    
    // Desenha carta base
    cContext.beginPath();
    cContext.roundRect(x + 3, y + 3, size - 6, size - 6, 4);
    cContext.fill();
    cContext.stroke();

    // Ícone da carta
    if (type === 'shield') {
        drawShieldIcon(cContext, x + 3, y + 3, size - 6);
    } else {
        cContext.save();
        cContext.font = '12px Share Tech Mono';
        cContext.textAlign = 'center';
        cContext.textBaseline = 'middle';
        
        let emoji = '🔥';
        if (type === 'bomb') emoji = '💣';
        else if (type === 'speed') emoji = '⚡';

        cContext.fillText(emoji, x + size / 2, y + size / 2);
        cContext.restore();
    }
}

function getLevelTheme() {
    if (gameMode !== 'levels') {
        return {
            wallFill: '#444c48',
            wallStroke: '#5c6460',
            blockBorder: '#8b5a2b',
            blockFill: '#a0522d',
            floorFill: '#0f1712'
        };
    }
    switch (currentLevel) {
        case 2: // Vulcão (Vermelho)
            return {
                wallFill: '#2c1e21',
                wallStroke: '#4a3036',
                blockBorder: '#831a1a',
                blockFill: '#c0392b',
                floorFill: '#220e10'
            };
        case 3: // Gelo (Azul Glacial)
            return {
                wallFill: '#1d3557',
                wallStroke: '#457b9d',
                blockBorder: '#a8dadc',
                blockFill: '#5b9aa0',
                floorFill: '#0b1b24'
            };
        case 4: // Deserto (Marrom Arenoso)
            return {
                wallFill: '#5c4033',
                wallStroke: '#8b5a2b',
                blockBorder: '#b38b6d',
                blockFill: '#d2b48c',
                floorFill: '#241c13'
            };
        case 5: // Cyberpunk Neon (Roxo/Rosa)
            return {
                wallFill: '#1a1a2e',
                wallStroke: '#0f3460',
                blockBorder: '#e94560',
                blockFill: '#8a2be2',
                floorFill: '#0e0b16'
            };
        case 1:
        default: // Clássico (Moss Green)
            return {
                wallFill: '#444c48',
                wallStroke: '#5c6460',
                blockBorder: '#8b5a2b',
                blockFill: '#a0522d',
                floorFill: '#0f1712'
            };
    }
}

function render() {
    const theme = getLevelTheme();
    var bgColor = document.body && document.body.dataset.theme === 'light' ? '#e0e0e0' : theme.floorFill;
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Desenha o grid
    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
            const val = grid[r][c];
            const x = c * TILE_SIZE;
            const y = r * TILE_SIZE;

            if (val === 1) {
                // Paredes indestrutíveis temáticas
                ctx.fillStyle = theme.wallFill;
                ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
                
                // Bordas internas para textura retrô
                ctx.strokeStyle = theme.wallStroke;
                ctx.lineWidth = 2;
                ctx.strokeRect(x + 2, y + 2, TILE_SIZE - 4, TILE_SIZE - 4);

                // HUD EM BLOCK (Desenha informações do jogador 1 na linha de cima)
                if (r === 0 && players[0]) {
                    ctx.save();
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.font = '12px Share Tech Mono';
                    ctx.fillStyle = '#ffffff';

                    // Fase atual
                    if (c === 0 && gameMode === 'levels') {
                        ctx.fillStyle = '#ff6400';
                        ctx.font = 'bold 11px Share Tech Mono';
                        ctx.fillText(`F${currentLevel}`, x + TILE_SIZE/2, y + TILE_SIZE/2);
                    }
                    else if (c === 0 && gameMode === 'vs_cpu') {
                        ctx.fillStyle = '#00c8ff';
                        ctx.font = 'bold 11px Share Tech Mono';
                        ctx.fillText(`VS`, x + TILE_SIZE/2, y + TILE_SIZE/2);
                    }
                    
                    // Bombas
                    else if (c === 2) {
                        ctx.fillText('💣', x + TILE_SIZE/2, y + TILE_SIZE/2);
                    }
                    else if (c === 3) {
                        ctx.fillStyle = '#ffd100';
                        ctx.fillText(`x${players[0].bombLimit}`, x + TILE_SIZE/2, y + TILE_SIZE/2);
                    }
                    
                    // Fogo
                    else if (c === 5) {
                        ctx.fillText('🔥', x + TILE_SIZE/2, y + TILE_SIZE/2);
                    }
                    else if (c === 6) {
                        ctx.fillStyle = '#ffd100';
                        ctx.fillText(`x${players[0].fireRange}`, x + TILE_SIZE/2, y + TILE_SIZE/2);
                    }
                    
                    // Escudo
                    else if (c === 9 && players[0].shield) {
                        ctx.fillText('🛡', x + TILE_SIZE/2, y + TILE_SIZE/2);
                    }
                    ctx.restore();
                }

                // Desenha informações do jogador 2 na linha de baixo se for multiplayer
                if (r === ROWS - 1 && gameMode === '2p' && players[1]) {
                    ctx.save();
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.font = '12px Share Tech Mono';
                    ctx.fillStyle = '#ffffff';

                    // Indicação P2
                    if (c === 0) {
                        ctx.fillStyle = '#ff6b6b';
                        ctx.font = 'bold 11px Share Tech Mono';
                        ctx.fillText(`P2`, x + TILE_SIZE/2, y + TILE_SIZE/2);
                    }
                    // Bombas
                    else if (c === 2) {
                        ctx.fillText('💣', x + TILE_SIZE/2, y + TILE_SIZE/2);
                    }
                    else if (c === 3) {
                        ctx.fillStyle = '#ffd100';
                        ctx.fillText(`x${players[1].bombLimit}`, x + TILE_SIZE/2, y + TILE_SIZE/2);
                    }
                    
                    // Fogo
                    else if (c === 5) {
                        ctx.fillText('🔥', x + TILE_SIZE/2, y + TILE_SIZE/2);
                    }
                    else if (c === 6) {
                        ctx.fillStyle = '#ffd100';
                        ctx.fillText(`x${players[1].fireRange}`, x + TILE_SIZE/2, y + TILE_SIZE/2);
                    }
                    
                    // Escudo
                    else if (c === 9 && players[1].shield) {
                        ctx.fillText('🛡', x + TILE_SIZE/2, y + TILE_SIZE/2);
                    }
                    ctx.restore();
                }
            }
            else if (val === 2) {
                // Blocos destrutíveis temáticos
                drawRoundedRect(ctx, x + 1.5, y + 1.5, TILE_SIZE - 3, 6, theme.blockBorder);
                
                // Detalhe de textura interna
                ctx.fillStyle = theme.blockFill;
                ctx.fillRect(x + 5, y + 5, TILE_SIZE - 10, TILE_SIZE - 10);
            }
            else if (val === 3) {
                // Carta de item de upgrade
                const type = items[`${c},${r}`];
                if (type) {
                    drawCard(ctx, x, y, TILE_SIZE, type);
                }
            }
        }
    }

    // Desenha bombas (círculos vermelhos/laranja pulsantes)
    const pulseFactor = Math.abs(Math.sin(performance.now() / 150)) * 2;
    bombs.forEach(bomb => {
        const x = bomb.col * TILE_SIZE + TILE_SIZE / 2;
        const y = bomb.row * TILE_SIZE + TILE_SIZE / 2;
        const radius = (TILE_SIZE / 2 - 3) + pulseFactor;

        // Círculo externo
        ctx.fillStyle = '#d32f2f';
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fill();

        // Círculo interno brilhante
        ctx.fillStyle = '#ff9800';
        ctx.beginPath();
        ctx.arc(x, y, radius * 0.6, 0, Math.PI * 2);
        ctx.fill();

        // Fusível
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x, y - radius + 2);
        ctx.lineTo(x + 4, y - radius - 3);
        ctx.stroke();
    });

    // Desenha fogo das explosões
    explosions.forEach(exp => {
        ctx.fillStyle = 'rgba(255, 100, 0, 0.75)'; // Laranja de explosão translúcido
        exp.cells.forEach(cell => {
            const x = cell.col * TILE_SIZE;
            const y = cell.row * TILE_SIZE;
            
            // Fogo da explosão geométrico estilizado
            ctx.fillRect(x + 1, y + 1, TILE_SIZE - 2, TILE_SIZE - 2);
            
            ctx.fillStyle = 'rgba(255, 235, 59, 0.9)'; // Amarelo central do fogo
            ctx.fillRect(x + 6, y + 6, TILE_SIZE - 12, TILE_SIZE - 12);
            
            // Reseta cor para próxima célula
            ctx.fillStyle = 'rgba(255, 100, 0, 0.75)';
        });
    });

    // Desenha jogadores (triângulos apontados para direção)
    players.forEach(player => {
        if (!player.alive) return;
        
        // Efeito de piscar caso esteja invulnerável
        if (player.invulTimer > 0 && Math.floor(performance.now() / 100) % 2 === 0) {
            // Pula desenho para dar efeito de piscar
        } else {
            drawTriangle(ctx, player.x, player.y, player.w, player.h, player.direction, player.color);
        }
        
        // Efeito visual de escudo ativo
        if (player.shield) {
            ctx.strokeStyle = '#00c8ff';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.arc(player.x + player.w/2, player.y + player.h/2, player.w, 0, Math.PI * 2);
            ctx.stroke();
        } else if (player.invulTimer > 0) {
            // Efeito visual de aura de invulnerabilidade
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
            ctx.lineWidth = 1.0;
            ctx.beginPath();
            ctx.arc(player.x + player.w/2, player.y + player.h/2, player.w - 2, 0, Math.PI * 2);
            ctx.stroke();
        }
    });

    // Desenha a porta se estiver revelada no modo levels
    if (gameMode === 'levels' && doorRevealed) {
        const x = doorPos.c * TILE_SIZE;
        const y = doorPos.r * TILE_SIZE;
        
        ctx.fillStyle = '#444';
        ctx.fillRect(x + 4, y + 4, TILE_SIZE - 8, TILE_SIZE - 8);
        
        ctx.save();
        if (doorActive) {
            const pulse = Math.abs(Math.sin(performance.now() / 200)) * 50;
            ctx.fillStyle = `rgb(0, ${100 + Math.floor(pulse)}, 255)`;
            ctx.fillRect(x + 7, y + 7, TILE_SIZE - 14, TILE_SIZE - 14);
            
            ctx.font = '10px Share Tech Mono';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = '#fff';
            ctx.fillText('🌟', x + TILE_SIZE / 2, y + TILE_SIZE / 2);
        } else {
            ctx.fillStyle = '#111';
            ctx.fillRect(x + 7, y + 7, TILE_SIZE - 14, TILE_SIZE - 14);
            
            ctx.font = '10px Share Tech Mono';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = '#888';
            ctx.fillText('🔒', x + TILE_SIZE / 2, y + TILE_SIZE / 2);
        }
        ctx.restore();
    }

    // Desenha os inimigos no modo de fases
    if (gameMode === 'levels') {
        enemies.forEach(enemy => {
            if (!enemy.alive) return;
            drawEnemy(ctx, enemy);
        });
    }
}

function updateEnemies(dt) {
    enemies.forEach(enemy => {
        if (!enemy.alive) return;
        
        enemy.changeDirTimer -= dt;
        
        const enemyCol = Math.floor((enemy.x + enemy.w / 2) / TILE_SIZE);
        const enemyRow = Math.floor((enemy.y + enemy.h / 2) / TILE_SIZE);
        
        // Comportamento do Rato: Tenta seguir o jogador vivo mais próximo
        if (enemy.type === 'rat' && enemy.changeDirTimer <= 0) {
            let targetPlayer = null;
            let minDist = Infinity;
            players.forEach(p => {
                if (!p.alive) return;
                const pCol = Math.floor((p.x + p.w / 2) / TILE_SIZE);
                const pRow = Math.floor((p.y + p.h / 2) / TILE_SIZE);
                const dist = Math.abs(pCol - enemyCol) + Math.abs(pRow - enemyRow);
                if (dist < minDist) {
                    minDist = dist;
                    targetPlayer = p;
                }
            });

            if (targetPlayer && minDist < 6) {
                const tpCol = Math.floor((targetPlayer.x + targetPlayer.w / 2) / TILE_SIZE);
                const tpRow = Math.floor((targetPlayer.y + targetPlayer.h / 2) / TILE_SIZE);
                if (tpCol === enemyCol) {
                    enemy.direction = tpRow > enemyRow ? 'down' : 'up';
                    enemy.changeDirTimer = 1500;
                } else if (tpRow === enemyRow) {
                    enemy.direction = tpCol > enemyCol ? 'right' : 'left';
                    enemy.changeDirTimer = 1500;
                }
            }
        }
        
        // Pimenta: Velocidade errática
        if (enemy.type === 'pepper') {
            if (Math.random() < 0.03) {
                enemy.speed = Math.random() < 0.5 ? 1.7 : 1.1;
            }
        }

        // Timer de mudança de direção
        if (enemy.changeDirTimer <= 0) {
            enemy.direction = getRandomDirection();
            enemy.changeDirTimer = Math.random() * 2000 + 1000;
        }

        let dx = 0;
        let dy = 0;
        if (enemy.direction === 'up') dy = -1;
        else if (enemy.direction === 'down') dy = 1;
        else if (enemy.direction === 'left') dx = -1;
        else if (enemy.direction === 'right') dx = 1;

        const nextX = enemy.x + dx * enemy.speed;
        const nextY = enemy.y + dy * enemy.speed;
        
        // Usa checkCollision diretamente passsando null
        if (!checkCollision(nextX, nextY, enemy.w, enemy.h, null)) {
            enemy.x = nextX;
            enemy.y = nextY;
        } else {
            enemy.direction = getRandomDirection();
            enemy.changeDirTimer = Math.random() * 1000 + 500;
        }
        
        // Colisão com os Jogadores
        players.forEach(p => {
            if (!p.alive) return;
            if (rectsOverlap(enemy.x, enemy.y, enemy.w, enemy.h, p.x, p.y, p.w, p.h)) {
                if (p.invulTimer > 0) {
                    // Ignora
                } else if (p.shield) {
                    p.shield = false;
                    p.invulTimer = 1500;
                    showToast('🛡 Escudo Protegeu!', 'success');
                    enemy.direction = getRandomDirection();
                    enemy.changeDirTimer = 1200;
                } else {
                    p.alive = false;
                    showToast(p.id === 'p1' ? 'P1 morreu!' : 'P2/Bot morreu!', 'error');
                    checkGameOver();
                }
            }
        });
    });
}

function checkDoorCollision() {
    if (!doorActive) return;
    
    // Qualquer jogador vivo que tocar no portal passa o nível
    const passed = players.some(p => {
        if (!p.alive) return false;
        const px = p.x + p.w / 2;
        const py = p.y + p.h / 2;
        const pCol = Math.floor(px / TILE_SIZE);
        const pRow = Math.floor(py / TILE_SIZE);
        return pCol === doorPos.c && pRow === doorPos.r;
    });

    if (passed) {
        clearLevel();
    }
}

function clearLevel() {
    isGameOver = true;
    if (gameLoopId) cancelAnimationFrame(gameLoopId);
    
    if (currentLevel === unlockedLevel && unlockedLevel < 5) {
        unlockedLevel++;
        localStorage.setItem('bomber_unlocked_level', unlockedLevel);
    }
    
    goTitle.textContent = `Nível ${currentLevel} Concluído!`;
    goSubtitle.textContent = currentLevel < 5 ? 'Avançar para a próxima fase?' : 'Você completou todas as fases!';
    goEmoji.textContent = '🎉';
    
    const restartBtn = document.getElementById('restart-btn');
    if (restartBtn) {
        if (currentLevel < 5) {
            restartBtn.innerHTML = 'Próxima Fase <span class="btn-emoji">➡️</span>';
        } else {
            restartBtn.innerHTML = 'Menu Principal <span class="btn-emoji">🏠</span>';
        }
    }
    
    gameOverScreen.classList.remove('hidden');
    setTimeout(() => updateMenuFocus(0), 50);
}

// ─── LOOP PRINCIPAL DE UPATE DO JOGO ──────────────────────────────────────────
function update(timestamp) {
    if (isPaused || isGameOver) return;

    const dt = timestamp - lastTime;
    lastTime = timestamp;

    // Decrementa invulTimer dos jogadores
    players.forEach(player => {
        if (player.invulTimer > 0) {
            player.invulTimer -= dt;
        }
    });

    // 1. Processar Controles P1 (Espaço para Bomba, WASD/Setas para andar)
    let p1Dx = 0;
    let p1Dy = 0;

    if (keys['ArrowUp']) p1Dy = -1;
    else if (keys['ArrowDown']) p1Dy = 1;
    else if (keys['ArrowLeft']) p1Dx = -1;
    else if (keys['ArrowRight']) p1Dx = 1;

    if (p1Dx !== 0 || p1Dy !== 0) {
        movePlayer(players[0], p1Dx, p1Dy);
    }

    if (keys[' ']) {
        placeBomb(players[0]);
    }

    // 2. Processar Controles P2 / Bot AI
    const p2 = players[1];
    if (p2 && p2.alive) {
        if (p2.isBot) {
            runBotAI(p2, dt);
        } else {
            // Local 2 Players (P2 usa WASD + F)
            let p2Dx = 0;
            let p2Dy = 0;
            if (keys['KeyW']) p2Dy = -1;
            else if (keys['KeyS']) p2Dy = 1;
            else if (keys['KeyA']) p2Dx = -1;
            else if (keys['KeyD']) p2Dx = 1;

            if (p2Dx !== 0 || p2Dy !== 0) {
                movePlayer(p2, p2Dx, p2Dy);
            }

            if (keys['KeyF']) {
                placeBomb(p2);
            }
        }
    }

    // Processar inimigos em todos os modos
    updateEnemies(dt);

    // 3. Gerenciar Timers de Bombas
    for (let i = bombs.length - 1; i >= 0; i--) {
        const bomb = bombs[i];
        bomb.timer -= dt;

        if (bomb.timer <= 0) {
            bombs.splice(i, 1);
            triggerExplosion(bomb);
        }
    }

    // 4. Gerenciar Timers de Explosões
    for (let i = explosions.length - 1; i >= 0; i--) {
        const exp = explosions[i];
        exp.timer -= dt;

        if (exp.timer <= 0) {
            explosions.splice(i, 1);
        } else {
            // A explosão está ativa, valida dano de fogo nos jogadores
            players.forEach(player => {
                if (!player.alive) return;
                
                const px = player.x + player.w / 2;
                const py = player.y + player.h / 2;
                const pCol = Math.floor(px / TILE_SIZE);
                const pRow = Math.floor(py / TILE_SIZE);

                const hit = exp.cells.some(cell => cell.col === pCol && cell.row === pRow);
                if (hit) {
                    if (player.invulTimer > 0) {
                        // Ignora dano
                    } else if (player.shield) {
                        player.shield = false; // perde escudo
                        player.invulTimer = 1500; // 1.5 segundos de invulnerabilidade
                        showToast('🛡 Escudo quebrado!', 'error');
                        updateHUD();
                    } else {
                        player.alive = false;
                        showToast(player.id === 'p1' ? 'P1 morreu!' : 'P2/Bot morreu!', 'error');
                    }
                }
            });

            // Valida dano de fogo nos inimigos
            enemies.forEach(enemy => {
                if (!enemy.alive) return;
                
                const ex = enemy.x + enemy.w / 2;
                const ey = enemy.y + enemy.h / 2;
                const eCol = Math.floor(ex / TILE_SIZE);
                const eRow = Math.floor(ey / TILE_SIZE);

                const hit = exp.cells.some(cell => cell.col === eCol && cell.row === eRow);
                if (hit) {
                    enemy.alive = false;
                    showToast('Inimigo derrotado!', 'success');
                }
            });
        }
    }

    // Controle de revelação e ativação automática da porta (em todos os modos)
    const allDead = enemies.every(e => !e.alive);
    if (allDead) {
        if (!doorActive) {
            doorActive = true;
            doorRevealed = true;
            // Se o bloco quebrável na porta ainda existir, limpa ele
            if (grid[doorPos.r][doorPos.c] === 2) {
                grid[doorPos.r][doorPos.c] = 0;
            }
            showToast('🏆 Portal Ativado! Encontre a saída!', 'success');
        }
        checkDoorCollision();
    }

    // 5. Validação de Fim de Jogo
    checkGameOver();

    // 6. Desenhar Frame
    render();

    if (!isGameOver && !isPaused) {
        gameLoopId = requestAnimationFrame(update);
    }
}

// ─── ESTADOS E MENU ──────────────────────────────────────────────────────────
function checkGameOver() {
    const anyAlive = players.some(p => p.alive);
    if (!anyAlive) {
        endGame('Você Perdeu!', 'Tente novamente o nível.', '💀');
    }
}

function endGame(title, subtitle, emoji) {
    isGameOver = true;
    if (gameLoopId) cancelAnimationFrame(gameLoopId);
    
    goTitle.textContent = title;
    goSubtitle.textContent = subtitle;
    goEmoji.textContent = emoji;
    
    gameOverScreen.classList.remove('hidden');
    setTimeout(() => updateMenuFocus(0), 50);
}

function pauseGame() {
    if (isGameOver) return;
    isPaused = true;
    pauseOverlay.classList.remove('hidden');
    setTimeout(() => updateMenuFocus(0), 50);
}

function resumeGame() {
    if (isGameOver) return;
    isPaused = false;
    pauseOverlay.classList.add('hidden');
    lastTime = performance.now();
    gameLoopId = requestAnimationFrame(update);
    setTimeout(() => updateMenuFocus(0), 50);
}

function backToMenu() {
    if (gameLoopId) cancelAnimationFrame(gameLoopId);
    isPaused = false;
    isGameOver = false;
    gameScreen.classList.add('hidden');
    menuScreen.classList.remove('hidden');
    setTimeout(() => updateMenuFocus(0), 50);
}

// ─── BINDINGS DE EVENTOS DE BOTÕES ────────────────────────────────────────────
if (btnSolo) btnSolo.onclick = () => showLevelsScreen();
if (btnVsCpu) btnVsCpu.onclick = () => initGame('vs_cpu');
if (btnLocal2p) btnLocal2p.onclick = () => initGame('2p');
if (btnRestart) {
    btnRestart.onclick = () => {
        if (gameMode === 'levels') {
            const p1 = players[0];
            if (p1 && p1.alive) {
                // Avançar para a próxima fase!
                if (currentLevel < 5) {
                    currentLevel++;
                    initGame('levels');
                } else {
                    backToMenu();
                }
            } else {
                // Tentar novamente a mesma fase
                initGame('levels');
            }
        } else {
            initGame(gameMode);
        }
    };
}
if (btnBackToMenu) btnBackToMenu.onclick = backToMenu;
if (btnResume) btnResume.onclick = resumeGame;
if (btnPauseMenu) btnPauseMenu.onclick = backToMenu;
if (btnPauseReset) {
    btnPauseReset.onclick = () => {
        isPaused = false;
        pauseOverlay.classList.add('hidden');
        initGame(gameMode);
    };
}

// Setup móvel na inicialização
setupDpad();

// ─── NAVEGAÇÃO DE MENU VIA CONTROLES ──────────────────────────────────────────
let menuFocusIndex = 0;
let lastActiveScreen = null;

function getActiveMenuScreen() {
    const screens = [
        document.getElementById('menu-screen'),
        document.getElementById('level-screen'),
        document.getElementById('game-over-screen'),
        document.getElementById('pause-overlay'),
        document.getElementById('instructions-modal'),
        document.getElementById('instructions-modal-game')
    ];
    return screens.find(s => s && !s.classList.contains('hidden'));
}

function getFocusableElements(screen) {
    if (!screen) return [];
    const elements = Array.from(screen.querySelectorAll('button, input, a')).filter(el => {
        return !el.classList.contains('modal-close-btn');
    });

    const topRow = document.querySelector('.game-top-row');
    if (topRow) {
        const loginBtn = topRow.querySelector('#google-login-btn') || topRow.querySelector('#google-login-btn-game');
        const apoieBtn = topRow.querySelector('.apoie-btn');
        const homeBtn = topRow.querySelector('.home-btn');
        [loginBtn, apoieBtn, homeBtn].forEach(el => {
            if (el && !elements.includes(el)) elements.push(el);
        });
    }

    return elements.filter(el => {
        const style = window.getComputedStyle(el);
        return style.display !== 'none' && style.visibility !== 'hidden' && !el.disabled && !el.classList.contains('modal-close-btn');
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

// Inicialização de foco do menu no carregamento
setTimeout(() => updateMenuFocus(0), 50);
