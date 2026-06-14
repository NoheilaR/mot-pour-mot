import React from 'react';
import { useGame } from './hooks/useGame';
import Home from './components/Home';
import Lobby from './components/Lobby';
import Game from './components/Game';
import GameOver from './components/GameOver';

export default function App() {
  const game = useGame();

  return (
    <div className="app">
      {game.error && (
        <div className="toast toast--error" onClick={game.actions.clearError}>
          {game.error}
        </div>
      )}

      {game.screen === 'home' && <Home game={game} />}
      {game.screen === 'lobby' && <Lobby game={game} />}
      {game.screen === 'game' && <Game game={game} />}
      {game.screen === 'gameover' && <GameOver game={game} />}
    </div>
  );
}
