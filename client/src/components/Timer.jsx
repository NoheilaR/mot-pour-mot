import React from 'react';

export default function Timer({ timeLeft, roundDuration = 30 }) {
  const pct = Math.max(0, timeLeft) / roundDuration * 100;
  const danger = timeLeft <= 10;
  const warn = timeLeft <= Math.floor(roundDuration * 0.4) && !danger;

  return (
    <div className="header-timer">
      <span className={`timer-num${danger ? ' timer-num--danger' : warn ? ' timer-num--warn' : ''}`}>
        {timeLeft}
      </span>
      <div className="timer-bar-wrap">
        <div
          className={`timer-bar${danger ? ' timer-bar--danger' : warn ? ' timer-bar--warn' : ''}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
