// ═══════════════════════════════════════════════════════════════════════════════
// GAME.JS — Engine Principal do Kamale Bomberman
// ═══════════════════════════════════════════════════════════════════════════════

// ─── TOAST ──────────────────────────────────────────────────────────────────
function showToast(msg, type = 'info', dur = 2500) {
    const c = document.getElementById('toastContainer');
    if (!c) return;
    const t = document.createElement('div');
    t.className = 'toast toast-' + type;
    t.textContent = msg;
    c.appendChild(t);
    requestAnimationFrame(() => t.classList.add('show'));
    setTimeout(() => { t.classList.remove('show'); t.classList.add('hide'); setTimeout(() => t.remove(), 300); }, dur);
}

// ─── SCREEN MANAGER ─────────────────────────────────────────────────────────
const Screens = {
    _all: ['screen-menu', 'screen-phases', 'screen-game'],
    show(id) {
        this._all.forEach(s => {
            const el = document.getElementById(s);
            if (el) el.classList.toggle('hidden', s !== id);
        });
    }
};

// ─── SAVE / LOAD PROGRESS ────────────────────────────────────────────────────
const Save = {
    KEY: 'kamale_bomb_save',
    load() {
        try { return JSON.parse(localStorage.getItem(this.KEY)) || { unlocked: 1, scores: {} }; }
        catch { return { unlocked: 1, scores: {} }; }
    },
    save(data) { localStorage.setItem(this.KEY, JSON.stringify(data)); },
};

// ─── STATE GLOBAL ────────────────────────────────────────────────────────────
let G = {
    canvas: null, ctx: null,
    tileSize: 32,
    grid: [],
    rows: 0, cols: 0,
    players: [],
    enemies: [],
    bombs: [],
    explosions: [],
    particles: [],
    powerups: [],
    boss: null,
    bossAI: null,
    hazards: [],
    hazardTimer: 0,
    score: 0,
    lives: [3, 3],
    levelIndex: 0,
    isMultiplayer: false,
    state: 'idle', // 'playing','paused','gameover','win','bosswin'
    animFrame: 0,
    lastTime: 0,
    rafId: null,
    save: null,
    levelDef: null,
    rng: null,
    iceFriction: false,
    introTimer: 0,
    showIntro: false,
    introText: '',
    lavaTimer: 0,
    lavaCells: [],
    lavaActive: false,
    bgParticles: [],
    comboKills: 0,
    comboTimer: 0,
};

// ─── PLAYER CLASS ────────────────────────────────────────────────────────────
class Player {
    constructor(id, spawnX, spawnY, isP2 = false) {
        this.id = id;
        this.isP2 = isP2;
        this.x = spawnX;
        this.y = spawnY;
        this.tileSize = 32;
        this.speed = 130;
        this.dir = 'down';
        this.animFrame = 0;
        this.alive = true;
        this.invincible = 0;
        this.maxBombs = 1;
        this.bombsUsed = 0;
        this.flameRange = 2;
        this.speedBoost = 0;
        this.shield = false;
        this.ghost = false;
        this.deathTimer = 0;
        this.keys = {};
    }

    get bombCount() { return Math.max(0, this.maxBombs - this.bombsUsed); }
    get effectiveSpeed() { return this.speed + (this.speedBoost > 0 ? 60 : 0); }
}

// ─── INIT ────────────────────────────────────────────────────────────────────
function init() {
    G.canvas = document.getElementById('game-canvas');
    G.ctx = G.canvas.getContext('2d');
    G.save = Save.load();

    // Detecta touch
    if ('ontouchstart' in window || navigator.maxTouchPoints > 0) {
        document.body.classList.add('touch-device');
    }

    setupMenuButtons();
    setupPhaseGrid();
    setupGameButtons();
    setupKeyboard();
    setupMobileControls();

    // Carrega sprites em background
    SpriteManager.loadAll(() => { /* sprites prontos */ });

    Screens.show('screen-menu');
}

// ─── MENU ────────────────────────────────────────────────────────────────────
function setupMenuButtons() {
    document.getElementById('btn-solo').onclick = () => {
        G.isMultiplayer = false;
        document.body.classList.remove('multiplayer');
        setupPhaseGrid();
        Screens.show('screen-phases');
    };
    document.getElementById('btn-multi').onclick = () => {
        G.isMultiplayer = true;
        document.body.classList.add('multiplayer');
        setupPhaseGrid();
        Screens.show('screen-phases');
    };
    document.getElementById('btn-help-menu').onclick = () => showHelpModal();
    document.getElementById('btn-back-phases').onclick = () => Screens.show('screen-menu');
    document.getElementById('btn-back-phases2').onclick = () => Screens.show('screen-menu');
}

function setupPhaseGrid() {
    const grid = document.getElementById('phase-grid');
    if (!grid) return;
    grid.innerHTML = '';
    const save = G.save || Save.load();

    LEVELS.forEach((lvl, i) => {
        const card = document.createElement('div');
        card.className = 'phase-card' + (lvl.isBoss ? ' boss' : '');
        const unlocked = i + 1 <= save.unlocked;
        if (!unlocked) card.classList.add('locked');
        if (save.scores && save.scores[i] > 0) card.classList.add('completed');

        card.innerHTML = `
            <div class="phase-icon">${lvl.icon}</div>
            <div class="phase-num">${i + 1}</div>
            ${!unlocked ? '<div class="phase-lock">🔒</div>' : ''}
        `;
        card.title = lvl.name;
        if (unlocked) {
            card.onclick = () => startLevel(i);
        }
        grid.appendChild(card);
    });
}

