const wordsData = require('./data/words.json');
const blacklistData = require('./data/blacklist.json');
const { matchAnswer } = require('./utils/matchAnswer');
const { validateClue } = require('./utils/validateClue');

const ROUND_DURATION = 30;
const TICK_INTERVAL = 1000;
const SKIP_PENALTY = -1;

function buildWordPool() {
  const all = Object.values(wordsData.categories).flat();
  for (let i = all.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [all[i], all[j]] = [all[j], all[i]];
  }
  return all;
}

class GameRoom {
  constructor(roomCode, hostId) {
    this.roomCode = roomCode;
    this.hostId = hostId;
    this.players = {};
    this.mode = 'text';
    this.totalRounds = 4;
    this.roundDuration = 30;
    this.phase = 'lobby';
    this.scores = { A: 0, B: 0 };
    this.currentRound = -1;
    this.teamPlayCount = { A: 0, B: 0 };
    this.activeTeam = null;
    this.indiceurId = null;
    this.devineurId = null;
    this.currentWord = null;
    this.currentClue = null;
    this.currentExchange = [];
    this.currentBlacklist = [];
    this.buzzPending = false;
    this.buzzTeam = null;
    this.roundScore = 0;
    this.wordHistory = [];
    this.wordPool = [];
    this.wordPoolIndex = 0;
    this.timeLeft = ROUND_DURATION;
    this._timerInterval = null;
    this._paused = false;
    this._pausedBy = null;
    this.onTick = null;
    this.onRoundEnd = null;
  }

  addPlayer(socketId, pseudo) {
    this.players[socketId] = { id: socketId, pseudo, team: null, preferredRole: null };
  }
  removePlayer(socketId) { delete this.players[socketId]; }

  setTeam(socketId, team) {
    if (!['A', 'B', null].includes(team)) return false;
    if (this.players[socketId]) { this.players[socketId].team = team; return true; }
    return false;
  }

  getTeamMembers(team) {
    return Object.values(this.players).filter(p => p.team === team);
  }

  updateSettings({ mode, totalRounds, roundDuration }) {
    if (mode === 'text' || mode === 'tabou') this.mode = mode;
    if (Number.isInteger(totalRounds) && totalRounds >= 2 && totalRounds <= 12) this.totalRounds = totalRounds;
    if (Number.isInteger(roundDuration) && roundDuration >= 20 && roundDuration <= 180) this.roundDuration = roundDuration;
  }

  setPreferredRole(socketId, role) {
    if (!['indiceur', 'devineur', null].includes(role)) return false;
    if (this.players[socketId]) { this.players[socketId].preferredRole = role; return true; }
    return false;
  }

  canStart() {
    const total = Object.keys(this.players).length;
    if (total < 2) return { ok: false, reason: 'Il faut au moins 2 joueurs.' };
    return { ok: true };
  }

  startGame() {
    const a = this.getTeamMembers('A'), b = this.getTeamMembers('B');
    if (a.length === 0 || b.length === 0) {
      const all = Object.values(this.players);
      for (let i = 0; i < all.length; i++) {
        all[i].team = i % 2 === 0 ? 'A' : 'B';
      }
    }
    this.wordPool = buildWordPool();
    this.wordPoolIndex = 0;
    this.scores = { A: 0, B: 0 };
    this.currentRound = -1;
    this.teamPlayCount = { A: 0, B: 0 };
    this.phase = 'playing';
    return this._nextRound();
  }

  _nextRound() {
    this.currentRound++;
    if (this.currentRound >= this.totalRounds) return this._endGame();

    this.activeTeam = this.currentRound % 2 === 0 ? 'A' : 'B';
    const members = this.getTeamMembers(this.activeTeam);
    const opponentTeam = this.activeTeam === 'A' ? 'B' : 'A';
    const opponents = this.getTeamMembers(opponentTeam);

    if (members.length === 1) {
      this.indiceurId = members[0].id;
      this.devineurId = opponents[0]?.id ?? null;
    } else if (this.mode === 'tabou') {
      // Tabou : alternance forcée, on ignore les préférences de rôle
      const idx = this.teamPlayCount[this.activeTeam] % members.length;
      this.indiceurId = members[idx].id;
      this.devineurId = members.find(p => p.id !== this.indiceurId)?.id ?? null;
    } else {
      const wantsIndiceur = members.find(p => p.preferredRole === 'indiceur');
      const wantsDevineur = members.find(p => p.preferredRole === 'devineur');
      const conflict = wantsIndiceur && wantsDevineur && wantsIndiceur.id === wantsDevineur.id;

      if (!conflict && wantsIndiceur && wantsDevineur && wantsIndiceur.id !== wantsDevineur.id) {
        this.indiceurId = wantsIndiceur.id;
        this.devineurId = wantsDevineur.id;
      } else if (!conflict && wantsIndiceur) {
        this.indiceurId = wantsIndiceur.id;
        this.devineurId = members.find(p => p.id !== wantsIndiceur.id)?.id ?? null;
      } else if (!conflict && wantsDevineur) {
        this.devineurId = wantsDevineur.id;
        this.indiceurId = members.find(p => p.id !== wantsDevineur.id)?.id ?? null;
      } else {
        const idx = this.teamPlayCount[this.activeTeam] % members.length;
        this.indiceurId = members[idx].id;
        this.devineurId = members.find(p => p.id !== this.indiceurId)?.id ?? null;
      }
    }

    this.teamPlayCount[this.activeTeam]++;
    this.roundScore = 0;
    this.wordHistory = [];
    this.timeLeft = this.roundDuration;
    this._paused = false;
    this._pausedBy = null;
    this.buzzPending = false;
    this.buzzTeam = null;
    this.phase = 'round_active';
    this._drawNextWord();
    this._startTimer();

    return { round: this.currentRound, totalRounds: this.totalRounds, activeTeam: this.activeTeam, indiceurId: this.indiceurId, devineurId: this.devineurId };
  }

