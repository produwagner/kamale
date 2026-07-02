// ═══════════════════════════════════════════════════════════════════════════════
// AI.JS — Inteligência Artificial dos Inimigos e Chefão
// ═══════════════════════════════════════════════════════════════════════════════

// ─── BFS PATHFINDING ─────────────────────────────────────────────────────────
function bfsPath(grid, fromR, fromC, toR, toC, canPassSoft = false) {
    const rows = grid.length, cols = grid[0].length;
    const visited = Array.from({ length: rows }, () => new Array(cols).fill(false));
    const prev = Array.from({ length: rows }, () => new Array(cols).fill(null));
    const queue = [{ r: fromR, c: fromC }];
    visited[fromR][fromC] = true;

    const isWalkable = (r, c) => {
        if (r < 0 || r >= rows || c < 0 || c >= cols) return false;
        const t = grid[r][c];
        if (t === TILE.WALL) return false;
        if (t === TILE.SOFT && !canPassSoft) return false;
        return true;
    };

    const DIRS = [[-1,0],[1,0],[0,-1],[0,1]];
    while (queue.length > 0) {
        const { r, c } = queue.shift();
        if (r === toR && c === toC) {
            // Reconstrói caminho
            const path = [];
            let cur = { r, c };
            while (prev[cur.r][cur.c]) {
                path.unshift(cur);
                cur = prev[cur.r][cur.c];
            }
            return path;
        }
        for (const [dr, dc] of DIRS) {
            const nr = r + dr, nc = c + dc;
            if (!visited[nr]?.[nc] && isWalkable(nr, nc)) {
                visited[nr][nc] = true;
                prev[nr][nc] = { r, c };
                queue.push({ r: nr, c: nc });
            }
        }
    }
    return []; // Sem caminho
}

// ─── DANGER MAP (calcula quais células estão em perigo de explosão) ──────────
function buildDangerMap(grid, bombs) {
    const rows = grid.length, cols = grid[0].length;
    const danger = Array.from({ length: rows }, () => new Array(cols).fill(0));
    const DIRS = [[-1,0],[1,0],[0,-1],[0,1]];

    for (const bomb of bombs) {
        const { row, col, range, timer } = bomb;
        const urgency = 1 - (timer / 3000); // Quanto mais próximo explodir, mais urgente
        danger[row][col] = Math.max(danger[row][col], urgency + 0.5);
        for (const [dr, dc] of DIRS) {
            for (let i = 1; i <= range; i++) {
                const nr = row + dr * i, nc = col + dc * i;
                if (!grid[nr]?.[nc] || grid[nr][nc] === TILE.WALL) break;
                danger[nr][nc] = Math.max(danger[nr][nc], urgency);
                if (grid[nr][nc] === TILE.SOFT) break;
            }
        }
    }
    return danger;
}

// ─── IA DE INIMIGOS ──────────────────────────────────────────────────────────

class EnemyAI {
    constructor(type, smart = false) {
        this.type = type;
        this.smart = smart;
        this.dir = ['up','down','left','right'][Math.floor(Math.random() * 4)];
        this.moveTimer = 0;
        this.pathTimer = 0;
        this.path = [];
        this.stuckTimer = 0;
        this.lastPos = null;
    }

    // Retorna próxima direção para o inimigo
    update(enemy, grid, players, bombs, dt) {
        const SPEEDS = { balloom: 180, dahl: 260, onil: 140 };
        const speed = SPEEDS[this.type] || 180;
        const dangerMap = bombs.length > 0 ? buildDangerMap(grid, bombs) : null;

        this.moveTimer -= dt;
        this.pathTimer -= dt;

        const row = Math.round(enemy.y / enemy.tileSize);
        const col = Math.round(enemy.x / enemy.tileSize);

        // ── Modo SMART: BFS em direção ao jogador ──────────────────────────
        if (this.smart && this.pathTimer <= 0) {
            this.pathTimer = 600 + Math.random() * 400;
            // Encontra jogador mais próximo
            let best = null, bestDist = Infinity;
            for (const p of players) {
                if (!p.alive) continue;
                const pr = Math.round(p.y / enemy.tileSize);
                const pc = Math.round(p.x / enemy.tileSize);
                const dist = Math.abs(pr - row) + Math.abs(pc - col);
                if (dist < bestDist) { bestDist = dist; best = { r: pr, c: pc }; }
            }
            if (best && bestDist > 1) {
                const canPass = this.type === 'onil';
                this.path = bfsPath(grid, row, col, best.r, best.c, canPass);
            }
        }

        // ── Fuga de bombas ─────────────────────────────────────────────────
        if (dangerMap && dangerMap[row]?.[col] > 0.3) {
            const safeDirs = this._getSafeDirs(grid, row, col, dangerMap);
            if (safeDirs.length > 0) {
                this.dir = safeDirs[Math.floor(Math.random() * safeDirs.length)];
                this.path = [];
            }
        }

        // ── Segue path BFS ─────────────────────────────────────────────────
        if (this.path.length > 0 && this.moveTimer <= 0) {
            const next = this.path[0];
            if (next.r < row) this.dir = 'up';
            else if (next.r > row) this.dir = 'down';
            else if (next.c < col) this.dir = 'left';
            else this.dir = 'right';
        }

        // ── Movimento ─────────────────────────────────────────────────────
        const moved = this._tryMove(enemy, grid, speed, dt);
        if (!moved) {
            // Bateu na parede — muda direção aleatoriamente
            this._randomDir(grid, row, col);
            this.path = [];
        } else if (this.path.length > 0) {
            const next = this.path[0];
            const curR = Math.round(enemy.y / enemy.tileSize);
            const curC = Math.round(enemy.x / enemy.tileSize);
            if (curR === next.r && curC === next.c) this.path.shift();
        }

        // Atualiza animFrame
        enemy.animFrame += dt * 0.008;

        return this.dir;
    }

