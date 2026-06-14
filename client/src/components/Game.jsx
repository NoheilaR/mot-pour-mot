import React from 'react';
import Timer from './Timer';
import IndiceurView from './IndiceurView';
import DevineurView from './DevineurView';
import SpectatorView from './SpectatorView';
import RoundSummary from './RoundSummary';
import HistorySidebar from './HistorySidebar';

const TEAM_NAMES = { A: 'Équipe Rouge', B: 'Équipe Bleue' };

export default function Game({ game }) {
  const { scores, activeTeam, currentRound, totalRounds, roundDuration, timeLeft, paused, roundSummary, myRole, wordHistory, buzzPending, buzzTeam, buzzer, isHost, actions } = game;

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

        <Timer timeLeft={timeLeft} roundDuration={roundDuration} />
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

      {roundSummary && <RoundSummary summary={roundSummary} />}

      {/* Buzz overlay — visible par tous quand un buzz est en cours */}
      {buzzPending && (
        <div className="buzz-overlay">
          <div className="buzz-overlay-card">
            <div className="buzz-badge">BUZZ !</div>
            <p className="buzz-info">
              <span className={`buzz-team-name buzz-team-name--${buzzTeam}`}>{TEAM_NAMES[buzzTeam]}</span>
              {' '}— {buzzer} signale un mot interdit.
            </p>
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