  swapRoles(socketId) {
    if (this.phase !== 'round_active') return { ok: false, reason: 'Pas en cours de round.' };
    if (socketId !== this.indiceurId && socketId !== this.devineurId) return { ok: false, reason: 'Tu n\'es pas dans l\'équipe active.' };
    if (this.currentExchange.length > 0) return { ok: false, reason: 'L\'échange a déjà commencé.' };
    [this.indiceurId, this.devineurId] = [this.devineurId, this.indiceurId];
    return { ok: true, indiceurId: this.indiceurId, devineurId: this.devineurId };
  }

  _getBlacklistFor(word) {
    if (blacklistData[word]) return [...blacklistData[word]];
    // Fallback : 5 mots de la même catégorie (aléatoirement)
    for (const words of Object.values(wordsData.categories)) {
      if (words.includes(word)) {
        const pool = words.filter(w => w !== word);
        for (let i = pool.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [pool[i], pool[j]] = [pool[j], pool[i]];
        }
        return pool.slice(0, 5);
      }
    }
    return [];
  }

  _drawNextWord() {
    if (this.wordPoolIndex >= this.wordPool.length) {
      this.wordPool = buildWordPool();
      this.wordPoolIndex = 0;
    }
    this.currentWord = this.wordPool[this.wordPoolIndex++];
    this.currentClue = null;
    this.currentExchange = [];
    this.currentBlacklist = this.mode === 'tabou' ? this._getBlacklistFor(this.currentWord) : [];
  }

  _startTimer() {
    this._clearTimer();
    this._timerInterval = setInterval(() => {
      if (this._paused) return;
      this.timeLeft--;
      if (this.onTick) this.onTick(this.timeLeft);
      if (this.timeLeft <= 0) { this._clearTimer(); if (this.onRoundEnd) this.onRoundEnd(); }
    }, TICK_INTERVAL);
  }

  _clearTimer() {
    if (this._timerInterval) { clearInterval(this._timerInterval); this._timerInterval = null; }
  }

  pauseTimer(socketId) {
    if (this.phase !== 'round_active') return false;
    this._paused = true; this._pausedBy = socketId; return true;
  }

  resumeTimer() {
    if (!this._paused) return false;
    this._paused = false; this._pausedBy = null; return true;
  }

  // ─── Mode texte : soumettre un indice ───────────────────────────
  submitClue(socketId, clue) {
    if (this.phase !== 'round_active') return { ok: false, reason: 'Pas en cours de round.' };
    if (socketId !== this.indiceurId) return { ok: false, reason: 'Tu n\'es pas l\'indiceur.' };
    if (this.mode !== 'text') return { ok: false, reason: 'Réservé au mode texte.' };
    if (this.currentClue !== null) return { ok: false, reason: 'Attends la tentative du devineur.' };

    const v = validateClue(clue, this.currentWord);
    if (!v.valid) return { ok: false, reason: v.reason };

    this.currentClue = clue.trim();
    this.currentExchange.push({ clue: this.currentClue, guess: null });
    return { ok: true, clue: this.currentClue };
  }

  // ─── Mode tabou : indiceur valide le mot deviné ─────────────────
  markResult(socketId, result) {
    if (this.phase !== 'round_active') return { ok: false, reason: 'Pas en cours de round.' };
    if (socketId !== this.indiceurId) return { ok: false, reason: 'Seul l\'indiceur peut valider.' };
    if (this.mode !== 'tabou') return { ok: false, reason: 'Réservé au mode tabou.' };
    return this._applyResult(result === 'correct', '[tabou]');
  }

  // ─── Buzz (équipe adverse signale un mot interdit) ───────────────
  buzz(socketId) {
    if (this.phase !== 'round_active') return { ok: false, reason: 'Pas en cours de round.' };
    if (this.mode !== 'tabou') return { ok: false, reason: 'Réservé au mode tabou.' };
    if (this.buzzPending) return { ok: false, reason: 'Un buzz est déjà en cours.' };
    const player = this.players[socketId];
    if (!player) return { ok: false };
    if (!player.team || player.team === this.activeTeam) return { ok: false, reason: 'Seule l\'équipe adverse peut buzzer.' };
    this.buzzPending = true;
    this.buzzTeam = player.team;
    this._paused = true;
    return { ok: true, buzzTeam: player.team, buzzer: player.pseudo };
  }