    _tryMove(enemy, grid, speed, dt) {
        const ts = enemy.tileSize;
        const hitbox = ts * 0.7;
        const half = hitbox / 2;
        const DIRS_MAP = { up:[-1,0], down:[1,0], left:[0,-1], right:[0,1] };
        const [dr, dc] = DIRS_MAP[this.dir];
        const nx = enemy.x + dc * speed * (dt / 1000);
        const ny = enemy.y + dr * speed * (dt / 1000);

        // Verifica colisão
        const isBlocked = (px, py) => {
            const corners = [
                [py - half + 2, px - half + 2],
                [py - half + 2, px + half - 2],
                [py + half - 2, px - half + 2],
                [py + half - 2, px + half - 2],
            ];
            for (const [cy, cx] of corners) {
                const r = Math.floor(cy / ts);
                const c = Math.floor(cx / ts);
                const tile = grid[r]?.[c];
                if (tile === TILE.WALL || tile === TILE.SOFT) return true;
                // Fantasmas passam por blocos destrutíveis
                if (this.type === 'onil' && tile === TILE.WALL) return true;
                if (this.type === 'onil') continue;
                if (tile === TILE.SOFT) return true;
            }
            return false;
        };

        if (!isBlocked(nx, ny)) {
            enemy.x = nx;
            enemy.y = ny;
            return true;
        }
        return false;
    }

    _getSafeDirs(grid, row, col, dangerMap) {
        const DIRS = { up:[-1,0], down:[1,0], left:[0,-1], right:[0,1] };
        const safe = [];
        for (const [d, [dr, dc]] of Object.entries(DIRS)) {
            const nr = row + dr, nc = col + dc;
            const t = grid[nr]?.[nc];
            if (t === TILE.WALL || t === TILE.SOFT) continue;
            if (!dangerMap[nr]?.[nc] || dangerMap[nr][nc] < 0.3) safe.push(d);
        }
        return safe;
    }

    _randomDir(grid, row, col) {
        const options = [];
        const DIRS = { up:[-1,0], down:[1,0], left:[0,-1], right:[0,1] };
        for (const [d, [dr, dc]] of Object.entries(DIRS)) {
            const nr = row + dr, nc = col + dc;
            const t = grid[nr]?.[nc];
            if (t === TILE.WALL || t === TILE.SOFT) continue;
            if (this.type !== 'onil' && t === TILE.SOFT) continue;
            options.push(d);
        }
        if (options.length > 0) {
            this.dir = options[Math.floor(Math.random() * options.length)];
        }
    }
}

// ─── IA DO CHEFÃO ────────────────────────────────────────────────────────────

class BossAI {
    constructor(config) {
        this.config = config;
        this.hp = config.maxHp;
        this.maxHp = config.maxHp;
        this.state = 'idle'; // idle, patrol, chase, berserk, attack, dying
        this.stateTimer = 0;
        this.attackTimer = 0;
        this.moveTimer = 0;
        this.patrolDir = 'right';
        this.patrolTimer = 0;
        this.currentPhase = 0;
        this.animFrame = 0;
        this.justHit = 0;
        this.deathTimer = 0;
        this.alive = true;
        this.pendingAttack = null;

        // Posição (em pixels)
        this.x = 0;
        this.y = 0;
        this.tileSize = 32;
        this.size = config.size || 64;
    }

