import React, { useState, useEffect, useRef } from 'react';
import CurrentExchange from './CurrentExchange';
import { wordSizeClass } from '../utils/wordSize';

export default function DevineurView({ game }) {
  const { currentClue, mode, currentExchange, indiceurId, devineurId, players, actions } = game;
  const [guess, setGuess] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    if (currentClue) {
      setGuess('');
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [currentClue]);

  function handleSubmit(e) {
    e.preventDefault();
    if (!guess.trim() || !currentClue) return;
    actions.submitGuess(guess.trim());
    setGuess('');
  }

  const indiceurPseudo = players.find(p => p.id === indiceurId)?.pseudo;
  const devineurPseudo = players.find(p => p.id === devineurId)?.pseudo;

  // Après un mauvais essai : promouvoir la dernière tentative en affichage principal
  const lastFailed =
    currentClue === null &&
    currentExchange.length > 0 &&
    currentExchange[currentExchange.length - 1].guess !== null &&
    currentExchange[currentExchange.length - 1].guess !== '[vocal]'
      ? currentExchange[currentExchange.length - 1]
      : null;

  // Tentatives plus anciennes (pas celle déjà affichée en grand)
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
        {mode === 'text' ? (
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
        ) : (
          <p className="hint">Réponds à l'oral — {indiceurPseudo} valide.</p>
        )}
      </div>
    </div>
  );
}
