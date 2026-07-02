const EnemyManager = {
    enemies: [],
    powerups: [],
    totalKills: 0,

    clear() {
        this.enemies = [];
        this.powerups = [];
        this.totalKills = 0;
    },

    spawnEnemies(level) {
        this.enemies = [];
        const count = CFG.ENEMIES_BASE + level * CFG.ENEMIES_PER_LEVEL;
        const types = [CFG.ENEMY_SLIME];
        if (level >= 2) types.push(CFG.ENEMY_GHOST);
        if (level >= 4) types.push(CFG.ENEMY_DEMON);

        for (let i = 0; i < count; i++) {
            const type = types[Math.floor(Math.random() * types.length)];
            let r, c, attempts = 0;
            do {
                r = Math.floor(Math.random() * (CFG.ROWS - 2)) + 1;
                c = Math.floor(Math.random() * (CFG.COLS - 2)) + 1;
                attempts++;
            } while ((!GameMap.isWalkable(r, c) || (r <= 2 && c <= 2)) && attempts < 200);

            if (attempts < 200) {
                this.enemies.push(this.createEnemy(type, r, c, level));
            }
        }
    },

    createEnemy(type, r, c, level) {
        const base = {
            r: r, c: c,
            x: c * CFG.CELL,
            y: r * CFG.CELL,
            type: type,
            alive: true,
            dir: ['up', 'down', 'left', 'right'][Math.floor(Math.random() * 4)],
            dirTimer: 0,
            speed: CFG.PLAYER_SPEED * 0.6,
            animFrame: 0,
            animTimer: 0,
            ghostPhase: 0,
            kickAnim: 0
        };

        switch (type) {
            case CFG.ENEMY_SLIME:
                base.speed = CFG.PLAYER_SPEED * (0.5 + Math.min(level * 0.05, 0.4));
                break;
            case CFG.ENEMY_GHOST:
                base.speed = CFG.PLAYER_SPEED * (0.4 + Math.min(level * 0.04, 0.3));
                break;
            case CFG.ENEMY_DEMON:
                base.speed = CFG.PLAYER_SPEED * (0.7 + Math.min(level * 0.05, 0.5));
                break;
        }

        return base;
    },

    update(dt) {
        for (const enemy of this.enemies) {
            if (!enemy.alive) continue;

            enemy.animTimer += dt;
            if (enemy.animTimer > 200) {
                enemy.animTimer = 0;
                enemy.animFrame = (enemy.animFrame + 1) % 4;
            }
            enemy.kickAnim += dt;

            const er = Math.floor((enemy.y + CFG.CELL/2) / CFG.CELL);
            const ec = Math.floor((enemy.x + CFG.CELL/2) / CFG.CELL);
            if (BombManager.isExplosionAt(er, ec)) {
                this.killEnemy(enemy);
                continue;
            }

            enemy.dirTimer += dt;
            if (enemy.dirTimer > 500 + Math.random() * 1000) {
                enemy.dirTimer = 0;
                this.changeDir(enemy);
            }

            let dx = 0, dy = 0;
            if (enemy.dir === 'left') dx = -1;
            if (enemy.dir === 'right') dx = 1;
            if (enemy.dir === 'up') dy = -1;
            if (enemy.dir === 'down') dy = 1;

            const spd = enemy.speed * (dt / 16);
            const newX = enemy.x + dx * spd;
            const newY = enemy.y + dy * spd;

            const margin = 6;
            const tileR1 = Math.floor((newY + margin) / CFG.CELL);
            const tileR2 = Math.floor((newY + CFG.CELL - margin) / CFG.CELL);
            const tileC1 = Math.floor((newX + margin) / CFG.CELL);
            const tileC2 = Math.floor((newX + CFG.CELL - margin) / CFG.CELL);

            let canMove = true;

            if (dx !== 0) {
                const tc = dx > 0 ? tileC2 : tileC1;
                if (enemy.type === CFG.ENEMY_GHOST) {
                    canMove = tc >= 0 && tc < CFG.COLS;
                } else {
                    canMove = GameMap.isWalkable(tileR1, tc) && GameMap.isWalkable(tileR2, tc);
                }
            }
            if (dy !== 0 && canMove) {
                const tr = dy > 0 ? tileR2 : tileR1;
                if (enemy.type === CFG.ENEMY_GHOST) {
                    canMove = tr >= 0 && tr < CFG.ROWS;
                } else {
                    canMove = GameMap.isWalkable(tr, tileC1) && GameMap.isWalkable(tr, tileC2);
                }
            }

            if (canMove) {
                enemy.x = newX;
                enemy.y = newY;
            } else {
                this.changeDir(enemy);
            }

            enemy.x = Math.max(0, Math.min(enemy.x, (CFG.COLS - 1) * CFG.CELL));
            enemy.y = Math.max(0, Math.min(enemy.y, (CFG.ROWS - 1) * CFG.CELL));

            if (enemy.type === CFG.ENEMY_GHOST) {
                enemy.ghostPhase += dt * 0.003;
            }
        }
    },

    changeDir(enemy) {
        const dirs = ['up', 'down', 'left', 'right'];
        const opposite = { up: 'down', down: 'up', left: 'right', right: 'left' };
        const walkable = dirs.filter(d => {
            let dx = 0, dy = 0;
            if (d === 'left') dx = -1;
            if (d === 'right') dx = 1;
            if (d === 'up') dy = -1;
            if (d === 'down') dy = 1;
            const nr = Math.floor((enemy.y + CFG.CELL/2 + dy * CFG.CELL) / CFG.CELL);
            const nc = Math.floor((enemy.x + CFG.CELL/2 + dx * CFG.CELL) / CFG.CELL);
            if (enemy.type === CFG.ENEMY_GHOST) return true;
            return GameMap.isWalkable(nr, nc);
        });

        if (walkable.length > 0) {
            const filtered = walkable.filter(d => d !== opposite[enemy.dir]);
            enemy.dir = filtered.length > 0
                ? filtered[Math.floor(Math.random() * filtered.length)]
                : walkable[Math.floor(Math.random() * walkable.length)];
        } else {
            enemy.dir = dirs[Math.floor(Math.random() * dirs.length)];
        }
    },

    killEnemy(enemy) {
        if (!enemy.alive) return;
        enemy.alive = false;
        this.totalKills++;
        AudioSys.play('enemy_die');

        if (Math.random() < 0.35) {
            this.spawnPowerup(enemy.r, enemy.c);
        }
    },

    spawnPowerup(r, c) {
        const types = [CFG.PU_BOMB, CFG.PU_FIRE, CFG.PU_SPEED];
        if (Math.random() < 0.25) types.push(CFG.PU_KICK);
        if (Math.random() < 0.15) types.push(CFG.PU_REMOTE);
        const type = types[Math.floor(Math.random() * types.length)];

        this.powerups.push({
            r: r, c: c,
            x: c * CFG.CELL,
            y: r * CFG.CELL,
            type: type,
            animT: 0
        });
    },

    checkPowerupPickup(player) {
        const pr = player.getTileR();
        const pc = player.getTileC();

        for (let i = this.powerups.length - 1; i >= 0; i--) {
            const pu = this.powerups[i];
            if (pu.r === pr && pu.c === pc) {
                this.applyPowerup(pu.type, player);
                this.powerups.splice(i, 1);
                AudioSys.play('powerup');
                return true;
            }
        }
        return false;
    },

    applyPowerup(type, player) {
        switch (type) {
            case CFG.PU_BOMB:
                player.maxBombs = Math.min(player.maxBombs + 1, 8);
                break;
            case CFG.PU_FIRE:
                player.power = Math.min(player.power + 1, 10);
                break;
            case CFG.PU_SPEED:
                player.speed = Math.min(player.speed + 0.5, 7);
                break;
            case CFG.PU_KICK:
                player.hasKick = true;
                break;
            case CFG.PU_REMOTE:
                player.hasRemote = true;
                break;
        }
    },

    render(ctx) {
        const cell = CFG.CELL;

        // Render powerups
        for (const pu of this.powerups) {
            const x = pu.x;
            const y = pu.y;
            pu.animT += 16;
            const bob = Math.sin(pu.animT / 300) * 3;

            // Glow
            ctx.fillStyle = 'rgba(255, 215, 0, 0.15)';
            ctx.beginPath();
            ctx.arc(x + cell/2, y + cell/2 + bob, cell * 0.45, 0, Math.PI * 2);
            ctx.fill();

            // Box
            const sz = cell * 0.55;
            const ox = (cell - sz) / 2;
            ctx.fillStyle = '#ffd700';
            ctx.fillRect(x + ox, y + ox + bob, sz, sz);
            ctx.fillStyle = '#b8860b';
            ctx.fillRect(x + ox, y + ox + bob, sz, 3);
            ctx.fillRect(x + ox, y + ox + bob, 3, sz);

            // Football themed icons
            ctx.fillStyle = '#fff';
            ctx.font = `bold ${cell * 0.3}px sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            const icons = {
                [CFG.PU_BOMB]: '⚽',
                [CFG.PU_FIRE]: '👟',
                [CFG.PU_SPEED]: '🏃',
                [CFG.PU_KICK]: '🚩',
                [CFG.PU_REMOTE]: '📋'
            };
            ctx.fillText(icons[pu.type] || '?', x + cell/2, y + cell/2 + bob);
        }

        // Render enemies
        for (const enemy of this.enemies) {
            if (!enemy.alive) continue;

            const x = enemy.x;
            const y = enemy.y;

            ctx.save();

            if (enemy.type === CFG.ENEMY_GHOST) {
                ctx.globalAlpha = 0.5 + 0.3 * Math.sin(enemy.ghostPhase);
            }

            // Shadow
            ctx.fillStyle = 'rgba(0,0,0,0.3)';
            ctx.beginPath();
            ctx.ellipse(x + cell/2, y + cell - 3, cell * 0.3, cell * 0.1, 0, 0, Math.PI * 2);
            ctx.fill();

            switch (enemy.type) {
                case CFG.ENEMY_SLIME:
                    this.renderReferee(ctx, enemy, x, y, cell);
                    break;
                case CFG.ENEMY_GHOST:
                    this.renderFan(ctx, enemy, x, y, cell);
                    break;
                case CFG.ENEMY_DEMON:
                    this.renderGoalkeeper(ctx, enemy, x, y, cell);
                    break;
            }

            ctx.restore();
        }
    },

    // ARBITRO (referee) - replaces Slime
    renderReferee(ctx, enemy, x, y, cell) {
        const bob = Math.sin(enemy.animFrame * Math.PI / 2) * 1.5;

        // Legs
        ctx.fillStyle = '#111';
        ctx.fillRect(x + cell * 0.38, y + cell * 0.62 + bob, cell * 0.1, cell * 0.15);
        ctx.fillRect(x + cell * 0.52, y + cell * 0.62 + bob, cell * 0.1, cell * 0.15);

        // Shoes
        ctx.fillStyle = '#222';
        ctx.fillRect(x + cell * 0.34, y + cell * 0.77 + bob, cell * 0.15, cell * 0.05);
        ctx.fillRect(x + cell * 0.51, y + cell * 0.77 + bob, cell * 0.15, cell * 0.05);

        // Body - striped shirt
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.ellipse(x + cell/2, y + cell * 0.5 + bob, cell * 0.28, cell * 0.2, 0, 0, Math.PI * 2);
        ctx.fill();

        // Black stripes
        ctx.fillStyle = '#111';
        for (let i = 0; i < 4; i++) {
            const sy = y + cell * 0.38 + i * cell * 0.07 + bob;
            ctx.fillRect(x + cell * 0.24, sy, cell * 0.52, cell * 0.03);
        }

        // Head
        ctx.fillStyle = '#d4a574';
        ctx.beginPath();
        ctx.arc(x + cell/2, y + cell * 0.3 + bob, cell * 0.15, 0, Math.PI * 2);
        ctx.fill();

        // Whistle
        ctx.fillStyle = '#ccc';
        ctx.beginPath();
        ctx.arc(x + cell * 0.6, y + cell * 0.35 + bob, 3, 0, Math.PI * 2);
        ctx.fill();

        // Eyes
        ctx.fillStyle = '#000';
        ctx.beginPath();
        ctx.arc(x + cell/2 - 4, y + cell * 0.29 + bob, 2, 0, Math.PI * 2);
        ctx.arc(x + cell/2 + 4, y + cell * 0.29 + bob, 2, 0, Math.PI * 2);
        ctx.fill();

        // Angry mouth
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(x + cell/2 - 4, y + cell * 0.34 + bob);
        ctx.lineTo(x + cell/2 + 4, y + cell * 0.34 + bob);
        ctx.stroke();

        // Red card held up
        const cardBob = Math.sin(enemy.kickAnim / 300) * 2;
        ctx.fillStyle = '#ff0000';
        ctx.fillRect(x + cell * 0.65, y + cell * 0.12 + cardBob, cell * 0.18, cell * 0.22);
        ctx.strokeStyle = '#aa0000';
        ctx.lineWidth = 1;
        ctx.strokeRect(x + cell * 0.65, y + cell * 0.12 + cardBob, cell * 0.18, cell * 0.22);
    },

    // TORCIDA FANATICA (fan) - replaces Ghost
    renderFan(ctx, enemy, x, y, cell) {
        const bob = Math.sin(enemy.animFrame * Math.PI / 2) * 2;

        // Body
        ctx.fillStyle = '#44aaff';
        ctx.beginPath();
        ctx.ellipse(x + cell/2, y + cell * 0.55 + bob, cell * 0.28, cell * 0.22, 0, 0, Math.PI * 2);
        ctx.fill();

        // Team scarf
        ctx.fillStyle = '#ff4444';
        ctx.fillRect(x + cell * 0.22, y + cell * 0.38 + bob, cell * 0.56, cell * 0.06);

        // Head
        ctx.fillStyle = '#d4a574';
        ctx.beginPath();
        ctx.arc(x + cell/2, y + cell * 0.32 + bob, cell * 0.16, 0, Math.PI * 2);
        ctx.fill();

        // Crazy hair / wig
        ctx.fillStyle = '#ffcc00';
        for (let i = 0; i < 5; i++) {
            const angle = (i / 5) * Math.PI - Math.PI / 2;
            const hx = x + cell/2 + Math.cos(angle + enemy.kickAnim * 0.002) * cell * 0.18;
            const hy = y + cell * 0.22 + bob + Math.sin(angle) * cell * 0.1;
            ctx.beginPath();
            ctx.arc(hx, hy, cell * 0.06, 0, Math.PI * 2);
            ctx.fill();
        }

        // Eyes (wide open / crazy)
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(x + cell/2 - 5, y + cell * 0.3 + bob, 4, 0, Math.PI * 2);
        ctx.arc(x + cell/2 + 5, y + cell * 0.3 + bob, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#000';
        ctx.beginPath();
        ctx.arc(x + cell/2 - 5, y + cell * 0.31 + bob, 2, 0, Math.PI * 2);
        ctx.arc(x + cell/2 + 5, y + cell * 0.31 + bob, 2, 0, Math.PI * 2);
        ctx.fill();

        // Open mouth (yelling)
        ctx.fillStyle = '#800';
        ctx.beginPath();
        ctx.ellipse(x + cell/2, y + cell * 0.37 + bob, 4, 3, 0, 0, Math.PI * 2);
        ctx.fill();

        // Wave bandeirole
        const flagAngle = Math.sin(enemy.kickAnim / 200) * 0.5;
        ctx.save();
        ctx.translate(x + cell * 0.15, y + cell * 0.5 + bob);
        ctx.rotate(flagAngle);
        ctx.fillStyle = '#8B4513';
        ctx.fillRect(-1, -cell * 0.2, 2, cell * 0.3);
        ctx.fillStyle = '#ff4444';
        ctx.fillRect(0, -cell * 0.2, cell * 0.18, cell * 0.12);
        ctx.restore();
    },

    // GOLEIRO (goalkeeper) - replaces Demon
    renderGoalkeeper(ctx, enemy, x, y, cell) {
        const bob = Math.sin(enemy.animFrame * Math.PI / 2) * 1;
        const squat = enemy.animFrame % 2 === 0 ? 0 : 2;

        // Legs
        ctx.fillStyle = '#111';
        ctx.fillRect(x + cell * 0.35, y + cell * 0.6 + bob + squat, cell * 0.12, cell * 0.15);
        ctx.fillRect(x + cell * 0.53, y + cell * 0.6 + bob + squat, cell * 0.12, cell * 0.15);

        // Body - goalkeeper jersey
        ctx.fillStyle = '#ff8800';
        ctx.beginPath();
        ctx.ellipse(x + cell/2, y + cell * 0.48 + bob + squat * 0.5, cell * 0.3, cell * 0.2, 0, 0, Math.PI * 2);
        ctx.fill();

        // Jersey pattern
        ctx.fillStyle = '#cc6600';
        ctx.fillRect(x + cell * 0.3, y + cell * 0.4 + bob + squat * 0.5, cell * 0.4, cell * 0.04);

        // Head with cap
        ctx.fillStyle = '#d4a574';
        ctx.beginPath();
        ctx.arc(x + cell/2, y + cell * 0.3 + bob + squat * 0.3, cell * 0.15, 0, Math.PI * 2);
        ctx.fill();

        // Goalkeeper cap
        ctx.fillStyle = '#ff8800';
        ctx.fillRect(x + cell * 0.25, y + cell * 0.2 + bob + squat * 0.3, cell * 0.5, cell * 0.08);

        // Eyes (focused)
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(x + cell/2 - 4, y + cell * 0.3 + bob + squat * 0.3, 3.5, 0, Math.PI * 2);
        ctx.arc(x + cell/2 + 4, y + cell * 0.3 + bob + squat * 0.3, 3.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#000';
        ctx.beginPath();
        ctx.arc(x + cell/2 - 4, y + cell * 0.31 + bob + squat * 0.3, 1.5, 0, Math.PI * 2);
        ctx.arc(x + cell/2 + 4, y + cell * 0.31 + bob + squat * 0.3, 1.5, 0, Math.PI * 2);
        ctx.fill();

        // Goalkeeper gloves (big)
        const gloveSpread = this.moving ? Math.sin(enemy.animFrame * Math.PI / 2) * 4 : 0;
        ctx.fillStyle = '#ffcc00';
        ctx.beginPath();
        ctx.ellipse(x + cell * 0.1, y + cell * 0.45 + bob, cell * 0.12, cell * 0.1, -0.3, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(x + cell * 0.9, y + cell * 0.45 + bob, cell * 0.12, cell * 0.1, 0.3, 0, Math.PI * 2);
        ctx.fill();

        // Glove details
        ctx.fillStyle = '#ddaa00';
        ctx.fillRect(x + cell * 0.05, y + cell * 0.42 + bob, cell * 0.08, cell * 0.03);
        ctx.fillRect(x + cell * 0.87, y + cell * 0.42 + bob, cell * 0.08, cell * 0.03);

        // Numbers
        ctx.fillStyle = '#fff';
        ctx.font = `bold ${cell * 0.18}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillText('1', x + cell/2, y + cell * 0.52 + bob + squat * 0.5);
    },

    aliveCount() {
        return this.enemies.filter(e => e.alive).length;
    }
};
