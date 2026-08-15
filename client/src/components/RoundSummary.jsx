import React, { useState, useEffect } from 'react';
import { playCountdownBeep } from '../utils/sounds';

const TEAM_NAMES = { A: 'Équipe Rouge', B: 'Équipe Bleue' };
const COUNTDOWN_FROM = 15;

export default function RoundSummary({ summary, scores, isHost, actions }) {
  const { roundScore, activeTeam, wordHistory } = summary;
  const pts = Math.max(0, roundScore);
  const [count, setCount] = useState(COUNTDOWN_FROM);

  useEffect(() => {
    const id = setInterval(() => {
      setCount(c => {
        const next = c - 1;
        if (next >= 1 && next <= 5) playCountdownBeep(Math.min(next, 3));
        return next;
      });
    }, 1000);
    return () => clearInterval(id);
  }, []);

  const correct = (wordHistory ?? []).filter(h => h.result === 'correct');
  const skipped = (wordHistory ?? []).filter(h => h.result === 'skip');
  const buzzed = (wordHistory ?? []).filter(h => h.result === 'buzzed');

  return (
    <div className="round-summary-overlay">
      <div className="round-summary-card">
        <p className="rs-label">Fin du round</p>
        <p className={`rs-team rs-team--${activeTeam}`}>{TEAM_NAMES[activeTeam]}</p>
        <div className="rs-score">{pts}</div>
        <p className="rs-sub">
          {correct.length} trouvé{correct.length > 1 ? 's' : ''}
          {skipped.length > 0 && ` · ${skipped.length} passé${skipped.length > 1 ? 's' : ''}`}
          {buzzed.length > 0 && ` · ${buzzed.length} buzzé${buzzed.length > 1 ? 's' : ''}`}
        </p>

        {/* Correction de score */}
        <div className="rs-adjust">
          <p className="rs-adjust-label">Corriger le score</p>
          <div className="rs-adjust-row">
            <span className="rs-adjust-team rs-adjust-team--A">Rouge</span>
            <span className="rs-adjust-val">{scores.A}</span>
            {isHost && (
              <>
                <button className="btn--adj btn--adj-minus" onClick={() => actions.adjustScore('A', -1)}>−</button>
                <button className="btn--adj btn--adj-plus"  onClick={() => actions.adjustScore('A', +1)}>+</button>
              </>
            )}
          </div>
          <div className="rs-adjust-row">
            <span className="rs-adjust-team rs-adjust-team--B">Bleue</span>
            <span className="rs-adjust-val">{scores.B}</span>
            {isHost && (
              <>
                <button className="btn--adj btn--adj-minus" onClick={() => actions.adjustScore('B', -1)}>−</button>
                <button className="btn--adj btn--adj-plus"  onClick={() => actions.adjustScore('B', +1)}>+</button>
              </>
            )}
          </div>
        </div>

        <div className="rs-footer">
          {isHost ? (
            <button className="btn--confirm-round" onClick={actions.confirmRound}>
              Lancer le round suivant →
            </button>
          ) : (
            <p className="rs-waiting">L'hôte examine le score…</p>
          )}
          <div className={`rs-countdown${count <= 5 ? ' rs-countdown--urgent' : ''}`}>{count > 0 ? count : '!'}</div>
        </div>
      </div>
    </div>
  );
}
