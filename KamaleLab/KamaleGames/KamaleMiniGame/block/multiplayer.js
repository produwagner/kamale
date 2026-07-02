// Módulo de Multiplayer com Firebase Realtime Database para o jogo KamaleBlock
const Multiplayer = (function() {
    const db = firebase.database();
    
    // Identificador único do jogador na sessão/dispositivo
    let playerId = localStorage.getItem('kamale_player_id');
    if (!playerId) {
        playerId = 'player_' + Math.random().toString(36).substr(2, 9);
        localStorage.setItem('kamale_player_id', playerId);
    }

    const COLORS = ['#3acc7a', '#ff4a4a']; // Verde (P1) e Vermelho (P2)

    // Estado da Sala
    let roomCode = null;
    let isHost = false;
    let playerName = '';
    let playerSymbol = '';
    let playerColor = '';
    let roomDisplayName = '';
    let players = {};
    let roomStatus = 'waiting';

    // Referências Firebase
    let roomRef = null;
    let playersRef = null;
    let attacksRef = null;

    // Callbacks Públicos
    let cbPlayers = null;
    let cbStatus = null;
    let cbOpponentGrid = null;
    let cbAttack = null;
    let cbRoomDeleted = null;
    let cbPauseUpdate = null;

    // ─── GERADOR DE CÓDIGO ────────────────────────────────────────────────
    function generateCode() {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let result = '';
        for (let i = 0; i < 6; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    }

    // ─── CRIAR SALA ───────────────────────────────────────────────────────
    function createRoom(name, roomName, callback) {
        playerName = name;
        roomCode = generateCode();
        isHost = true;
        playerSymbol = 'P1';
        playerColor = COLORS[0];
        roomDisplayName = roomName || 'Sala ' + roomCode;

        roomRef = db.ref('rooms/' + roomCode);
        playersRef = roomRef.child('players/' + playerId);

        // Criar sala no banco
        roomRef.set({
            host: playerId,
            status: 'waiting',
            game: 'block',
            roomName: roomDisplayName,
            winner: '',
            createdAt: firebase.database.ServerValue.TIMESTAMP
        });

        players[playerId] = {
            name: playerName,
            color: playerColor,
            symbol: playerSymbol,
            score: 0,
            ready: false,
            wantsRematch: false
        };

        playersRef.set({
            name: playerName,
            color: playerColor,
            symbol: playerSymbol,
            score: 0,
            ready: false,
            wantsRematch: false
        });

        roomRef.onDisconnect().remove();

        setupListeners();
        callback(roomCode);
    }

    // ─── ENTRAR NA SALA ───────────────────────────────────────────────────
    function joinRoom(code, name, callback) {
        playerName = name;
        roomCode = code.toUpperCase().trim();
        isHost = false;

        roomRef = db.ref('rooms/' + roomCode);

        roomRef.once('value', (snap) => {
            if (!snap.exists()) {
                callback(null, 'Sala não encontrada');
                return;
            }

            const data = snap.val();
            if (data.game && data.game !== 'block') {
                callback(null, 'Esta sala pertence a outro jogo');
                return;
            }

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
            playerSymbol = 'P2';

            players[playerId] = {
                name: playerName,
                color: playerColor,
                symbol: playerSymbol,
                score: 0,
                ready: false,
                wantsRematch: false
            };

            playersRef = roomRef.child('players/' + playerId);
            playersRef.set({
                name: playerName,
                color: playerColor,
                symbol: playerSymbol,
                score: 0,
                ready: false,
                wantsRematch: false
            });

            playersRef.onDisconnect().remove();

            setupListeners();
            callback(roomCode);
        });
    }

    // ─── LISTENERS DO FIREBASE ────────────────────────────────────────────
    function setupListeners() {
        if (!roomRef) return;

        roomRef.child('players').on('value', (snap) => {
            if (!snap.exists() && !isHost) {
                if (cbRoomDeleted) cbRoomDeleted();
                return;
            }
            players = snap.val() || {};
            if (cbPlayers) cbPlayers(players);
        });

        roomRef.child('status').on('value', (snap) => {
            roomStatus = snap.val() || 'waiting';
            let winner = '';
            if (roomStatus === 'finished') {
                roomRef.child('winner').once('value', (wSnap) => {
                    winner = wSnap.val() || '';
                    if (cbStatus) cbStatus(roomStatus, winner);
                });
            } else {
                if (cbStatus) cbStatus(roomStatus, winner);
            }
        });

        // Escutar grids dos oponentes
        roomRef.child('grids').on('value', (snap) => {
            const allGrids = snap.val() || {};
            for (const id in allGrids) {
                if (id !== playerId && cbOpponentGrid) {
                    cbOpponentGrid(allGrids[id]);
                }
            }
        });

        // Escutar ataques recebidos
        attacksRef = roomRef.child('attacks/' + playerId);
        attacksRef.on('child_added', (snap) => {
            const data = snap.val();
            if (data && data.lines && cbAttack) {
                cbAttack(data.lines);
                // Consumir o ataque deletando a referência
                snap.ref.remove();
            }
        });

        roomRef.child('pausedBy').on('value', (snap) => {
            if (cbPauseUpdate) cbPauseUpdate(snap.val() || null);
        });
    }

    // ─── AÇÕES DE JOGO ────────────────────────────────────────────────────
    function sendGrid(gridMatrix, score, lines) {
        if (roomRef && playerId) {
            roomRef.child('grids/' + playerId).set({
                grid: gridMatrix,
                score: score || 0,
                lines: lines || 0
            });
        }
    }

    function sendAttack(linesCount) {
        if (!roomRef) return;
        // Encontrar ID do oponente
        for (const id in players) {
            if (id !== playerId) {
                roomRef.child('attacks/' + id).push({
                    lines: linesCount,
                    timestamp: firebase.database.ServerValue.TIMESTAMP
                });
                break;
            }
        }
    }

    function sendGameOver() {
        if (!roomRef) return;
        let opponentSymbol = 'P1';
        let opponentId = null;
        for (const id in players) {
            if (id !== playerId) {
                opponentSymbol = players[id].symbol || 'P1';
                opponentId = id;
                break;
            }
        }
        
        const updates = {
            status: 'finished',
            winner: opponentSymbol
        };
        
        if (opponentId && players[opponentId]) {
            const newScore = (players[opponentId].score || 0) + 1;
            players[opponentId].score = newScore;
            updates['players/' + opponentId + '/score'] = newScore;
        }

        roomRef.update(updates);
        if (cbPlayers) cbPlayers(players);
    }

    function sendReady(isReady) {
        if (players[playerId]) players[playerId].ready = isReady;
        if (cbPlayers) cbPlayers(players);
        if (playersRef) {
            playersRef.child('ready').set(isReady);
        }
    }

    function sendRematch(wants) {
        if (players[playerId]) players[playerId].wantsRematch = wants;
        if (cbPlayers) cbPlayers(players);
        if (playersRef) {
            playersRef.child('wantsRematch').set(wants);
        }
    }

    function clearRematch() {
        if (players[playerId]) players[playerId].wantsRematch = false;
        if (cbPlayers) cbPlayers(players);
        if (playersRef) {
            playersRef.child('wantsRematch').set(false);
        }
    }

    function startGame() {
        if (roomRef && isHost) {
            const updates = {
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
        }
    }

    function restartGame() {
        if (roomRef && isHost) {
            const updates = {
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
            if (cbPlayers) cbPlayers(players);
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

    function leaveRoom() {
        if (playersRef) playersRef.remove();
        if (isHost && roomRef) roomRef.remove();

        if (roomRef) {
            roomRef.child('players').off();
            roomRef.child('status').off();
            roomRef.child('grids').off();
            if (attacksRef) attacksRef.off();
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
        roomStatus = 'waiting';
        roomRef = null;
        playersRef = null;
        attacksRef = null;
    }

    function getAvailableRooms(callback) {
        db.ref('rooms').orderByChild('game').equalTo('block').once('value', (snap) => {
            const rooms = [];
            if (snap.exists()) {
                snap.forEach((childSnap) => {
                    const data = childSnap.val();
                    const playersCount = Object.keys(data.players || {}).length;
                    if (data.status === 'waiting' && playersCount < 2) {
                        rooms.push({
                            code: childSnap.key,
                            name: data.roomName || ('Sala ' + childSnap.key),
                            hostName: Object.values(data.players || {})[0]?.name || 'Anônimo',
                            playersCount: playersCount
                        });
                    }
                });
            }
            callback(rooms);
        });
    }

    function getPlayerCount() {
        return Object.keys(players).length;
    }

    return {
        get playerId() { return playerId; },
        get roomCode() { return roomCode; },
        get isHost() { return isHost; },
        get playerName() { return playerName; },
        get playerSymbol() { return playerSymbol; },
        get playerColor() { return playerColor; },
        get roomDisplayName() { return roomDisplayName; },
        get players() { return players; },
        get roomStatus() { return roomStatus; },

        createRoom,
        joinRoom,
        leaveRoom,
        startGame,
        restartGame,
        sendGrid,
        sendAttack,
        sendGameOver,
        sendReady,
        sendRematch,
        clearRematch,
        sendPause,
        sendUnpause,
        getAvailableRooms,
        getPlayerCount,

        set onPlayersUpdate(fn) { cbPlayers = fn; },
        set onStatusUpdate(fn) { cbStatus = fn; },
        set onOpponentGridUpdate(fn) { cbOpponentGrid = fn; },
        set onAttackReceived(fn) { cbAttack = fn; },
        set onRoomDeleted(fn) { cbRoomDeleted = fn; },
        set onPauseUpdate(fn) { cbPauseUpdate = fn; },

        // Test helpers
        _triggerPlayers: (p) => cbPlayers && cbPlayers(p),
        _triggerStatus: (s, w) => cbStatus && cbStatus(s, w),
        _triggerOpponentGrid: (g) => cbOpponentGrid && cbOpponentGrid(g),
        _triggerAttack: (l) => cbAttack && cbAttack(l)
    };
})();
