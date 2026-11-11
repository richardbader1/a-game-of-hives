import { useState } from 'react';
import { discardSavedGame, resumeSavedGame, useSessionStore } from '../../store/sessionStore';

export function SavedGamePrompt() {
  const saved = useSessionStore(s => s.savedGame);
  const [confirm, setConfirm] = useState(false);
  if (!saved) return null;
  return <section className="setup-card" aria-labelledby="saved-game-title">
    <h1 id="saved-game-title">Welcome back to your garden</h1>
    <p>{saved.players.map(p => p.name).join(', ')} · Round {saved.roundNumber}</p>
    <p>{saved.outcome ? 'You can review the completed game or start again.' : 'Resume your saved turn, including its event and actions.'}</p>
    <button type="button" className="primary-button" onClick={resumeSavedGame}>Resume saved game</button>
    {!confirm ? <button type="button" className="secondary-button" onClick={() => setConfirm(true)}>Start a new game</button> :
      <div className="saved-game-confirmation" role="group" aria-label="Replace saved game">
        <p>Your saved garden will be lost. Start again?</p>
        <button type="button" className="secondary-button" onClick={() => setConfirm(false)}>Keep saved game</button>
        <button type="button" className="primary-button" onClick={discardSavedGame}>Discard save and start new game</button>
      </div>}
  </section>;
}
