import React, { useState, useEffect, useRef } from 'react';
import CurrentExchange from './CurrentExchange';
import { wordSizeClass } from '../utils/wordSize';

export default function IndiceurView({ game }) {
  const { currentWord, currentClue, clueError, mode, currentExchange, currentBlacklist, indiceurId, devineurId, players, actions } = game;
  const [clue, setClue] = useState('');
  const [wordKey, setWordKey] = useState(0);
  const inputRef = useRef(null);
  const prevWordRef = useRef(null);

  useEffect(() => {
    if (currentWord && currentWord !== prevWordRef.current) {
      prevWordRef.current = currentWord;
      setWordKey(k => k + 1);
      setClue('');
    }
  }, [currentWord]);

  useEffect(() => {
    if (mode === 'text' && currentClue === null && currentWord) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [currentClue, currentWord, mode]);

  function handleSubmit(e) {
    e.preventDefault();
    if (!clue.trim()) return;
    actions.submitClue(clue.trim());
    setClue('');
  }

  const indiceurPseudo = players.find(p => p.id === indiceurId)?.pseudo;
  const devineurPseudo = players.find(p => p.id === devineurId)?.pseudo;

  return (
    <div className="game-card">
      <div className="role-strip">
        <div className="role-strip-left">
          <span className="role-pill role-pill--indiceur">Indiceur</span>
          <span className="role-name">{indiceurPseudo}</span>
          <span className="role-label">→</span>
          <span className="role-name">{devineurPseudo}</span>
        </div>
      </div>

      {/* Mot cible */}
      <div className="word-area">
        <div className={`current-word ${wordSizeClass(currentWord)}`} key={wordKey}>
          {currentWord ? currentWord.toUpperCase() : '…'}
        </div>
      </div>

      {/* Blacklist (mode tabou) */}
      {mode === 'tabou' && currentBlacklist.length > 0 && (
        <div className="blacklist-area">
          <div className="blacklist-label">Mots interdits</div>
          <div className="blacklist-grid">
            {currentBlacklist.map((word, i) => (
              <span key={i} className="blacklist-badge">{word.toUpperCase()}</span>
            ))}
          </div>
        </div>
      )}

      {/* Échange courant (mode texte) */}
      {mode === 'text' && <CurrentExchange exchange={currentExchange} />}

      <div className="action-area">
        {clueError && (
          <div className="guess-feedback guess-feedback--wrong">{clueError}</div>
        )}

        {mode === 'text' && (
          currentClue === null ? (
            <form className="clue-form" onSubmit={handleSubmit}>
              <div className="clue-row">
                <input
                  ref={inputRef}
                  className="field-input field-input--clue"
                  type="text"
                  value={clue}
                  onChange={e => setClue(e.target.value.replace(/\s/g, ''))}
                  placeholder={currentExchange.length > 0 ? 'Nouvel indice…' : 'Ton indice…'}
                  maxLength={40}
                  disabled={!currentWord}
                  autoComplete="off"
                />
                <button className="btn--send" type="submit" disabled={!clue.trim() || !currentWord}>→</button>
              </div>
            </form>
          ) : (
            <div className="clue-submitted">
              <span className="clue-submitted-label">Indice envoyé</span>
              <span className="clue-submitted-value">{currentClue.toUpperCase()}</span>
            </div>
          )
        )}

        {mode === 'text' && currentWord && (
          <div className="skip-btn-row">
            <button className="btn--skip" onClick={actions.skipWord}>Passer (−1)</button>
          </div>
        )}

        {mode === 'tabou' && (
          <div className="skip-btn-row">
            <button className="btn--correct" onClick={() => actions.markResult('correct')} disabled={!currentWord}>
              ✓ Correct
            </button>
            <button className="btn--skip" onClick={actions.skipWord} disabled={!currentWord}>
              Passer (−1)
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
