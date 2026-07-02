// ═══════════════════════════════════════════════════════════════════════════════
// LEVELS.JS — Definição das 5 Fases + 1 Chefão
// ═══════════════════════════════════════════════════════════════════════════════

// ─── Constantes de tiles ────────────────────────────────────────────────────
// 0 = chão   1 = parede sólida   2 = bloco destrutível   3 = spawn p1   4 = spawn p2

const TILE = { FLOOR:0, WALL:1, SOFT:2, SPAWN1:3, SPAWN2:4, SPAWN_E:5 };

// ─── Gerador de mapa aleatório ───────────────────────────────────────────────
function generateMap(rows, cols, softDensity, pattern, theme) {
    // Garante sempre bordas sólidas + padrão de paredes internas em grade
    const grid = [];
    for (let r = 0; r < rows; r++) {
        grid[r] = [];
        for (let c = 0; c < cols; c++) {
            if (r === 0 || r === rows - 1 || c === 0 || c === cols - 1) {
                grid[r][c] = TILE.WALL;
            } else if (r % 2 === 0 && c % 2 === 0) {
                grid[r][c] = TILE.WALL;
            } else {
                grid[r][c] = TILE.FLOOR;
            }
        }
    }

    // Safe zones para spawns (cantos livres de blocos destrutíveis)
    const safeCells = new Set([
        '1,1','1,2','2,1', // P1 canto superior esquerdo
        `1,${cols-2}`,`1,${cols-3}`,`2,${cols-2}`, // P2 canto superior direito
        `${rows-2},1`,`${rows-2},2`,`${rows-3},1`, // canto inferior esquerdo
        `${rows-2},${cols-2}`,`${rows-2},${cols-3}`,`${rows-3},${cols-2}`, // canto inferior direito
    ]);

    // Spawns fixos dos inimigos (marcados no mapa base e removidos depois)
    const enemySpawns = pattern.enemies.map(e => `${e.row},${e.col}`);

    // Coloca blocos destrutíveis aleatoriamente
    const rand = seededRandom(pattern.seed || 42);
    for (let r = 1; r < rows - 1; r++) {
        for (let c = 1; c < cols - 1; c++) {
            if (grid[r][c] === TILE.FLOOR && !safeCells.has(`${r},${c}`) && !enemySpawns.includes(`${r},${c}`)) {
                if (rand() < softDensity) {
                    grid[r][c] = TILE.SOFT;
                }
            }
        }
    }

    // Marca spawns
    grid[1][1] = TILE.SPAWN1;
    grid[1][cols - 2] = TILE.SPAWN2;

    return grid;
}

// LCG pseudo-random para seeds reproduzíveis
function seededRandom(seed) {
    let s = seed;
    return function() {
        s = (s * 1664525 + 1013904223) & 0xffffffff;
        return (s >>> 0) / 0xffffffff;
    };
}

