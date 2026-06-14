import React from 'react';
import CurrentExchange from './CurrentExchange';
import { wordSizeClass } from '../utils/wordSize';

// L'équipe non-active voit la même chose que le devineur (indice en gros, échange courant)
// mais sans le champ de saisie
export default function SpectatorView({ game }) {
  const { currentClue, currentExchange, indiceurId, devineurId, players } = game;

  const indiceurPseudo = players.find(p => p.id === indiceurId)?.pseudo ?? '?';
  const devineurPseudo = players.find(p => p.id === devineurId)?.pseudo ?? '?';

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
