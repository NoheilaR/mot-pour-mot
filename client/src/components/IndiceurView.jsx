import React, { useState, useEffect, useRef } from 'react';
import CurrentExchange from './CurrentExchange';
import { wordSizeClass } from '../utils/wordSize';

export default function IndiceurView({ game }) {
  const { currentWord, currentClue, clueError, mode, currentExchange, indiceurId, devineurId, players, actions } = game;
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

  // Focus auto quand l'indiceur peut redonner un indice
  useEffect(() => {
    if (currentClue === null && currentWord) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [currentClue, currentWord]);

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

      {/* Mot cible — visible uniquement par l'indiceur */}
      <div className="word-area">
        <div className={`current-word ${wordSizeClass(currentWord)}`} key={wordKey}>
          {currentWord ? currentWord.toUpperCase() : '…'}
        </div>
      </div>

      {/* Tentatives échouées pour ce mot */}
      <CurrentExchange exchange={currentExchange} />

      <div className="action-area">
        {clueError && (
          <div className="guess-feedback guess-feedback--wrong">{clueError}</div>
        )}

        {currentClue === null ? (
          /* L'indiceur peut donner (ou redonner) un indice */
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
          /* Indice envoyé, en attente de la réponse du devineur */
          <div className="clue-submitted">
            <span className="clue-submitted-label">Indice envoyé</span>
            <span className="clue-submitted-value">{currentClue.toUpperCase()}</span>
          </div>
        )}

        {/* Mode vocal : boutons correct/passer (seulement quand l'indice est actif) */}
        {mode === 'vocal' && currentClue !== null && (
          <div className="skip-btn-row">
            <button className="btn--correct" onClick={() => actions.markResult('correct')}>✓ Correct</button>
            <button className="btn--skip" onClick={actions.skipWord}>Passer (−1)</button>
          </div>
        )}

        {/* Mode texte : passer disponible dès qu'un indice est actif */}
        {mode === 'text' && currentClue !== null && (
          <div className="skip-btn-row">
            <button className="btn--skip" onClick={actions.skipWord}>Passer (−1)</button>
          </div>
        )}
      </div>
    </div>
  );
}
