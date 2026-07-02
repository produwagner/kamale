const GameMap = {
    grid: [],
    exitPos: null,
    totalBlocks: 0,

    init(level) {
        const cols = CFG.COLS;
        const rows = CFG.ROWS;
        this.grid = [];
        this.exitPos = null;
        this.totalBlocks = 0;

        for (let r = 0; r < rows; r++) {
            this.grid[r] = [];
            for (let c = 0; c < cols; c++) {
                if (r === 0 || r === rows - 1 || c === 0 || c === cols - 1) {
                    this.grid[r][c] = CFG.TILE_WALL;
                } else if (r % 2 === 0 && c % 2 === 0) {
                    this.grid[r][c] = CFG.TILE_WALL;
                } else {
                    this.grid[r][c] = CFG.TILE_EMPTY;
                }
            }
        }

        const safeTiles = [[1, 1], [1, 2], [2, 1]];
        const exitR = rows - 2;
        const exitC = cols - 2;
        const exitSafe = [];
        for (let dr = -1; dr <= 1; dr++) {
            for (let dc = -1; dc <= 1; dc++) {
                exitSafe.push([exitR + dr, exitC + dc]);
            }
        }

        const blockDensity = Math.min(0.75, 0.5 + level * 0.03);
        for (let r = 1; r < rows - 1; r++) {
            for (let c = 1; c < cols - 1; c++) {
                if (this.grid[r][c] === CFG.TILE_EMPTY) {
                    const isSafe = safeTiles.some(s => s[0] === r && s[1] === c) ||
                                   exitSafe.some(s => s[0] === r && s[1] === c);
                    if (!isSafe && Math.random() < blockDensity) {
                        this.grid[r][c] = CFG.TILE_BLOCK;
                        this.totalBlocks++;
                    }
                }
            }
        }

        const exitCandidates = [];
        for (let r = rows - 2; r >= Math.floor(rows / 2); r--) {
            for (let c = cols - 2; c >= Math.floor(cols / 2); c--) {
                if (this.grid[r][c] === CFG.TILE_BLOCK) {
                    exitCandidates.push([r, c]);
                }
            }
        }
        if (exitCandidates.length > 0) {
            const pick = exitCandidates[Math.floor(Math.random() * exitCandidates.length)];
            this.exitPos = { r: pick[0], c: pick[1] };
        } else {
            this.exitPos = { r: rows - 2, c: cols - 2 };
            this.grid[rows - 2][cols - 2] = CFG.TILE_EMPTY;
        }
    },

    getTile(r, c) {
        if (r < 0 || r >= CFG.ROWS || c < 0 || c >= CFG.COLS) return CFG.TILE_WALL;
        return this.grid[r][c];
    },

    setTile(r, c, val) {
        if (r >= 0 && r < CFG.ROWS && c >= 0 && c < CFG.COLS) {
            this.grid[r][c] = val;
        }
    },

    isWalkable(r, c) {
        if (r < 0 || r >= CFG.ROWS || c < 0 || c >= CFG.COLS) return false;
        return this.grid[r][c] === CFG.TILE_EMPTY;
    },

    pixelToTile(px, py) {
        return {
            c: Math.floor(px / CFG.CELL),
            r: Math.floor(py / CFG.CELL)
        };
    },

    tileToPixel(r, c) {
        return {
            x: c * CFG.CELL,
            y: r * CFG.CELL
        };
    },

    destroyBlock(r, c) {
        if (this.grid[r][c] === CFG.TILE_BLOCK) {
            this.grid[r][c] = CFG.TILE_EMPTY;
            this.totalBlocks--;
            return true;
        }
        return false;
    },

    render(ctx) {
        const cell = CFG.CELL;
        for (let r = 0; r < CFG.ROWS; r++) {
            for (let c = 0; c < CFG.COLS; c++) {
                const x = c * cell;
                const y = r * cell;
                const tile = this.grid[r][c];

                // Football field grass
                const isCheckerLight = (r + c) % 2 === 0;
                ctx.fillStyle = isCheckerLight ? CFG.COLOR_FLOOR_1 : CFG.COLOR_FLOOR_2;
                ctx.fillRect(x, y, cell, cell);

                // Grass lines on empty tiles
                if (tile === CFG.TILE_EMPTY) {
                    ctx.strokeStyle = 'rgba(255,255,255,0.06)';
                    ctx.lineWidth = 1;
                    ctx.beginPath();
                    ctx.moveTo(x, y + cell/2);
                    ctx.lineTo(x + cell, y + cell/2);
                    ctx.stroke();
                }

                if (tile === CFG.TILE_WALL) {
                    // Stadium wall / concrete
                    ctx.fillStyle = CFG.COLOR_WALL;
                    ctx.fillRect(x, y, cell, cell);
                    ctx.fillStyle = CFG.COLOR_WALL_HIGHLIGHT;
                    ctx.fillRect(x + 2, y + 2, cell - 4, 3);
                    ctx.fillRect(x + 2, y + 2, 3, cell - 4);
                    ctx.fillStyle = CFG.COLOR_WALL_SHADOW;
                    ctx.fillRect(x + 2, y + cell - 5, cell - 4, 3);
                    ctx.fillRect(x + cell - 5, y + 2, 3, cell - 4);
                    // Stadium pattern - small windows
                    ctx.fillStyle = 'rgba(0,0,0,0.15)';
                    ctx.fillRect(x + cell * 0.3, y + cell * 0.3, cell * 0.15, cell * 0.15);
                    ctx.fillRect(x + cell * 0.6, y + cell * 0.3, cell * 0.15, cell * 0.15);
                    ctx.fillRect(x + cell * 0.3, y + cell * 0.6, cell * 0.15, cell * 0.15);
                    ctx.fillRect(x + cell * 0.6, y + cell * 0.6, cell * 0.15, cell * 0.15);
                } else if (tile === CFG.TILE_BLOCK) {
                    // Tribuna / Arquibancada
                    ctx.fillStyle = CFG.COLOR_BLOCK;
                    ctx.fillRect(x + 1, y + 1, cell - 2, cell - 2);
                    ctx.fillStyle = CFG.COLOR_BLOCK_HIGHLIGHT;
                    ctx.fillRect(x + 2, y + 2, cell - 4, 2);
                    ctx.fillRect(x + 2, y + 2, 2, cell - 4);
                    ctx.fillStyle = CFG.COLOR_BLOCK_SHADOW;
                    ctx.fillRect(x + 2, y + cell - 4, cell - 4, 2);
                    ctx.fillRect(x + cell - 4, y + 2, 2, cell - 4);
                    // Bleacher rows
                    ctx.strokeStyle = 'rgba(0,0,0,0.25)';
                    ctx.lineWidth = 1;
                    for (let i = 1; i < 4; i++) {
                        ctx.beginPath();
                        ctx.moveTo(x + 3, y + cell * i / 4);
                        ctx.lineTo(x + cell - 3, y + cell * i / 4);
                        ctx.stroke();
                    }
                    // Tiny fans
                    const fanColors = ['#ff4444', '#4444ff', '#ffcc00', '#44ff44'];
                    for (let i = 0; i < 3; i++) {
                        for (let j = 0; j < 3; j++) {
                            ctx.fillStyle = fanColors[(i + j + r + c) % fanColors.length];
                            ctx.fillRect(x + 4 + i * 14, y + 6 + j * 14, 4, 6);
                            ctx.beginPath();
                            ctx.arc(x + 6 + i * 14, y + 4 + j * 14, 2.5, 0, Math.PI * 2);
                            ctx.fill();
                        }
                    }
                }

                // Exit - Golden ball
                if (this.exitPos && this.exitPos.r === r && this.exitPos.c === c && tile === CFG.TILE_EMPTY) {
                    const pulse = 0.5 + 0.5 * Math.sin(Date.now() / 300);
                    // Glow
                    ctx.fillStyle = `rgba(255, 215, 0, ${0.15 + pulse * 0.2})`;
                    ctx.beginPath();
                    ctx.arc(x + cell/2, y + cell/2, cell * 0.45, 0, Math.PI * 2);
                    ctx.fill();
                    // Ball
                    this.drawBall(ctx, x + cell/2, y + cell/2, cell * 0.35);
                }
            }
        }

        // Field markings on center
        const cx = Math.floor(CFG.COLS / 2) * cell;
        const cy = Math.floor(CFG.ROWS / 2) * cell;
        ctx.strokeStyle = 'rgba(255,255,255,0.12)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(cx + cell/2, cy + cell/2, cell * 1.5, 0, Math.PI * 2);
        ctx.stroke();
    },

    drawBall(ctx, cx, cy, size) {
        // Soccer ball
        ctx.fillStyle = CFG.COLOR_BALL;
        ctx.beginPath();
        ctx.arc(cx, cy, size, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Pentagon pattern
        ctx.fillStyle = '#333';
        ctx.beginPath();
        ctx.arc(cx, cy, size * 0.3, 0, Math.PI * 2);
        ctx.fill();

        // Hexagon patches
        for (let i = 0; i < 5; i++) {
            const angle = (i / 5) * Math.PI * 2 - Math.PI / 2;
            const px = cx + Math.cos(angle) * size * 0.6;
            const py = cy + Math.sin(angle) * size * 0.6;
            ctx.fillStyle = '#555';
            ctx.beginPath();
            ctx.arc(px, py, size * 0.18, 0, Math.PI * 2);
            ctx.fill();
        }

        // Shine
        ctx.fillStyle = 'rgba(255,255,255,0.4)';
        ctx.beginPath();
        ctx.arc(cx - size * 0.25, cy - size * 0.25, size * 0.2, 0, Math.PI * 2);
        ctx.fill();
    }
};
