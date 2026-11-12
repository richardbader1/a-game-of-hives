import { useGameStore } from '../../store/gameStore';
import { placementCoordinates, selectableTileIds, tileDescription } from '../../game/selectors';
import { RESOURCE_PRESENTATION } from '../../game/config/gameSettings';

/** DOM alternatives dispatch exactly the same commands as canvas selection. */
export function BoardDestinations() {
  const state = useGameStore();
  const destinations = selectableTileIds(state);
  const placements = placementCoordinates(state);
  const choosing = state.turnPhase === 'eventPlacement' || state.selectedAction !== null || state.pendingHivePurchase;
  return (
    <details className="keyboard-placement gameplay-destinations" open={choosing}>
      <summary>Board controls (keyboard and screen reader)</summary>
      {choosing && <div className="coordinate-buttons" aria-label="Legal destinations">
        {destinations.map(id => {
          const tile = state.tiles.find(t => t.id === id)!;
          const verb = state.pendingHivePurchase ? 'Place hive on' : `Move ${state.selectedAction} to`;
          return <button type="button" key={id} onClick={() => state.handleBoardTile(id, tile)}>
            {verb} {tileDescription(state, id)}
          </button>;
        })}
        {placements.map(coord => <button type="button" key={`${coord.q},${coord.r}`}
          onClick={() => state.handleBoardTile(null, coord)}>
          Place {RESOURCE_PRESENTATION[state.selectedResource].label.toLowerCase()} at {coord.q}, {coord.r}
        </button>)}
        {!destinations.length && !placements.length && <p>No destination is available. Finish the chosen beekeeper task, choose another tile type, or skip the action.</p>}
      </div>}
      <details>
        <summary>Inspect garden tiles</summary>
        <ul className="accessible-board-list">{state.tiles.map(tile => <li key={tile.id}>
          {tileDescription(state, tile.id)}
          {state.beeTileId === tile.id ? '; bee here' : ''}
          {state.beekeeperTileId === tile.id ? '; beekeeper here' : ''}
        </li>)}</ul>
      </details>
    </details>
  );
}
