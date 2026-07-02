// ═══════════════════════════════════════════════════════════════════════════════
// SPRITES.JS — Gerenciador de Sprite Sheets + Fallback Programático
// ═══════════════════════════════════════════════════════════════════════════════

const SpriteManager = (() => {
    const sheets = {};
    const loaded = {};

    // Caminhos dos sprite sheets gerados
    const SHEET_PATHS = {
        player:  'player_sprite_sheet.png',
        enemies: 'enemies_sprite_sheet.png',
        tiles:   'tiles_sprite_sheet.png',
        boss1:   'boss1_sprite_sheet.png',
    };

    // Carrega todos os sheets assincronamente
    function loadAll(onComplete) {
        let pending = Object.keys(SHEET_PATHS).length;
        function done() { if (--pending === 0) onComplete(); }

        for (const [key, path] of Object.entries(SHEET_PATHS)) {
            const img = new Image();
            img.onload = () => { sheets[key] = img; loaded[key] = true; done(); };
            img.onerror = () => { loaded[key] = false; done(); }; // Usa fallback programático
            img.src = path;
        }
    }

    function isLoaded(key) { return loaded[key] === true; }
    function get(key) { return sheets[key]; }

    // ──────────────────────────────────────────────────────────────────────────
    // CONFIGURAÇÃO DOS FRAMES (posição na sprite sheet)
    // ──────────────────────────────────────────────────────────────────────────

    // Player sheet: 12 frames × 32px wide, 32px tall
    const PLAYER_FRAMES = {
        down:  [{ x:0,y:0 }, { x:32,y:0 }, { x:64,y:0 }],      // walk down
        right: [{ x:96,y:0 }, { x:128,y:0 }, { x:160,y:0 }],   // walk right
        up:    [{ x:192,y:0 }, { x:224,y:0 }, { x:256,y:0 }],   // walk up
        left:  [{ x:96,y:0 }, { x:128,y:0 }, { x:160,y:0 }],   // walk left (mirrored)
        bomb:  [{ x:288,y:0 }, { x:320,y:0 }],                  // planting
        idle:  [{ x:352,y:0 }],                                  // idle
    };

    // Enemy sheet: 3 rows × 4 frames × 32px
    const ENEMY_FRAMES = {
        balloom: [{ x:0,y:0 },{ x:32,y:0 },{ x:64,y:0 },{ x:96,y:0 }],
        dahl:    [{ x:0,y:32 },{ x:32,y:32 },{ x:64,y:32 },{ x:96,y:32 }],
        onil:    [{ x:0,y:64 },{ x:32,y:64 },{ x:64,y:64 },{ x:96,y:64 }],
    };

    // Tiles sheet: 4 cols × 3 rows × 32px
    const TILE_FRAMES = {
        floor:      { x:0,  y:0 },
        wall:       { x:32, y:0 },
        soft:       { x:64, y:0 },
        bomb_f1:    { x:96, y:0 },
        exp_center: { x:0,  y:32 },
        exp_right:  { x:32, y:32 },
        exp_up:     { x:64, y:32 },
        exp_tip:    { x:96, y:32 },
        pu_flame:   { x:0,  y:64 },
        pu_bomb:    { x:32, y:64 },
        pu_speed:   { x:64, y:64 },
        pu_shield:  { x:96, y:64 },
    };

    // Boss1 sheet: 5 frames × 64px, 64px tall
    const BOSS1_FRAMES = {
        idle:   { x:0,   y:0 },
        charge: { x:64,  y:0 },
        stomp:  { x:128, y:0 },
        throw:  { x:192, y:0 },
        death:  { x:256, y:0 },
    };

    // ──────────────────────────────────────────────────────────────────────────
    // DRAW HELPERS
    // ──────────────────────────────────────────────────────────────────────────

    function drawFrame(ctx, sheetKey, frameInfo, dx, dy, dw, dh, mirrorX = false) {
        if (!isLoaded(sheetKey)) return false;
        const img = get(sheetKey);
        const { x, y } = frameInfo;
        const sw = dw, sh = dh; // Assume frame size = draw size (scaled)
        if (mirrorX) {
            ctx.save();
            ctx.scale(-1, 1);
            ctx.drawImage(img, x, y, sw, sh, -dx - dw, dy, dw, dh);
            ctx.restore();
        } else {
            ctx.drawImage(img, x, y, sw, sh, dx, dy, dw, dh);
        }
        return true;
    }

    // ──────────────────────────────────────────────────────────────────────────
    // FALLBACK PROGRAMÁTICO (usado quando PNG não carregou)
    // ──────────────────────────────────────────────────────────────────────────

    function drawPlayerFallback(ctx, x, y, size, dir, animFrame, isP2 = false) {
        const s = size / 32;
        const baseColor = isP2 ? '#4488ff' : '#ffffff';
        const helmetColor = isP2 ? '#2255cc' : '#3366ff';
        const t = animFrame * 0.4;

        ctx.save();
        ctx.translate(x + size / 2, y + size / 2);
        if (dir === 'left') ctx.scale(-1, 1);

        // Sombra
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.beginPath();
        ctx.ellipse(0, size * 0.42, size * 0.25, size * 0.07, 0, 0, Math.PI * 2);
        ctx.fill();

        // Pernas
        const legAnim = Math.sin(t) * 3 * s;
        ctx.fillStyle = '#1a1a88';
        ctx.fillRect(-8 * s, 10 * s, 6 * s, (10 + legAnim) * s);
        ctx.fillRect(2 * s, 10 * s, 6 * s, (10 - legAnim) * s);

        // Corpo
        ctx.fillStyle = baseColor;
        ctx.fillRect(-9 * s, -4 * s, 18 * s, 16 * s);

        // Detalhe corpo (jaqueta)
        ctx.fillStyle = 'rgba(0,0,0,0.2)';
        ctx.fillRect(-9 * s, 4 * s, 18 * s, 2 * s);

        // Braços
        const armAnim = Math.cos(t) * 2 * s;
        ctx.fillStyle = baseColor;
        ctx.fillRect(-13 * s, -2 * s + armAnim, 5 * s, 10 * s);
        ctx.fillRect(8 * s, -2 * s - armAnim, 5 * s, 10 * s);

        // Cabeça
        ctx.fillStyle = '#ffcc88';
        ctx.beginPath();
        ctx.ellipse(0, -10 * s, 8 * s, 9 * s, 0, 0, Math.PI * 2);
        ctx.fill();

        // Capacete
        ctx.fillStyle = helmetColor;
        ctx.beginPath();
        ctx.arc(0, -12 * s, 8 * s, Math.PI, 0);
        ctx.fill();
        // Visor
        ctx.fillStyle = 'rgba(100,200,255,0.5)';
        ctx.beginPath();
        ctx.ellipse(0, -12 * s, 6 * s, 3 * s, 0, 0, Math.PI);
        ctx.fill();

        // Olhos
        ctx.fillStyle = '#000';
        if (dir === 'up') {
            // costas
        } else {
            ctx.beginPath(); ctx.arc(-3 * s, -10 * s, 1.5 * s, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(3 * s, -10 * s, 1.5 * s, 0, Math.PI * 2); ctx.fill();
        }

        ctx.restore();
    }

    function drawEnemyFallback(ctx, x, y, size, type, animFrame) {
        const s = size / 32;
        const t = animFrame * 0.3;
        const wobble = Math.sin(t) * 2 * s;

        ctx.save();
        ctx.translate(x + size / 2, y + size / 2);

        if (type === 'balloom') {
            // Bolha rosa
            const pulse = 1 + Math.sin(t * 2) * 0.05;
            ctx.fillStyle = '#ff88cc';
            ctx.beginPath();
            ctx.ellipse(wobble, 2 * s, 12 * s * pulse, 11 * s, 0, 0, Math.PI * 2);
            ctx.fill();
            // Brilho
            ctx.fillStyle = 'rgba(255,255,255,0.4)';
            ctx.beginPath(); ctx.ellipse(-4 * s + wobble, -4 * s, 4 * s, 3 * s, -0.5, 0, Math.PI * 2); ctx.fill();
            // Olhos
            ctx.fillStyle = '#330022';
            ctx.beginPath(); ctx.arc(-4 * s + wobble, 2 * s, 2.5 * s, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(4 * s + wobble, 2 * s, 2.5 * s, 0, Math.PI * 2); ctx.fill();
            // Olho brilho
            ctx.fillStyle = '#fff';
            ctx.beginPath(); ctx.arc(-3 * s + wobble, 1 * s, 1 * s, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(5 * s + wobble, 1 * s, 1 * s, 0, Math.PI * 2); ctx.fill();
            // Pezinhos
            ctx.fillStyle = '#cc44aa';
            for (let i = -1; i <= 1; i++) {
                const legY = Math.sin(t + i) * 2;
                ctx.fillRect(i * 5 * s - 2 * s + wobble, 10 * s + legY * s, 4 * s, 4 * s);
            }

        } else if (type === 'dahl') {
            // Criatura vermelha rápida
            const speed = Math.sin(t * 3) * 3 * s;
            ctx.fillStyle = '#ff3322';
            // Corpo triangular
            ctx.beginPath();
            ctx.moveTo(0, -12 * s + speed);
            ctx.lineTo(-9 * s, 8 * s);
            ctx.lineTo(9 * s, 8 * s);
            ctx.closePath(); ctx.fill();
            // Stripes
            ctx.fillStyle = '#ff6655';
            ctx.fillRect(-5 * s, -2 * s + speed, 10 * s, 3 * s);
            // Olhos brilhantes
            ctx.fillStyle = '#ffff00';
            ctx.beginPath(); ctx.arc(-4 * s, -4 * s + speed, 2 * s, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(4 * s, -4 * s + speed, 2 * s, 0, Math.PI * 2); ctx.fill();
            // Pernas
            ctx.fillStyle = '#cc1100';
            ctx.fillRect(-8 * s, 8 * s, 4 * s, 5 * s + Math.sin(t * 3) * 2 * s);
            ctx.fillRect(4 * s, 8 * s, 4 * s, 5 * s - Math.sin(t * 3) * 2 * s);

        } else if (type === 'onil') {
            // Fantasma azul translúcido
            const float = Math.sin(t) * 3 * s;
            ctx.globalAlpha = 0.75;
            // Corpo
            ctx.fillStyle = '#44aaff';
            ctx.beginPath();
            ctx.arc(0, -6 * s + float, 10 * s, Math.PI, 0);
            ctx.lineTo(10 * s, 6 * s + float);
            // Cauda fantasmagórica
            const waves = 3;
            const wStep = 20 * s / waves;
            for (let w = 0; w < waves; w++) {
                const wx = 10 * s - w * wStep;
                ctx.quadraticCurveTo(wx - wStep / 2, 12 * s + float + Math.sin(t + w) * 2 * s, wx - wStep, 6 * s + float);
            }
            ctx.lineTo(-10 * s, 6 * s + float);
            ctx.closePath(); ctx.fill();
            // Brilho
            ctx.fillStyle = 'rgba(150,220,255,0.5)';
            ctx.beginPath(); ctx.ellipse(-3 * s, -10 * s + float, 4 * s, 2.5 * s, -0.3, 0, Math.PI * 2); ctx.fill();
            // Olhos
            ctx.globalAlpha = 1;
            ctx.fillStyle = '#002244';
            ctx.beginPath(); ctx.arc(-4 * s, -5 * s + float, 2.5 * s, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(4 * s, -5 * s + float, 2.5 * s, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#88ccff';
            ctx.beginPath(); ctx.arc(-3 * s, -6 * s + float, 1 * s, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(5 * s, -6 * s + float, 1 * s, 0, Math.PI * 2); ctx.fill();
        }

        ctx.restore();
    }

    function drawBossFallback(ctx, x, y, size, state, animFrame, hpRatio) {
        const s = size / 64;
        const t = animFrame * 0.2;
        const rage = hpRatio < 0.4; // Modo raiva abaixo de 40% HP

        ctx.save();
        ctx.translate(x + size / 2, y + size / 2);

        // Aura de raiva
        if (rage) {
            ctx.globalAlpha = 0.15 + Math.sin(t * 4) * 0.1;
            ctx.fillStyle = '#ff0000';
            ctx.beginPath();
            ctx.arc(0, 0, 34 * s, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = 1;
        }

        // Sombra
        ctx.fillStyle = 'rgba(0,0,0,0.4)';
        ctx.beginPath();
        ctx.ellipse(0, 28 * s, 22 * s, 6 * s, 0, 0, Math.PI * 2);
        ctx.fill();

        // Pernas
        const legA = state === 'stomp' ? -12 * s : Math.sin(t) * 4 * s;
        ctx.fillStyle = '#5c2d00';
        ctx.fillRect(-18 * s, 18 * s, 10 * s, 14 * s + legA);
        ctx.fillRect(8 * s, 18 * s, 10 * s, 14 * s - legA);
        // Botas
        ctx.fillStyle = '#333';
        ctx.fillRect(-20 * s, 30 * s + legA, 13 * s, 6 * s);
        ctx.fillRect(7 * s, 30 * s - legA, 13 * s, 6 * s);

        // Corpo (armadura)
        const bodyColor = rage ? '#8b1a00' : '#5c2d00';
        ctx.fillStyle = bodyColor;
        ctx.fillRect(-20 * s, -2 * s, 40 * s, 22 * s);
        // Placa de armadura
        ctx.fillStyle = rage ? '#cc4400' : '#8b5e00';
        ctx.fillRect(-16 * s, 0, 32 * s, 14 * s);
        // Prega dourada
        ctx.fillStyle = '#ffd100';
        ctx.fillRect(-16 * s, 0, 32 * s, 2 * s);
        ctx.fillRect(-16 * s, 12 * s, 32 * s, 2 * s);

        // Braços
        const armState = state === 'throw' ? -20 * s : (state === 'charge' ? 10 * s : Math.cos(t) * 3 * s);
        ctx.fillStyle = bodyColor;
        ctx.fillRect(-32 * s, -4 * s + armState, 14 * s, 22 * s);
        ctx.fillRect(18 * s, -4 * s - armState, 14 * s, 22 * s);
        // Pauldrons (ombreiras)
        ctx.fillStyle = '#ffd100';
        ctx.fillRect(-32 * s, -8 * s, 14 * s, 7 * s);
        ctx.fillRect(18 * s, -8 * s, 14 * s, 7 * s);

        // Cabeça
        const headBob = state === 'stomp' ? 3 * s : Math.sin(t * 0.5) * 1.5 * s;
        ctx.fillStyle = '#ffaa55';
        ctx.fillRect(-12 * s, -28 * s + headBob, 24 * s, 28 * s);

        // Capacete dourado
        ctx.fillStyle = '#ffd100';
        ctx.fillRect(-14 * s, -32 * s + headBob, 28 * s, 10 * s);
        ctx.fillRect(-10 * s, -38 * s + headBob, 20 * s, 8 * s);
        // Crista
        ctx.fillStyle = '#ff4444';
        ctx.fillRect(-4 * s, -44 * s + headBob, 8 * s, 8 * s);

        // Olhos
        const eyeColor = rage ? '#ff0000' : '#ff6600';
        const eyeGlow = 0.5 + Math.sin(t * 3) * 0.3;
        ctx.fillStyle = eyeColor;
        ctx.globalAlpha = eyeGlow;
        ctx.beginPath(); ctx.arc(-6 * s, -22 * s + headBob, 4 * s, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(6 * s, -22 * s + headBob, 4 * s, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = 1;
        // Pupila
        ctx.fillStyle = '#000';
        ctx.beginPath(); ctx.arc(-6 * s, -22 * s + headBob, 2 * s, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(6 * s, -22 * s + headBob, 2 * s, 0, Math.PI * 2); ctx.fill();

        // Boca
        ctx.fillStyle = '#330000';
        ctx.fillRect(-8 * s, -14 * s + headBob, 16 * s, 4 * s);
        if (rage) {
            // Dentes
            ctx.fillStyle = '#fff';
            for (let i = 0; i < 3; i++) {
                ctx.fillRect((-7 + i * 5) * s, -14 * s + headBob, 3 * s, 4 * s);
            }
        }

        // Bomba gigante na mão (idle/throw)
        if (state === 'idle' || state === 'throw') {
            const bombX = 22 * s;
            const bombY = -4 * s + (state === 'throw' ? -16 * s : 0);
            ctx.fillStyle = '#111';
            ctx.beginPath(); ctx.arc(bombX, bombY, 7 * s, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#fff';
            ctx.font = `${8 * s}px monospace`;
            ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.fillText('💀', bombX, bombY);
            // Pavio
            ctx.strokeStyle = '#ffd100'; ctx.lineWidth = 2 * s;
            ctx.beginPath(); ctx.moveTo(bombX, bombY - 7 * s);
            ctx.quadraticCurveTo(bombX + 5 * s, bombY - 14 * s, bombX + 3 * s, bombY - 18 * s); ctx.stroke();
            // Faísca
            if (Math.sin(t * 8) > 0) {
                ctx.fillStyle = '#ffff00';
                ctx.beginPath(); ctx.arc(bombX + 3 * s, bombY - 18 * s, 2 * s, 0, Math.PI * 2); ctx.fill();
            }
        }

        ctx.restore();
    }

    function drawTileFallback(ctx, tileType, x, y, size, theme) {
        const colors = THEME_COLORS[theme] || THEME_COLORS.forest;
        ctx.save();

        switch (tileType) {
            case 0: // Floor
                ctx.fillStyle = colors.floor;
                ctx.fillRect(x, y, size, size);
                ctx.fillStyle = 'rgba(0,0,0,0.12)';
                for (let i = 0; i < size; i += 8) {
                    ctx.fillRect(x + i, y, 1, size);
                    ctx.fillRect(x, y + i, size, 1);
                }
                break;
            case 1: // Hard wall
                ctx.fillStyle = colors.hardWall;
                ctx.fillRect(x, y, size, size);
                ctx.fillStyle = 'rgba(255,255,255,0.07)';
                for (let ry = 0; ry < size; ry += 8) {
                    for (let rx = (ry % 16 === 0 ? 0 : 4); rx < size; rx += 8) {
                        ctx.fillRect(x + rx, y + ry, 7, 7);
                    }
                }
                ctx.strokeStyle = 'rgba(0,0,0,0.4)';
                ctx.lineWidth = 1;
                ctx.strokeRect(x + 0.5, y + 0.5, size - 1, size - 1);
                break;
            case 2: // Soft block
                ctx.fillStyle = colors.softBlock;
                ctx.fillRect(x, y, size, size);
                // X mark
                ctx.strokeStyle = 'rgba(0,0,0,0.3)'; ctx.lineWidth = 2;
                ctx.beginPath(); ctx.moveTo(x + 4, y + 4); ctx.lineTo(x + size - 4, y + size - 4); ctx.stroke();
                ctx.beginPath(); ctx.moveTo(x + size - 4, y + 4); ctx.lineTo(x + 4, y + size - 4); ctx.stroke();
                // Borda
                ctx.strokeStyle = 'rgba(0,0,0,0.4)'; ctx.lineWidth = 2;
                ctx.strokeRect(x + 1, y + 1, size - 2, size - 2);
                // Brilho
                ctx.fillStyle = 'rgba(255,255,255,0.15)';
                ctx.fillRect(x + 2, y + 2, size - 4, 4);
                break;
        }
        ctx.restore();
    }

    function drawBombFallback(ctx, x, y, size, animFrame) {
        const pulse = 1 + Math.sin(animFrame * 0.4) * 0.06;
        const cx = x + size / 2, cy = y + size / 2;
        const r = (size * 0.38) * pulse;

        ctx.save();
        // Sombra
        ctx.fillStyle = 'rgba(0,0,0,0.4)';
        ctx.beginPath(); ctx.ellipse(cx + 2, cy + r, r * 0.8, r * 0.25, 0, 0, Math.PI * 2); ctx.fill();
        // Corpo bomba
        const grad = ctx.createRadialGradient(cx - r * 0.3, cy - r * 0.3, r * 0.1, cx, cy, r);
        grad.addColorStop(0, '#555');
        grad.addColorStop(1, '#111');
        ctx.fillStyle = grad;
        ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
        // Brilho
        ctx.fillStyle = 'rgba(255,255,255,0.2)';
        ctx.beginPath(); ctx.ellipse(cx - r * 0.25, cy - r * 0.3, r * 0.3, r * 0.2, -0.5, 0, Math.PI * 2); ctx.fill();
        // Pavio
        ctx.strokeStyle = '#88aa44'; ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(cx + r * 0.2, cy - r);
        ctx.quadraticCurveTo(cx + r * 0.7, cy - r * 1.5, cx + r * 0.4, cy - r * 1.8);
        ctx.stroke();
        // Faísca (pisca)
        if (Math.sin(animFrame * 0.6) > 0) {
            ctx.fillStyle = '#ffff00';
            ctx.beginPath(); ctx.arc(cx + r * 0.4, cy - r * 1.8, 3, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#ff8800';
            ctx.beginPath(); ctx.arc(cx + r * 0.35, cy - r * 1.75, 2, 0, Math.PI * 2); ctx.fill();
        }
        ctx.restore();
    }

    function drawExplosionFallback(ctx, x, y, size, dir, isCenter, isEnd, progress) {
        // progress: 0 a 1 (animação)
        const alpha = Math.max(0, 1 - progress * 1.2);
        ctx.save();
        ctx.globalAlpha = alpha;
        const cx = x + size / 2, cy = y + size / 2;

        if (isCenter) {
            // Starburst central
            const r = size * 0.5 * (0.5 + progress * 0.8);
            const g1 = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
            g1.addColorStop(0, '#ffffff');
            g1.addColorStop(0.2, '#ffff00');
            g1.addColorStop(0.6, '#ff8800');
            g1.addColorStop(1, 'rgba(255,50,0,0)');
            ctx.fillStyle = g1;
            ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
            // Raios
            const rays = 8;
            ctx.strokeStyle = '#ffcc00'; ctx.lineWidth = 3;
            for (let i = 0; i < rays; i++) {
                const angle = (i / rays) * Math.PI * 2 + progress;
                const rLen = r * (0.6 + Math.random() * 0.4);
                ctx.beginPath();
                ctx.moveTo(cx, cy);
                ctx.lineTo(cx + Math.cos(angle) * rLen, cy + Math.sin(angle) * rLen);
                ctx.stroke();
            }
        } else {
            // Braço de fogo
            const w = isEnd ? size * 0.4 : size * 0.6;
            const h = isEnd ? size * 0.4 : size * 0.9;
            const fw = dir === 'h' ? h : w;
            const fh = dir === 'h' ? w : h;
            const g2 = ctx.createLinearGradient(cx - fw/2, cy - fh/2, cx + fw/2, cy + fh/2);
            g2.addColorStop(0, '#ff8800');
            g2.addColorStop(0.5, '#ffcc00');
            g2.addColorStop(1, '#ff4400');
            ctx.fillStyle = g2;
            ctx.beginPath();
            ctx.ellipse(cx, cy, fw / 2, fh / 2, 0, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();
    }

    function drawPowerupFallback(ctx, x, y, size, type) {
        const cx = x + size / 2, cy = y + size / 2;
        const t = Date.now() * 0.003;
        ctx.save();
        // Fundo
        const bgColors = { flame:'#ff4444', bomb:'#ffd100', speed:'#4488ff', shield:'#88ffaa', ghost:'#cc88ff' };
        const icons = { flame:'🔥', bomb:'💣', speed:'⚡', shield:'🛡️', ghost:'👻' };
        ctx.fillStyle = bgColors[type] || '#888';
        ctx.globalAlpha = 0.9;
        ctx.beginPath();
        ctx.roundRect(x + 2, y + 2, size - 4, size - 4, 5);
        ctx.fill();
        ctx.globalAlpha = 1;
        // Brilho pulsante
        ctx.strokeStyle = 'rgba(255,255,255,0.6)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.roundRect(x + 2, y + 2, size - 4, size - 4, 5);
        ctx.stroke();
        // Ícone
        ctx.font = `${size * 0.5}px serif`;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(icons[type] || '?', cx, cy + Math.sin(t) * 1.5);
        ctx.restore();
    }

    // Cores temáticas por fase
    const THEME_COLORS = {
        forest: { floor: '#1a2a0a', hardWall: '#2d4a1a', softBlock: '#4a2d0a' },
        volcano: { floor: '#2a0a00', hardWall: '#4a1a00', softBlock: '#6a2a00' },
        ice:    { floor: '#0a1a2a', hardWall: '#1a2a4a', softBlock: '#2a3a5a' },
        city:   { floor: '#1a1a1a', hardWall: '#2a2a2a', softBlock: '#3a2a1a' },
        boss:   { floor: '#1a0000', hardWall: '#2a0000', softBlock: '#3a1a00' },
    };

    return {
        loadAll,
        isLoaded,
        get,
        PLAYER_FRAMES,
        ENEMY_FRAMES,
        TILE_FRAMES,
        BOSS1_FRAMES,
        drawFrame,
        // Fallbacks
        drawPlayer: drawPlayerFallback,
        drawEnemy: drawEnemyFallback,
        drawBoss: drawBossFallback,
        drawTile: drawTileFallback,
        drawBomb: drawBombFallback,
        drawExplosion: drawExplosionFallback,
        drawPowerup: drawPowerupFallback,
        THEME_COLORS,
    };
})();
