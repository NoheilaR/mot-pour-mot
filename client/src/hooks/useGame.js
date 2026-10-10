import { useEffect, useReducer, useCallback } from 'react';
import socket from '../socket';
import { getDiscordInstanceId, getDiscordUser } from '../discord';
import { playDing, playWrong, playBuzzer } from '../utils/sounds';

function getRoomCodeFromURL() {
  const params = new URLSearchParams(window.location.search);
  return params.get('room') || '';
}

function setRoomInURL(code) {
  if (!code) return;
  const url = new URL(window.location);
  url.searchParams.set('room', code);
  window.history.replaceState({}, '', url);
}

function clearRoomFromURL() {
  const url = new URL(window.location);
  url.searchParams.delete('room');
  window.history.replaceState({}, '', url);
}

// Persistance de session (survit à un refresh / une coupure réseau) pour
// permettre une reconnexion automatique en cours de partie via rejoinRoom.
const SESSION_KEY = 'motpourmot_session';

function saveSession(session) {
  try { localStorage.setItem(SESSION_KEY, JSON.stringify(session)); } catch { /* stockage indisponible */ }
}
function loadSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}
function clearSession() {
  try { localStorage.removeItem(SESSION_KEY); } catch { /* stockage indisponible */ }
}

// Lazy init — appelé au premier render (après initDiscord().finally()), pas à l'import du module
function makeInitialState() {
  const discordInstanceId = getDiscordInstanceId();
  const discordUser = getDiscordUser();
  return {
    connected: false,
    screen: 'home',
    roomCode: null,
    myId: null,
    pseudo: null,
    discordInstanceId,
    discordUser,
    urlRoomCode: discordInstanceId || getRoomCodeFromURL(),

    // Snapshot serveur
    hostId: null,
    players: [],
    mode: 'text',
    totalRounds: 4,
    roundDuration: 30,
    customWordsEnabled: false,
    phase: 'lobby',
    scores: { A: 0, B: 0 },
    currentRound: -1,
    activeTeam: null,
    indiceurId: null,
    devineurId: null,
    currentClue: null,
    timeLeft: 30,
    paused: false,
    pausedManually: false,
    wordHistory: [],
    buzzPending: false,
    buzzTeam: null,
    buzzer: null,

    // État client
    currentWord: null,
    currentBlacklist: [],
    currentExchange: [],
    lastGuessResult: null,
    clueError: null,
    roundSummary: null,
    gameResult: null,
    error: null,
  };
}

