import React from 'react';

// Affiche les tentatives échouées du mot en cours
// Visible par l'indiceur ET le devineur → l'indiceur peut calibrer son prochain indice
export default function CurrentExchange({ exchange }) {
  const failed = exchange.filter(e => e.guess !== null && e.guess !== '[vocal]');
  if (failed.length === 0) return null;

  return (
    <div className="current-exchange">
      <div className="current-exchange-label">Tentatives</div>
      {failed.map((ex, i) => (
        <div key={i} className="ex-row">
          <div className="ex-clue-col">
            <span className="ex-clue-tag">indice</span>
            <span className="ex-clue-val">{ex.clue.toUpperCase()}</span>
          </div>
          <span className="ex-separator">→</span>
          <div className="ex-guess-col">
            <span className="ex-guess-val">{ex.guess.toUpperCase()}</span>
            <span className="ex-wrong-icon">✗</span>
          </div>
        </div>
      ))}
    </div>
  );
}
