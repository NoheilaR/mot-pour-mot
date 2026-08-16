import React, { useState } from 'react';
import CustomWordsPanel from './CustomWordsPanel';

const TEAM_NAMES = { A: 'Équipe Rouge', B: 'Équipe Bleue' };
const DURATIONS = [30, 45, 60, 90, 120];

export default function Lobby({ game }) {
  const { roomCode, players, mode, totalRounds, roundDuration, customWordsEnabled, isHost, myId, shareUrl, discordInstanceId, actions } = game;
  const [copied, setCopied] = useState(false);
  const isDiscord = !!discordInstanceId;

  const unassigned = players.filter(p => !p.team);
  const spectators = players.filter(p => p.team === 'spectator');
  const me = players.find(p => p.id === myId);
  const isSpectator = me?.team === 'spectator';

  function copyLink() {
    navigator.clipboard.writeText(shareUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  // Rejoindre une équipe + réclamer un rôle en un seul clic
  function claimSlot(team, role) {
    if (me?.team !== team) actions.chooseTeam(team);
    // Si on clique sur son propre rôle actuel → désélection
    actions.setPreferredRole(me?.team === team && me?.preferredRole === role ? null : role);
  }

  return (
    <div className="screen screen--lobby">
      <div className="lobby-wrap">
        {/* Top bar */}
        <div className="lobby-top">
          <h2 className="lobby-title">Salon</h2>
          {!isDiscord && (
            <div className="room-badge">
              <span className="room-badge-label">Code</span>
              <span className="room-badge-code">{roomCode}</span>
            </div>
          )}
        </div>

        {/* Share URL — caché en mode Discord Activity */}
        {!isDiscord && (
          <div className="share-row">
            <span className="share-url">{shareUrl}</span>
            <button className={`btn--copy${copied ? ' btn--copy--done' : ''}`} onClick={copyLink}>
              {copied ? '✓ Copié' : 'Copier le lien'}
            </button>
          </div>
        )}

        {/* Teams — 2 cards côte à côte */}
        <div className="teams-grid">
          {['A', 'B'].map(team => {
            const members = players.filter(p => p.team === team);
            const indiceurCandidates = members.filter(p => p.preferredRole === 'indiceur');
            const devineurCandidates = members.filter(p => p.preferredRole === 'devineur');
            // Joueurs sans préférence de rôle
            const unroled = members.filter(p => !p.preferredRole);

            return (
              <div key={team} className={`team-col team-col--${team}`}>
                <div className="team-col-title">{TEAM_NAMES[team]}</div>

                {/* Slot Indiceur — plusieurs joueurs peuvent le revendiquer en même temps,
                    le conflit se résout automatiquement au lancement. */}
                <RoleSlot
                  label="Indiceur"
                  candidates={indiceurCandidates}
                  myId={myId}
                  onClick={() => claimSlot(team, 'indiceur')}
                  isActive={me?.team === team && me?.preferredRole === 'indiceur'}
                />

                {/* Slot Devineur */}
                <RoleSlot
                  label="Devineur"
                  candidates={devineurCandidates}
                  myId={myId}
                  onClick={() => claimSlot(team, 'devineur')}
                  isActive={me?.team === team && me?.preferredRole === 'devineur'}
                />

                {/* Joueurs dans l'équipe sans rôle choisi */}
                {unroled.length > 0 && (
                  <div className="unroled-list">
                    {unroled.map(p => (
                      <span key={p.id} className={`unroled-chip${p.id === myId ? ' unroled-chip--me' : ''}`}>
                        {p.pseudo}
                        {p.id === game.hostId && <span className="host-pip">hôte</span>}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Sans équipe */}
        {unassigned.length > 0 && (
          <div className="unassigned-bar">
            <span>Sans équipe :</span>
            {unassigned.map(p => (
              <span key={p.id} className="unassigned-chip">{p.pseudo}</span>
            ))}
          </div>
        )}

        {/* Spectateurs — choix explicite, ils ne jouent pas cette partie */}
        <div className="spectator-bar">
          <div className="spectator-bar-list">
            <span className="spectator-bar-label">👀 Spectateurs</span>
            {spectators.length === 0 ? (
              <span className="spectator-bar-empty">Aucun</span>
            ) : (
              spectators.map(p => (
                <span key={p.id} className={`spectator-chip${p.id === myId ? ' spectator-chip--me' : ''}`}>
                  {p.pseudo}
                </span>
              ))
            )}
          </div>
          <button
            className={`btn--spectate${isSpectator ? ' btn--spectate--active' : ''}`}
            onClick={() => actions.chooseTeam(isSpectator ? null : 'spectator')}
          >
            {isSpectator ? '↩ Rejoindre une équipe' : '👀 Regarder en spectateur'}
          </button>
        </div>

        {/* Settings (host only) */}
        {isHost && (
          <div className="settings-panel">
            <div className="settings-row">
              <span className="settings-label">Mode de réponse</span>
              <div className="pill-group">
                <button className={`pill${mode === 'text' ? ' pill--active' : ''}`} onClick={() => actions.updateSettings({ mode: 'text' })}>Texte</button>
                <button className={`pill${mode === 'tabou' ? ' pill--active' : ''}`} onClick={() => actions.updateSettings({ mode: 'tabou' })}>Tabou</button>
              </div>
            </div>
            <div className="settings-row">
              <span className="settings-label">Rounds</span>
              <div className="pill-group">
                {[2, 4, 6, 8].map(n => (
                  <button key={n} className={`pill${totalRounds === n ? ' pill--active' : ''}`} onClick={() => actions.updateSettings({ totalRounds: n })}>{n}</button>
                ))}
              </div>
            </div>
            <div className="settings-row">
              <span className="settings-label">Durée du round</span>
              <div className="pill-group">
                {DURATIONS.map(s => (
                  <button key={s} className={`pill${roundDuration === s ? ' pill--active' : ''}`} onClick={() => actions.updateSettings({ roundDuration: s })}>{s}s</button>
                ))}
              </div>
            </div>
            <div className="settings-row">
              <span className="settings-label">Mots personnalisés</span>
              <div className="pill-group">
                <button className={`pill${!customWordsEnabled ? ' pill--active' : ''}`} onClick={() => actions.updateSettings({ customWordsEnabled: false })}>Non</button>
                <button className={`pill${customWordsEnabled ? ' pill--active' : ''}`} onClick={() => actions.updateSettings({ customWordsEnabled: true })}>Oui</button>
              </div>
            </div>
            <button className="btn--start-game" onClick={actions.startGame} disabled={!canStart(players)}>
              {canStart(players) ? '▶ Lancer la partie' : '2 joueurs min.'}
            </button>
          </div>
        )}

        {!isHost && (
          <div className="non-host-settings">
            <span className="settings-label">Durée</span>
            <span className="settings-value">{roundDuration}s</span>
            <span className="settings-label">Mode</span>
            <span className="settings-value">{mode === 'text' ? 'Texte' : 'Tabou'}</span>
            <p className="hint">En attente que l'hôte lance la partie…</p>
          </div>
        )}

        {customWordsEnabled && <CustomWordsPanel game={game} />}
      </div>
    </div>
  );
}

function canStart(players) {
  return players.filter(p => p.team !== 'spectator').length >= 2;
}

// Plusieurs joueurs peuvent revendiquer le même rôle en même temps pendant
// le pick (jamais désactivé à cause d'un autre joueur) — le conflit est
// résolu automatiquement au lancement de la partie, côté serveur.
function RoleSlot({ label, candidates, myId, onClick, isActive }) {
  const isEmpty = candidates.length === 0;
  const isContested = candidates.length > 1;

  return (
    <button
      className={`role-slot${isActive ? ' role-slot--active' : ''}${isEmpty ? ' role-slot--empty' : ''}${isContested ? ' role-slot--contested' : ''}`}
      onClick={onClick}
    >
      <span className="role-slot-label">{label}</span>
      {isEmpty ? (
        <span className="role-slot-player">Libre</span>
      ) : (
        <span className="role-slot-players">
          {candidates.map(p => (
            <span key={p.id} className={`role-slot-player${p.id === myId ? ' role-slot-player--me' : ''}`}>
              {p.pseudo}
            </span>
          ))}
        </span>
      )}
      {isContested && <span className="role-slot-contested-pip" title="Sera réparti automatiquement au lancement">à trancher</span>}
    </button>
  );
}