// ─── START LEVEL ─────────────────────────────────────────────────────────────
function startLevel(levelIndex) {
    G.levelIndex = levelIndex;
    G.levelDef = LEVELS[levelIndex];
    const lvl = G.levelDef;

    G.rng = seededRandom(lvl.pattern.seed + Date.now() % 1000);

    // Monta grid
    G.grid = buildLevelGrid(levelIndex);
    G.rows = lvl.rows;
    G.cols = lvl.cols;

    // Calcula tileSize baseado no canvas
    resizeCanvas();

    // Limpa estado
    G.bombs = [];
    G.explosions = [];
    G.particles = [];
    G.powerups = [];
    G.enemies = [];
    G.boss = null;
    G.bossAI = null;
    G.score = 0;
    G.state = 'playing';
    G.animFrame = 0;
    G.comboKills = 0;
    G.comboTimer = 0;
    G.lavaActive = false;
    G.lavaTimer = 0;
    G.lavaCells = [];

    // Configura hazards
    if (lvl.hazards) {
        for (const h of lvl.hazards) {
            if (h.type === 'lava') {
                G.lavaCells = h.cells;
                G.lavaTimer = h.interval;
            }
        }
    }

    // Fundo de partículas
    G.bgParticles = generateBgParticles(lvl.theme);

    // Cria jogadores
    G.players = [];
    const ts = G.tileSize;
    const p1 = new Player(0, ts, ts, false);
    G.players.push(p1);
    G.lives[0] = 3;

    if (G.isMultiplayer) {
        const p2 = new Player(1, (G.cols - 2) * ts, ts, true);
        G.players.push(p2);
        G.lives[1] = 3;
    }

    // Cria inimigos
    for (const eDef of lvl.pattern.enemies) {
        spawnEnemy(eDef.type, eDef.row, eDef.col, lvl.smartEnemies || false);
    }

    // Cria boss
    if (lvl.boss) {
        G.bossAI = new BossAI(lvl.boss);
        G.bossAI.x = lvl.boss.spawnCol * ts;
        G.bossAI.y = lvl.boss.spawnRow * ts;
        G.bossAI.tileSize = ts;
        G.boss = G.bossAI;
        updateBossHUD();
        document.getElementById('boss-hud').classList.add('visible');
        document.getElementById('boss-name').textContent = lvl.boss.name;
    } else {
        document.getElementById('boss-hud').classList.remove('visible');
    }

    // Intro da fase
    G.showIntro = true;
    G.introText = lvl.intro || lvl.name;
    G.introTimer = 2000;

    updateHUD();
    hideOverlay();
    Screens.show('screen-game');

    if (G.rafId) cancelAnimationFrame(G.rafId);
    G.lastTime = performance.now();
    G.rafId = requestAnimationFrame(gameLoop);
}

function spawnEnemy(type, row, col, smart) {
    const ts = G.tileSize;
    const enemy = {
        x: col * ts, y: row * ts,
        type, tileSize: ts,
        alive: true, animFrame: 0,
        deathTimer: 0,
        ai: new EnemyAI(type, smart),
    };
    G.enemies.push(enemy);
}

function generateBgParticles(theme) {
    const particles = [];
    const colors = {
        forest: ['#1a3a0a','#2a5a15','#0a2a04'],
        volcano: ['#3a1000','#5a2000','#ff6600'],
        ice:    ['#0a2040','#102850','#aaddff'],
        city:   ['#1a1a2a','#2a2a3a','#4444aa'],
        boss:   ['#2a0000','#400000','#ff2200'],
    };
    const cols = colors[theme] || colors.forest;
    for (let i = 0; i < 30; i++) {
        particles.push({
            x: Math.random() * 800,
            y: Math.random() * 800,
            vx: (Math.random() - 0.5) * 10,
            vy: (Math.random() - 0.5) * 10,
            r: Math.random() * 3 + 1,
            color: cols[Math.floor(Math.random() * cols.length)],
            alpha: Math.random() * 0.5 + 0.1,
        });
    }
    return particles;
}

// ─── GAME LOOP ────────────────────────────────────────────────────────────────
function gameLoop(now) {
    const dt = Math.min(now - G.lastTime, 50);
    G.lastTime = now;
    G.animFrame++;

    if (G.state === 'playing') {
        update(dt);
    }
    render();

    G.rafId = requestAnimationFrame(gameLoop);
}

