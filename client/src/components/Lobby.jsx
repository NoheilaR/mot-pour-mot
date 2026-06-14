import React, { useState } from 'react';

const TEAM_NAMES = { A: 'Équipe Rouge', B: 'Équipe Bleue' };
const DURATIONS = [30, 45, 60, 90, 120];

export default function Lobby({ game }) {
  const { roomCode, players, mode, totalRounds, roundDuration, isHost, myId, shareUrl, discordInstanceId, actions } = game;
  const [copied, setCopied] = useState(false);
  const isDiscord = !!discordInstanceId;

  const unassigned = players.filter(p => !p.team);
  const me = players.find(p => p.id === myId);

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
            const indiceur = members.find(p => p.preferredRole === 'indiceur');
            const devineur = members.find(p => p.preferredRole === 'devineur');
            // Joueurs sans préférence de rôle
            const unroled = members.filter(p => !p.preferredRole);

            return (
              <div key={team} className={`team-col team-col--${team}`}>
                <div className="team-col-title">{TEAM_NAMES[team]}</div>

                {/* Slot Indiceur */}
                <RoleSlot
                  label="Indiceur"
                  player={indiceur}
                  myId={myId}
                  onClick={() => claimSlot(team, 'indiceur')}
                  isActive={me?.team === team && me?.preferredRole === 'indiceur'}
                />

                {/* Slot Devineur */}
                <RoleSlot
                  label="Devineur"
                  player={devineur}
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

        {/* Settings (host only) */}
        {isHost && (
          <div className="settings-panel">
            <div className="settings-row">
              <span className="settings-label">Mode de réponse</span>
              <div className="pill-group">
                <button className={`pill${mode === 'text' ? ' pill--active' : ''}`} onClick={() => actions.updateSettings({ mode: 'text' })}>Texte</button>
                <button className={`pill${mode === 'vocal' ? ' pill--active' : ''}`} onClick={() => actions.updateSettings({ mode: 'vocal' })}>Vocal</button>
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
            <span className="settings-value">{mode === 'text' ? 'Texte' : 'Vocal'}</span>
            <p className="hint">En attente que l'hôte lance la partie…</p>
          </div>
        )}
      </div>
    </div>
  );
}

function canStart(players) {
  return players.length >= 2;
}

function RoleSlot({ label, player, myId, onClick, isActive }) {
  const isEmpty = !player;
  const isMe = player?.id === myId;

  return (
    <button
      className={`role-slot${isActive ? ' role-slot--active' : ''}${isEmpty ? ' role-slot--empty' : ''}`}
      onClick={onClick}
      // Désactivé si quelqu'un d'autre occupe déjà ce slot
      disabled={!isEmpty && !isMe}
    >
      <span className="role-slot-label">{label}</span>
      <span className={`role-slot-player${isMe ? ' role-slot-player--me' : ''}`}>
        {player ? player.pseudo : 'Libre'}
      </span>
    </button>
  );
}
