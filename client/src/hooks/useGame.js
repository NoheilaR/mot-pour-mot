import { useEffect, useReducer, useCallback } from 'react';
import socket from '../socket';
import { getDiscordInstanceId, getDiscordUser } from '../discord';

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
    phase: 'lobby',
    scores: { A: 0, B: 0 },
    currentRound: -1,
    activeTeam: null,
    indiceurId: null,
    devineurId: null,
    currentClue: null,
    timeLeft: 30,
    paused: false,
    wordHistory: [],

    // État client
    currentWord: null,
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
    case 'ROOM_UPDATE':
      return {
        ...state,
        hostId: action.data.hostId,
        players: action.data.players,
        mode: action.data.mode,
        totalRounds: action.data.totalRounds,
        roundDuration: action.data.roundDuration ?? state.roundDuration,
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
        wordHistory: action.data.wordHistory ?? state.wordHistory,
      };
    case 'GAME_STARTED':
      return { ...state, screen: 'game', currentWord: null, lastGuessResult: null, roundSummary: null, gameResult: null, wordHistory: [] };
    case 'ROUND_STARTED':
      return {
        ...state,
        currentRound: action.data.round,
        activeTeam: action.data.activeTeam,
        indiceurId: action.data.indiceurId,
        devineurId: action.data.devineurId,
        currentWord: null,
        currentClue: null,
        currentExchange: [],
        clueError: null,
        lastGuessResult: null,
        roundSummary: null,
        wordHistory: [],
      };
    case 'ROLES_SWAPPED':
      return {
        ...state,
        indiceurId: action.indiceurId,
        devineurId: action.devineurId,
        currentWord: action.indiceurId === state.myId ? state.currentWord : null,
      };
    case 'WORD_REVEALED':
      return { ...state, currentWord: action.word, clueError: null, currentExchange: [], currentClue: null };
    case 'CLUE_REVEALED': {
      // Ajoute l'indice dans l'échange courant (côté client)
      const newEntry = { clue: action.clue, guess: null };
      const updatedExchange = [...state.currentExchange];
      // Remplace la dernière entrée si elle n'a pas encore de guess (double submit guard)
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
        // Mot suivant : reset de l'échange courant, mise à jour de l'historique
        return {
          ...state,
          lastGuessResult: { correct: true, word: action.word },
          scores: action.scores,
          wordHistory: action.wordHistory ?? state.wordHistory,
          currentClue: null,
          currentExchange: [],
        };
      } else {
        // Mauvaise réponse : met à jour l'échange (serveur a réinitialisé currentClue)
        return {
          ...state,
          lastGuessResult: { correct: false, word: action.word },
          scores: action.scores,
          currentClue: null,           // indiceur peut redonner un indice
          currentExchange: action.currentExchange ?? state.currentExchange,
        };
      }
    case 'WORD_SKIPPED':
      return {
        ...state,
        scores: action.scores,
        wordHistory: action.wordHistory ?? state.wordHistory,
        currentClue: null,
        currentExchange: [],
        lastGuessResult: null,
      };
    case 'TIMER_TICK':
      return { ...state, timeLeft: action.timeLeft };
    case 'ROUND_ENDED':
      return { ...state, roundSummary: action.data, wordHistory: action.data.wordHistory ?? state.wordHistory };
    case 'GAME_ENDED':
      return { ...state, screen: 'gameover', gameResult: action.data };
    case 'GAME_PAUSED':
      return { ...state, paused: true };
    case 'GAME_RESUMED':
      return { ...state, paused: false, timeLeft: action.timeLeft };
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

    socket.on('connect', () => dispatch({ type: 'CONNECTED' }));
    socket.on('disconnect', () => dispatch({ type: 'DISCONNECTED' }));
    socket.on('roomUpdate', (data) => dispatch({ type: 'ROOM_UPDATE', data }));
    socket.on('gameStarted', () => dispatch({ type: 'GAME_STARTED' }));
    socket.on('roundStarted', (data) => dispatch({ type: 'ROUND_STARTED', data }));
    socket.on('rolesSwapped', ({ indiceurId, devineurId }) => dispatch({ type: 'ROLES_SWAPPED', indiceurId, devineurId }));
    socket.on('wordRevealed', ({ word }) => dispatch({ type: 'WORD_REVEALED', word }));
    socket.on('clueRevealed', ({ clue }) => dispatch({ type: 'CLUE_REVEALED', clue }));
    socket.on('guessResult', ({ correct, word, scores, wordHistory, currentExchange }) => dispatch({ type: 'GUESS_RESULT', correct, word, scores, wordHistory, currentExchange }));
    socket.on('wordSkipped', ({ scores, wordHistory }) => dispatch({ type: 'WORD_SKIPPED', scores, wordHistory }));
    socket.on('timerTick', ({ timeLeft }) => dispatch({ type: 'TIMER_TICK', timeLeft }));
    socket.on('roundEnded', (data) => dispatch({ type: 'ROUND_ENDED', data }));
    socket.on('gameEnded', (data) => dispatch({ type: 'GAME_ENDED', data }));
    socket.on('gamePaused', () => dispatch({ type: 'GAME_PAUSED' }));
    socket.on('gameResumed', ({ timeLeft }) => dispatch({ type: 'GAME_RESUMED', timeLeft }));

    return () => socket.disconnect();
  }, []);

  const createRoom = useCallback((pseudo) => {
    socket.emit('createRoom', { pseudo }, (res) => {
      if (res.error) return dispatch({ type: 'SET_ERROR', message: res.error });
      setRoomInURL(res.roomCode);
      dispatch({ type: 'ROOM_JOINED', roomCode: res.roomCode, pseudo });
    });
  }, []);

  const joinRoom = useCallback((roomCode, pseudo) => {
    socket.emit('joinRoom', { roomCode, pseudo }, (res) => {
      if (res.error) return dispatch({ type: 'SET_ERROR', message: res.error });
      setRoomInURL(res.roomCode);
      dispatch({ type: 'ROOM_JOINED', roomCode: res.roomCode, pseudo });
    });
  }, []);

  // Discord Activity : crée la room si elle n'existe pas, la rejoint sinon
  const joinOrCreate = useCallback((roomCode, pseudo) => {
    socket.emit('joinOrCreate', { roomCode, pseudo }, (res) => {
      if (res.error) return dispatch({ type: 'SET_ERROR', message: res.error });
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
  const playAgain = useCallback(() => {
    socket.emit('playAgain', {}, (res) => {
      if (res?.error) return dispatch({ type: 'SET_ERROR', message: res.error });
      dispatch({ type: 'BACK_TO_LOBBY' });
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
    actions: { createRoom, joinRoom, joinOrCreate, chooseTeam, updateSettings, startGame, submitClue, submitGuess, markResult, skipWord, swapRoles, setPreferredRole, playAgain, clearError },
  };
}
