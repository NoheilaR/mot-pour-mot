import React from 'react';

const TEAM_NAMES = { A: 'Équipe Rouge', B: 'Équipe Bleue' };

export default function GameOver({ game }) {
  const { gameResult, isHost, actions, players } = game;
  if (!gameResult) return null;

  const { scores, winner } = gameResult;

  return (
    <div className="screen screen--gameover">
      <div className="gameover-card">
        <p className="go-label">Partie terminée</p>
        {winner === 'draw' ? (
          <h2 className="go-winner go-winner--draw">Égalité !</h2>
        ) : (
          <h2 className={`go-winner go-winner--${winner}`}>{TEAM_NAMES[winner]}</h2>
        )}

        <div className="go-scores">
          {['A', 'B'].map(t => (
            <div key={t} className={`go-score-block go-score-block--${t}${winner === t ? ' go-score-block--winner' : ''}`}>
              <span className="go-score-label">{TEAM_NAMES[t]}</span>
              <span className="go-score-val">{scores[t]}</span>
            </div>
          ))}
        </div>

        <div className="go-players">
          {['A', 'B'].map(t => (
            <div key={t} className="go-team-players">
              <span className="go-team-title">{TEAM_NAMES[t]}</span>
              {players.filter(p => p.team === t).map(p => (
                <span key={p.id} className="go-player-name">{p.pseudo}</span>
              ))}
            </div>
          ))}
        </div>

        {isHost ? (
          <button className="btn--replay" onClick={actions.playAgain}>Rejouer</button>
        ) : (
          <p className="hint">En attente de l'hôte…</p>
        )}
      </div>
    </div>
  );
}
