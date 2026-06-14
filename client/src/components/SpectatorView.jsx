import React from 'react';
import CurrentExchange from './CurrentExchange';
import { wordSizeClass } from '../utils/wordSize';

export default function SpectatorView({ game }) {
  const { currentClue, currentExchange, currentWord, currentBlacklist, mode, myTeam, activeTeam, buzzPending, indiceurId, devineurId, players, actions } = game;

  const indiceurPseudo = players.find(p => p.id === indiceurId)?.pseudo ?? '?';
  const devineurPseudo = players.find(p => p.id === devineurId)?.pseudo ?? '?';

  const canBuzz = mode === 'tabou' && !buzzPending && myTeam !== null && myTeam !== activeTeam;

  if (mode === 'tabou') {
    return (
      <div className="game-card">
        <div className="role-strip">
          <div className="role-strip-left">
            <span className="role-pill role-pill--spectateur">Spectateurs</span>
            <span className="role-name">{indiceurPseudo}</span>
            <span className="role-label">→</span>
            <span className="role-name">{devineurPseudo}</span>
          </div>
        </div>

        {/* Mot visible par tous sauf le devineur */}
        <div className="word-area">
          <div className={`current-word ${wordSizeClass(currentWord)}`} key={currentWord}>
            {currentWord ? currentWord.toUpperCase() : '…'}
          </div>
          <p className="clue-waiting">Écoute l'indiceur…</p>
        </div>

        {/* Blacklist */}
        {currentBlacklist.length > 0 && (
          <div className="blacklist-area">
            <div className="blacklist-label">Mots interdits</div>
            <div className="blacklist-grid">
              {currentBlacklist.map((word, i) => (
                <span key={i} className="blacklist-badge">{word.toUpperCase()}</span>
              ))}
            </div>
          </div>
        )}

        {/* Bouton buzz pour l'équipe adverse */}
        {myTeam !== null && myTeam !== activeTeam && (
          <div className="action-area">
            <button
              className={`btn--buzz${buzzPending ? ' btn--buzz--disabled' : ''}`}
              onClick={actions.buzz}
              disabled={!canBuzz}
            >
              {buzzPending ? 'Buzz en cours…' : '🚨 BUZZ — Mot interdit !'}
            </button>
          </div>
        )}
      </div>
    );
  }

  // Mode texte
  return (
    <div className="game-card">
      <div className="role-strip">
        <div className="role-strip-left">
          <span className="role-pill role-pill--spectateur">Spectateurs</span>
          <span className="role-name">{indiceurPseudo}</span>
          <span className="role-label">→</span>
          <span className="role-name">{devineurPseudo}</span>
        </div>
      </div>

      <div className="word-area">
        {currentClue ? (
          <div className={`current-word ${wordSizeClass(currentClue)}`} key={currentClue}>{currentClue.toUpperCase()}</div>
        ) : (
          <div className="current-word current-word--empty">?</div>
        )}
        {!currentClue && (
          <p className="clue-waiting">En attente de l'indice…</p>
        )}
      </div>

      <CurrentExchange exchange={currentExchange} />
    </div>
  );
}
