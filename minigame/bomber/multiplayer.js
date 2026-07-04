const BomberMultiplayer = (() => {
    const db = firebase.database();
    const playerId = 'p_' + Math.random().toString(36).substr(2, 9);
    const COLORS = ['#3acc7a', '#ff6b6b'];

    let roomCode = null;
    let isHost = false;
    let playerName = '';
    let playerColor = '';
    let players = {};
    let roomStatus = 'waiting';
    let roomDisplayName = '';
    let roomRef = null;
    let playersRef = null;

    let cbPlayers = null;
    let cbStatus = null;
    let cbRoomDeleted = null;
    let cbBomb = null;

    function generateCode() {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        let code = '';
        for (let i = 0; i < 6; i++)
            code += chars[Math.floor(Math.random() * chars.length)];
        return code;
    }

    function getPlayerCount() { return Object.keys(players).length; }

    function createRoom(name, roomName, callback) {
        playerName = name;
        roomCode = generateCode();
        isHost = true;
        playerColor = COLORS[0];
        roomDisplayName = roomName || 'Sala ' + roomCode;
        roomRef = db.ref('rooms/' + roomCode);
        playersRef = roomRef.child('players/' + playerId);

        roomRef.set({
            host: playerId,
            status: 'waiting',
            game: 'bomber',
            roomName: roomDisplayName,
            createdAt: firebase.database.ServerValue.TIMESTAMP
        });

        playersRef.set({
            name: playerName,
            color: playerColor,
            x: 0, y: 0,
            direction: 'down',
            alive: true,
            ready: false
        });

        roomRef.onDisconnect().remove();
        setupListeners();
        callback(roomCode);
    }

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
            if (data.game !== 'bomber') {
                callback(null, 'Sala incompatível');
                return;
            }
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
            const usedColors = Object.values(data.players || {}).map(p => p.color);
            playerColor = COLORS.find(c => !usedColors.includes(c)) || COLORS[count % COLORS.length];

            playersRef = roomRef.child('players/' + playerId);
            playersRef.set({
                name: playerName,
                color: playerColor,
                x: 0, y: 0,
                direction: 'down',
                alive: true,
                ready: false
            });

            playersRef.onDisconnect().remove();
            setupListeners();
            callback(roomCode);
        });
    }

    function setupListeners() {
        roomRef.child('players').on('value', (snap) => {
            players = snap.val() || {};
            if (cbPlayers) cbPlayers(players);
        });

        roomRef.child('status').on('value', (snap) => {
            if (snap.exists()) {
                roomStatus = snap.val();
                if (cbStatus) cbStatus(roomStatus);
            }
        });

        roomRef.on('value', (snap) => {
            if (!snap.exists() && roomCode) {
                if (cbRoomDeleted) cbRoomDeleted();
            }
        });

        roomRef.child('bombs').on('child_added', (snap) => {
            if (snap.exists() && cbBomb) {
                cbBomb(snap.val());
                snap.ref.remove();
            }
        });
    }

    function sendPosition(x, y, direction) {
        if (playersRef) {
            playersRef.child('x').set(x);
            playersRef.child('y').set(y);
            playersRef.child('direction').set(direction);
        }
    }

    function sendBomb(col, row, range) {
        if (roomRef) {
            const bombRef = roomRef.child('bombs').push();
            bombRef.set({ col, row, range, ownerId: playerId });
        }
    }

    function sendAliveState(alive) {
        if (playersRef) playersRef.child('alive').set(alive);
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

    function startGame() {
        if (isHost && roomRef) {
            const update = { status: 'playing' };
            Object.keys(players).forEach(id => {
                update['players/' + id + '/alive'] = true;
                update['players/' + id + '/ready'] = false;
                update['players/' + id + '/wantsRematch'] = null;
            });
            roomRef.update(update);
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
            roomRef.child('bombs').remove();
            const updates = {};
            Object.keys(players).forEach(id => {
                updates[id + '/ready'] = false;
                updates[id + '/alive'] = true;
                delete players[id].wantsRematch;
                updates[id + '/wantsRematch'] = null;
            });
            roomRef.child('players').update(updates);
        }
    }

    function leaveRoom() {
        if (playersRef) playersRef.remove();
        if (isHost && roomRef) roomRef.remove();
        if (roomRef) {
            roomRef.child('players').off();
            roomRef.child('status').off();
            roomRef.off();
            roomRef.child('bombs').off();
        }
        roomRef = null;
        playersRef = null;
        roomCode = null;
        isHost = false;
        players = {};
    }

    function getAvailableRooms(callback) {
        db.ref('rooms').orderByChild('status').equalTo('waiting').once('value', (snap) => {
            const rooms = [];
            snap.forEach(child => {
                const data = child.val();
                if (data.game !== 'bomber') return;
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
        createRoom, joinRoom, leaveRoom,
        sendPosition, sendBomb, sendAliveState,
        sendReady, sendRematch, clearRematch,
        startGame, endRoom, resetToLobby,
        getAvailableRooms, generateCode,
        get playerId() { return playerId; },
        get roomCode() { return roomCode; },
        get isHost() { return isHost; },
        get players() { return players; },
        get playerColor() { return playerColor; },
        get playerName() { return playerName; },
        get roomStatus() { return roomStatus; },
        get roomDisplayName() { return roomDisplayName; },
        set onPlayersUpdate(fn) { cbPlayers = fn; },
        set onStatusUpdate(fn) { cbStatus = fn; },
        set onRoomDeleted(fn) { cbRoomDeleted = fn; },
        set onBomb(fn) { cbBomb = fn; },
    };
})();
window.BomberMultiplayer = BomberMultiplayer;