// ─── UPDATE ──────────────────────────────────────────────────────────────────
function update(dt) {
    // Intro timer
    if (G.showIntro) {
        G.introTimer -= dt;
        if (G.introTimer <= 0) G.showIntro = false;
    }

    // Combo timer
    if (G.comboTimer > 0) {
        G.comboTimer -= dt;
        if (G.comboTimer <= 0) G.comboKills = 0;
    }

    // Background particles
    updateBgParticles(dt);

    // Lava hazard
    updateLava(dt);

    // Players
    for (const p of G.players) {
        if (p.alive) updatePlayer(p, dt);
        else if (p.deathTimer > 0) p.deathTimer -= dt;
    }

    // Inimigos
    for (const e of G.enemies) {
        if (e.alive) {
            e.ai.update(e, G.grid, G.players, G.bombs, dt);
            checkEnemyPlayerCollision(e);
        } else {
            e.deathTimer -= dt;
        }
    }
    G.enemies = G.enemies.filter(e => e.alive || e.deathTimer > 0);

    // Boss
    if (G.boss && G.boss.alive) {
        const attack = G.boss.update(G.grid, G.players, G.bombs, dt);
        if (attack) executeBossAttack(attack);
        checkBossPlayerCollision();
        updateBossHUD();
    }

    // Bombas
    for (const b of G.bombs) {
        b.timer -= dt;
        if (b.timer <= 0) explodeBomb(b);
    }
    G.bombs = G.bombs.filter(b => b.timer > 0);

    // Explosões
    for (const ex of G.explosions) ex.life -= dt;
    G.explosions = G.explosions.filter(ex => ex.life > 0);

    // Power-ups
    for (const pu of G.powerups) {
        pu.animFrame += dt * 0.006;
        checkPowerupCollision(pu);
    }
    G.powerups = G.powerups.filter(pu => !pu.collected);

    // Partículas
    G.particles = G.particles.filter(p => p.life > 0);
    for (const p of G.particles) {
        p.x += p.vx * (dt / 1000);
        p.y += p.vy * (dt / 1000);
        p.vy += 200 * (dt / 1000); // gravidade
        p.life -= dt;
        p.alpha = p.life / p.maxLife;
    }

    // Power-up timers
    for (const p of G.players) {
        if (p.speedBoost > 0) p.speedBoost -= dt;
        if (p.invincible > 0) p.invincible -= dt;
    }

    // Check vitória/derrota
    checkWinLose();
}

// ─── PLAYER UPDATE ────────────────────────────────────────────────────────────
function updatePlayer(player, dt) {
    const keys = player.keys;
    const ts = G.tileSize;
    const speed = player.effectiveSpeed;
    let moved = false;

    const isP1 = !player.isP2;
    const up    = isP1 ? (keys['ArrowUp']    || keys['w'] || keys['W']) : keys['ArrowUp'];
    const down  = isP1 ? (keys['ArrowDown']  || keys['s'] || keys['S']) : keys['ArrowDown'];
    const left  = isP1 ? (keys['ArrowLeft']  || keys['a'] || keys['A']) : keys['ArrowLeft'];
    const right = isP1 ? (keys['ArrowRight'] || keys['d'] || keys['D']) : keys['ArrowRight'];

    let dx = 0, dy = 0;
    if (up)    { dy = -1; player.dir = 'up'; }
    if (down)  { dy =  1; player.dir = 'down'; }
    if (left)  { dx = -1; player.dir = 'left'; }
    if (right) { dx =  1; player.dir = 'right'; }

    // Normaliza diagonal
    if (dx !== 0 && dy !== 0) { dx *= 0.707; dy *= 0.707; }

    // Gelo: inércia extra
    if (G.levelDef?.iceSlide && (dx !== 0 || dy !== 0)) {
        player._vx = (player._vx || 0) * 0.85 + dx * speed * 0.15;
        player._vy = (player._vy || 0) * 0.85 + dy * speed * 0.15;
        dx = player._vx / speed;
        dy = player._vy / speed;
    }

    if (dx !== 0 || dy !== 0) {
        const nx = player.x + dx * speed * (dt / 1000);
        const ny = player.y + dy * speed * (dt / 1000);
        const [rx, ry] = tryMovePlayer(player, nx, ny, ts);
        if (rx !== player.x || ry !== player.y) moved = true;
        player.x = rx;
        player.y = ry;
    }

    if (moved) player.animFrame += dt * 0.01;
    else player.animFrame += dt * 0.003;

    // Alinha ao grid quando parado (snap suave)
    if (!moved && !G.levelDef?.iceSlide) {
        const snapStr = 3 * (dt / 1000);
        const snapX = Math.round(player.x / ts) * ts;
        const snapY = Math.round(player.y / ts) * ts;
        player.x += (snapX - player.x) * Math.min(1, snapStr);
        player.y += (snapY - player.y) * Math.min(1, snapStr);
    }
}

function tryMovePlayer(player, nx, ny, ts) {
    const hitbox = ts * 0.65;
    const half = hitbox / 2;
    const cx = player.x + ts / 2, cy = player.y + ts / 2;

    const blocked = (px, py) => {
        const corners = [
            [py - half + 2, px - half + 2],
            [py - half + 2, px + half - 2],
            [py + half - 2, px - half + 2],
            [py + half - 2, px + half - 2],
        ];
        for (const [cy, cx] of corners) {
            const r = Math.floor(cy / ts), c = Math.floor(cx / ts);
            const tile = G.grid[r]?.[c];
            if (tile === TILE.WALL) return true;
            if (tile === TILE.SOFT && !player.ghost) return true;
            // Verifica bombas colocadas (não pode passar por cima)
            for (const b of G.bombs) {
                if (b.placedBy === player.id) continue; // Pode sair da bomba própria
                if (b.row === r && b.col === c) return true;
            }
        }
        return false;
    };

    const ncx = nx + ts / 2, ncy = ny + ts / 2;
    let rx = player.x, ry = player.y;
    if (!blocked(ncx, cy)) rx = nx;
    if (!blocked(cx, ncy)) ry = ny;
    return [rx, ry];
}

