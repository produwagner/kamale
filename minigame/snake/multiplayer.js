// ─── MÓDULO MULTIPLAYER (Firebase Realtime Database) ──────────────────────────
// Gerencia salas, sincronização de estado e modo espectador.

const Multiplayer = (() => {
    const db = firebase.database();

    // IDs únicos do jogador
    const playerId = 'p_' + Math.random().toString(36).substr(2, 9);

    // Cores para até 4 jogadores
    const COLORS = ['#3acc7a', '#00c8ff', '#ff6b6b', '#ffd100'];

    // Estado
    let roomCode = null;
    let isHost = false;
    let playerName = '';
    let playerColor = '';
    let players = {};
    let roomStatus = 'waiting';
    let roomDisplayName = '';

    // Referências Firebase
    let roomRef = null;
    let playersRef = null;

    // Callbacks
    let cbPlayers = null;
    let cbFood = null;
    let cbStatus = null;
    let cbRoomDeleted = null;

    // ─── UTILITÁRIOS ──────────────────────────────────────────────────────

    function generateCode() {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        let code = '';
        for (let i = 0; i < 6; i++) {
            code += chars[Math.floor(Math.random() * chars.length)];
        }
        return code;
    }

    function getPlayerCount() {
        return Object.keys(players).length;
    }

    function getAlivePlayers() {
        return Object.entries(players)
            .filter(([, p]) => p.alive)
            .map(([id, p]) => ({ id, ...p }));
    }

    function getSortedPlayers() {
        return Object.entries(players)
            .map(([id, p]) => ({ id, ...p }))
            .sort((a, b) => b.score - a.score);
    }

    // ─── CRIAR SALA ───────────────────────────────────────────────────────

    function createRoom(name, roomName, callback) {
        playerName = name;
        roomCode = generateCode();
        isHost = true;
        playerColor = COLORS[0];

        roomDisplayName = roomName || 'Sala ' + roomCode;

        roomRef = db.ref('rooms/' + roomCode);
        playersRef = roomRef.child('players/' + playerId);

        // Criar sala no banco
        roomRef.set({
            host: playerId,
            status: 'waiting',
            game: 'snake',
            roomName: roomDisplayName,
            food: { x: 10, y: 10 },
            createdAt: firebase.database.ServerValue.TIMESTAMP
        });

        // Adicionar jogador à sala
        playersRef.set({
            name: playerName,
            color: playerColor,
            snake: [],
            direction: { x: 0, y: 0 },
            score: 0,
            alive: true,
            isMoving: false,
            ready: false
        });

        // Se o host sair, deletar a sala inteira
        roomRef.onDisconnect().remove();

        // Iniciar listeners
        setupListeners();

        callback(roomCode);
    }

    // ─── ENTRAR NA SALA ───────────────────────────────────────────────────

    function joinRoom(code, name, callback) {
        roomCode = code.toUpperCase().trim();
        playerName = name;
        isHost = false;

        roomRef = db.ref('rooms/' + roomCode);

        roomRef.once('value', (snap) => {
            if (!snap.exists()) {
                callback(null, 'Sala não encontrada');
                return;
            }

            const data = snap.val();
            if (data.status !== 'waiting') {
                callback(null, 'Jogo já em andamento');
                return;
            }

            const count = Object.keys(data.players || {}).length;
            if (count >= 4) {
                callback(null, 'Sala cheia (máx. 4 jogadores)');
                return;
            }

            roomDisplayName = data.roomName || '';

            // Atribuir cor baseada em cores disponíveis
            const usedColors = Object.values(data.players || {}).map(p => p.color);
            playerColor = COLORS.find(c => !usedColors.includes(c)) || COLORS[count % COLORS.length];

            playersRef = roomRef.child('players/' + playerId);
            playersRef.set({
                name: playerName,
                color: playerColor,
                snake: [],
                direction: { x: 0, y: 0 },
                score: 0,
                alive: true,
                isMoving: false,
                ready: false
            });

            // Remover jogador se desconectar
            playersRef.onDisconnect().remove();

            // Iniciar listeners
            setupListeners();

            callback(roomCode);
        });
    }

    // ─── LISTENERS DO FIREBASE ────────────────────────────────────────────

    function setupListeners() {
        // Jogadores mudaram
        roomRef.child('players').on('value', (snap) => {
            players = snap.val() || {};
            if (cbPlayers) cbPlayers(players);
        });

        // Comida mudou
        roomRef.child('food').on('value', (snap) => {
            if (snap.exists()) {
                food = snap.val();
                if (cbFood) cbFood(food);
            }
        });

        // Status da sala mudou
        roomRef.child('status').on('value', (snap) => {
            if (snap.exists()) {
                roomStatus = snap.val();
                if (cbStatus) cbStatus(roomStatus);
            }
        });

        // Sala deletada (host saiu)
        roomRef.on('value', (snap) => {
            if (!snap.exists() && roomCode) {
                if (cbRoomDeleted) cbRoomDeleted();
            }
        });

        // Comida comida por outro jogador (host regenera)
        roomRef.child('foodEaten').on('value', (snap) => {
            if (snap.exists() && isHost && cbFoodEaten) {
                cbFoodEaten();
                roomRef.child('foodEaten').remove();
            }
        });

        // Pausa de outro jogador
        roomRef.child('pausedBy').on('value', (snap) => {
            if (cbPauseUpdate) {
                cbPauseUpdate(snap.exists() ? snap.val() : null);
            }
        });
    }

    // ─── ENVIAR ESTADO ────────────────────────────────────────────────────

    function sendDirection(dir) {
        if (playersRef) playersRef.child('direction').set(dir);
    }

    function sendSnake(snake) {
        if (playersRef) playersRef.child('snake').set(snake);
    }

    function sendScore(score) {
        if (playersRef) playersRef.child('score').set(score);
    }

    function sendMoving(moving) {
        if (playersRef) playersRef.child('isMoving').set(moving);
    }

    function sendState(state) {
        if (playersRef) playersRef.update(state);
    }

    function sendReady(isReady) {
        if (players[playerId]) players[playerId].ready = isReady;
        if (playersRef) playersRef.child('ready').set(isReady);
    }

    function sendRematch(wants) {
        if (players[playerId]) players[playerId].wantsRematch = wants;
        if (playersRef) playersRef.child('wantsRematch').set(wants);
    }

    function clearRematch() {
        if (players[playerId]) delete players[playerId].wantsRematch;
        if (playersRef) playersRef.child('wantsRematch').remove();
        if (isHost && roomRef) {
            const updates = {};
            Object.keys(players).forEach(id => {
                updates[id + '/wantsRematch'] = null;
            });
            roomRef.child('players').update(updates);
        }
    }

    // ─── COMIDA (só host gera) ────────────────────────────────────────────

    function setFood(newFood) {
        if (isHost && roomRef) {
            roomRef.child('food').set(newFood);
        }
    }

    function notifyFoodEaten() {
        if (!isHost && roomRef) {
            roomRef.child('foodEaten').set({ playerId: playerId, t: Date.now() });
        }
    }

    let cbFoodEaten = null;

    // ─── PAUSA ─────────────────────────────────────────────────────────────

    function sendPause(playerName) {
        if (roomRef) {
            roomRef.child('pausedBy').set(playerName);
        }
    }

    function sendUnpause() {
        if (roomRef) {
            roomRef.child('pausedBy').remove();
        }
    }

    let cbPauseUpdate = null;

    // ─── CONTROLE DO JOGO ─────────────────────────────────────────────────

    function startGame(foodData) {
        if (isHost && roomRef) {
            const update = { status: 'playing' };
            if (foodData) update.food = foodData;
            Object.keys(players).forEach(id => {
                if (players[id]) {
                    players[id].alive = true;
                    players[id].score = 0;
                    players[id].snake = [];
                    players[id].isMoving = false;
                    players[id].ready = false;
                    delete players[id].wantsRematch;
                }
                update['players/' + id + '/alive'] = true;
                update['players/' + id + '/score'] = 0;
                update['players/' + id + '/snake'] = [];
                update['players/' + id + '/isMoving'] = false;
                update['players/' + id + '/ready'] = false;
                update['players/' + id + '/wantsRematch'] = null;
            });
            roomRef.update(update);
        }
    }

    function markDead() {
        if (playersRef) {
            playersRef.update({ alive: false });
        }
    }

    function endRoom() {
        if (isHost && roomRef) {
            roomRef.child('status').set('ended');
        }
    }

    function resetToLobby() {
        if (isHost && roomRef) {
            roomRef.child('status').set('waiting');
            roomRef.child('food').set({ x: 10, y: 10 });
            const updates = {};
            Object.keys(players).forEach(id => {
                if (players[id]) {
                    players[id].ready = false;
                    players[id].alive = true;
                    players[id].score = 0;
                    players[id].snake = [];
                    players[id].isMoving = false;
                    delete players[id].wantsRematch;
                }
                updates[id + '/ready'] = false;
                updates[id + '/alive'] = true;
                updates[id + '/score'] = 0;
                updates[id + '/snake'] = [];
                updates[id + '/isMoving'] = false;
                updates[id + '/wantsRematch'] = null;
            });
            roomRef.child('players').update(updates);
        }
    }

    function resetStatus() {
        if (isHost && roomRef) {
            roomRef.child('status').set('waiting');
        }
    }

    // ─── SAIR DA SALA ─────────────────────────────────────────────────────

    function leaveRoom() {
        if (playersRef) playersRef.remove();

        if (isHost && roomRef) {
            roomRef.remove();
        }

        // Limpar listeners
        if (roomRef) {
            roomRef.child('players').off();
            roomRef.child('food').off();
            roomRef.child('status').off();
            roomRef.off();
        }

        roomRef = null;
        playersRef = null;
        roomCode = null;
        isHost = false;
        players = {};
    }

    // ─── GETTERS ──────────────────────────────────────────────────────────

    function getAvailableRooms(callback) {
        db.ref('rooms').orderByChild('status').equalTo('waiting').once('value', (snap) => {
            const rooms = [];
            snap.forEach(child => {
                const data = child.val();
                if (data.game !== 'snake') return;
                const playerCount = Object.keys(data.players || {}).length;
                rooms.push({
                    code: child.key,
                    roomName: data.roomName || 'Sala',
                    players: playerCount,
                    maxPlayers: 4
                });
            });
            callback(rooms);
        });
    }
    return {
        createRoom,
        joinRoom,
        leaveRoom,
        sendDirection,
        sendSnake,
        sendScore,
        sendMoving,
        sendState,
        sendReady,
        sendRematch,
        clearRematch,
        setFood,
        notifyFoodEaten,
        startGame,
        markDead,
        endRoom,
        resetToLobby,
        resetStatus,
        sendPause,
        sendUnpause,
        getPlayerCount,
        getAlivePlayers,
        getSortedPlayers,
        getAvailableRooms,
        generateCode,

        get playerId() { return playerId; },
        get roomCode() { return roomCode; },
        get isHost() { return isHost; },
        get players() { return players; },
        get food() { return food; },
        get playerColor() { return playerColor; },
        get playerName() { return playerName; },
        get roomStatus() { return roomStatus; },
        get roomDisplayName() { return roomDisplayName; },

        set onPlayersUpdate(fn) { cbPlayers = fn; },
        set onFoodUpdate(fn) { cbFood = fn; },
        set onStatusUpdate(fn) { cbStatus = fn; },
        set onRoomDeleted(fn) { cbRoomDeleted = fn; },
        set onFoodEaten(fn) { cbFoodEaten = fn; },
    };
})();
window.Multiplayer = Multiplayer;
