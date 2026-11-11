import { STARTING_HIVE_COUNT } from '../../game/config/gameSettings';
import { useGameStore } from '../../store/gameStore';

export function HivePlacement() {
  const tiles = useGameStore((state) => state.tiles);
  const hives = useGameStore((state) => state.hives);
  const hiveTileIds = hives.map((hive) => hive.tileId);
  const error = useGameStore((state) => state.error);
  const placeHive = useGameStore((state) => state.placeHive);
  const openTiles = tiles.filter((tile) => !hiveTileIds.includes(tile.id));

  return (
    <section className="setup-card compact-card" aria-labelledby="hive-setup-title">
      <div className="eyebrow"><span className="eyebrow-dot" /> HIVE SETUP · 3 OF 4</div>
      <h2 id="hive-setup-title">Give your hives a home</h2>
      <p className="intro-copy">Place four hives, each on a different garden tile.</p>
      <div className="placement-progress" aria-live="polite">
        <strong>{hiveTileIds.length} of {STARTING_HIVE_COUNT}</strong>
        <div className="progress-track" aria-hidden="true">
          <span style={{ width: `${(hiveTileIds.length / STARTING_HIVE_COUNT) * 100}%` }} />
        </div>
        <span>hives placed</span>
      </div>
      <p className="tip-box">Tap a highlighted garden tile to place a wooden hive.</p>
      {error && <p className="error-message" role="alert">{error}</p>}
      <details className="keyboard-placement">
        <summary>Keyboard-accessible placement</summary>
        <div className="coordinate-buttons">
          {openTiles.map((tile) => (
            <button key={tile.id} type="button" onClick={() => placeHive(tile.id)}>
              Place hive at {tile.q}, {tile.r}
            </button>
          ))}
        </div>
      </details>
      <div className="placed-icons" aria-label={`${hiveTileIds.length} of 4 hives placed`}>
        {Array.from({ length: STARTING_HIVE_COUNT }, (_, index) => (
          <span className={index < hiveTileIds.length ? 'placed-icon active' : 'placed-icon'} key={index} aria-hidden="true">
            ⌂
          </span>
        ))}
      </div>
      <p className="microcopy">Each healthy hive helps your bee gather more resources.</p>
    </section>
  );
}
