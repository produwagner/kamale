const Input = {
    keys: {},
    touchDirs: { up: false, down: false, left: false, right: false },
    bombPressed: false,
    bombJustPressed: false,

    init() {
        window.addEventListener('keydown', (e) => {
            if (!this.keys[e.code]) {
                if (e.code === 'Space' || e.code === 'KeyZ') {
                    this.bombJustPressed = true;
                }
            }
            this.keys[e.code] = true;
            if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
                e.preventDefault();
            }
        });

        window.addEventListener('keyup', (e) => {
            this.keys[e.code] = false;
        });

        // Mobile controls
        const dpadBtns = document.querySelectorAll('.dpad-btn');
        dpadBtns.forEach(btn => {
            const dir = btn.dataset.dir;
            const start = (e) => { e.preventDefault(); this.touchDirs[dir] = true; };
            const end = (e) => { e.preventDefault(); this.touchDirs[dir] = false; };
            btn.addEventListener('touchstart', start, { passive: false });
            btn.addEventListener('touchend', end, { passive: false });
            btn.addEventListener('touchcancel', end, { passive: false });
            btn.addEventListener('mousedown', start);
            btn.addEventListener('mouseup', end);
            btn.addEventListener('mouseleave', end);
        });

        const bombBtn = document.getElementById('btn-bomb');
        if (bombBtn) {
            const bStart = (e) => { e.preventDefault(); this.bombJustPressed = true; };
            bombBtn.addEventListener('touchstart', bStart, { passive: false });
            bombBtn.addEventListener('mousedown', bStart);
        }
    },

    getDir() {
        if (this.keys['ArrowUp'] || this.keys['KeyW'] || this.touchDirs.up) return 'up';
        if (this.keys['ArrowDown'] || this.keys['KeyS'] || this.touchDirs.down) return 'down';
        if (this.keys['ArrowLeft'] || this.keys['KeyA'] || this.touchDirs.left) return 'left';
        if (this.keys['ArrowRight'] || this.keys['KeyD'] || this.touchDirs.right) return 'right';
        return null;
    },

    isBomb() {
        const pressed = this.bombJustPressed || this.keys['Space'] || this.keys['KeyZ'];
        return pressed;
    },

    consumeBombPress() {
        const was = this.bombJustPressed;
        this.bombJustPressed = false;
        return was;
    },

    reset() {
        this.keys = {};
        this.touchDirs = { up: false, down: false, left: false, right: false };
        this.bombPressed = false;
        this.bombJustPressed = false;
    }
};
