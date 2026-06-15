import React, { useState, useEffect } from 'react';
import { playCountdownBeep } from '../utils/sounds';

const TEAM_NAMES = { A: 'Équipe Rouge', B: 'Équipe Bleue' };
const COUNTDOWN_FROM = 5;

export default function RoundSummary({ summary }) {
  const { roundScore, activeTeam } = summary;
  const pts = Math.max(0, roundScore);
  const [count, setCount] = useState(COUNTDOWN_FROM);

  useEffect(() => {
    const id = setInterval(() => {
      setCount(c => {
        const next = c - 1;
        if (next >= 1 && next <= 3) playCountdownBeep(next);
        return next;
      });
    }, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="round-summary-overlay">
      <div className="round-summary-card">
        <p className="rs-label">Fin du round</p>
        <p className={`rs-team rs-team--${activeTeam}`}>{TEAM_NAMES[activeTeam]}</p>
        <div className="rs-score">{pts}</div>
        <p className="rs-sub">point{pts > 1 ? 's' : ''} ce round</p>
        <div className={`rs-countdown${count <= 3 ? ' rs-countdown--urgent' : ''}`}>{count > 0 ? count : '!'}</div>
      </div>
    </div>
  );
}
