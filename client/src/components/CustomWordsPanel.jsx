import React, { useState, useEffect, useRef } from 'react';

const MAX_WORDS = 5;

export default function CustomWordsPanel({ game }) {
  const { players, myId, mode, actions } = game;
  const me = players.find(p => p.id === myId);
  const [entries, setEntries] = useState(padEntries(me?.customWords));
  const saveTimer = useRef(null);

  // Resynchronise si le serveur renvoie une version différente (ex: reconnexion)
  useEffect(() => {
    setEntries(padEntries(me?.customWords));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [myId]);

  function scheduleSave(next) {
    setEntries(next);
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      const payload = next
        .map(e => ({
          word: e.word.trim(),
          forbidden: e.forbidden.split(',').map(f => f.trim()).filter(Boolean).slice(0, 5),
        }))
        .filter(e => e.word);
      actions.setCustomWords(payload);
    }, 500);
  }

  function updateWord(i, value) {
    const next = [...entries];
    next[i] = { ...next[i], word: value };
    scheduleSave(next);
  }

  function updateForbidden(i, value) {
    const next = [...entries];
    next[i] = { ...next[i], forbidden: value };
    scheduleSave(next);
  }

  const others = players.filter(p => p.id !== myId);
  const myCount = entries.filter(e => e.word.trim()).length;
  const isTabou = mode === 'tabou';

  return (
    <div className="custom-words-panel">
      <div className="custom-words-header">
        <span className="settings-label">Tes mots ({myCount}/{MAX_WORDS})</span>
        <p className="hint">
          Ils apparaîtront forcément pendant la partie.
          {isTabou && ' Ajoute aussi ses mots interdits pour une vraie carte Tabou (optionnel).'}
        </p>
      </div>
      <div className="custom-words-list">
        {entries.map((e, i) => (
          <div key={i} className="custom-word-card">
            <input
              className="field-input field-input--custom-word"
              type="text"
              value={e.word}
              placeholder={`Mot ${i + 1}`}
              maxLength={30}
              autoComplete="off"
              onChange={ev => updateWord(i, ev.target.value)}
            />
            {isTabou && e.word.trim() && (
              <input
                className="field-input field-input--custom-forbidden"
                type="text"
                value={e.forbidden}
                placeholder="Mots interdits, séparés par une virgule (optionnel)"
                maxLength={120}
                autoComplete="off"
                onChange={ev => updateForbidden(i, ev.target.value)}
              />
            )}
          </div>
        ))}
      </div>

      {others.length > 0 && (
        <div className="custom-words-others">
          {others.map(p => (
            <span key={p.id} className="custom-words-other-chip">
              {p.pseudo} · {(p.customWords ?? []).length}/{MAX_WORDS}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function padEntries(list) {
  const base = Array.isArray(list) ? list.slice(0, MAX_WORDS).map(e => (
    typeof e === 'string'
      ? { word: e, forbidden: '' }
      : { word: e.word || '', forbidden: (e.forbidden || []).join(', ') }
  )) : [];
  while (base.length < MAX_WORDS) base.push({ word: '', forbidden: '' });
  return base;
}
