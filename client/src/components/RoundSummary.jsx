import React from 'react';

const TEAM_NAMES = { A: 'Équipe Rouge', B: 'Équipe Bleue' };

export default function RoundSummary({ summary }) {
  const { roundScore, activeTeam } = summary;
  const pts = Math.max(0, roundScore);

  return (
    <div className="round-summary-overlay">
      <div className="round-summary-card">
        <p className="rs-label">Fin du round</p>
        <p className={`rs-team rs-team--${activeTeam}`}>{TEAM_NAMES[activeTeam]}</p>
        <div className="rs-score">{pts}</div>
        <p className="rs-sub">point{pts > 1 ? 's' : ''} ce round · Prochain round dans…</p>
      </div>
    </div>
  );
}
