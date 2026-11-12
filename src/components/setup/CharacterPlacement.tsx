import { useGameStore } from '../../store/gameStore';

export function CharacterPlacement() {
  const tiles = useGameStore((state) => state.tiles);
  const beeTileId = useGameStore((state) => state.beeTileId);
  const beekeeperTileId = useGameStore((state) => state.beekeeperTileId);
  const activeCharacter = useGameStore((state) => state.activeCharacter);
  const error = useGameStore((state) => state.error);
  const selectCharacter = useGameStore((state) => state.selectCharacter);
  const placeCharacter = useGameStore((state) => state.placeCharacter);
  const completeSetup = useGameStore((state) => state.completeSetup);

  return (
    <section className="setup-card compact-card" aria-labelledby="character-setup-title">
      <div className="eyebrow"><span className="eyebrow-dot" /> CHARACTERS · 4 OF 4</div>
      <h2 id="character-setup-title">Meet the team</h2>
      <p className="intro-copy">Choose a character, then tap a garden tile. They can share a home.</p>
      <div className="character-choices" role="group" aria-label="Choose a character to place">
        <button
          type="button"
          className={activeCharacter === 'bee' ? 'character-choice selected' : 'character-choice'}
          aria-pressed={activeCharacter === 'bee'}
          onClick={() => selectCharacter('bee')}
        >
          <span aria-hidden="true">🐝</span>
          <span>Bee</span>
          <small>{beeTileId ? 'Placed' : 'Choose tile'}</small>
        </button>
        <button
          type="button"
          className={activeCharacter === 'beekeeper' ? 'character-choice selected' : 'character-choice'}
          aria-pressed={activeCharacter === 'beekeeper'}
          onClick={() => selectCharacter('beekeeper')}
        >
          <span aria-hidden="true">🧑‍🌾</span>
          <span>Beekeeper</span>
          <small>{beekeeperTileId ? 'Placed' : 'Choose tile'}</small>
        </button>
      </div>
      <p className="tip-box">
        {beeTileId && beekeeperTileId ? 'Your garden is ready! Five garden tiles, four hives, a beekeeper and a forager bee. Let’s learn your first turn.' : activeCharacter === 'bee' ? 'Your forager bee collects resources when it lands. Choose its starting tile.' : 'Your beekeeper repairs damage and installs protections. Choose its starting tile.'}
      </p>
      {error && <p className="error-message" role="alert">{error}</p>}
      <details className="keyboard-placement">
        <summary>Keyboard-accessible placement</summary>
        <div className="coordinate-buttons">
          {tiles.map((tile) => (
            <button
              key={tile.id}
              type="button"
              onClick={() => placeCharacter(activeCharacter, tile.id)}
            >
              Place {activeCharacter} at {tile.q}, {tile.r}
            </button>
          ))}
        </div>
      </details>
      <button
        type="button"
        className="primary-button"
        disabled={!beeTileId || !beekeeperTileId}
        onClick={completeSetup}
      >
        Start First Round <span aria-hidden="true">→</span>
      </button>
      <p className="microcopy">The team can stand together on one tile.</p>
    </section>
  );
}