  confirmBuzz() {
    if (!this.buzzPending) return { ok: false };
    const buzzTeam = this.buzzTeam;
    this.scores[buzzTeam]++;
    this.buzzPending = false;
    this.buzzTeam = null;
    this._paused = false;
    return { ok: true, scores: { ...this.scores }, buzzTeam };
  }

  denyBuzz() {
    if (!this.buzzPending) return { ok: false };
    this.buzzPending = false;
    this.buzzTeam = null;
    this._paused = false;
    return { ok: true };
  }

  // ─── Passer ─────────────────────────────────────────────────────
  skipWord(socketId) {
    if (this.phase !== 'round_active') return { ok: false, reason: 'Pas en cours de round.' };
    if (socketId !== this.indiceurId && socketId !== this.devineurId) return { ok: false, reason: 'Seul un joueur actif peut passer.' };

    const prevWord = this.currentWord;
    const exchange = [...this.currentExchange];
    this.scores[this.activeTeam] = Math.max(0, this.scores[this.activeTeam] + SKIP_PENALTY);
    this.roundScore += SKIP_PENALTY;
    this.wordHistory.push({ word: prevWord, result: 'skip', exchange });
    this._drawNextWord();

    return { ok: true, skipped: prevWord, penalty: SKIP_PENALTY, scores: { ...this.scores }, wordHistory: [...this.wordHistory] };
  }

  // ─── Mode texte : devineur soumet une réponse ───────────────────
  submitGuess(socketId, guess) {
    if (this.phase !== 'round_active') return { ok: false, reason: 'Pas en cours de round.' };
    if (socketId !== this.devineurId) return { ok: false, reason: 'Tu n\'es pas le devineur.' };
    if (this.mode !== 'text') return { ok: false, reason: 'Mode texte uniquement.' };
    if (!this.currentClue) return { ok: false, reason: 'En attente de l\'indice.' };

    return this._applyResult(matchAnswer(guess, this.currentWord), guess);
  }

  _applyResult(correct, guessText) {
    const prevWord = this.currentWord;
    const last = this.currentExchange[this.currentExchange.length - 1];
    if (last) last.guess = guessText;

    if (correct) {
      this.scores[this.activeTeam]++;
      this.roundScore++;
      const exchange = [...this.currentExchange];
      this.wordHistory.push({ word: prevWord, result: 'correct', exchange });
      this._drawNextWord();
      return { ok: true, correct: true, word: prevWord, scores: { ...this.scores }, wordHistory: [...this.wordHistory] };
    } else {
      this.currentClue = null;
      return { ok: true, correct: false, word: prevWord, scores: { ...this.scores }, currentExchange: [...this.currentExchange] };
    }
  }

  endCurrentRound() {
    this._clearTimer();
    this.phase = 'round_end';
    return { roundScore: this.roundScore, scores: { ...this.scores }, activeTeam: this.activeTeam, wordHistory: [...this.wordHistory] };
  }

  advanceToNextRound() { return this._nextRound(); }

  _endGame() {
    this._clearTimer();
    this.phase = 'game_end';
    const winner = this.scores.A > this.scores.B ? 'A' : this.scores.B > this.scores.A ? 'B' : 'draw';
    return { scores: { ...this.scores }, winner };
  }

  resetToLobby() {
    this._clearTimer();
    this.phase = 'lobby';
    this.scores = { A: 0, B: 0 };
    this.currentRound = -1;
    this.teamPlayCount = { A: 0, B: 0 };
    this.activeTeam = null;
    this.indiceurId = null;
    this.devineurId = null;
    this.currentWord = null;
    this.currentClue = null;
    this.currentExchange = [];
    this.currentBlacklist = [];
    this.buzzPending = false;
    this.buzzTeam = null;
    this.roundScore = 0;
    this.wordHistory = [];
    this.wordPool = [];
    this.wordPoolIndex = 0;
    this._paused = false;
    this._pausedBy = null;
  }

  publicSnapshot() {
    return {
      roomCode: this.roomCode,
      hostId: this.hostId,
      players: Object.values(this.players),
      mode: this.mode,
      totalRounds: this.totalRounds,
      roundDuration: this.roundDuration,
      phase: this.phase,
      scores: { ...this.scores },
      currentRound: this.currentRound,
      activeTeam: this.activeTeam,
      indiceurId: this.indiceurId,
      devineurId: this.devineurId,
      currentClue: this.currentClue,
      currentExchange: [...this.currentExchange],
      timeLeft: this.timeLeft,
      paused: this._paused,
      wordHistory: [...this.wordHistory],
      buzzPending: this.buzzPending,
      buzzTeam: this.buzzTeam,
    };
  }
}

module.exports = { GameRoom };