// ─── BOMB ─────────────────────────────────────────────────────────────────────
function placeBomb(playerId) {
    const p = G.players[playerId];
    if (!p || !p.alive) return;
    if (p.bombCount <= 0) return;

    const ts = G.tileSize;
    const row = Math.round(p.y / ts);
    const col = Math.round(p.x / ts);

    // Evita duas bombas na mesma célula
    if (G.bombs.some(b => b.row === row && b.col === col)) return;
    if (G.grid[row]?.[col] === TILE.WALL || G.grid[row]?.[col] === TILE.SOFT) return;

    p.bombsUsed++;
    G.bombs.push({
        row, col, timer: 3000,
        range: p.flameRange,
        placedBy: playerId,
        animFrame: 0,
    });
}

function explodeBomb(bomb) {
    const ts = G.tileSize;
    const { row, col, range } = bomb;

    // Libera contador do jogador
    const p = G.players[bomb.placedBy];
    if (p) p.bombsUsed = Math.max(0, p.bombsUsed - 1);

    // Centro
    addExplosion(row, col, 'center', 800);
    spawnExplosionParticles(col * ts + ts / 2, row * ts + ts / 2);

    const DIRS = [[-1,0,'v'],[1,0,'v'],[0,-1,'h'],[0,1,'h']];
    for (const [dr, dc, axis] of DIRS) {
        for (let i = 1; i <= range; i++) {
            const r = row + dr * i, c = col + dc * i;
            const tile = G.grid[r]?.[c];
            if (tile === TILE.WALL) break;

            const isEnd = i === range || tile === TILE.SOFT;
            addExplosion(r, c, isEnd ? 'end' : axis, 700);
            spawnExplosionParticles(c * ts + ts / 2, r * ts + ts / 2);

            if (tile === TILE.SOFT) {
                G.grid[r][c] = TILE.FLOOR;
                // Chance de power-up
                if (Math.random() < (G.levelDef?.powerupChance || 0.3)) {
                    spawnPowerup(r, c);
                }
                break;
            }

            // Detona bombas em cadeia
            const chainBomb = G.bombs.find(b => b.row === r && b.col === c);
            if (chainBomb) { chainBomb.timer = 0; }
        }
    }

    // Verifica colisão com entidades
    const expCells = G.explosions.map(e => `${e.row},${e.col}`);
    for (const p of G.players) {
        if (!p.alive || p.invincible > 0) continue;
        const pr = Math.round(p.y / ts), pc = Math.round(p.x / ts);
        if (expCells.includes(`${pr},${pc}`)) damagePlayer(p);
    }
    for (const e of G.enemies) {
        if (!e.alive) continue;
        const er = Math.round(e.y / ts), ec = Math.round(e.x / ts);
        if (expCells.includes(`${er},${ec}`)) killEnemy(e);
    }
    // Boss
    if (G.boss && G.boss.alive) {
        const br = Math.round(G.boss.y / ts), bc = Math.round(G.boss.x / ts);
        const halfS = Math.ceil(G.boss.size / ts / 2);
        for (let dr = -halfS; dr <= halfS; dr++) {
            for (let dc = -halfS; dc <= halfS; dc++) {
                if (expCells.includes(`${br + dr},${bc + dc}`)) {
                    G.boss.takeDamage(1);
                    updateBossHUD();
                    break;
                }
            }
        }
    }
}

function addExplosion(row, col, type, life) {
    // Remove duplicata
    G.explosions = G.explosions.filter(e => !(e.row === row && e.col === col));
    G.explosions.push({ row, col, type, life, maxLife: life });
}

function spawnExplosionParticles(cx, cy) {
    for (let i = 0; i < 8; i++) {
        const angle = (i / 8) * Math.PI * 2 + Math.random() * 0.5;
        const spd = 100 + Math.random() * 150;
        G.particles.push({
            x: cx, y: cy,
            vx: Math.cos(angle) * spd,
            vy: Math.sin(angle) * spd - 100,
            r: 2 + Math.random() * 3,
            color: Math.random() < 0.5 ? '#ff8800' : '#ffff00',
            life: 400 + Math.random() * 300,
            maxLife: 700, alpha: 1,
        });
    }
}

// ─── POWERUPS ────────────────────────────────────────────────────────────────
function spawnPowerup(row, col) {
    const type = randomPowerup(G.rng);
    G.powerups.push({ row, col, type, animFrame: 0, collected: false });
}

function checkPowerupCollision(pu) {
    const ts = G.tileSize;
    for (const p of G.players) {
        if (!p.alive) continue;
        const pr = Math.round(p.y / ts), pc = Math.round(p.x / ts);
        if (pr === pu.row && pc === pu.col) {
            applyPowerup(p, pu.type);
            pu.collected = true;
            showToast(POWERUP_POOL.find(x => x.type === pu.type)?.label || '✨', 'success', 1500);
            spawnCollectParticles(pu.col * ts + ts / 2, pu.row * ts + ts / 2);
        }
    }
}

