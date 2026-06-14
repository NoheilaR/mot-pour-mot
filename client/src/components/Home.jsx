import React, { useState, useEffect } from 'react';

export default function Home({ game }) {
  const [pseudo, setPseudo] = useState('');
  const [roomCode, setRoomCode] = useState(game.urlRoomCode || '');
  const [tab, setTab] = useState(game.urlRoomCode ? 'join' : 'create');

  // Mode Discord Activity avec pseudo récupéré automatiquement → auto-join
  useEffect(() => {
    if (game.discordInstanceId && game.discordUser && game.connected) {
      const name = game.discordUser.global_name || game.discordUser.username;
      game.actions.joinOrCreate(game.discordInstanceId, name);
    }
  }, [game.connected, game.discordInstanceId, game.discordUser]);

  // Mode Discord sans pseudo récupéré → formulaire simple
  if (game.discordInstanceId && !game.discordUser) {
    function handleDiscordJoin(e) {
      e.preventDefault();
      if (!pseudo.trim()) return;
      game.actions.joinOrCreate(game.discordInstanceId, pseudo.trim());
    }

    return (
      <div className="screen screen--home">
        <div className="home-logo">MOT <span>pour</span> MOT</div>
        <p className="home-sub">Party game · 2v2 · temps réel</p>
        <div className="home-card">
          <form onSubmit={handleDiscordJoin}>
            <div className="field">
              <label className="field-label">Pseudo</label>
              <input
                className="field-input"
                type="text"
                value={pseudo}
                onChange={e => setPseudo(e.target.value)}
                placeholder="Ton prénom"
                maxLength={20}
                autoFocus
              />
            </div>
            <button
              className="btn btn--primary"
              type="submit"
              disabled={!game.connected || !pseudo.trim()}
            >
              Rejoindre la partie
            </button>
          </form>
          {!game.connected && <p className="hint">Connexion…</p>}
        </div>
      </div>
    );
  }

  // Mode Discord avec pseudo → affiche un écran de chargement (auto-join en cours)
  if (game.discordInstanceId && game.discordUser) {
    return (
      <div className="screen screen--home">
        <div className="home-logo">MOT <span>pour</span> MOT</div>
        <p className="home-sub">Connexion en cours…</p>
      </div>
    );
  }

  function handleCreate(e) {
    e.preventDefault();
    if (!pseudo.trim()) return;
    game.actions.createRoom(pseudo.trim());
  }

  function handleJoin(e) {
    e.preventDefault();
    if (!pseudo.trim() || !roomCode.trim()) return;
    game.actions.joinRoom(roomCode.trim().toUpperCase(), pseudo.trim());
  }

  return (
    <div className="screen screen--home">
      <div className="home-logo">
        MOT <span>pour</span> MOT
      </div>
      <p className="home-sub">Party game · 2v2 · temps réel</p>

      <div className="home-card">
        <div className="tab-row">
          <button
            className={`tab-btn${tab === 'create' ? ' tab-btn--active' : ''}`}
            onClick={() => setTab('create')}
          >Créer</button>
          <button
            className={`tab-btn${tab === 'join' ? ' tab-btn--active' : ''}`}
            onClick={() => setTab('join')}
          >Rejoindre</button>
        </div>

        <form onSubmit={tab === 'create' ? handleCreate : handleJoin}>
          <div className="field">
            <label className="field-label">Pseudo</label>
            <input
              className="field-input"
              type="text"
              value={pseudo}
              onChange={e => setPseudo(e.target.value)}
              placeholder="Ton prénom"
              maxLength={20}
              autoFocus
            />
          </div>

          {tab === 'join' && (
            <div className="field">
              <label className="field-label">Code de la room</label>
              <input
                className="field-input field-input--code"
                type="text"
                value={roomCode}
                onChange={e => setRoomCode(e.target.value.toUpperCase())}
                placeholder="XXXXXX"
                maxLength={6}
              />
            </div>
          )}

          <button
            className="btn btn--primary"
            type="submit"
            disabled={!game.connected || !pseudo.trim() || (tab === 'join' && roomCode.length < 6)}
          >
            {tab === 'create' ? 'Créer la partie' : 'Rejoindre'}
          </button>
        </form>

        {!game.connected && <p className="hint">Connexion…</p>}
      </div>
    </div>
  );
}