function reducer(state, action) {
  switch (action.type) {
    case 'CONNECTED':
      return { ...state, connected: true, myId: socket.id };
    case 'DISCONNECTED':
      return { ...state, connected: false };
    case 'ROOM_JOINED':
      return { ...state, roomCode: action.roomCode, pseudo: action.pseudo, screen: 'lobby', error: null };
    case 'REJOINED': {
      const { phase, roundScore, scores, activeTeam, wordHistory, winner, lastWord } = action.snapshot;
      const screen = phase === 'lobby' ? 'lobby' : phase === 'game_end' ? 'gameover' : 'game';
      return {
        ...state,
        roomCode: action.roomCode,
        pseudo: action.pseudo,
        screen,
        error: null,
        roundSummary: phase === 'round_end' ? { roundScore, scores, activeTeam, wordHistory, lastWord } : null,
        gameResult: phase === 'game_end' ? { scores, winner } : null,
      };
    }
    case 'ROOM_UPDATE':
      return {
        ...state,
        hostId: action.data.hostId,
        players: action.data.players,
        mode: action.data.mode,
        totalRounds: action.data.totalRounds,
        roundDuration: action.data.roundDuration ?? state.roundDuration,
        customWordsEnabled: action.data.customWordsEnabled ?? state.customWordsEnabled,
        phase: action.data.phase,
        scores: action.data.scores,
        currentRound: action.data.currentRound,
        activeTeam: action.data.activeTeam,
        indiceurId: action.data.indiceurId,
        devineurId: action.data.devineurId,
        currentClue: action.data.currentClue,
        currentExchange: action.data.currentExchange ?? state.currentExchange,
        timeLeft: action.data.timeLeft,
        paused: action.data.paused,
        pausedManually: action.data.pausedManually ?? false,
        wordHistory: action.data.wordHistory ?? state.wordHistory,
        buzzPending: action.data.buzzPending ?? state.buzzPending,
        buzzTeam: action.data.buzzTeam ?? state.buzzTeam,
      };
    case 'GAME_STARTED':
      return { ...state, screen: 'game', currentWord: null, currentBlacklist: [], lastGuessResult: null, roundSummary: null, gameResult: null, wordHistory: [], buzzPending: false, buzzTeam: null, buzzer: null };
    case 'ROUND_STARTED':
      return {
        ...state,
        currentRound: action.data.round,
        activeTeam: action.data.activeTeam,
        indiceurId: action.data.indiceurId,
        devineurId: action.data.devineurId,
        currentWord: null,
        currentBlacklist: [],
        currentClue: null,
        currentExchange: [],
        clueError: null,
        lastGuessResult: null,
        roundSummary: null,
        wordHistory: [],
        buzzPending: false,
        buzzTeam: null,
        buzzer: null,
      };
    case 'ROLES_SWAPPED':
      return {
        ...state,
        indiceurId: action.indiceurId,
        devineurId: action.devineurId,
        currentWord: action.indiceurId === state.myId ? state.currentWord : null,
        currentBlacklist: action.indiceurId === state.myId ? state.currentBlacklist : [],
      };
    case 'WORD_REVEALED':
      return { ...state, currentWord: action.word, currentBlacklist: action.blacklist ?? [], clueError: null, currentExchange: [], currentClue: null };
    case 'CLUE_REVEALED': {
      const newEntry = { clue: action.clue, guess: null };
      const updatedExchange = [...state.currentExchange];
      if (updatedExchange.length > 0 && updatedExchange[updatedExchange.length - 1].guess === null) {
        updatedExchange[updatedExchange.length - 1] = newEntry;
      } else {
        updatedExchange.push(newEntry);
      }
      return { ...state, currentClue: action.clue, currentExchange: updatedExchange, clueError: null };
    }
    case 'CLUE_ERROR':
      return { ...state, clueError: action.message };
    case 'GUESS_RESULT':
      if (action.correct) {
        return {
          ...state,
          lastGuessResult: { correct: true, word: action.word },
          scores: action.scores,
          wordHistory: action.wordHistory ?? state.wordHistory,
          currentClue: null,
          currentExchange: [],
        };
      } else {
        return {
          ...state,
          lastGuessResult: { correct: false, word: action.word },
          scores: action.scores,
          currentClue: null,
          currentExchange: action.currentExchange ?? state.currentExchange,
        };
      }
    case 'WORD_SKIPPED':
      return {
        ...state,
        scores: action.scores,
        wordHistory: action.wordHistory ?? state.wordHistory,
        currentClue: null,
        currentBlacklist: [],
        currentExchange: [],
        lastGuessResult: null,
      };
    case 'TIMER_TICK':
      return { ...state, timeLeft: action.timeLeft };
    case 'ROUND_ENDED':
      return { ...state, roundSummary: action.data, wordHistory: action.data.wordHistory ?? state.wordHistory };
    case 'SCORE_ADJUSTED':
      return { ...state, scores: action.scores };
    case 'GAME_ENDED':
      return { ...state, screen: 'gameover', gameResult: action.data };
    case 'GAME_PAUSED':
      return { ...state, paused: true };
    case 'GAME_RESUMED':
      return { ...state, paused: false, timeLeft: action.timeLeft };
    case 'BUZZ_STARTED':
      return { ...state, buzzPending: true, buzzTeam: action.buzzTeam, buzzer: action.buzzer, paused: true };
    case 'BUZZ_RESOLVED':
      return {
        ...state,
        buzzPending: false,
        buzzTeam: null,
        buzzer: null,
        paused: false,
        scores: action.confirmed ? (action.scores ?? state.scores) : state.scores,
        wordHistory: action.confirmed ? (action.wordHistory ?? state.wordHistory) : state.wordHistory,
      };
    case 'BACK_TO_LOBBY':
      return { ...makeInitialState(), connected: state.connected, myId: state.myId, screen: 'lobby', roomCode: state.roomCode, pseudo: state.pseudo, discordInstanceId: state.discordInstanceId, discordUser: state.discordUser };
    case 'SET_ERROR':
      return { ...state, error: action.message };
    case 'CLEAR_ERROR':
      return { ...state, error: null };
    default:
      return state;
  }
}