function applyPowerup(player, type) {
    switch (type) {
        case 'flame':  player.flameRange = Math.min(player.flameRange + 1, 6); break;
        case 'bomb':   player.maxBombs   = Math.min(player.maxBombs + 1, 5);  break;
        case 'speed':  player.speedBoost = 8000; break;
        case 'shield': player.shield = true; break;
        case 'ghost':  player.ghost = true; setTimeout(() => player.ghost = false, 10000); break;
    }
    G.score += 50;
}

function spawnCollectParticles(cx, cy) {
    for (let i = 0; i < 12; i++) {
        const angle = Math.random() * Math.PI * 2;
        const spd = 60 + Math.random() * 100;
        G.particles.push({
            x: cx, y: cy,
            vx: Math.cos(angle) * spd, vy: Math.sin(angle) * spd - 80,
            r: 2 + Math.random() * 2,
            color: '#ffd100',
            life: 500, maxLife: 500, alpha: 1,
        });
    }
}

// ─── DAMAGE / DEATH ──────────────────────────────────────────────────────────
function damagePlayer(player) {
    if (player.invincible > 0) return;
    if (player.shield) { player.shield = false; player.invincible = 1500; return; }
    G.lives[player.id] = Math.max(0, G.lives[player.id] - 1);
    player.invincible = 2000;
    updateHUD();
    if (G.lives[player.id] <= 0) {
        player.alive = false;
        player.deathTimer = 1000;
        spawnExplosionParticles(player.x + G.tileSize / 2, player.y + G.tileSize / 2);
    }
}

function killEnemy(enemy) {
    if (!enemy.alive) return;
    enemy.alive = false;
    enemy.deathTimer = 400;
    const ts = G.tileSize;
    spawnExplosionParticles(enemy.x + ts / 2, enemy.y + ts / 2);
    // Pontuação com combo
    G.comboKills++;
    G.comboTimer = 1500;
    const points = [100, 200, 400, 800, 1600][Math.min(G.comboKills - 1, 4)];
    G.score += points;
    if (G.comboKills >= 2) showToast(`COMBO x${G.comboKills}! +${points}`, 'success', 1200);
    updateHUD();
}

function checkEnemyPlayerCollision(enemy) {
    const ts = G.tileSize;
    for (const p of G.players) {
        if (!p.alive || p.invincible > 0) continue;
        const dx = Math.abs((enemy.x + ts / 2) - (p.x + ts / 2));
        const dy = Math.abs((enemy.y + ts / 2) - (p.y + ts / 2));
        if (dx < ts * 0.7 && dy < ts * 0.7) damagePlayer(p);
    }
}

function checkBossPlayerCollision() {
    for (const p of G.players) {
        if (!p.alive || p.invincible > 0) continue;
        if (G.boss.collidesWithPlayer(p)) damagePlayer(p);
    }
}

function executeBossAttack(attack) {
    const ts = G.tileSize;
    const bRow = Math.round(G.boss.y / ts);
    const bCol = Math.round(G.boss.x / ts);

    if (attack.type === 'throw' || attack.type === 'charge') {
        // Lança bombas em padrão cruz
        const dirs = [[-1,0],[1,0],[0,-1],[0,1]];
        for (const [dr, dc] of dirs) {
            const r = bRow + dr, c = bCol + dc;
            if (G.grid[r]?.[c] !== TILE.WALL && !G.bombs.some(b => b.row === r && b.col === c)) {
                G.bombs.push({ row: r, col: c, timer: 2200, range: attack.range, placedBy: -1, animFrame: 0 });
            }
        }
        if (attack.count > 1) {
            // Segundo ataque: diagonais
            setTimeout(() => {
                const diags = [[-1,-1],[-1,1],[1,-1],[1,1]];
                for (const [dr, dc] of diags) {
                    const r = bRow + dr * 2, c = bCol + dc * 2;
                    if (G.grid[r]?.[c] !== TILE.WALL && !G.bombs.some(b => b.row === r && b.col === c)) {
                        G.bombs.push({ row: r, col: c, timer: 2000, range: attack.range, placedBy: -1, animFrame: 0 });
                    }
                }
            }, 600);
        }
    } else if (attack.type === 'stomp') {
        // Stomp: explosão em área ao redor do boss
        for (let dr = -1; dr <= 1; dr++) {
            for (let dc = -1; dc <= 1; dc++) {
                addExplosion(bRow + dr, bCol + dc, 'center', 600);
            }
        }
        // Dano nos jogadores próximos
        for (const p of G.players) {
            if (!p.alive || p.invincible > 0) continue;
            const pr = Math.round(p.y / ts), pc = Math.round(p.x / ts);
            if (Math.abs(pr - bRow) <= 2 && Math.abs(pc - bCol) <= 2) damagePlayer(p);
        }
    }
}

// ─── LAVA HAZARD ─────────────────────────────────────────────────────────────
function updateLava(dt) {
    if (!G.lavaCells.length) return;
    G.lavaTimer -= dt;
    if (G.lavaTimer <= 0) {
        G.lavaTimer = G.levelDef?.hazards?.[0]?.interval || 4000;
        G.lavaActive = true;
        setTimeout(() => { G.lavaActive = false; }, 800);
        // Dano nos jogadores em células de lava
        const ts = G.tileSize;
        for (const p of G.players) {
            if (!p.alive || p.invincible > 0) continue;
            const pr = Math.round(p.y / ts), pc = Math.round(p.x / ts);
            if (G.lavaCells.some(lc => lc.r === pr && lc.c === pc)) damagePlayer(p);
        }
    }
}

