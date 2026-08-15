import React, { useState, useEffect, useRef } from 'react';

const MAX_WORDS = 5;

export default function CustomWordsPanel({ game }) {
  const { players, myId, actions } = game;
  const me = players.find(p => p.id === myId);
  const [words, setWords] = useState(padWords(me?.customWords));
  const saveTimer = useRef(null);

  // Resynchronise si le serveur renvoie une version différente (ex: reconnexion)
  useEffect(() => {
    setWords(padWords(me?.customWords));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [myId]);

  function scheduleSave(next) {
    setWords(next);
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      actions.setCustomWords(next.map(w => w.trim()).filter(Boolean));
    }, 500);
  }

  function updateWord(i, value) {
    const next = [...words];
    next[i] = value;
    scheduleSave(next);
  }

  const others = players.filter(p => p.id !== myId);
  const myCount = words.filter(w => w.trim()).length;

  return (
    <div className="custom-words-panel">
      <div className="custom-words-header">
        <span className="settings-label">Tes mots ({myCount}/{MAX_WORDS})</span>
        <p className="hint">Ils apparaîtront forcément pendant la partie.</p>
      </div>
      <div className="custom-words-inputs">
        {words.map((w, i) => (
          <input
            key={i}
            className="field-input field-input--custom-word"
            type="text"
            value={w}
            placeholder={`Mot ${i + 1}`}
            maxLength={30}
            autoComplete="off"
            onChange={e => updateWord(i, e.target.value)}
          />
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

function padWords(list) {
  const base = Array.isArray(list) ? list.slice(0, MAX_WORDS) : [];
  while (base.length < MAX_WORDS) base.push('');
  return base;
}
