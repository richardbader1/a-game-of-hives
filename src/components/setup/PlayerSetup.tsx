import { useState } from 'react';
import { useGameStore } from '../../store/gameStore';

export function PlayerSetup() {
  const [names, setNames] = useState(['', '']);
  const players = useGameStore((state) => state.players);
  const startingPlayerIndex = useGameStore((state) => state.startingPlayerIndex);
  const error = useGameStore((state) => state.error);
  const setPlayers = useGameStore((state) => state.setPlayers);
  const setStartingPlayer = useGameStore((state) => state.setStartingPlayer);
  const beginGardenSetup = useGameStore((state) => state.beginGardenSetup);
  const allNamesEntered = names.every((name) => name.trim().length > 0);

  function updateNames(nextNames: string[]) {
    setNames(nextNames);
    setPlayers(nextNames);
  }

  return (
    <section className="setup-card" aria-labelledby="player-setup-title">
      <div className="eyebrow"><span className="eyebrow-dot" /> TEAM SETUP · 1 OF 4</div>
      <h1 id="player-setup-title">Let’s build a garden<br />for the bees.</h1>
      <p className="intro-copy">
        Work together on one shared board. Add everyone who’s playing, then choose who starts.
      </p>

      <div className="player-list">
        {names.map((name, index) => (
          <label className="field-label" key={`player-${index + 1}`}>
            <span className="player-number">{String(index + 1).padStart(2, '0')}</span>
            <span className="sr-only">Player {index + 1} name</span>
            <input
              autoComplete="off"
              maxLength={24}
              placeholder={`Player ${index + 1} name`}
              value={name}
              onChange={(event) => {
                const nextNames = [...names];
                nextNames[index] = event.target.value;
                updateNames(nextNames);
              }}
            />
            {names.length > 2 && (
              <button
                className="remove-player"
                type="button"
                aria-label={`Remove player ${index + 1}`}
                onClick={() => updateNames(names.filter((_, playerIndex) => playerIndex !== index))}
              >
                ×
              </button>
            )}
          </label>
        ))}
      </div>

      <div className="player-form-actions">
        {names.length < 4 && (
          <button
            type="button"
            className="quiet-button"
            onClick={() => updateNames([...names, ''])}
          >
            <span aria-hidden="true">＋</span> Add a player
          </button>
        )}
        {names.length > 2 && <span className="player-count">{names.length} players</span>}
      </div>

      {allNamesEntered && (
        <label className="starting-player-label">
          Who starts? <span>Pick together as a team.</span>
          <select
            value={startingPlayerIndex}
            onChange={(event) => setStartingPlayer(Number(event.target.value))}
          >
            {names.map((name, index) => (
              <option key={`starter-${index}`} value={index}>{name.trim()}</option>
            ))}
          </select>
        </label>
      )}

      {error && <p className="error-message" role="alert">{error}</p>}

      <button
        type="button"
        className="primary-button"
        disabled={!allNamesEntered}
        onClick={beginGardenSetup}
      >
        Choose your garden <span aria-hidden="true">→</span>
      </button>
      <p className="microcopy">2–4 players · One team · One very important queen</p>
    </section>
  );
}