// ─── BACKGROUND PARTICLES ─────────────────────────────────────────────────────
function updateBgParticles(dt) {
    const W = G.canvas.width, H = G.canvas.height;
    for (const p of G.bgParticles) {
        p.x += p.vx * (dt / 1000);
        p.y += p.vy * (dt / 1000);
        if (p.x < 0) p.x = W;
        if (p.x > W) p.x = 0;
        if (p.y < 0) p.y = H;
        if (p.y > H) p.y = 0;
    }
}

// ─── WIN / LOSE ───────────────────────────────────────────────────────────────
function checkWinLose() {
    // Derrota: todos os jogadores mortos
    const allDead = G.players.every(p => !p.alive && p.deathTimer <= 0);
    if (allDead && G.state === 'playing') {
        G.state = 'gameover';
        setTimeout(() => showOverlay('lose'), 600);
        return;
    }

    if (G.state !== 'playing') return;

    // Vitória
    const isWin = G.levelDef.isBoss
        ? (G.boss && !G.boss.alive)
        : G.enemies.length === 0 && G.explosions.length === 0;

    if (isWin) {
        G.state = 'win';
        G.score += 1000; // Bônus de fase

        // Desbloqueia próxima fase
        const save = Save.load();
        const nextLevel = G.levelIndex + 2; // +1 porque index, +1 próxima
        if (nextLevel > save.unlocked) {
            save.unlocked = nextLevel;
        }
        save.scores = save.scores || {};
        save.scores[G.levelIndex] = Math.max(save.scores[G.levelIndex] || 0, G.score);
        Save.save(save);

        setTimeout(() => showOverlay('win'), 800);
    }
}

// ─── HUD ─────────────────────────────────────────────────────────────────────
function updateHUD() {
    const livesEl = document.getElementById('hud-lives');
    const scoreEl = document.getElementById('hud-score');
    const phaseEl = document.getElementById('hud-phase');
    if (livesEl) {
        const hearts1 = '❤️'.repeat(Math.max(0, G.lives[0])) + '🖤'.repeat(Math.max(0, 3 - G.lives[0]));
        const hearts2 = G.isMultiplayer ? ' | 💙'.repeat(Math.max(0, G.lives[1])) + '🖤'.repeat(Math.max(0, 3 - G.lives[1])) : '';
        livesEl.textContent = hearts1 + hearts2;
    }
    if (scoreEl) scoreEl.textContent = G.score.toString().padStart(6, '0');
    if (phaseEl) phaseEl.textContent = `FASE ${G.levelIndex + 1}`;
}

function updateBossHUD() {
    if (!G.boss) return;
    const fill = document.getElementById('boss-hp-fill');
    if (fill) fill.style.width = (G.boss.hpRatio * 100) + '%';
}

// ─── OVERLAY ─────────────────────────────────────────────────────────────────
function showOverlay(type) {
    const overlay = document.getElementById('game-overlay');
    const title = document.getElementById('overlay-title');
    const sub = document.getElementById('overlay-sub');
    const scoreEl = document.getElementById('overlay-score');
    const btnMain = document.getElementById('overlay-btn-main');
    const btnMenu = document.getElementById('overlay-btn-menu');

    overlay.classList.add('visible');
    scoreEl.textContent = `Pontuação: ${G.score.toString().padStart(6, '0')}`;

    if (type === 'win') {
        title.className = 'overlay-title win';
        title.textContent = G.levelDef.isBoss ? '🏆 CHEFÃO DERROTADO!' : '✨ FASE CONCLUÍDA!';
        sub.textContent = G.levelIndex + 1 < LEVELS.length ? 'Próxima fase desbloqueada!' : '🎉 Você zerou o jogo!';
        btnMain.textContent = G.levelIndex + 1 < LEVELS.length ? 'Próxima Fase →' : 'Menu Principal';
        btnMain.onclick = () => {
            hideOverlay();
            if (G.levelIndex + 1 < LEVELS.length) startLevel(G.levelIndex + 1);
            else { setupPhaseGrid(); Screens.show('screen-phases'); }
        };
    } else if (type === 'lose') {
        title.className = 'overlay-title lose';
        title.textContent = '💀 GAME OVER';
        sub.textContent = 'Você foi eliminado pelas bombas...';
        btnMain.textContent = 'Tentar Novamente';
        btnMain.onclick = () => { hideOverlay(); startLevel(G.levelIndex); };
    } else if (type === 'pause') {
        title.className = 'overlay-title pause';
        title.textContent = '⏸ PAUSADO';
        sub.textContent = 'ESC para continuar';
        scoreEl.textContent = '';
        btnMain.textContent = 'Continuar';
        btnMain.onclick = () => { hideOverlay(); G.state = 'playing'; };
    }

    btnMenu.onclick = () => {
        hideOverlay();
        G.state = 'idle';
        setupPhaseGrid();
        Screens.show('screen-phases');
    };
}

function hideOverlay() {
    document.getElementById('game-overlay')?.classList.remove('visible');
}

