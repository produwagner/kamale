const AudioSys = {
    ctx: null,
    enabled: true,

    init() {
        try {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        } catch (e) {
            this.enabled = false;
        }
    },

    resume() {
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    },

    play(type) {
        if (!this.enabled || !this.ctx) return;
        this.resume();
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        const t = this.ctx.currentTime;

        switch (type) {
            case 'bomb_place':
                osc.type = 'sine';
                osc.frequency.setValueAtTime(200, t);
                osc.frequency.exponentialRampToValueAtTime(80, t + 0.15);
                gain.gain.setValueAtTime(0.3, t);
                gain.gain.exponentialRampToValueAtTime(0.01, t + 0.15);
                osc.start(t);
                osc.stop(t + 0.15);
                break;

            case 'explosion':
                osc.type = 'sawtooth';
                osc.frequency.setValueAtTime(150, t);
                osc.frequency.exponentialRampToValueAtTime(30, t + 0.3);
                gain.gain.setValueAtTime(0.4, t);
                gain.gain.exponentialRampToValueAtTime(0.01, t + 0.3);
                osc.start(t);
                osc.stop(t + 0.3);
                break;

            case 'powerup':
                osc.type = 'sine';
                osc.frequency.setValueAtTime(400, t);
                osc.frequency.exponentialRampToValueAtTime(800, t + 0.1);
                osc.frequency.exponentialRampToValueAtTime(1200, t + 0.2);
                gain.gain.setValueAtTime(0.25, t);
                gain.gain.exponentialRampToValueAtTime(0.01, t + 0.25);
                osc.start(t);
                osc.stop(t + 0.25);
                break;

            case 'death':
                osc.type = 'square';
                osc.frequency.setValueAtTime(400, t);
                osc.frequency.exponentialRampToValueAtTime(50, t + 0.6);
                gain.gain.setValueAtTime(0.3, t);
                gain.gain.exponentialRampToValueAtTime(0.01, t + 0.6);
                osc.start(t);
                osc.stop(t + 0.6);
                break;

            case 'enemy_die':
                osc.type = 'square';
                osc.frequency.setValueAtTime(300, t);
                osc.frequency.exponentialRampToValueAtTime(100, t + 0.2);
                gain.gain.setValueAtTime(0.25, t);
                gain.gain.exponentialRampToValueAtTime(0.01, t + 0.2);
                osc.start(t);
                osc.stop(t + 0.2);
                break;

            case 'level_complete':
                osc.type = 'sine';
                osc.frequency.setValueAtTime(523, t);
                osc.frequency.setValueAtTime(659, t + 0.15);
                osc.frequency.setValueAtTime(784, t + 0.3);
                osc.frequency.setValueAtTime(1047, t + 0.45);
                gain.gain.setValueAtTime(0.3, t);
                gain.gain.exponentialRampToValueAtTime(0.01, t + 0.65);
                osc.start(t);
                osc.stop(t + 0.65);
                break;

            case 'game_over':
                osc.type = 'sawtooth';
                osc.frequency.setValueAtTime(200, t);
                osc.frequency.exponentialRampToValueAtTime(100, t + 0.5);
                osc.frequency.exponentialRampToValueAtTime(50, t + 1);
                gain.gain.setValueAtTime(0.3, t);
                gain.gain.exponentialRampToValueAtTime(0.01, t + 1);
                osc.start(t);
                osc.stop(t + 1);
                break;

            case 'kick':
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(250, t);
                osc.frequency.exponentialRampToValueAtTime(100, t + 0.08);
                gain.gain.setValueAtTime(0.2, t);
                gain.gain.exponentialRampToValueAtTime(0.01, t + 0.08);
                osc.start(t);
                osc.stop(t + 0.08);
                break;

            case 'move':
                osc.type = 'sine';
                osc.frequency.setValueAtTime(120, t);
                gain.gain.setValueAtTime(0.05, t);
                gain.gain.exponentialRampToValueAtTime(0.01, t + 0.04);
                osc.start(t);
                osc.stop(t + 0.04);
                break;
        }
    }
};
