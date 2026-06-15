import React, { useState, useEffect, useRef } from 'react';
import CurrentExchange from './CurrentExchange';
import { wordSizeClass } from '../utils/wordSize';

export default function DevineurView({ game }) {
  const { currentClue, currentWord, devineurWordLength, currentBlacklist, mode, currentExchange, indiceurId, devineurId, players, actions } = game;
  const [guess, setGuess] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    if (currentClue && mode === 'text') {
      setGuess('');
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [currentClue, mode]);

  function handleSubmit(e) {
    e.preventDefault();
    if (!guess.trim() || !currentClue) return;
    actions.submitGuess(guess.trim());
    setGuess('');
  }

  const indiceurPseudo = players.find(p => p.id === indiceurId)?.pseudo;
  const devineurPseudo = players.find(p => p.id === devineurId)?.pseudo;

  // Mode tabou : devineur écoute — voit la longueur du mot et les mots interdits (pour anticiper)
  if (mode === 'tabou') {
    const blanks = devineurWordLength
      ? Array(devineurWordLength).fill('_').join(' ')
      : '?';
    return (
      <div className="game-card">
        <div className="role-strip">
          <div className="role-strip-left">
            <span className="role-pill role-pill--devineur">Devineur</span>
            <span className="role-name">{devineurPseudo}</span>
          </div>
        </div>
        <div className="word-area">
          <div className={`current-word ${devineurWordLength ? 'current-word--blanks' : 'current-word--empty'}`}>{blanks}</div>
          <p className="clue-waiting">Écoute bien et devine le mot…</p>
        </div>
        {currentBlacklist.length > 0 && (
          <div className="blacklist-area">
            <div className="blacklist-label">Mots que l'indiceur ne peut pas dire</div>
            <div className="blacklist-grid">
              {currentBlacklist.map((word, i) => (
                <span key={i} className="blacklist-badge blacklist-badge--hint">{word.toUpperCase()}</span>
              ))}
            </div>
          </div>
        )}
        <div className="action-area">
          <div className="skip-btn-row">
            <button className="btn--skip" onClick={actions.skipWord} disabled={!devineurWordLength}>Passer (−1)</button>
          </div>
        </div>
      </div>
    );
  }

  // Mode texte
  const lastFailed =
    currentClue === null &&
    currentExchange.length > 0 &&
    currentExchange[currentExchange.length - 1].guess !== null
      ? currentExchange[currentExchange.length - 1]
      : null;

  const olderExchange = lastFailed ? currentExchange.slice(0, -1) : currentExchange;

  return (
    <div className="game-card">
      <div className="role-strip">
        <div className="role-strip-left">
          <span className="role-pill role-pill--devineur">Devineur</span>
          <span className="role-name">{devineurPseudo}</span>
          <span className="role-label">·</span>
          <span className="role-name">{indiceurPseudo}</span>
          <span className="role-label">donne l'indice</span>
        </div>
      </div>

      <div className="word-area">
        {currentClue ? (
          <div className={`current-word ${wordSizeClass(currentClue)}`} key={currentClue}>
            {currentClue.toUpperCase()}
          </div>
        ) : lastFailed ? (
          <div className="failed-attempt">
            <div className="failed-attempt-clue-label">indice</div>
            <div className="failed-attempt-clue">
              {lastFailed.clue.toUpperCase()}
            </div>
            <div className="failed-attempt-guess">
              <span className="failed-attempt-arrow">→</span>
              <span className="failed-attempt-val">
                {lastFailed.guess.toUpperCase()}
              </span>
              <span className="failed-attempt-x">✗</span>
            </div>
          </div>
        ) : (
          <div className="current-word current-word--empty">?</div>
        )}

        {!currentClue && (
          <p className="clue-waiting">
            {lastFailed
              ? `En attente d'un nouvel indice de ${indiceurPseudo}…`
              : `En attente de l'indice de ${indiceurPseudo}…`}
          </p>
        )}
      </div>

      <CurrentExchange exchange={olderExchange} />

      <div className="action-area">
        <form className="guess-form" onSubmit={handleSubmit}>
          <input
            ref={inputRef}
            className="field-input field-input--guess"
            type="text"
            value={guess}
            onChange={e => setGuess(e.target.value)}
            placeholder="Ton mot…"
            disabled={!currentClue}
            maxLength={40}
            autoComplete="off"
            autoFocus
          />
          <button className="btn--guess" type="submit" disabled={!guess.trim() || !currentClue}>→</button>
        </form>
        <div className="skip-btn-row">
          <button className="btn--skip" onClick={actions.skipWord} disabled={!currentWord}>Passer (−1)</button>
        </div>
      </div>
    </div>
  );
}