// ─── RENDER ──────────────────────────────────────────────────────────────────
function render() {
    const ctx = G.ctx;
    const W = G.canvas.width, H = G.canvas.height;
    const ts = G.tileSize;
    const lvl = G.levelDef;

    // Fundo
    ctx.fillStyle = lvl?.bgColor || '#0a0a0a';
    ctx.fillRect(0, 0, W, H);

    // Partículas de fundo (atmosfera)
    for (const p of G.bgParticles) {
        ctx.globalAlpha = p.alpha;
        ctx.fillStyle = p.color;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;

    if (!G.grid.length) return;

    // Calcula offset para centralizar
    const gridW = G.cols * ts, gridH = G.rows * ts;
    const offX = Math.floor((W - gridW) / 2);
    const offY = Math.floor((H - gridH) / 2);

    ctx.save();
    ctx.translate(offX, offY);

    // ── Grid de tiles ──
    for (let r = 0; r < G.rows; r++) {
        for (let c = 0; c < G.cols; c++) {
            const tile = G.grid[r][c];
            const x = c * ts, y = r * ts;
            const baseType = tile === TILE.WALL ? 1 : (tile === TILE.SOFT ? 2 : 0);
            SpriteManager.drawTile(ctx, baseType, x, y, ts, lvl?.theme || 'forest');

            // Lava
            if (G.lavaActive && G.lavaCells?.some(lc => lc.r === r && lc.c === c)) {
                ctx.globalAlpha = 0.7 + Math.sin(G.animFrame * 0.3) * 0.2;
                ctx.fillStyle = '#ff4400';
                ctx.fillRect(x, y, ts, ts);
                ctx.globalAlpha = 1;
            }
        }
    }

    // ── Power-ups ──
    for (const pu of G.powerups) {
        SpriteManager.drawPowerup(ctx, pu.row * ts, pu.col * ts, ts, pu.type);
    }

    // ── Bombas ──
    for (const b of G.bombs) {
        b.animFrame = (b.animFrame || 0) + 0.1;
        // Pisca rápido nos últimos 1.5s
        if (b.timer < 1500 && Math.floor(b.animFrame * (b.timer < 600 ? 4 : 2)) % 2 === 0) continue;
        SpriteManager.drawBomb(ctx, b.col * ts, b.row * ts, ts, b.animFrame);
    }

    // ── Explosões ──
    for (const ex of G.explosions) {
        const progress = 1 - ex.life / ex.maxLife;
        const isCenter = ex.type === 'center';
        const isEnd = ex.type === 'end';
        const dir = ex.type === 'h' ? 'h' : 'v';
        SpriteManager.drawExplosion(ctx, ex.col * ts, ex.row * ts, ts, dir, isCenter, isEnd, progress);
    }

    // ── Inimigos ──
    for (const e of G.enemies) {
        if (e.deathTimer > 0 && !e.alive) {
            // Efeito morte: flash branco
            ctx.globalAlpha = e.deathTimer / 400;
            ctx.fillStyle = '#ffffff';
            ctx.beginPath(); ctx.arc(e.x + ts / 2, e.y + ts / 2, ts * 0.4, 0, Math.PI * 2); ctx.fill();
            ctx.globalAlpha = 1;
            continue;
        }
        SpriteManager.drawEnemy(ctx, e.x, e.y, ts, e.type, e.animFrame);
    }

    // ── Boss ──
    if (G.boss) {
        const bossSize = G.boss.size;
        if (G.boss.alive) {
            // Flash de dano
            if (G.boss.justHit > 0) {
                ctx.globalAlpha = 0.5;
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(G.boss.x, G.boss.y, bossSize, bossSize);
                ctx.globalAlpha = 1;
            }
            SpriteManager.drawBoss(ctx, G.boss.x, G.boss.y, bossSize, G.boss.state, G.boss.animFrame, G.boss.hpRatio);
        } else if (G.boss.deathTimer > 0) {
            // Animação de morte do boss
            const dProgress = 1 - G.boss.deathTimer / 2000;
            ctx.globalAlpha = 1 - dProgress;
            SpriteManager.drawBoss(ctx, G.boss.x, G.boss.y, bossSize, 'death', G.boss.animFrame, 0);
            ctx.globalAlpha = 1;
            // Explosões aleatórias na morte
            if (Math.random() < 0.15) {
                const rx = G.boss.x + Math.random() * bossSize;
                const ry = G.boss.y + Math.random() * bossSize;
                spawnExplosionParticles(rx, ry);
            }
            G.boss.deathTimer -= 16;
        }
    }

    // ── Jogadores ──
    for (const p of G.players) {
        if (!p.alive && p.deathTimer <= 0) continue;
        if (!p.alive) {
            ctx.globalAlpha = p.deathTimer / 1000;
        } else if (p.invincible > 0) {
            ctx.globalAlpha = Math.sin(G.animFrame * 0.8) > 0 ? 1 : 0.3;
        }
        // Escudo visual
        if (p.shield) {
            ctx.strokeStyle = 'rgba(100,200,255,0.6)';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(p.x + ts / 2, p.y + ts / 2, ts * 0.65, 0, Math.PI * 2);
            ctx.stroke();
        }
        // Ghost visual
        if (p.ghost) ctx.globalAlpha = Math.min(ctx.globalAlpha, 0.6);

        SpriteManager.drawPlayer(ctx, p.x, p.y, ts, p.dir, p.animFrame, p.isP2);
        ctx.globalAlpha = 1;

        // Indicador P2
        if (p.isP2) {
            ctx.fillStyle = '#4488ff';
            ctx.font = `${Math.floor(ts * 0.25)}px 'Share Tech Mono'`;
            ctx.textAlign = 'center';
            ctx.fillText('P2', p.x + ts / 2, p.y - 4);
            ctx.textAlign = 'left';
        }
    }

    // ── Partículas ──
    for (const part of G.particles) {
        ctx.globalAlpha = part.alpha;
        ctx.fillStyle = part.color;
        ctx.beginPath(); ctx.arc(part.x, part.y, part.r, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;

    ctx.restore(); // /translate

    // ── INTRO OVERLAY ──
    if (G.showIntro) {
        const alpha = Math.min(1, G.introTimer / 400) * Math.min(1, (G.introTimer - 400) / 400 + 1);
        ctx.globalAlpha = Math.max(0, Math.min(1, G.introTimer / 2000 * 2));
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.fillRect(0, 0, W, H);
        ctx.globalAlpha = 1;
        const lines = G.introText.split('\n');
        ctx.textAlign = 'center';
        lines.forEach((line, i) => {
            if (i === 0) {
                ctx.font = `bold ${Math.floor(W * 0.055)}px 'Press Start 2P', monospace`;
                ctx.fillStyle = G.levelDef?.isBoss ? '#ff4444' : '#ffd100';
            } else {
                ctx.font = `${Math.floor(W * 0.035)}px 'Share Tech Mono', monospace`;
                ctx.fillStyle = '#cccccc';
            }
            ctx.fillText(line, W / 2, H / 2 - 20 + i * 30);
        });
        ctx.textAlign = 'left';
    }
}

// ─── RESIZE ──────────────────────────────────────────────────────────────────
function resizeCanvas() {
    const board = document.getElementById('game-board');
    if (!board || !G.canvas) return;
    const size = board.clientWidth;
    G.canvas.width = size;
    G.canvas.height = size;
    if (G.rows && G.cols) {
        G.tileSize = Math.floor(size / Math.max(G.rows, G.cols));
        // Reposiciona entidades
        if (G.players) {
            for (const p of G.players) {
                p.tileSize = G.tileSize;
            }
        }
    }
}

// ─── KEYBOARD ────────────────────────────────────────────────────────────────
const sharedKeys = {};
function setupKeyboard() {
    document.addEventListener('keydown', e => {
        sharedKeys[e.key] = true;
        for (const p of G.players) p.keys[e.key] = true;

        if (e.key === ' ' && G.state === 'playing') { e.preventDefault(); placeBomb(0); }
        if (e.key === 'Enter' && G.state === 'playing' && G.isMultiplayer) { e.preventDefault(); placeBomb(1); }
        if (e.key === 'Escape') {
            if (G.state === 'playing') { G.state = 'paused'; showOverlay('pause'); }
            else if (G.state === 'paused') { hideOverlay(); G.state = 'playing'; }
        }
    });
    document.addEventListener('keyup', e => {
        sharedKeys[e.key] = false;
        for (const p of G.players) p.keys[e.key] = false;
    });
    document.getElementById('btn-pause').onclick = () => {
        if (G.state === 'playing') { G.state = 'paused'; showOverlay('pause'); }
        else if (G.state === 'paused') { hideOverlay(); G.state = 'playing'; }
    };
}

// ─── MOBILE CONTROLS ─────────────────────────────────────────────────────────
function setupMobileControls() {
    const makeDpad = (prefix, playerId) => {
        const dirs = { up:'ArrowUp', down:'ArrowDown', left:'ArrowLeft', right:'ArrowRight' };
        for (const [name, key] of Object.entries(dirs)) {
            const btn = document.getElementById(`${prefix}${name}`);
            if (!btn) continue;
            btn.addEventListener('touchstart', e => { e.preventDefault(); if (G.players[playerId]) G.players[playerId].keys[key] = true; btn.classList.add('pressed'); }, { passive: false });
            btn.addEventListener('touchend',   e => { e.preventDefault(); if (G.players[playerId]) G.players[playerId].keys[key] = false; btn.classList.remove('pressed'); }, { passive: false });
        }
    };
    makeDpad('btn-', 0);
    makeDpad('btn2-', 1);

    const bombBtn = document.getElementById('bomb-btn');
    if (bombBtn) {
        bombBtn.addEventListener('touchstart', e => { e.preventDefault(); placeBomb(0); }, { passive: false });
    }
    const bombBtn2 = document.getElementById('bomb-btn2');
    if (bombBtn2) {
        bombBtn2.addEventListener('touchstart', e => { e.preventDefault(); placeBomb(1); }, { passive: false });
    }
}

// ─── GAME BUTTONS ─────────────────────────────────────────────────────────────
function setupGameButtons() {
    // noop — botões configurados inline ou em showOverlay
}

// ─── HELP MODAL ──────────────────────────────────────────────────────────────
function showHelpModal() {
    document.getElementById('modal-help')?.classList.remove('hidden');
}
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('modal-close-btn')?.addEventListener('click', () => {
        document.getElementById('modal-help')?.classList.add('hidden');
    });
    document.getElementById('modal-help')?.addEventListener('click', e => {
        if (e.target === e.currentTarget) e.currentTarget.classList.add('hidden');
    });
});

// ─── RESIZE OBSERVER ─────────────────────────────────────────────────────────
window.addEventListener('resize', () => resizeCanvas());

// ─── START ────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', init);
