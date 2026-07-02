// ─── MÓDULO MULTIPLAYER (Firebase Realtime Database) ──────────────────────────
// Gerencia salas, sincronização de estado e turnos para o Vea Game.

const Multiplayer = (() => {
    const db = firebase.database();

    // IDs únicos do jogador
    const playerId = 'p_' + Math.random().toString(36).substr(2, 9);

    // Cores para até 2 jogadores
    const COLORS = ['#3acc7a', '#ff4a4a']; // Verde (X) e Vermelho (O)

    // Estado
    let roomCode = null;
    let isHost = false;
    let playerName = '';
    let playerSymbol = '';
    let playerColor = '';
    let players = {};
    let board = Array(9).fill("");
    let currentPlayerSymbol = "X";
    let roomStatus = 'waiting';
    let roomDisplayName = '';

    // Referências Firebase
    let roomRef = null;
    let playersRef = null;

    // Callbacks públicos
    let onPlayersUpdate = null;
    let onStatusUpdate = null;
    let onBoardUpdate = null;
    let onRoomDeleted = null;
    let onPauseUpdate = null;

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

    // ─── CRIAR SALA ───────────────────────────────────────────────────────

    function createRoom(name, roomName, callback) {
        playerName = name;
        roomCode = generateCode();
        isHost = true;
        playerSymbol = 'X';
        playerColor = COLORS[0];
        roomDisplayName = roomName || 'Sala ' + roomCode;

        roomRef = db.ref('rooms/' + roomCode);
        playersRef = roomRef.child('players/' + playerId);

        // Criar sala no banco
        roomRef.set({
            host: playerId,
            status: 'waiting',
            game: 'veagame',
            roomName: roomDisplayName,
            board: Array(9).fill(""),
            currentPlayerSymbol: 'X',
            winner: '',
            createdAt: firebase.database.ServerValue.TIMESTAMP
        });

        players[playerId] = {
            name: playerName,
            color: playerColor,
            symbol: playerSymbol,
            score: 0,
            alive: true,
            ready: false,
            wantsRematch: false
        };

        // Adicionar jogador à sala
        playersRef.set({
            name: playerName,
            color: playerColor,
            symbol: playerSymbol,
            score: 0,
            alive: true,
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
        playerSymbol = 'O';
        playerColor = COLORS[1];

        roomRef = db.ref('rooms/' + roomCode);

        roomRef.once('value', (snap) => {
            if (!snap.exists()) {
                callback(null, 'Sala não encontrada');
                return;
            }

            const data = snap.val();
            roomDisplayName = data.roomName || 'Sala ' + roomCode;
            if (data.status !== 'waiting') {
                callback(null, 'Jogo já em andamento');
                return;
            }

            const count = Object.keys(data.players || {}).length;
            if (count >= 2) {
                callback(null, 'Sala cheia (máx. 2 jogadores)');
                return;
            }

            const existingPlayers = Object.values(data.players || {});
            const usedColor = existingPlayers[0]?.color;
            playerColor = usedColor === COLORS[0] ? COLORS[1] : COLORS[0];
            playerSymbol = 'O';

            players[playerId] = {
                name: playerName,
                color: playerColor,
                symbol: playerSymbol,
                score: 0,
                alive: true,
                ready: false,
                wantsRematch: false
            };

            playersRef = roomRef.child('players/' + playerId);
            playersRef.set({
                name: playerName,
                color: playerColor,
                symbol: playerSymbol,
                score: 0,
                alive: true,
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
            if (onPlayersUpdate) onPlayersUpdate(players);
        });

        // Tabuleiro mudou
        roomRef.child('board').on('value', (snap) => {
            if (snap.exists()) {
                board = snap.val();
                if (onBoardUpdate) onBoardUpdate(board, currentPlayerSymbol);
            }
        });

        // Turno mudou
        roomRef.child('currentPlayerSymbol').on('value', (snap) => {
            if (snap.exists()) {
                currentPlayerSymbol = snap.val();
                if (onBoardUpdate) onBoardUpdate(board, currentPlayerSymbol);
            }
        });

        // Status da sala mudou
        roomRef.child('status').on('value', (snap) => {
            if (snap.exists()) {
                roomStatus = snap.val();
                if (roomStatus === 'finished') {
                    roomRef.child('winner').once('value', function (winnerSnap) {
                        var winner = winnerSnap.val() || null;
                        if (onStatusUpdate) onStatusUpdate(roomStatus, winner);
                    });
                } else {
                    if (onStatusUpdate) onStatusUpdate(roomStatus);
                }
            }
        });

        // Sala deletada (host saiu)
        roomRef.on('value', (snap) => {
            if (!snap.exists() && roomCode) {
                if (onRoomDeleted) onRoomDeleted();
            }
        });

        // Pausa de outro jogador
        roomRef.child('pausedBy').on('value', (snap) => {
            if (onPauseUpdate) {
                onPauseUpdate(snap.exists() ? snap.val() : null);
            }
        });
    }

    // ─── ENVIAR AÇÕES ─────────────────────────────────────────────────────

    function sendMove(newBoard, nextPlayerSymbol) {
        if (roomRef) {
            roomRef.update({
                board: newBoard,
                currentPlayerSymbol: nextPlayerSymbol
            });
        }
    }

    function sendGameOver(winnerSymbol) {
        if (roomRef) {
            const updates = {
                status: 'finished',
                winner: winnerSymbol
            };
            if (winnerSymbol === 'X' || winnerSymbol === 'O') {
                for (const id in players) {
                    if (players[id].symbol === winnerSymbol) {
                        const newScore = (players[id].score || 0) + 1;
                        players[id].score = newScore;
                        updates['players/' + id + '/score'] = newScore;
                        break;
                    }
                }
            }
            roomRef.update(updates);
            if (onPlayersUpdate) onPlayersUpdate(players);
        }
    }

    function sendReady(isReady) {
        if (players[playerId]) players[playerId].ready = isReady;
        if (onPlayersUpdate) onPlayersUpdate(players);
        if (playersRef) {
            playersRef.child('ready').set(isReady);
        }
    }

    function sendRematch(wants) {
        if (players[playerId]) players[playerId].wantsRematch = wants;
        if (onPlayersUpdate) onPlayersUpdate(players);
        if (playersRef) {
            playersRef.child('wantsRematch').set(wants);
        }
    }

    function clearRematch() {
        if (players[playerId]) players[playerId].wantsRematch = false;
        if (onPlayersUpdate) onPlayersUpdate(players);
        if (playersRef) {
            playersRef.child('wantsRematch').set(false);
        }
    }

    function sendPause(name) {
        if (roomRef) {
            roomRef.child('pausedBy').set(name);
        }
    }

    function sendUnpause() {
        if (roomRef) {
            roomRef.child('pausedBy').remove();
        }
    }

    function startGame() {
        if (roomRef && isHost) {
            roomRef.child('status').set('playing');
        }
    }

    function restartGame() {
        if (roomRef && isHost) {
            const updates = {
                board: Array(9).fill(""),
                currentPlayerSymbol: 'X',
                winner: '',
                status: 'playing'
            };
            Object.keys(players).forEach(id => {
                if (players[id]) {
                    players[id].ready = false;
                    players[id].wantsRematch = false;
                }
                updates['players/' + id + '/ready'] = false;
                updates['players/' + id + '/wantsRematch'] = false;
            });
            roomRef.update(updates);
            if (onPlayersUpdate) onPlayersUpdate(players);
        }
    }

    function leaveRoom() {
        if (playersRef) playersRef.remove();
        if (isHost && roomRef) roomRef.remove();

        if (roomRef) {
            roomRef.child('players').off();
            roomRef.child('board').off();
            roomRef.child('currentPlayerSymbol').off();
            roomRef.child('status').off();
            roomRef.child('pausedBy').off();
            roomRef.off();
        }
        resetState();
    }

    function resetState() {
        roomCode = null;
        isHost = false;
        playerName = '';
        playerSymbol = '';
        playerColor = '';
        roomDisplayName = '';
        players = {};
        board = Array(9).fill("");
        currentPlayerSymbol = "X";
        roomStatus = 'waiting';
        roomRef = null;
        playersRef = null;
    }

    function getAvailableRooms(callback) {
        db.ref('rooms').once('value', (snap) => {
            const roomsData = snap.val() || {};
            const available = [];
            for (const code in roomsData) {
                const room = roomsData[code];
                if (room.status === 'waiting' && room.game === 'veagame' && Object.keys(room.players || {}).length < 2) {
                    available.push({
                        code: code,
                        name: room.roomName,
                        playersCount: Object.keys(room.players || {}).length
                    });
                }
            }
            callback(available);
        });
    }

    // Expor API
    return {
        playerId,
        get roomCode() { return roomCode; },
        get isHost() { return isHost; },
        get playerName() { return playerName; },
        get playerSymbol() { return playerSymbol; },
        get playerColor() { return playerColor; },
        get players() { return players; },
        get board() { return board; },
        get currentPlayerSymbol() { return currentPlayerSymbol; },
        get roomStatus() { return roomStatus; },
        get roomDisplayName() { return roomDisplayName; },
        
        createRoom,
        joinRoom,
        leaveRoom,
        startGame,
        restartGame,
        sendMove,
        sendGameOver,
        sendReady,
        sendRematch,
        clearRematch,
        sendPause,
        sendUnpause,
        getAvailableRooms,
        getPlayerCount,
        
        // Callbacks setter/getter
        get onPlayersUpdate() { return onPlayersUpdate; },
        set onPlayersUpdate(cb) { onPlayersUpdate = cb; },
        get onStatusUpdate() { return onStatusUpdate; },
        set onStatusUpdate(cb) { onStatusUpdate = cb; },
        get onBoardUpdate() { return onBoardUpdate; },
        set onBoardUpdate(cb) { onBoardUpdate = cb; },
        get onRoomDeleted() { return onRoomDeleted; },
        set onRoomDeleted(cb) { onRoomDeleted = cb; },
        get onPauseUpdate() { return onPauseUpdate; },
        set onPauseUpdate(cb) { onPauseUpdate = cb; }
    };
})();
