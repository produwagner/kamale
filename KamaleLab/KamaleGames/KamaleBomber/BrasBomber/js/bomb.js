const BombManager = {
    bombs: [],
    explosions: [],
    confetti: [],

    clear() {
        this.bombs = [];
        this.explosions = [];
        this.confetti = [];
    },

    placeBomb(tileR, tileC, power, isRemote) {
        const existing = this.bombs.find(b => b.r === tileR && b.c === tileC);
        if (existing) return false;

        const bomb = {
            r: tileR,
            c: tileC,
            power: power,
            timer: isRemote ? 999999 : CFG.BOMB_TIMER,
            isRemote: isRemote,
            detonated: false,
            animT: 0,
            owner: 'player'
        };
        this.bombs.push(bomb);
        AudioSys.play('bomb_place');
        return true;
    },

    detonateRemote() {
        const remotes = this.bombs.filter(b => b.isRemote && !b.detonated);
        if (remotes.length > 0) {
            remotes.forEach(b => this.detonate(b));
            return true;
        }
        return false;
    },

    detonate(bomb) {
        if (bomb.detonated) return;
        bomb.detonated = true;
        AudioSys.play('explosion');

        // Spawn confetti
        const cx = bomb.c * CFG.CELL + CFG.CELL / 2;
        const cy = bomb.r * CFG.CELL + CFG.CELL / 2;
        this.spawnConfetti(cx, cy, 15);

        const dirs = [
            { dr: 0, dc: 0 },
            { dr: -1, dc: 0 },
            { dr: 1, dc: 0 },
            { dr: 0, dc: -1 },
            { dr: 0, dc: 1 }
        ];

        for (const dir of dirs) {
            for (let i = 0; i <= bomb.power; i++) {
                const nr = bomb.r + dir.dr * i;
                const nc = bomb.c + dir.dc * i;

                if (nr < 0 || nr >= CFG.ROWS || nc < 0 || nc >= CFG.COLS) break;

                const tile = GameMap.getTile(nr, nc);
                if (tile === CFG.TILE_WALL) break;

                const isCenter = (i === 0 && dir.dr === 0 && dir.dc === 0);
                this.explosions.push({
                    r: nr,
                    c: nc,
                    timer: CFG.EXPLOSION_DURATION,
                    maxTimer: CFG.EXPLOSION_DURATION,
                    isCenter: isCenter
                });

                // More confetti at each explosion cell
                const ex = nc * CFG.CELL + CFG.CELL / 2;
                const ey = nr * CFG.CELL + CFG.CELL / 2;
                this.spawnConfetti(ex, ey, 3);

                if (tile === CFG.TILE_BLOCK) {
                    GameMap.destroyBlock(nr, nc);
                    break;
                }

                const chainBomb = this.bombs.find(b => b.r === nr && b.c === nc && !b.detonated);
                if (chainBomb && i > 0) {
                    chainBomb.timer = 50;
                }
            }
        }
    },

    spawnConfetti(cx, cy, count) {
        const colors = ['#ff4444', '#4444ff', '#ffcc00', '#44ff44', '#ff44ff', '#ffffff', '#ff8800'];
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 1 + Math.random() * 3;
            this.confetti.push({
                x: cx,
                y: cy,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed - 2,
                life: 400 + Math.random() * 300,
                maxLife: 400 + Math.random() * 300,
                size: 2 + Math.random() * 3,
                color: colors[Math.floor(Math.random() * colors.length)],
                rotation: Math.random() * Math.PI * 2,
                rotSpeed: (Math.random() - 0.5) * 0.2
            });
        }
    },

    update(dt, player, enemies) {
        for (let i = this.bombs.length - 1; i >= 0; i--) {
            const bomb = this.bombs[i];
            if (bomb.detonated) {
                this.bombs.splice(i, 1);
                continue;
            }
            bomb.timer -= dt;
            bomb.animT += dt;
            if (bomb.timer <= 0) {
                this.detonate(bomb);
                this.bombs.splice(i, 1);
            }
        }

        for (let i = this.explosions.length - 1; i >= 0; i--) {
            const exp = this.explosions[i];
            exp.timer -= dt;
            if (exp.timer <= 0) {
                this.explosions.splice(i, 1);
            }
        }

        // Update confetti
        for (let i = this.confetti.length - 1; i >= 0; i--) {
            const p = this.confetti[i];
            p.x += p.vx;
            p.y += p.vy;
            p.vy += 0.08;
            p.rotation += p.rotSpeed;
            p.life -= dt;
            if (p.life <= 0) {
                this.confetti.splice(i, 1);
            }
        }
    },

    isExplosionAt(r, c) {
        return this.explosions.some(e => e.r === r && e.c === c);
    },

    isBombAt(r, c) {
        return this.bombs.some(b => b.r === r && b.c === c);
    },

    kickBomb(bomb, dr, dc) {
        let newR = bomb.r + dr;
        let newC = bomb.c + dc;
        if (GameMap.isWalkable(newR, newC) && !this.isBombAt(newR, newC)) {
            bomb.r = newR;
            bomb.c = newC;
            AudioSys.play('kick');
        }
    },

    render(ctx) {
        const cell = CFG.CELL;

        // Render bombs as soccer balls
        for (const bomb of this.bombs) {
            const x = bomb.c * cell;
            const y = bomb.r * cell;
            const pulse = 0.85 + 0.15 * Math.sin(bomb.animT / 80);
            const size = cell * 0.38 * pulse;

            // Warning glow
            const urgency = 1 - (bomb.timer / CFG.BOMB_TIMER);
            const glowAlpha = 0.1 + urgency * 0.25;
            ctx.fillStyle = `rgba(255, 50, 0, ${glowAlpha})`;
            ctx.beginPath();
            ctx.arc(x + cell/2, y + cell/2, cell * 0.48 * pulse, 0, Math.PI * 2);
            ctx.fill();

            // Shadow
            ctx.fillStyle = 'rgba(0,0,0,0.3)';
            ctx.beginPath();
            ctx.ellipse(x + cell/2, y + cell - 4, size * 0.8, size * 0.2, 0, 0, Math.PI * 2);
            ctx.fill();

            // Soccer ball body
            const by = Math.sin(bomb.animT / 120) * 1.5;
            ctx.fillStyle = '#fff';
            ctx.beginPath();
            ctx.arc(x + cell/2, y + cell/2 + by, size, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#333';
            ctx.lineWidth = 1.5;
            ctx.stroke();

            // Pentagon
            ctx.fillStyle = '#333';
            ctx.beginPath();
            ctx.arc(x + cell/2, y + cell/2 + by, size * 0.3, 0, Math.PI * 2);
            ctx.fill();

            // Hexagon patches
            for (let i = 0; i < 5; i++) {
                const angle = (i / 5) * Math.PI * 2 + bomb.animT * 0.001;
                const px = x + cell/2 + Math.cos(angle) * size * 0.6;
                const py = y + cell/2 + by + Math.sin(angle) * size * 0.6;
                ctx.fillStyle = '#555';
                ctx.beginPath();
                ctx.arc(px, py, size * 0.15, 0, Math.PI * 2);
                ctx.fill();
            }

            // Shine
            ctx.fillStyle = 'rgba(255,255,255,0.5)';
            ctx.beginPath();
            ctx.arc(x + cell/2 - size * 0.25, y + cell/2 + by - size * 0.25, size * 0.18, 0, Math.PI * 2);
            ctx.fill();

            // Fuse flame (blinking red)
            if (urgency > 0.5) {
                const flicker = Math.sin(bomb.animT * 0.02) * 0.3 + 0.7;
                ctx.fillStyle = `rgba(255, 60, 0, ${flicker})`;
                ctx.beginPath();
                ctx.arc(x + cell/2, y + cell/2 - size - 2, 3, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = `rgba(255, 200, 0, ${flicker * 0.7})`;
                ctx.beginPath();
                ctx.arc(x + cell/2, y + cell/2 - size - 3, 2, 0, Math.PI * 2);
                ctx.fill();
            }

            // Remote indicator
            if (bomb.isRemote) {
                ctx.fillStyle = '#4488ff';
                ctx.font = `bold ${cell * 0.25}px sans-serif`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText('R', x + cell/2, y + cell * 0.15);
            }
        }

        // Render explosions as fan celebration
        for (const exp of this.explosions) {
            const x = exp.c * cell;
            const y = exp.r * cell;
            const progress = 1 - (exp.timer / exp.maxTimer);
            const alpha = 1 - progress * 0.6;

            // Firework / celebration burst
            const gradient = ctx.createRadialGradient(
                x + cell/2, y + cell/2, 0,
                x + cell/2, y + cell/2, cell * 0.55
            );
            gradient.addColorStop(0, `rgba(255, 255, 150, ${alpha})`);
            gradient.addColorStop(0.3, `rgba(255, 180, 50, ${alpha * 0.9})`);
            gradient.addColorStop(0.6, `rgba(255, 80, 20, ${alpha * 0.7})`);
            gradient.addColorStop(1, `rgba(200, 30, 0, ${alpha * 0.2})`);

            ctx.fillStyle = gradient;
            const expand = 1 + progress * 0.4;
            const offset = (cell * (1 - expand)) / 2;
            ctx.fillRect(x + offset, y + offset, cell * expand, cell * expand);

            // Star burst lines
            if (progress < 0.5) {
                ctx.strokeStyle = `rgba(255, 255, 200, ${(1 - progress * 2) * 0.6})`;
                ctx.lineWidth = 2;
                for (let i = 0; i < 6; i++) {
                    const angle = (i / 6) * Math.PI * 2 + progress * 2;
                    const len = cell * 0.3 * (1 - progress);
                    ctx.beginPath();
                    ctx.moveTo(x + cell/2, y + cell/2);
                    ctx.lineTo(
                        x + cell/2 + Math.cos(angle) * len,
                        y + cell/2 + Math.sin(angle) * len
                    );
                    ctx.stroke();
                }
            }
        }

        // Render confetti
        for (const p of this.confetti) {
            const lifeRatio = p.life / p.maxLife;
            ctx.save();
            ctx.translate(p.x, p.y);
            ctx.rotate(p.rotation);
            ctx.globalAlpha = lifeRatio;
            ctx.fillStyle = p.color;
            ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
            ctx.restore();
        }
        ctx.globalAlpha = 1;
    }
};
