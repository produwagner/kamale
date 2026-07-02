const Player = {
    x: 0, y: 0,
    speed: CFG.PLAYER_SPEED,
    maxBombs: CFG.BASE_BOMBS,
    power: CFG.BASE_POWER,
    hasKick: false,
    hasRemote: false,
    lives: CFG.INITIAL_LIVES,
    activeBombs: 0,
    dir: 'down',
    animFrame: 0,
    animTimer: 0,
    invincible: 0,
    moving: false,
    dead: false,

    init() {
        this.x = 1 * CFG.CELL;
        this.y = 1 * CFG.CELL;
        this.speed = CFG.PLAYER_SPEED;
        this.maxBombs = CFG.BASE_BOMBS;
        this.power = CFG.BASE_POWER;
        this.hasKick = false;
        this.hasRemote = false;
        this.activeBombs = 0;
        this.dir = 'down';
        this.animFrame = 0;
        this.animTimer = 0;
        this.invincible = CFG.INVINCIBLE_TIME;
        this.moving = false;
        this.dead = false;
    },

    getTileR() { return Math.floor((this.y + CFG.CELL / 2) / CFG.CELL); },
    getTileC() { return Math.floor((this.x + CFG.CELL / 2) / CFG.CELL); },

    update(dt, enemies) {
        if (this.dead) return;

        this.invincible = Math.max(0, this.invincible - dt);
        this.animTimer += dt;
        if (this.animTimer > 150) {
            this.animTimer = 0;
            this.animFrame = (this.animFrame + 1) % 4;
        }

        const dir = Input.getDir();
        this.moving = !!dir;
        if (dir) this.dir = dir;

        if (dir) {
            let dx = 0, dy = 0;
            if (dir === 'left') dx = -1;
            if (dir === 'right') dx = 1;
            if (dir === 'up') dy = -1;
            if (dir === 'down') dy = 1;

            const newX = this.x + dx * this.speed * (dt / 16);
            const newY = this.y + dy * this.speed * (dt / 16);

            const margin = 4;
            const tileR1 = Math.floor((newY + margin) / CFG.CELL);
            const tileR2 = Math.floor((newY + CFG.CELL - margin) / CFG.CELL);
            const tileC1 = Math.floor((newX + margin) / CFG.CELL);
            const tileC2 = Math.floor((newX + CFG.CELL - margin) / CFG.CELL);

            if (dx !== 0) {
                const tc = dx > 0 ? tileC2 : tileC1;
                const canR1 = GameMap.isWalkable(tileR1, tc) || this.isBombUnder(tileR1, tc);
                const canR2 = GameMap.isWalkable(tileR2, tc) || this.isBombUnder(tileR2, tc);
                if (canR1 && canR2) {
                    this.x = newX;
                } else if (this.hasKick) {
                    this.tryKick(tileR1, tc, dx, 0);
                    this.tryKick(tileR2, tc, dx, 0);
                }
            }

            if (dy !== 0) {
                const tr = dy > 0 ? tileR2 : tileR1;
                const canC1 = GameMap.isWalkable(tr, tileC1) || this.isBombUnder(tr, tileC1);
                const canC2 = GameMap.isWalkable(tr, tileC2) || this.isBombUnder(tr, tileC2);
                if (canC1 && canC2) {
                    this.y = newY;
                } else if (this.hasKick) {
                    this.tryKick(tr, tileC1, 0, dy);
                    this.tryKick(tr, tileC2, 0, dy);
                }
            }
        }

        this.x = Math.max(0, Math.min(this.x, (CFG.COLS - 1) * CFG.CELL));
        this.y = Math.max(0, Math.min(this.y, (CFG.ROWS - 1) * CFG.CELL));

        if (Input.consumeBombPress()) {
            this.placeBomb();
        }

        const myR = this.getTileR();
        const myC = this.getTileC();
        if (BombManager.isExplosionAt(myR, myC) && this.invincible <= 0) {
            this.die();
        }

        if (this.invincible <= 0) {
            for (const enemy of enemies) {
                if (!enemy.alive) continue;
                const dist = Math.hypot(this.x - enemy.x, this.y - enemy.y);
                if (dist < CFG.CELL * 0.7) {
                    this.die();
                    break;
                }
            }
        }

        if (GameMap.exitPos) {
            const exit = GameMap.exitPos;
            if (myR === exit.r && myC === exit.c) {
                return 'exit';
            }
        }

        return null;
    },

    isBombUnder(r, c) {
        return BombManager.isBombAt(r, c);
    },

    tryKick(r, c, dx, dy) {
        if (BombManager.isBombAt(r, c)) {
            const bomb = BombManager.bombs.find(b => b.r === r && b.c === c);
            if (bomb) BombManager.kickBomb(bomb, dx, dy);
        }
    },

    placeBomb() {
        const myBombs = BombManager.bombs.filter(b => b.owner === 'player').length;
        if (myBombs >= this.maxBombs) return;
        const r = this.getTileR();
        const c = this.getTileC();
        if (this.hasRemote) {
            BombManager.placeBomb(r, c, this.power, true);
        } else {
            BombManager.placeBomb(r, c, this.power, false);
        }
    },

    die() {
        if (this.dead || this.invincible > 0) return;
        this.lives--;
        this.dead = true;
        AudioSys.play('death');
    },

    respawn() {
        this.x = 1 * CFG.CELL;
        this.y = 1 * CFG.CELL;
        this.dead = false;
        this.invincible = CFG.INVINCIBLE_TIME;
        this.dir = 'down';
    },

    render(ctx) {
        if (this.dead) return;

        const cell = CFG.CELL;
        const x = this.x;
        const y = this.y;

        if (this.invincible > 0 && Math.floor(this.invincible / 100) % 2 === 0) {
            ctx.globalAlpha = 0.5;
        }

        // Shadow
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.beginPath();
        ctx.ellipse(x + cell/2, y + cell - 3, cell * 0.3, cell * 0.1, 0, 0, Math.PI * 2);
        ctx.fill();

        const bob = this.moving ? Math.sin(this.animFrame * Math.PI / 2) * 2 : 0;
        const kickFrame = this.moving && (this.animFrame === 1 || this.animFrame === 3);

        // === FOOTBALL PLAYER ===

        // Legs / shorts
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(x + cell * 0.35, y + cell * 0.58 + bob, cell * 0.12, cell * 0.18);
        ctx.fillRect(x + cell * 0.53, y + cell * 0.58 + bob, cell * 0.12, cell * 0.18);

        // Socks
        ctx.fillStyle = '#1a6dd4';
        ctx.fillRect(x + cell * 0.35, y + cell * 0.72 + bob, cell * 0.12, cell * 0.1);
        ctx.fillRect(x + cell * 0.53, y + cell * 0.72 + bob, cell * 0.12, cell * 0.1);

        // Chuteiras
        ctx.fillStyle = '#111';
        const footOffset = kickFrame ? -3 : 0;
        ctx.fillRect(x + cell * 0.3, y + cell * 0.82 + bob + footOffset, cell * 0.18, cell * 0.06);
        ctx.fillRect(x + cell * 0.52, y + cell * 0.82 + bob, cell * 0.18, cell * 0.06);

        // Body / Jersey
        ctx.fillStyle = '#1a6dd4';
        ctx.beginPath();
        ctx.ellipse(x + cell/2, y + cell * 0.48 + bob, cell * 0.3, cell * 0.22, 0, 0, Math.PI * 2);
        ctx.fill();

        // Jersey number
        ctx.fillStyle = '#ffffff';
        ctx.font = `bold ${cell * 0.2}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('10', x + cell/2, y + cell * 0.48 + bob);

        // Jersey stripes
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(x + cell * 0.25, y + cell * 0.42 + bob);
        ctx.lineTo(x + cell * 0.25, y + cell * 0.55 + bob);
        ctx.stroke();

        // Arms
        ctx.fillStyle = CFG.COLOR_SKIN;
        const armSwing = this.moving ? Math.sin(this.animFrame * Math.PI / 2) * 3 : 0;
        ctx.fillRect(x + cell * 0.12, y + cell * 0.38 + bob + armSwing, cell * 0.1, cell * 0.08);
        ctx.fillRect(x + cell * 0.78, y + cell * 0.38 + bob - armSwing, cell * 0.1, cell * 0.08);

        // Head
        ctx.fillStyle = CFG.COLOR_SKIN;
        ctx.beginPath();
        ctx.arc(x + cell/2, y + cell * 0.28 + bob, cell * 0.18, 0, Math.PI * 2);
        ctx.fill();

        // Hair
        ctx.fillStyle = '#3a2a1a';
        ctx.beginPath();
        ctx.arc(x + cell/2, y + cell * 0.22 + bob, cell * 0.18, Math.PI, Math.PI * 2);
        ctx.fill();

        // Eyes
        const eyeOffsets = {
            'up': { dx: 0, dy: -2 },
            'down': { dx: 0, dy: 1 },
            'left': { dx: -2, dy: 0 },
            'right': { dx: 2, dy: 0 }
        };
        const eo = eyeOffsets[this.dir] || eyeOffsets['down'];

        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(x + cell/2 - 4, y + cell * 0.27 + bob, 3, 0, Math.PI * 2);
        ctx.arc(x + cell/2 + 4, y + cell * 0.27 + bob, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#222';
        ctx.beginPath();
        ctx.arc(x + cell/2 - 4 + eo.dx * 0.4, y + cell * 0.28 + eo.dy * 0.4 + bob, 1.5, 0, Math.PI * 2);
        ctx.arc(x + cell/2 + 4 + eo.dx * 0.4, y + cell * 0.28 + eo.dy * 0.4 + bob, 1.5, 0, Math.PI * 2);
        ctx.fill();

        // Smile
        ctx.strokeStyle = '#8B4513';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(x + cell/2, y + cell * 0.3 + bob, 3, 0.1, Math.PI - 0.1);
        ctx.stroke();

        // Headband
        ctx.fillStyle = '#ff4444';
        ctx.fillRect(x + cell * 0.2, y + cell * 0.2 + bob, cell * 0.6, cell * 0.05);

        // Power-up indicators
        if (this.hasKick) {
            ctx.fillStyle = '#44ff44';
            ctx.font = `bold ${cell * 0.18}px sans-serif`;
            ctx.textAlign = 'center';
            ctx.fillText('⚡', x + cell/2, y + cell * 0.95 + bob);
        }
        if (this.hasRemote) {
            ctx.fillStyle = '#4488ff';
            ctx.font = `bold ${cell * 0.18}px sans-serif`;
            ctx.textAlign = 'center';
            ctx.fillText('📋', x + cell/2, y + cell * 0.95 + bob);
        }

        ctx.globalAlpha = 1;
    }
};
