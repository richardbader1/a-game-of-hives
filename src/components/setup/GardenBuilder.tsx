import { HEX_DIRECTIONS, hexKey } from '../../game/board/hexCoordinates';
import { isGardenPlacementLegal } from '../../game/board/legalPlacement';
import { RESOURCE_PRESENTATION, STARTING_TILE_COUNT, TILE_SUPPLY } from '../../game/config/gameSettings';
import { validateStartingGarden } from '../../game/engine/setupValidator';
import type { CSSProperties } from 'react';
import type { GardenTile, HexCoord, ResourceType } from '../../game/types';
import { useGameStore } from '../../store/gameStore';

function getAccessiblePlacements(tiles: readonly GardenTile[]): HexCoord[] {
  if (tiles.length === 0) return [{ q: 0, r: 0 }];
  const candidates = tiles.flatMap((tile) =>
    HEX_DIRECTIONS.map(({ q, r }) => ({ q: tile.q + q, r: tile.r + r })),
  );
  const unique = new Map(candidates.map((coord) => [hexKey(coord), coord]));
  return [...unique.values()].filter((coord) => isGardenPlacementLegal(coord, tiles));
}

export function GardenBuilder() {
  const tiles = useGameStore((state) => state.tiles);
  const selectedResource = useGameStore((state) => state.selectedResource);
  const error = useGameStore((state) => state.error);
  const selectResource = useGameStore((state) => state.selectResource);
  const placeGardenTile = useGameStore((state) => state.placeGardenTile);
  const removeLastGardenTile = useGameStore((state) => state.removeLastGardenTile);
  const beginHiveSetup = useGameStore((state) => state.beginHiveSetup);
  const isComplete = validateStartingGarden(tiles);
  const placementChoices = getAccessiblePlacements(tiles);
  const canAddTile = tiles.length < STARTING_TILE_COUNT;
  const remaining = (resource: ResourceType) =>
    TILE_SUPPLY[resource] - tiles.filter((tile) => tile.resource === resource).length;

  return (
    <section className="setup-card compact-card" aria-labelledby="garden-setup-title">
      <div className="eyebrow"><span className="eyebrow-dot" /> GARDEN SETUP · 2 OF 4</div>
      <h2 id="garden-setup-title">Grow your garden</h2>
      <p className="intro-copy">Choose five touching tiles. Your team needs pollen, nectar and water.</p>

      <div className="resource-picker" role="group" aria-label="Choose a garden tile">
        {(Object.keys(RESOURCE_PRESENTATION) as ResourceType[]).map((resource) => {
          const item = RESOURCE_PRESENTATION[resource];
          return (
            <button
              className={`resource-choice ${selectedResource === resource ? 'is-selected' : ''}`}
              key={resource}
              type="button"
              aria-pressed={selectedResource === resource}
              style={{ '--resource-color': item.color, '--resource-soft': item.softColor } as CSSProperties}
              disabled={remaining(resource) === 0}
              onClick={() => selectResource(resource)}
            >
              <span className="resource-icon" aria-hidden="true">{item.icon}</span>
              <span>{item.label}</span>
              <span className="supply-count">{remaining(resource)} left</span>
            </button>
          );
        })}
      </div>

      <div className="placement-progress" aria-live="polite">
        <strong>{tiles.length} of 5</strong>
        <div className="progress-track" aria-hidden="true">
          <span style={{ width: `${(tiles.length / 5) * 100}%` }} />
        </div>
        <span>tiles placed</span>
      </div>

      <p className="tip-box">
        {tiles.length === 0
          ? 'Tap the middle space on the board to place your first tile.'
          : canAddTile
            ? 'Tap a highlighted empty space beside your garden.'
            : 'Your five tiles are down. Check the mix and shape before continuing.'}
      </p>

      {tiles.length === 5 && !isComplete.valid && (
        <p className="error-message" role="status">{isComplete.errors[0]}</p>
      )}
      {error && <p className="error-message" role="alert">{error}</p>}

      <details className="keyboard-placement">
        <summary>Keyboard-accessible placement</summary>
        {placementChoices.length > 0 ? (
          <div className="coordinate-buttons">
            {placementChoices.map((coord) => (
              <button
                key={hexKey(coord)}
                type="button"
                disabled={!canAddTile || remaining(selectedResource) === 0}
                onClick={() => placeGardenTile(coord.q, coord.r)}
              >
                Place at {coord.q}, {coord.r}
              </button>
            ))}
          </div>
        ) : <p>No open neighboring spaces.</p>}
      </details>

      <div className="button-row">
        <button type="button" className="secondary-button" disabled={tiles.length === 0} onClick={removeLastGardenTile}>
          Undo last tile
        </button>
        <button type="button" className="primary-button" disabled={!isComplete.valid} onClick={beginHiveSetup}>
          Place the hives <span aria-hidden="true">→</span>
        </button>
      </div>
      <p className="microcopy">Red = pollen · Gold = nectar · Blue = water</p>
    </section>
  );
}
