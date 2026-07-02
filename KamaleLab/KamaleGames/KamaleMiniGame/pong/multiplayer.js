// ─── MÓDULO MULTIPLAYER (Firebase Realtime Database) ──────────────────────────
// Gerencia salas, sincronização de estado e modo espectador para Pong.

const Multiplayer = (() => {
    const db = firebase.database();

    // IDs únicos do jogador
    const playerId = 'p_' + Math.random().toString(36).substr(2, 9);

    // Cores para até 2 jogadores
    const COLORS = ['#3acc7a', '#00c8ff'];

    // Estado
    let roomCode = null;
    let isHost = false;
    let playerName = '';
    let playerColor = '';
    let roomDisplayName = '';
    let players = {};
    let ball = { x: 400, y: 300, vx: 5, vy: 3 };
    let roomStatus = 'waiting';

    // Referências Firebase
    let roomRef = null;
    let playersRef = null;

    // Callbacks
    let cbPlayers = null;
    let cbFood = null;
    let cbBall = null;
    let cbStatus = null;
    let cbRoomDeleted = null;
    let cbScores = null;

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
        roomDisplayName = roomName || 'Sala ' + roomCode;
        playerColor = COLORS[0];

        roomRef = db.ref('rooms/' + roomCode);
        playersRef = roomRef.child('players/' + playerId);

        // Criar sala no banco
        roomRef.set({
            host: playerId,
            status: 'waiting',
            game: 'pong',
            roomName: roomName || 'Sala ' + roomCode,
            ball: { x: 400, y: 300, vx: 5, vy: 3 },
            createdAt: firebase.database.ServerValue.TIMESTAMP
        });

        // Adicionar jogador à sala
        playersRef.set({
            name: playerName,
            color: playerColor,
            paddle: 250,
            score: 0,
            alive: true,
            isMoving: false,
            ready: false,
            wantsRematch: false
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
            if (count >= 2) {
                callback(null, 'Sala cheia (máx. 2 jogadores)');
                return;
            }

            roomDisplayName = data.roomName || '';

            // Atribuir cor baseada na posição (evitando colisão com jogadores existentes)
            const usedColors = Object.values(data.players || {}).map(p => p.color);
            playerColor = COLORS.find(c => !usedColors.includes(c)) || COLORS[count % COLORS.length];

            playersRef = roomRef.child('players/' + playerId);
            playersRef.set({
                name: playerName,
                color: playerColor,
                paddle: 250,
                score: 0,
                alive: true,
                isMoving: false,
                ready: false,
                wantsRematch: false
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

        // Ball mudou (host envia estado da bola)
        roomRef.child('ball').on('value', (snap) => {
            if (snap.exists()) {
                ball = snap.val();
                if (cbBall) cbBall(ball);
            }
        });

        // Status da sala mudou
        roomRef.child('status').on('value', (snap) => {
            if (snap.exists()) {
                roomStatus = snap.val();
                if (roomStatus === 'gameover') {
                    roomRef.child('scores').once('value').then(scoreSnap => {
                        if (scoreSnap.exists() && cbScores) {
                            cbScores(scoreSnap.val());
                        }
                        if (cbStatus) cbStatus(roomStatus);
                    });
                } else {
                    if (cbStatus) cbStatus(roomStatus);
                }
            }
        });

        // Sala deletada (host saiu)
        roomRef.on('value', (snap) => {
            if (!snap.exists() && roomCode) {
                if (cbRoomDeleted) cbRoomDeleted();
            }
        });

        // Pausa de outro jogador
        roomRef.child('pausedBy').on('value', (snap) => {
            if (cbPauseUpdate) {
                cbPauseUpdate(snap.exists() ? snap.val() : null);
            }
        });

        // Scores sincronizados
        roomRef.child('scores').on('value', (snap) => {
            if (snap.exists() && cbScores) cbScores(snap.val());
        });
    }

    // ─── ENVIAR ESTADO ────────────────────────────────────────────────────

    function sendDirection(dir) {
        if (playersRef) playersRef.child('direction').set(dir);
    }

    function sendPaddle(x, y) {
        if (playersRef) playersRef.child('paddle').set({ x: x, y: y });
    }

    function sendBallState(state) {
        if (isHost && roomRef) {
            roomRef.child('ball').set(state);
        }
    }

    function sendScore(score) {
        if (playersRef) playersRef.child('score').set(score);
    }

    function sendScores(hostScore, guestScore) {
        if (isHost && roomRef) {
            roomRef.child('scores').set({ host: hostScore, guest: guestScore });
        }
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
    }

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

    function startGame() {
        Object.keys(players).forEach(id => {
            if (players[id]) {
                players[id].score = 0;
                players[id].alive = true;
                players[id].isMoving = false;
                players[id].ready = false;
                delete players[id].wantsRematch;
            }
        });
        if (isHost && roomRef) {
            const update = { status: 'playing' };
            Object.keys(players).forEach(id => {
                update['players/' + id + '/score'] = 0;
                update['players/' + id + '/alive'] = true;
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
        Object.keys(players).forEach(id => {
            if (players[id]) {
                players[id].score = 0;
                players[id].alive = true;
                players[id].isMoving = false;
                players[id].ready = false;
                delete players[id].wantsRematch;
            }
        });
        if (isHost && roomRef) {
            roomRef.child('status').set('waiting');
            roomRef.child('scores').set({ host: 0, guest: 0 });
            const updates = {};
            Object.keys(players).forEach(id => {
                updates[id + '/score'] = 0;
                updates[id + '/alive'] = true;
                updates[id + '/isMoving'] = false;
                updates[id + '/ready'] = false;
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
            roomRef.child('ball').off();
            roomRef.child('status').off();
            roomRef.child('scores').off();
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
                if (data.game !== 'pong') return;
                const playerCount = Object.keys(data.players || {}).length;
                rooms.push({
                    code: child.key,
                    roomName: data.roomName || 'Sala',
                    players: playerCount,
                    maxPlayers: 2
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
        sendPaddle,
        sendBallState,
        sendScore,
        sendScores,
        sendMoving,
        sendState,
        sendReady,
        sendRematch,
        clearRematch,
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
        get ball() { return ball; },
        get playerColor() { return playerColor; },
        get playerName() { return playerName; },
        get roomStatus() { return roomStatus; },
        get roomDisplayName() { return roomDisplayName; },

        set onPlayersUpdate(fn) { cbPlayers = fn; },
        set onFoodUpdate(fn) { cbFood = fn; },
        set onBallUpdate(fn) { cbBall = fn; },
        set onStatusUpdate(fn) { cbStatus = fn; },
        set onRoomDeleted(fn) { cbRoomDeleted = fn; },
        set onPauseUpdate(fn) { cbPauseUpdate = fn; },
        set onScoresUpdate(fn) { cbScores = fn; },

        // Test helpers
        _triggerScores: (s) => cbScores && cbScores(s),
        _triggerBall: (b) => cbBall && cbBall(b)
    };
})();