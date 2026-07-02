const CFG = {
    // Grid
    COLS: 15,
    ROWS: 13,
    CELL: 48,

    // Tile types
    TILE_EMPTY: 0,
    TILE_WALL: 1,
    TILE_BLOCK: 2,

    // Game
    INITIAL_LIVES: 3,
    PLAYER_SPEED: 3,
    BASE_BOMBS: 1,
    BASE_POWER: 1,
    BOMB_TIMER: 2500,
    EXPLOSION_DURATION: 400,
    INVINCIBLE_TIME: 2000,

    // Enemies per level
    ENEMIES_BASE: 3,
    ENEMIES_PER_LEVEL: 1,

    // Powerup types
    PU_BOMB: 'bomb',
    PU_FIRE: 'fire',
    PU_SPEED: 'speed',
    PU_KICK: 'kick',
    PU_REMOTE: 'remote',

    // Enemy types
    ENEMY_SLIME: 'slime',
    ENEMY_GHOST: 'ghost',
    ENEMY_DEMON: 'demon',

    // Football theme colors
    COLOR_BG: '#1a472a',
    COLOR_WALL: '#5c5c7a',
    COLOR_WALL_HIGHLIGHT: '#7a7a9a',
    COLOR_WALL_SHADOW: '#4a4a6a',
    COLOR_BLOCK: '#c8722a',
    COLOR_BLOCK_HIGHLIGHT: '#e08830',
    COLOR_BLOCK_SHADOW: '#a05a1a',
    COLOR_FLOOR_1: '#2d7a3a',
    COLOR_FLOOR_2: '#258a35',
    COLOR_EXIT: '#ffd700',

    // Football specific
    COLOR_BALL: '#ffffff',
    COLOR_JERSEY: '#1a6dd4',
    COLOR_SHORTS: '#ffffff',
    COLOR_SKIN: '#e8b87a',
};
