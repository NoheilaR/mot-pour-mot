const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { GameRoom } = require('./game');

const PORT = process.env.PORT || 3001;
const ROUND_END_DELAY = 3000;

const app = express();
const httpServer = http.createServer(app);
const io = new Server(httpServer, {
  cors: { origin: '*' },
});

app.use(express.json());

app.get('/health', (_, res) => res.json({ ok: true }));

app.get('/api/config', (_, res) => {
  res.json({ discordClientId: process.env.DISCORD_CLIENT_ID || '' });
});

app.post('/api/discord/token', async (req, res) => {
  try {
    const { code } = req.body;
    const response = await fetch('https://discord.com/api/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: process.env.DISCORD_CLIENT_ID,
        client_secret: process.env.DISCORD_CLIENT_SECRET,
        grant_type: 'authorization_code',
        code,
      }),
    });
    const data = await response.json();
    res.json({ access_token: data.access_token });
  } catch {
    res.status(500).json({ error: 'Token exchange failed' });
  }
});

const rooms = {};
const socketToRoom = {};

// ─── Utilitaires ────────────────────────────────────────────────────────────

function generateRoomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code;
  do {
    code = Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  } while (rooms[code]);
  return code;
}

function getRoomOf(socketId) {
  const code = socketToRoom[socketId];
  return code ? rooms[code] : null;
}

function emitRoomUpdate(room) {
  io.to(room.roomCode).emit('roomUpdate', room.publicSnapshot());
}

// Révèle le mot selon le mode :
// - texte : uniquement à l'indiceur
// - tabou : à tout le monde sauf le devineur
function revealWord(room) {
  if (room.mode === 'tabou') {
    for (const socketId of Object.keys(room.players)) {
      if (socketId !== room.devineurId) {
        const s = io.sockets.sockets.get(socketId);
        if (s) s.emit('wordRevealed', { word: room.currentWord, blacklist: room.currentBlacklist });
      }
    }
  } else {
    const indiceurSocket = io.sockets.sockets.get(room.indiceurId);
    if (indiceurSocket) indiceurSocket.emit('wordRevealed', { word: room.currentWord, blacklist: [] });
  }
}

// ─── Gestion du début de round ──────────────────────────────────────────────

function startRound(room, roundInfo) {
  if (roundInfo.scores) {
    io.to(room.roomCode).emit('gameEnded', roundInfo);
    return;
  }

  io.to(room.roomCode).emit('roundStarted', {
    round: roundInfo.round,
    totalRounds: roundInfo.totalRounds,
    activeTeam: roundInfo.activeTeam,
    indiceurId: roundInfo.indiceurId,
    devineurId: roundInfo.devineurId,
  });

  revealWord(room);

  room.onTick = (timeLeft) => {
    io.to(room.roomCode).emit('timerTick', { timeLeft });
  };

  room.onRoundEnd = () => {
    const summary = room.endCurrentRound();
    io.to(room.roomCode).emit('roundEnded', summary);

    setTimeout(() => {
      if (!rooms[room.roomCode]) return;
      const next = room.advanceToNextRound();
      startRound(room, next);
    }, ROUND_END_DELAY);
  };
}

// ─── Socket.IO ──────────────────────────────────────────────────────────────

