import React from 'react';

export default function HistorySidebar({ history }) {
  if (!history || history.length === 0) {
    return (
      <div className="history-sidebar">
        <p className="history-sidebar-empty">Les mots joués apparaîtront ici</p>
      </div>
    );
  }

  // Plus récent en haut
  const reversed = [...history].reverse();

  return (
    <div className="history-sidebar">
      <div className="history-sidebar-label">Historique</div>
      <div className="history-entries">
        {reversed.map((item, i) => (
          <div key={i} className={`history-entry history-entry--${item.result}`}>
            <div className="history-entry-header">
              <span className="history-entry-result">
                {item.result === 'correct' ? '✓' : '✗'}
              </span>
              <span className="history-entry-word">{item.word.toUpperCase()}</span>
            </div>
            {item.exchange && item.exchange.length > 0 && (
              <div className="history-entry-exchange">
                {item.exchange.map((ex, j) => (
                  <div key={j} className="history-ex-row">
                    <span className="history-ex-clue">{ex.clue}</span>
                    {ex.guess && ex.guess !== '[vocal]' && (
                      <span className="history-ex-guess">→ {ex.guess}</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