    getPhase() {
        const hpRatio = this.hp / this.maxHp;
        for (let i = this.config.phases.length - 1; i >= 0; i--) {
            if (hpRatio <= this.config.phases[i].hpThreshold) {
                return this.config.phases[i];
            }
        }
        return this.config.phases[0];
    }

    get hpRatio() { return this.hp / this.maxHp; }

    takeDamage(amount = 1) {
        if (!this.alive || this.state === 'dying') return;
        this.hp = Math.max(0, this.hp - amount);
        this.justHit = 300; // ms de flash de dano
        if (this.hp <= 0) {
            this.state = 'dying';
            this.deathTimer = 2000;
        }
    }

    update(grid, players, bombs, dt) {
        if (!this.alive) return null;
        this.animFrame += dt * 0.005;
        this.justHit = Math.max(0, this.justHit - dt);

        if (this.state === 'dying') {
            this.deathTimer -= dt;
            if (this.deathTimer <= 0) this.alive = false;
            return null;
        }

        const phase = this.getPhase();

        // Verifica transição de fase
        const newPhase = this.config.phases.findLastIndex(p => this.hpRatio <= p.hpThreshold);
        if (newPhase > this.currentPhase) {
            this.currentPhase = newPhase;
            this.state = 'rage'; // Animação de raiva ao mudar de fase
            this.stateTimer = 1200;
        }

        if (this.state === 'rage') {
            this.stateTimer -= dt;
            if (this.stateTimer <= 0) this.state = phase.movePattern;
            return null; // Não planta bombas durante transição
        }

        // Movimentação
        this._updateMovement(grid, players, phase, dt);

        // Ataque
        this.attackTimer -= dt;
        if (this.attackTimer <= 0) {
            this.attackTimer = phase.bombInterval + (Math.random() * 600 - 300);
            return this._chooseAttack(phase);
        }

        return null;
    }

    _updateMovement(grid, players, phase, dt) {
        const speed = (phase.speed || 1) * 80;
        const ts = this.tileSize;

        if (phase.movePattern === 'patrol') {
            // Patrulha horizontal
            this.patrolTimer -= dt;
            if (this.patrolTimer <= 0) {
                this.patrolTimer = 1500 + Math.random() * 1000;
                this.patrolDir = Math.random() < 0.5 ? 'left' : 'right';
            }
            const dc = this.patrolDir === 'right' ? 1 : -1;
            const nx = this.x + dc * speed * (dt / 1000);
            const col = Math.floor(nx / ts);
            const row = Math.floor(this.y / ts);
            if (grid[row]?.[col] !== TILE.WALL && grid[row]?.[col] !== undefined) {
                this.x = nx;
            } else {
                this.patrolDir = this.patrolDir === 'right' ? 'left' : 'right';
            }

        } else if (phase.movePattern === 'chase' || phase.movePattern === 'berserk') {
            // Persegue jogador mais próximo
            let target = null, bestDist = Infinity;
            for (const p of players) {
                if (!p.alive) continue;
                const d = Math.hypot(p.x - this.x, p.y - this.y);
                if (d < bestDist) { bestDist = d; target = p; }
            }
            if (target) {
                const dx = target.x - this.x, dy = target.y - this.y;
                const len = Math.hypot(dx, dy) || 1;
                const nx = this.x + (dx / len) * speed * (dt / 1000);
                const ny = this.y + (dy / len) * speed * (dt / 1000);
                const col = Math.floor(nx / ts), row = Math.floor(ny / ts);
                // Chefão ignora blocos destrutíveis (destrói ao passar)
                if (grid[row]?.[col] !== TILE.WALL) { this.x = nx; this.y = ny; }
            }
        }

        // Limita ao grid
        const maxX = (grid[0].length - 2) * ts;
        const maxY = (grid.length - 2) * ts;
        this.x = Math.max(ts, Math.min(maxX, this.x));
        this.y = Math.max(ts, Math.min(maxY, this.y));
    }

    _chooseAttack(phase) {
        const attacks = this.config.attacks || ['throw'];
        // Em modo berserk, usa stomp + throw em sequência
        if (phase.movePattern === 'berserk') {
            return { type: attacks[Math.floor(Math.random() * attacks.length)], range: phase.bombRange, count: 2 };
        }
        return { type: attacks[Math.floor(Math.random() * attacks.length)], range: phase.bombRange, count: 1 };
    }

    // Colisão AABB com jogador
    collidesWithPlayer(player) {
        const half = this.size * 0.4;
        const pHalf = player.tileSize * 0.35;
        return (
            Math.abs((this.x + this.size / 2) - (player.x + player.tileSize / 2)) < half + pHalf &&
            Math.abs((this.y + this.size / 2) - (player.y + player.tileSize / 2)) < half + pHalf
        );
    }
}