// ─── DEFINIÇÃO DAS FASES ─────────────────────────────────────────────────────
const LEVELS = [
    // ── FASE 1: FLORESTA ──────────────────────────────────────────────────
    {
        id: 1,
        name: 'Floresta',
        icon: '🌲',
        theme: 'forest',
        rows: 13, cols: 13,
        softDensity: 0.55,
        timeLimit: 180,
        bgColor: '#0a1a04',
        ambientColor: 'rgba(50,120,20,0.03)',
        pattern: {
            seed: 1001,
            enemies: [
                { row:1, col:11, type:'balloom', count:1 },
                { row:11, col:1, type:'balloom', count:1 },
                { row:11, col:11, type:'balloom', count:1 },
                { row:5, col:6, type:'balloom', count:1 },
                { row:7, col:6, type:'balloom', count:1 },
            ],
        },
        powerupChance: 0.3,
        music: 'forest',
        intro: '🌲 Floresta Sombria\nDerrote todos os inimigos!',
    },

    // ── FASE 2: VULCÃO ────────────────────────────────────────────────────
    {
        id: 2,
        name: 'Vulcão',
        icon: '🌋',
        theme: 'volcano',
        rows: 13, cols: 13,
        softDensity: 0.5,
        timeLimit: 160,
        bgColor: '#1a0500',
        ambientColor: 'rgba(200,80,0,0.04)',
        pattern: {
            seed: 2002,
            enemies: [
                { row:1, col:11, type:'balloom', count:1 },
                { row:11, col:1, type:'dahl',    count:1 },
                { row:11, col:11, type:'dahl',   count:1 },
                { row:5, col:6, type:'balloom',  count:1 },
                { row:3, col:5, type:'dahl',     count:1 },
                { row:9, col:7, type:'dahl',     count:1 },
            ],
        },
        // Células de lava que dão dano periodicamente
        hazards: [
            { type:'lava', cells: [{r:5,c:5},{r:5,c:7},{r:7,c:5},{r:7,c:7}], interval:4000 },
        ],
        powerupChance: 0.35,
        music: 'volcano',
        intro: '🌋 Vulcão Ativo\nCuidado com a lava!',
    },

    // ── FASE 3: GELO ──────────────────────────────────────────────────────
    {
        id: 3,
        name: 'Gelo',
        icon: '🧊',
        theme: 'ice',
        rows: 13, cols: 13,
        softDensity: 0.48,
        timeLimit: 150,
        bgColor: '#020d1a',
        ambientColor: 'rgba(100,180,255,0.04)',
        pattern: {
            seed: 3003,
            enemies: [
                { row:1, col:11, type:'dahl',   count:1 },
                { row:11, col:1, type:'dahl',   count:1 },
                { row:11, col:11, type:'onil',  count:1 },
                { row:5, col:6, type:'onil',    count:1 },
                { row:3, col:9, type:'balloom', count:1 },
                { row:9, col:3, type:'dahl',    count:1 },
                { row:6, col:10, type:'onil',   count:1 },
            ],
        },
        // Piso de gelo: jogador desliza (inércia extra)
        iceSlide: true,
        powerupChance: 0.4,
        music: 'ice',
        intro: '🧊 Tundra Congelada\nO chão escorrega!',
    },

    // ── FASE 4: CIDADE ────────────────────────────────────────────────────
    {
        id: 4,
        name: 'Cidade',
        icon: '🏙️',
        theme: 'city',
        rows: 13, cols: 13,
        softDensity: 0.45,
        timeLimit: 140,
        bgColor: '#080808',
        ambientColor: 'rgba(100,100,200,0.03)',
        pattern: {
            seed: 4004,
            enemies: [
                { row:1, col:11, type:'dahl',    count:1 },
                { row:11, col:1, type:'onil',    count:1 },
                { row:11, col:11, type:'dahl',   count:1 },
                { row:5, col:6, type:'onil',     count:1 },
                { row:3, col:9, type:'dahl',     count:1 },
                { row:9, col:3, type:'onil',     count:1 },
                { row:6, col:5, type:'balloom',  count:1 },
                { row:7, col:8, type:'dahl',     count:1 },
            ],
        },
        // Inimigos com pathfinding ativo (perseguem o jogador)
        smartEnemies: true,
        powerupChance: 0.38,
        music: 'city',
        intro: '🏙️ Metrópole\nOs inimigos são mais espertos aqui!',
    },

    // ── FASE 5: CHEFÃO — WARLORD ──────────────────────────────────────────
    {
        id: 5,
        name: 'Warlord',
        icon: '☠️',
        theme: 'boss',
        isBoss: true,
        rows: 13, cols: 13,
        softDensity: 0.3,
        timeLimit: 300,
        bgColor: '#0d0000',
        ambientColor: 'rgba(200,0,0,0.05)',
        pattern: {
            seed: 5005,
            enemies: [], // Sem inimigos normais — só o boss
        },
        boss: {
            type: 'warlord',
            name: '⚔️ WARLORD',
            maxHp: 20,
            size: 64, // tamanho em pixels (2×tile)
            spawnRow: 6, spawnCol: 8,
            // Fases de raiva (muda comportamento ao perder HP)
            phases: [
                { hpThreshold: 1.0, speed: 0.8, bombInterval: 4000, bombRange: 2, movePattern:'patrol' },
                { hpThreshold: 0.6, speed: 1.2, bombInterval: 3000, bombRange: 3, movePattern:'chase',   rageColor:'#ff6600' },
                { hpThreshold: 0.3, speed: 1.8, bombInterval: 1800, bombRange: 4, movePattern:'berserk', rageColor:'#ff0000' },
            ],
            attacks: ['stomp', 'throw', 'charge'],
        },
        powerupChance: 0.5, // Mais drops no boss
        music: 'boss',
        intro: '☠️ CHEFÃO: WARLORD\nO guerreiro das bombas!\nBoa sorte...',
    },
];

// ─── Helper: gera grid completo de uma fase ─────────────────────────────────
function buildLevelGrid(levelIndex) {
    const lvl = LEVELS[levelIndex];
    const grid = generateMap(lvl.rows, lvl.cols, lvl.softDensity, lvl.pattern, lvl.theme);

    // Limpa posições de spawn de inimigos (garante chão)
    for (const e of lvl.pattern.enemies) {
        if (grid[e.row] && grid[e.row][e.col] !== TILE.WALL) {
            grid[e.row][e.col] = TILE.FLOOR;
        }
    }

    return grid;
}

// ─── Power-up types com pesos ────────────────────────────────────────────────
const POWERUP_POOL = [
    { type:'flame',  weight:30, label:'🔥 +Alcance' },
    { type:'bomb',   weight:25, label:'💣 +Bomba' },
    { type:'speed',  weight:20, label:'⚡ +Velocidade' },
    { type:'shield', weight:15, label:'🛡️ Escudo' },
    { type:'ghost',  weight:10, label:'👻 Fantasma' },
];

function randomPowerup(rng) {
    const totalWeight = POWERUP_POOL.reduce((s, p) => s + p.weight, 0);
    let r = (rng ? rng() : Math.random()) * totalWeight;
    for (const p of POWERUP_POOL) {
        r -= p.weight;
        if (r <= 0) return p.type;
    }
    return 'flame';
}