io.on('connection', (socket) => {
  console.log(`[connect] ${socket.id}`);

  // ── createRoom ──────────────────────────────────────────────────
  socket.on('createRoom', ({ pseudo }, cb) => {
    if (!pseudo?.trim()) return cb?.({ error: 'Pseudo requis.' });
    const code = generateRoomCode();
    const room = new GameRoom(code, socket.id);
    room.addPlayer(socket.id, pseudo.trim());
    rooms[code] = room;
    socketToRoom[socket.id] = code;
    socket.join(code);
    cb?.({ roomCode: code });
    emitRoomUpdate(room);
  });

  // ── joinRoom ────────────────────────────────────────────────────
  socket.on('joinRoom', ({ roomCode, pseudo }, cb) => {
    const code = (roomCode || '').toUpperCase().trim();
    const room = rooms[code];
    if (!room) return cb?.({ error: 'Salon introuvable.' });
    if (room.phase !== 'lobby') return cb?.({ error: 'La partie a déjà commencé.' });
    if (!pseudo?.trim()) return cb?.({ error: 'Pseudo requis.' });

    room.addPlayer(socket.id, pseudo.trim());
    socketToRoom[socket.id] = code;
    socket.join(code);
    cb?.({ roomCode: code });
    emitRoomUpdate(room);
  });

  // ── joinOrCreate (Discord Activity) ─────────────────────────────
  socket.on('joinOrCreate', ({ roomCode, pseudo }, cb) => {
    if (!pseudo?.trim()) return cb?.({ error: 'Pseudo requis.' });
    const code = (roomCode || '').trim();
    if (!code) return cb?.({ error: 'Code de room manquant.' });

    let room = rooms[code];
    if (!room) {
      room = new GameRoom(code, socket.id);
      rooms[code] = room;
    } else if (room.phase !== 'lobby') {
      return cb?.({ error: 'La partie a déjà commencé.' });
    }

    room.addPlayer(socket.id, pseudo.trim());
    const aCount = room.getTeamMembers('A').length;
    const bCount = room.getTeamMembers('B').length;
    room.setTeam(socket.id, aCount <= bCount ? 'A' : 'B');

    socketToRoom[socket.id] = code;
    socket.join(code);
    cb?.({ roomCode: code });
    emitRoomUpdate(room);
  });

  // ── chooseTeam ──────────────────────────────────────────────────
  socket.on('chooseTeam', ({ team }, cb) => {
    const room = getRoomOf(socket.id);
    if (!room) return cb?.({ error: 'Pas dans un salon.' });
    if (room.phase !== 'lobby') return cb?.({ error: 'La partie a déjà commencé.' });
    const ok = room.setTeam(socket.id, team);
    if (!ok) return cb?.({ error: 'Équipe invalide.' });
    cb?.({ ok: true });
    emitRoomUpdate(room);
  });

  // ── setPreferredRole ────────────────────────────────────────────
  socket.on('setPreferredRole', ({ role }, cb) => {
    const room = getRoomOf(socket.id);
    if (!room) return cb?.({ error: 'Pas dans un salon.' });
    room.setPreferredRole(socket.id, role ?? null);
    cb?.({ ok: true });
    emitRoomUpdate(room);
  });

  // ── updateSettings ──────────────────────────────────────────────
  socket.on('updateSettings', (settings, cb) => {
    const room = getRoomOf(socket.id);
    if (!room) return cb?.({ error: 'Pas dans un salon.' });
    if (socket.id !== room.hostId) return cb?.({ error: 'Hôte uniquement.' });
    if (room.phase !== 'lobby') return cb?.({ error: 'La partie a déjà commencé.' });
    room.updateSettings(settings);
    cb?.({ ok: true });
    emitRoomUpdate(room);
  });

  // ── startGame ───────────────────────────────────────────────────
  socket.on('startGame', (_, cb) => {
    const room = getRoomOf(socket.id);
    if (!room) return cb?.({ error: 'Pas dans un salon.' });
    if (socket.id !== room.hostId) return cb?.({ error: 'Hôte uniquement.' });
    const check = room.canStart();
    if (!check.ok) return cb?.({ error: check.reason });

    const roundInfo = room.startGame();
    io.to(room.roomCode).emit('gameStarted', { mode: room.mode });
    startRound(room, roundInfo);
    cb?.({ ok: true });
  });

  // ── submitClue ──────────────────────────────────────────────────
  socket.on('submitClue', ({ clue }, cb) => {
    const room = getRoomOf(socket.id);
    if (!room) return cb?.({ error: 'Pas dans un salon.' });

    const result = room.submitClue(socket.id, clue);
    if (!result.ok) return cb?.({ error: result.reason });

    cb?.({ ok: true });
    io.to(room.roomCode).emit('clueRevealed', { clue: result.clue });
  });

  // ── swapRoles ───────────────────────────────────────────────────
  socket.on('swapRoles', (_, cb) => {
    const room = getRoomOf(socket.id);
    if (!room) return cb?.({ error: 'Pas dans un salon.' });

    const res = room.swapRoles(socket.id);
    if (!res.ok) return cb?.({ error: res.reason });

    cb?.({ ok: true });
    io.to(room.roomCode).emit('rolesSwapped', {
      indiceurId: res.indiceurId,
      devineurId: res.devineurId,
    });
    revealWord(room);
  });

  // ── submitGuess ─────────────────────────────────────────────────
  socket.on('submitGuess', ({ guess }, cb) => {
    const room = getRoomOf(socket.id);
    if (!room) return cb?.({ error: 'Pas dans un salon.' });

    const result = room.submitGuess(socket.id, guess);
    if (!result.ok) return cb?.({ error: result.reason });

    cb?.({ ok: true });
    io.to(room.roomCode).emit('guessResult', {
      correct: result.correct,
      word: result.word,
      scores: result.scores,
      wordHistory: result.wordHistory,
      currentExchange: result.currentExchange,
    });

    if (result.correct) revealWord(room);
  });

  // ── markResult (mode tabou — indiceur valide) ───────────────────
  socket.on('markResult', ({ result }, cb) => {
    const room = getRoomOf(socket.id);
    if (!room) return cb?.({ error: 'Pas dans un salon.' });

    const res = room.markResult(socket.id, result);
    if (!res.ok) return cb?.({ error: res.reason });

    cb?.({ ok: true });
    io.to(room.roomCode).emit('guessResult', {
      correct: res.correct,
      word: res.word,
      scores: res.scores,
      wordHistory: res.wordHistory,
      currentExchange: res.currentExchange,
    });

    if (res.correct) revealWord(room);
  });

  // ── skipWord ────────────────────────────────────────────────────
  socket.on('skipWord', (_, cb) => {
    const room = getRoomOf(socket.id);
    if (!room) return cb?.({ error: 'Pas dans un salon.' });

    const res = room.skipWord(socket.id);
    if (!res.ok) return cb?.({ error: res.reason });

    cb?.({ ok: true });
    io.to(room.roomCode).emit('wordSkipped', {
      skipped: res.skipped,
      penalty: res.penalty,
      scores: res.scores,
      wordHistory: res.wordHistory,
    });

    revealWord(room);
  });

  // ── buzz (équipe adverse) ───────────────────────────────────────
  socket.on('buzz', (_, cb) => {
    const room = getRoomOf(socket.id);
    if (!room) return cb?.({ error: 'Pas dans un salon.' });

    const res = room.buzz(socket.id);
    if (!res.ok) return cb?.({ error: res.reason || 'Buzz impossible.' });

    cb?.({ ok: true });
    io.to(room.roomCode).emit('buzzStarted', { buzzTeam: res.buzzTeam, buzzer: res.buzzer });
  });

  // ── confirmBuzz (hôte confirme le buzz) ─────────────────────────
  socket.on('confirmBuzz', (_, cb) => {
    const room = getRoomOf(socket.id);
    if (!room) return cb?.({ error: 'Pas dans un salon.' });
    if (socket.id !== room.hostId) return cb?.({ error: 'Hôte uniquement.' });

    const res = room.confirmBuzz();
    if (!res.ok) return cb?.({ error: 'Pas de buzz en cours.' });

    cb?.({ ok: true });
    io.to(room.roomCode).emit('buzzResolved', { confirmed: true, scores: res.scores, buzzTeam: res.buzzTeam });
  });

  // ── denyBuzz (hôte refuse le buzz) ──────────────────────────────
  socket.on('denyBuzz', (_, cb) => {
    const room = getRoomOf(socket.id);
    if (!room) return cb?.({ error: 'Pas dans un salon.' });
    if (socket.id !== room.hostId) return cb?.({ error: 'Hôte uniquement.' });

    const res = room.denyBuzz();
    if (!res.ok) return cb?.({ error: 'Pas de buzz en cours.' });

    cb?.({ ok: true });
    io.to(room.roomCode).emit('buzzResolved', { confirmed: false });
  });

  // ── abandonGame (hôte abandonne la partie en cours) ─────────────
  socket.on('abandonGame', (_, cb) => {
    const room = getRoomOf(socket.id);
    if (!room) return cb?.({ error: 'Pas dans un salon.' });
    if (socket.id !== room.hostId) return cb?.({ error: 'Hôte uniquement.' });
    room.resetToLobby();
    cb?.({ ok: true });
    io.to(room.roomCode).emit('gameAbandoned');
    emitRoomUpdate(room);
  });

  // ── playAgain ───────────────────────────────────────────────────
  socket.on('playAgain', (_, cb) => {
    const room = getRoomOf(socket.id);
    if (!room) return cb?.({ error: 'Pas dans un salon.' });
    if (socket.id !== room.hostId) return cb?.({ error: 'Hôte uniquement.' });
    room.resetToLobby();
    cb?.({ ok: true });
    emitRoomUpdate(room);
  });

  // ── leaveRoom ───────────────────────────────────────────────────
  socket.on('leaveRoom', () => handleLeave(socket));

  // ── disconnect ──────────────────────────────────────────────────
  socket.on('disconnect', () => {
    console.log(`[disconnect] ${socket.id}`);
    const room = getRoomOf(socket.id);
    if (!room) return;

    if (room.phase === 'round_active') {
      const isActive = socket.id === room.indiceurId || socket.id === room.devineurId;
      if (isActive) {
        room.pauseTimer(socket.id);
        io.to(room.roomCode).emit('gamePaused', {
          reason: `${room.players[socket.id]?.pseudo ?? 'Un joueur'} s'est déconnecté.`,
        });
      }
    }

    room.removePlayer(socket.id);
    delete socketToRoom[socket.id];

    if (Object.keys(room.players).length === 0) {
      delete rooms[room.roomCode];
      return;
    }

    if (room.hostId === socket.id) {
      room.hostId = Object.keys(room.players)[0];
    }

    emitRoomUpdate(room);
  });

  // ── rejoinRoom ──────────────────────────────────────────────────
  socket.on('rejoinRoom', ({ roomCode, pseudo }, cb) => {
    const code = (roomCode || '').toUpperCase().trim();
    const room = rooms[code];
    if (!room) return cb?.({ error: 'Salon introuvable.' });

    room.addPlayer(socket.id, pseudo.trim());
    socketToRoom[socket.id] = code;
    socket.join(code);

    if (room._paused && !room.buzzPending) {
      room.resumeTimer();
      io.to(room.roomCode).emit('gameResumed', { timeLeft: room.timeLeft });
    }

    cb?.({ roomCode: code, snapshot: room.publicSnapshot() });
    emitRoomUpdate(room);
  });
});

function handleLeave(socket) {
  const room = getRoomOf(socket.id);
  if (!room) return;
  room.removePlayer(socket.id);
  socket.leave(room.roomCode);
  delete socketToRoom[socket.id];

  if (Object.keys(room.players).length === 0) {
    delete rooms[room.roomCode];
    return;
  }
  if (room.hostId === socket.id) {
    room.hostId = Object.keys(room.players)[0];
  }
  emitRoomUpdate(room);
}

const path = require('path');
const DIST = path.join(__dirname, '../client/dist');
app.use(express.static(DIST));
app.get('*', (_, res) => res.sendFile(path.join(DIST, 'index.html')));

httpServer.listen(PORT, () => {
  console.log(`[server] Mot pour Mot — écoute sur :${PORT}`);
});
