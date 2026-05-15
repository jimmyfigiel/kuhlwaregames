import { useState } from "react";
import Login from "./games/player-portal/Login.jsx";
import Dashboard from "./games/player-portal/Dashboard.jsx";

export default function App() {
  const [currentPlayer, setCurrentPlayer] = useState(null);

  function handleLoginSuccess(player) {
    setCurrentPlayer(player);
  }

  function handleLogout() {
    setCurrentPlayer(null);
  }

  function handlePlayerUpdated(updatedPlayer) {
    setCurrentPlayer(updatedPlayer);
  }

  if (!currentPlayer) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <Dashboard
      player={currentPlayer}
      onLogout={handleLogout}
      onPlayerUpdated={handlePlayerUpdated}
    />
  );
}