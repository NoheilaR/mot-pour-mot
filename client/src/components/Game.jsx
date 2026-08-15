import React, { useState } from 'react';
import Timer from './Timer';
import IndiceurView from './IndiceurView';
import DevineurView from './DevineurView';
import SpectatorView from './SpectatorView';
import RoundSummary from './RoundSummary';
import HistorySidebar from './HistorySidebar';

const TEAM_NAMES = { A: 'Équipe Rouge', B: 'Équipe Bleue' };

function renderTeamStripPlayer(p, i) {
  return (
    <span key={p.id} className={`team-strip-player${p.connected === false ? ' team-strip-player--offline' : ''}`}>
      {i > 0 && ', '}
      {p.pseudo}
      {p.connected === false && <span className="team-strip-offline-pip" title="Déconnecté — en attente de reconnexion">⚠</span>}
    </span>
  );
}

export default function Game({ game }) {
  const { scores, activeTeam, currentRound, totalRounds, roundDuration, timeLeft, paused,
    roundSummary, myRole, wordHistory, buzzPending, buzzTeam, buzzer, currentBlacklist,
    players, isHost, actions } = game;
  const [confirmAbandon, setConfirmAbandon] = useState(false);

  const teamA = players.filter(p => p.team === 'A');
  const teamB = players.filter(p => p.team === 'B');

  function handleAbandon() {
    actions.abandonGame();
    setConfirmAbandon(false);
  }

  return (
    <div className="screen screen--game">
      {/* Header */}
      <div className="game-header">
        <div className="header-score">
          <span className="header-score-val header-score-val--a">{scores.A}</span>
          <span className="header-score-sep">—</span>
          <span className="header-score-val header-score-val--b">{scores.B}</span>
        </div>

        <div className="header-middle">
          <span className="header-round">Round {currentRound + 1} / {totalRounds}</span>
          {activeTeam && (
            <span className={`header-team-badge header-team-badge--${activeTeam}`}>
              {TEAM_NAMES[activeTeam]}
            </span>
          )}
        </div>

        <div className="header-right">
          <Timer timeLeft={timeLeft} roundDuration={roundDuration} />
          {isHost && (
            confirmAbandon ? (
              <div className="abandon-confirm">
                <span className="abandon-confirm-label">Fin ?</span>
                <button className="btn--abandon-yes" onClick={handleAbandon}>Oui</button>
                <button className="btn--abandon-no" onClick={() => setConfirmAbandon(false)}>Non</button>
              </div>
            ) : (
              <button className="btn--abandon" onClick={() => setConfirmAbandon(true)} title="Abandonner la partie">
                ✕
              </button>
            )
          )}
        </div>
      </div>

      {/* Strip équipes */}
      <div className="team-strip">
        <div className={`team-strip-side team-strip-side--A${activeTeam === 'A' ? ' team-strip-side--active' : ''}`}>
          <span className="team-strip-name">Rouge</span>
          <span className="team-strip-players">{teamA.length > 0 ? teamA.map(renderTeamStripPlayer) : '—'}</span>
        </div>
        <div className={`team-strip-side team-strip-side--B${activeTeam === 'B' ? ' team-strip-side--active' : ''}`}>
          <span className="team-strip-name">Bleue</span>
          <span className="team-strip-players">{teamB.length > 0 ? teamB.map(renderTeamStripPlayer) : '—'}</span>
        </div>
      </div>

      {paused && !buzzPending && <div className="pause-banner">⏸ Pause — joueur déconnecté</div>}

      {/* Corps : main + sidebar */}
      <div className="game-layout">
        <div className="game-main">
          {myRole === 'indiceur'   && <IndiceurView game={game} />}
          {myRole === 'devineur'   && <DevineurView game={game} />}
          {myRole === 'spectateur' && <SpectatorView game={game} />}
        </div>

        <HistorySidebar history={wordHistory} />
      </div>

      {roundSummary && (
        <RoundSummary
          summary={roundSummary}
          scores={scores}
          isHost={isHost}
          actions={actions}
        />
      )}

      {/* Buzz overlay */}
      {buzzPending && (
        <div className="buzz-overlay">
          <div className="buzz-overlay-card">
            <div className="buzz-badge">BUZZ !</div>
            <p className="buzz-info">
              <span className={`buzz-team-name buzz-team-name--${buzzTeam}`}>{TEAM_NAMES[buzzTeam]}</span>
              {' '}— {buzzer || 'Un joueur'} signale un mot interdit.
            </p>
            {currentBlacklist.length > 0 && (
              <div className="buzz-blacklist">
                <div className="blacklist-label">Mots interdits</div>
                <div className="blacklist-grid">
                  {currentBlacklist.map((word, i) => (
                    <span key={i} className="blacklist-badge">{word.toUpperCase()}</span>
                  ))}
                </div>
              </div>
            )}
            {isHost ? (
              <div className="buzz-actions">
                <button className="btn--confirm-buzz" onClick={actions.confirmBuzz}>
                  ✓ Confirmer (+1)
                </button>
                <button className="btn--deny-buzz" onClick={actions.denyBuzz}>
                  ✗ Refuser
                </button>
              </div>
            ) : (
              <p className="buzz-waiting">L'hôte examine le buzz…</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