export function useGame() {
  const [state, dispatch] = useReducer(reducer, undefined, makeInitialState);

  useEffect(() => {
    socket.connect();

    socket.on('connect', () => {
      dispatch({ type: 'CONNECTED' });
      // Reconnexion automatique après un refresh / une coupure réseau : si on
      // a une session sauvegardée pour un salon, on retente d'y entrer avec
      // le même sessionToken plutôt que de renvoyer sur l'écran d'accueil.
      const saved = loadSession();
      if (!saved) return;
      socket.emit('rejoinRoom', { roomCode: saved.roomCode, sessionToken: saved.sessionToken }, (res) => {
        if (res?.ok) {
          dispatch({ type: 'REJOINED', roomCode: res.roomCode, pseudo: saved.pseudo, snapshot: res.snapshot });
        } else {
          clearSession();
        }
      });
    });
    socket.on('disconnect', () => dispatch({ type: 'DISCONNECTED' }));
    socket.on('roomUpdate', (data) => dispatch({ type: 'ROOM_UPDATE', data }));
    socket.on('gameStarted', () => dispatch({ type: 'GAME_STARTED' }));
    socket.on('roundStarted', (data) => dispatch({ type: 'ROUND_STARTED', data }));
    socket.on('rolesSwapped', ({ indiceurId, devineurId }) => dispatch({ type: 'ROLES_SWAPPED', indiceurId, devineurId }));
    socket.on('wordRevealed', ({ word, blacklist }) => dispatch({ type: 'WORD_REVEALED', word, blacklist }));
    socket.on('clueRevealed', ({ clue }) => dispatch({ type: 'CLUE_REVEALED', clue }));
    socket.on('guessResult', ({ correct, word, scores, wordHistory, currentExchange }) => {
      if (correct) playDing(); else playWrong();
      dispatch({ type: 'GUESS_RESULT', correct, word, scores, wordHistory, currentExchange });
    });
    socket.on('wordSkipped', ({ scores, wordHistory }) => dispatch({ type: 'WORD_SKIPPED', scores, wordHistory }));
    socket.on('timerTick', ({ timeLeft }) => dispatch({ type: 'TIMER_TICK', timeLeft }));
    socket.on('roundEnded', (data) => dispatch({ type: 'ROUND_ENDED', data }));
    socket.on('scoreAdjusted', ({ scores }) => dispatch({ type: 'SCORE_ADJUSTED', scores }));
    socket.on('gameEnded', (data) => dispatch({ type: 'GAME_ENDED', data }));
    socket.on('gamePaused', () => dispatch({ type: 'GAME_PAUSED' }));
    socket.on('gameResumed', ({ timeLeft }) => dispatch({ type: 'GAME_RESUMED', timeLeft }));
    socket.on('buzzStarted', ({ buzzTeam, buzzer }) => { playBuzzer(); dispatch({ type: 'BUZZ_STARTED', buzzTeam, buzzer }); });
    socket.on('buzzResolved', ({ confirmed, scores, buzzTeam, wordHistory }) => dispatch({ type: 'BUZZ_RESOLVED', confirmed, scores, buzzTeam, wordHistory }));
    socket.on('gameAbandoned', () => dispatch({ type: 'BACK_TO_LOBBY' }));
    socket.on('gameRestarted', () => dispatch({ type: 'BACK_TO_LOBBY' }));

    return () => socket.disconnect();
  }, []);

  const createRoom = useCallback((pseudo) => {
    socket.emit('createRoom', { pseudo }, (res) => {
      if (res.error) return dispatch({ type: 'SET_ERROR', message: res.error });
      setRoomInURL(res.roomCode);
      saveSession({ roomCode: res.roomCode, sessionToken: res.sessionToken, pseudo });
      dispatch({ type: 'ROOM_JOINED', roomCode: res.roomCode, pseudo });
    });
  }, []);

  const joinRoom = useCallback((roomCode, pseudo) => {
    socket.emit('joinRoom', { roomCode, pseudo }, (res) => {
      if (res.error) return dispatch({ type: 'SET_ERROR', message: res.error });
      setRoomInURL(res.roomCode);
      saveSession({ roomCode: res.roomCode, sessionToken: res.sessionToken, pseudo });
      dispatch({ type: 'ROOM_JOINED', roomCode: res.roomCode, pseudo });
    });
  }, []);

  const joinOrCreate = useCallback((roomCode, pseudo) => {
    socket.emit('joinOrCreate', { roomCode, pseudo }, (res) => {
      if (res.error) return dispatch({ type: 'SET_ERROR', message: res.error });
      saveSession({ roomCode: res.roomCode, sessionToken: res.sessionToken, pseudo });
      dispatch({ type: 'ROOM_JOINED', roomCode: res.roomCode, pseudo });
    });
  }, []);

  const chooseTeam = useCallback((team) => socket.emit('chooseTeam', { team }), []);
  const updateSettings = useCallback((s) => socket.emit('updateSettings', s), []);
  const startGame = useCallback(() => {
    socket.emit('startGame', {}, (res) => {
      if (res?.error) dispatch({ type: 'SET_ERROR', message: res.error });
    });
  }, []);
  const submitClue = useCallback((clue) => {
    socket.emit('submitClue', { clue }, (res) => {
      if (res?.error) dispatch({ type: 'CLUE_ERROR', message: res.error });
    });
  }, []);
  const submitGuess = useCallback((guess) => socket.emit('submitGuess', { guess }), []);
  const markResult = useCallback((result) => socket.emit('markResult', { result }), []);
  const skipWord = useCallback(() => socket.emit('skipWord', {}), []);
  const swapRoles = useCallback(() => {
    socket.emit('swapRoles', {}, (res) => {
      if (res?.error) dispatch({ type: 'SET_ERROR', message: res.error });
    });
  }, []);
  const setPreferredRole = useCallback((role) => {
    socket.emit('setPreferredRole', { role });
  }, []);
  const setCustomWords = useCallback((words) => {
    socket.emit('setCustomWords', { words }, (res) => {
      if (res?.error) dispatch({ type: 'SET_ERROR', message: res.error });
    });
  }, []);
  const playAgain = useCallback(() => {
    socket.emit('playAgain', {}, (res) => {
      if (res?.error) return dispatch({ type: 'SET_ERROR', message: res.error });
      dispatch({ type: 'BACK_TO_LOBBY' });
    });
  }, []);
  const abandonGame = useCallback(() => {
    socket.emit('abandonGame', {}, (res) => {
      if (res?.error) dispatch({ type: 'SET_ERROR', message: res.error });
    });
  }, []);
  const buzz = useCallback(() => {
    socket.emit('buzz', {}, (res) => {
      if (res?.error) dispatch({ type: 'SET_ERROR', message: res.error });
    });
  }, []);
  const confirmBuzz = useCallback(() => socket.emit('confirmBuzz', {}), []);
  const denyBuzz = useCallback(() => socket.emit('denyBuzz', {}), []);
  const adjustScore = useCallback((team, delta) => {
    socket.emit('adjustScore', { team, delta }, (res) => {
      if (res?.error) dispatch({ type: 'SET_ERROR', message: res.error });
    });
  }, []);
  const togglePause = useCallback(() => {
    socket.emit('togglePause', {}, (res) => {
      if (res?.error) dispatch({ type: 'SET_ERROR', message: res.error });
    });
  }, []);
  const confirmRound = useCallback(() => {
    socket.emit('confirmRound', {}, (res) => {
      if (res?.error) dispatch({ type: 'SET_ERROR', message: res.error });
    });
  }, []);
  const clearError = useCallback(() => dispatch({ type: 'CLEAR_ERROR' }), []);

  const myId = state.myId || socket.id;
  const myRole = myId === state.indiceurId ? 'indiceur'
    : myId === state.devineurId ? 'devineur'
    : 'spectateur';
  const myTeam = state.players.find(p => p.id === myId)?.team ?? null;
  const isHost = myId === state.hostId;
  const shareUrl = state.roomCode
    ? `${window.location.origin}${window.location.pathname}?room=${state.roomCode}`
    : '';

  return {
    ...state,
    myId,
    myRole,
    myTeam,
    isHost,
    shareUrl,
    actions: { createRoom, joinRoom, joinOrCreate, chooseTeam, updateSettings, startGame, submitClue, submitGuess, markResult, skipWord, swapRoles, setPreferredRole, setCustomWords, playAgain, abandonGame, buzz, confirmBuzz, denyBuzz, adjustScore, togglePause, confirmRound, clearError },
  };
}
