const Game = {
    canvas: null,
    ctx: null,
    state: 'menu',
    level: 1,
    score: 0,
    lastTime: 0,
    running: false,
    deathTimer: 0,
    exitFound: false,

    init() {
        this.canvas = document.getElementById('game-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.resizeCanvas();
        AudioSys.init();
        Input.init();
        this.bindEvents();
        this.showScreen('menu');
        this.lastTime = performance.now();
        requestAnimationFrame((t) => this.loop(t));
    },

    resizeCanvas() {
        const maxW = Math.min(window.innerWidth - 32, 800);
        const maxH = Math.min(window.innerHeight - 180, 640);
        const cellW = Math.floor(maxW / CFG.COLS);
        const cellH = Math.floor(maxH / CFG.ROWS);
        CFG.CELL = Math.max(24, Math.min(cellW, cellH));
        this.canvas.width = CFG.COLS * CFG.CELL;
        this.canvas.height = CFG.ROWS * CFG.CELL;
    },

    bindEvents() {
        window.addEventListener('resize', () => this.resizeCanvas());

        document.getElementById('btn-start').addEventListener('click', () => this.startGame());
        document.getElementById('btn-resume').addEventListener('click', () => this.resume());
        document.getElementById('btn-restart').addEventListener('click', () => this.restart());
        document.getElementById('btn-nextlevel').addEventListener('click', () => this.nextLevel());
        document.getElementById('btn-menuwin').addEventListener('click', () => this.goToMenu());

        window.addEventListener('keydown', (e) => {
            if (e.code === 'Escape' || e.code === 'KeyP') {
                if (this.state === 'playing') this.pause();
                else if (this.state === 'paused') this.resume();
            }
            // Remote detonate
            if ((e.code === 'KeyX' || e.code === 'Enter') && this.state === 'playing') {
                if (Player.hasRemote) {
                    BombManager.detonateRemote();
                }
            }
        });
    },

    showScreen(name) {
        document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
        const el = document.getElementById('screen-' + name);
        if (el) el.classList.add('active');
    },

    startGame() {
        AudioSys.resume();
        this.level = 1;
        this.score = 0;
        Player.lives = CFG.INITIAL_LIVES;
        this.initLevel();
        this.state = 'playing';
        this.showScreen(null);
    },

    initLevel() {
        this.canvas.width = CFG.COLS * CFG.CELL;
        this.canvas.height = CFG.ROWS * CFG.CELL;
        GameMap.init(this.level);
        Player.init();
        BombManager.clear();
        EnemyManager.clear();
        EnemyManager.spawnEnemies(this.level);
        this.deathTimer = 0;
        this.exitFound = false;
        this.updateHUD();
    },

    restart() {
        this.score = 0;
        Player.lives = CFG.INITIAL_LIVES;
        this.initLevel();
        this.state = 'playing';
        this.showScreen(null);
    },

    nextLevel() {
        this.level++;
        this.initLevel();
        this.state = 'playing';
        this.showScreen(null);
    },

    pause() {
        this.state = 'paused';
        this.showScreen('pause');
    },

    resume() {
        this.state = 'playing';
        this.showScreen(null);
    },

    goToMenu() {
        this.state = 'menu';
        this.showScreen('menu');
    },

    gameOver() {
        this.state = 'gameover';
        document.getElementById('final-score').textContent = this.score;
        this.showScreen('gameover');
        AudioSys.play('game_over');
    },

    levelComplete() {
        this.state = 'levelcomplete';
        this.score += 1000 + this.level * 200;
        document.getElementById('level-score').textContent = this.score;
        this.showScreen('levelcomplete');
        AudioSys.play('level_complete');
    },

    win() {
        this.state = 'win';
        document.getElementById('win-score').textContent = this.score;
        this.showScreen('win');
        AudioSys.play('level_complete');
    },

    updateHUD() {
        document.getElementById('level').textContent = this.level;
        document.getElementById('score').textContent = this.score;
        let livesStr = '';
        for (let i = 0; i < Player.lives; i++) livesStr += '❤ ';
        document.getElementById('lives').textContent = livesStr;
    },

    loop(timestamp) {
        const dt = Math.min(timestamp - this.lastTime, 50);
        this.lastTime = timestamp;

        if (this.state === 'playing') {
            this.update(dt);
        }

        this.render();
        requestAnimationFrame((t) => this.loop(t));
    },

    update(dt) {
        // Player death sequence
        if (Player.dead) {
            this.deathTimer += dt;
            if (this.deathTimer > 1500) {
                if (Player.lives <= 0) {
                    this.gameOver();
                    return;
                }
                Player.respawn();
                this.deathTimer = 0;
            }
            return;
        }

        const result = Player.update(dt, EnemyManager.enemies);
        EnemyManager.update(dt);
        BombManager.update(dt, Player, EnemyManager.enemies);
        EnemyManager.checkPowerupPickup(Player);

        // Score from enemy kills
        const kills = EnemyManager.totalKills;
        this.score += kills * 50;
        EnemyManager.totalKills = 0;

        // Score from destroying blocks
        const blocksDestroyed = CFG._lastBlockCount !== undefined
            ? Math.max(0, CFG._lastBlockCount - GameMap.totalBlocks) : 0;
        this.score += blocksDestroyed * 10;
        CFG._lastBlockCount = GameMap.totalBlocks;

        if (result === 'exit') {
            if (EnemyManager.aliveCount() === 0) {
                if (this.level >= 10) {
                    this.win();
                } else {
                    this.levelComplete();
                }
            } else {
                this.exitFound = true;
            }
        }

        // Check if all enemies dead and player on exit
        if (this.exitFound && EnemyManager.aliveCount() === 0) {
            if (this.level >= 10) {
                this.win();
            } else {
                this.levelComplete();
            }
        }

        this.updateHUD();
    },

    render() {
        const ctx = this.ctx;
        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        ctx.fillStyle = CFG.COLOR_BG;
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        if (this.state === 'playing' || this.state === 'paused') {
            GameMap.render(ctx);
            BombManager.render(ctx);
            EnemyManager.render(ctx);
            Player.render(ctx);

            // Exit indicator when all enemies dead
            if (EnemyManager.aliveCount() === 0 && GameMap.exitPos) {
                const ep = GameMap.exitPos;
                const ex = ep.c * CFG.CELL;
                const ey = ep.r * CFG.CELL;
                const pulse = 0.5 + 0.5 * Math.sin(Date.now() / 200);
                ctx.strokeStyle = `rgba(68, 204, 136, ${pulse})`;
                ctx.lineWidth = 3;
                ctx.strokeRect(ex + 2, ey + 2, CFG.CELL - 4, CFG.CELL - 4);
            }

            // HUD overlay: active bombs count
            const myBombs = BombManager.bombs.filter(b => b.owner === 'player').length;
            ctx.fillStyle = 'rgba(0,0,0,0.6)';
            ctx.fillRect(4, this.canvas.height - 28, 120, 22);
            ctx.fillStyle = '#fff';
            ctx.font = '12px monospace';
            ctx.textAlign = 'left';
            ctx.textBaseline = 'middle';
            ctx.fillText(`Bombas: ${myBombs}/${Player.maxBombs}  Poder: ${Player.power}`, 8, this.canvas.height - 17);

            // Power-ups active
            let puText = '';
            if (Player.hasKick) puText += '[Chute] ';
            if (Player.hasRemote) puText += '[Remoto] ';
            if (puText) {
                const tw = ctx.measureText(puText).width + 16;
                ctx.fillStyle = 'rgba(0,0,0,0.6)';
                ctx.fillRect(this.canvas.width - tw - 4, this.canvas.height - 28, tw, 22);
                ctx.fillStyle = '#ffd700';
                ctx.fillText(puText, this.canvas.width - tw + 4, this.canvas.height - 17);
            }
        }

        // Game over overlay
        if (this.state === 'gameover') {
            ctx.fillStyle = 'rgba(0,0,0,0.5)';
            ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        }
    }
};

window.addEventListener('load', () => Game.init());
