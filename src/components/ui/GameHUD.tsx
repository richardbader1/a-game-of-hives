import { InventoryToolbar } from './InventoryToolbar';
import { TradePanel } from './TradePanel';
import { BoardDestinations } from './BoardDestinations';
import { GameHelp } from './GameHelp';
import { HelpTip } from './HelpTip';
import { useSessionStore } from '../../store/sessionStore';
import { useEffect, useRef, useState } from 'react';
import { IMPROVEMENT_SUPPLY, RESOURCE_PRESENTATION, TILE_SUPPLY } from '../../game/config/gameSettings';
import {
  availableBeekeeperActions,
  eventDescription,
  eventName,
  healthyHiveCount,
  movementDestinations,
  remainingTileSupply,
} from '../../game/engine/gameEngine';
import type { ActionCategory, ImprovementType, ResourceType } from '../../game/types';
import { useGameStore } from '../../store/gameStore';

const ACTION_LABELS: Record<ActionCategory, string> = {
  bee: 'Bee',
  beekeeper: 'Beekeeper',
  garden: 'Garden',
};

const IMPROVEMENT_LABELS: Record<ImprovementType | 'repairHive' | 'repairTile', string> = {
  smartHive: 'Install smart hive',
  wildlifeReserve: 'Establish wildlife reserve',
  noSprayZone: 'Create no-spray zone',
  repairHive: 'Repair hive',
  repairTile: 'Repair garden tile',
};

export function GameHUD() {
  const state = useGameStore();
  const {
    players,
    currentPlayerIndex,
    roundNumber,
    turnPhase,
    actionCategoriesUsed,
    selectedAction,
    selectedTileId,
    tiles,
    hives,
    dieResult,
    currentEvent,
    eventRestriction,
    outcome,
    eventLog,
    lastCollected,
  } = state;
  const currentPlayer = players[currentPlayerIndex];
  const livingHives = healthyHiveCount(hives);
  const selectedTile = tiles.find((tile) => tile.id === selectedTileId);
  const selectedHive = hives.find((hive) => hive.tileId === selectedTileId);
  const keeperActions = selectedAction === 'beekeeper'
    ? availableBeekeeperActions(state, state.selectedTileId)
    : [];
  const usedImprovements = {
    smartHive: hives.filter((hive) => hive.smartHive).length,
    wildlifeReserve: tiles.filter((tile) => tile.wildlifeReserve).length,
    noSprayZone: tiles.filter((tile) => tile.noSprayZone).length,
  };
  const beeCanMove = movementDestinations(state.beeTileId, tiles, 'bee').length > 0;
  const beekeeperCanMove = movementDestinations(state.beekeeperTileId, tiles, 'beekeeper').length > 0;
  const anyGardenSupply = (['pollen', 'nectar', 'water'] as const)
    .some((resource) => remainingTileSupply(tiles, resource) > 0);
  const [confirmNewGame, setConfirmNewGame] = useState(false);
  const cancelNewGameRef = useRef<HTMLButtonElement>(null);
  const newGameTriggerRef = useRef<HTMLButtonElement>(null);

  const saveNotice = useSessionStore(state => state.notice);
  useEffect(() => {
    if (!confirmNewGame) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeNewGameConfirmation();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [confirmNewGame]);

  useEffect(() => {
    if (confirmNewGame) cancelNewGameRef.current?.focus();
  }, [confirmNewGame]);

  function closeNewGameConfirmation() {
    setConfirmNewGame(false);
    requestAnimationFrame(() => newGameTriggerRef.current?.focus());
  }

  return (
    <>
    <InventoryToolbar />

    <section className="ready-panel gameplay-panel" aria-label="Game controls and team status">
      {outcome && (
        <div className={`outcome-banner ${outcome}`} role="alert">
          <div className="outcome-icon" aria-hidden="true">{outcome === 'won' ? '★' : '♡'}</div>
          <h1>{outcome === 'won' ? 'You saved the queen bee!' : 'The garden needs another try'}</h1>
          <p>
            {outcome === 'won'
              ? 'Your team held 10 or more points in honey and bee bread.'
              : 'There are no healthy hives left. You learned how to protect the bees—try again!'}
          </p>
          <button type="button" className="primary-button" onClick={() => setConfirmNewGame(true)}>Play again</button>
        </div>
      )}

      <div className="ready-heading">
        <div>
          <div className="eyebrow"><span className="eyebrow-dot" /> ROUND {roundNumber} · {turnPhase === 'ended' ? 'GAME OVER' : turnPhase.toUpperCase()}</div>
          <h1>{currentPlayer ? `${currentPlayer.name}’s turn` : 'Your shared garden'}</h1>
          <p>
            {turnPhase === 'roll' && 'Roll the die together to discover what the garden needs.'}
            {turnPhase === 'eventPlacement' && 'Choose a tile for the free garden growth, then take your actions.'}
            {turnPhase === 'actions' && 'Choose two different actions to help the garden.'}
            {turnPhase === 'trading' && 'Make any affordable trades, then finish the turn.'}
            {turnPhase === 'ended' && outcome === 'won' && 'Wonderful teamwork saved the queen bee.'}
            {turnPhase === 'ended' && outcome === 'lost' && 'Keep learning and try a new garden strategy.'}
          </p>
        </div>
        <span className="ready-bee" aria-hidden="true">🐝</span>
      </div>

      <div className="turn-players" aria-label="Players in turn order">
        {players.map((player, index) => (
          <span className={index === currentPlayerIndex ? 'player-pill active' : 'player-pill'} key={player.id} aria-current={index === currentPlayerIndex ? 'true' : undefined}>
            {player.name}{index !== currentPlayerIndex && index === (currentPlayerIndex + 1) % players.length ? ' · Next' : ''}
          </span>
        ))}
      </div>
      <ol className="turn-progress" aria-label="Turn progress">
        {(['roll', 'actions', 'trading', 'next'] as const).map((stage, index) => <li key={stage} aria-current={(turnPhase === stage || (stage === 'roll' && turnPhase === 'eventPlacement')) ? 'step' : undefined}>{index + 1}. {['Roll & event', 'Two actions', 'Trade', 'Next player'][index]}</li>)}
      </ol>

      <div className="status-strip">
        <div title="If no healthy hives remain, the team loses. Use your beekeeper to repair damaged hives."><span className="hud-label">HEALTHY HIVES</span><strong>{livingHives}<small> / {hives.length}</small></strong><small>{hives.length - livingHives} damaged</small></div>
        <div><span className="hud-label">TILES</span><strong>{tiles.length}</strong></div>
      </div>
      <HelpTip label="hive health">A healthy hive doubles bee collection on its tile. Damage stops that bonus. Repair hives with your beekeeper: losing all healthy hives ends the game immediately.</HelpTip>

      <p className="message-line" role="status">{state.message}</p>
      {state.error && <p className="error-message" role="alert">{state.error}</p>}
      <div className="event-card" aria-live="polite">
        <div className="event-card-heading">
          <span className="event-die">{dieResult ?? '🎲'}</span>
          <div>
            <span className="hud-label">{currentEvent ? `DICE · ${eventName(currentEvent)}` : 'ENVIRONMENTAL EVENT'}</span>
            <strong>{currentEvent ? eventName(currentEvent) : 'What will happen today?'}</strong>
          </div>
        </div>
        <p>{eventDescription(state)}</p>
        <HelpTip label="environmental events">The die has six equally likely outcomes: Varroa mites, climate damage, pesticides, two types of extreme weather, or free garden growth. The event above shows this turn’s actual effect.</HelpTip>
        {turnPhase === 'roll' && (
          <button data-tour="roll" type="button" className="primary-button full-width" onClick={() => state.rollDice()}>
            Roll the die <span aria-hidden="true">🎲</span>
          </button>
        )}
        {eventRestriction && (
          <p className="restriction-note">
            {eventRestriction === 'waterOnly'
              ? 'Restriction: collect water only, unless the bee lands on a no-spray zone.'
              : 'Restriction: the bee cannot move this turn.'}
          </p>
        )}
        {turnPhase === 'eventPlacement' && (
          <ResourceChoices
            selected={state.selectedResource}
            onSelect={state.selectResource}
            tiles={tiles}
          />
        )}
      </div>

      {turnPhase === 'actions' && (
        <div className="action-card">
          <div className="section-heading">
            <div><span className="hud-label">YOUR ACTIONS</span><strong>Choose two different actions</strong></div>
            <span className="action-count">{actionCategoriesUsed.length} / 2 used</span>
          </div>
          <div className="action-slots">
            {[0, 1].map((slot) => (
              <span className={slot < actionCategoriesUsed.length ? 'action-slot done' : 'action-slot'} key={slot}>
                {slot < actionCategoriesUsed.length
                  ? `${ACTION_LABELS[actionCategoriesUsed[slot]]} ✓`
                  : `Action ${slot + 1}`}
              </span>
            ))}
          </div>
          <div className="action-choices">
            {(['bee', 'beekeeper', 'garden'] as const).map((category) => {
              const used = actionCategoriesUsed.includes(category);
              return (
                <button
                  key={category}
                  type="button"
                  className={selectedAction === category ? 'action-choice selected' : 'action-choice'}
                  aria-pressed={selectedAction === category}
                  title={used ? 'Already used. Choose a different category this turn.' : selectedAction === 'beekeeper' && selectedTileId ? 'Finish the beekeeper task or skip it first.' : category === 'bee' ? 'Move in a straight line over healthy tiles and collect on landing.' : category === 'beekeeper' ? 'Move, then repair damage or install one protection for free.' : 'Add one connected garden tile from the available supply.'}
                  disabled={
                    used ||
                    Boolean(outcome) ||
                    Boolean(selectedAction === 'beekeeper' && selectedTileId)
                  }
                  onClick={() => state.chooseAction(category)}
                >
                  <span aria-hidden="true">{category === 'bee' ? '🐝' : category === 'beekeeper' ? '🧑‍🌾' : '🌱'}</span>
                  {ACTION_LABELS[category]}
                  {used && <small>Used</small>}
                </button>
              );
            })}
          </div>
          {selectedAction === 'garden' && (
            <ResourceChoices selected={state.selectedResource} onSelect={state.selectResource} tiles={tiles} />
          )}
          {selectedAction === 'beekeeper' && selectedTileId && (
            <div className="improvement-options">
              <p>At this tile, the beekeeper can:</p>
              {keeperActions.length ? keeperActions.map((action) => (
                <button type="button" className="secondary-button" key={action} onClick={() => state.beekeeperAction(action)}>
                  {IMPROVEMENT_LABELS[action]}
                </button>
              )) : <p className="helper-text">No repair or improvement is available here. Skip this action.</p>}
            </div>
          )}
          {selectedAction === 'beekeeper' && <HelpTip label="protective upgrades">Smart hives block Varroa damage. Wildlife reserves prevent damaged tiles from being removed. No-spray zones allow normal collection during pesticides. Each uses a finite protection piece, with no resource cost.</HelpTip>}
          {selectedAction && (
            <div className="action-footer">
              <p className="helper-text">
                {selectedAction === 'bee' && (eventRestriction === 'noBeeMove'
                  ? 'The bee cannot move because of extreme weather. Skip this action.'
                  : !beeCanMove
                    ? 'There is no healthy straight-line destination for the bee. Skip this action.'
                    : 'Tap a highlighted healthy tile in a straight line. The bee collects when it arrives.')}
                {selectedAction === 'beekeeper' && (selectedTileId
                    ? 'The destination is locked. Choose one repair or improvement above, or skip to finish this action.'
                  : beekeeperCanMove
                    ? 'Tap a highlighted tile in a straight line for the beekeeper.'
                    : 'There is no connected tile the beekeeper can reach. Skip this action.')}
                {selectedAction === 'garden' && (!anyGardenSupply
                  ? 'No garden tiles remain in the supply. Skip this action.'
                  : remainingTileSupply(tiles, state.selectedResource) === 0
                    ? 'No tiles of this type remain. Choose another tile type or skip.'
                    : 'Choose a tile type and tap a highlighted neighboring space.')}
              </p>
              <button type="button" className="quiet-button" onClick={state.skipCurrentAction}>Skip this action</button>
            </div>
          )}
        </div>
      )}

      {turnPhase === 'trading' && <TradePanel />}
      <BoardDestinations />
      <GameHelp />
      <p className="save-status" role="status">{saveNotice ?? 'Progress saves automatically on this browser.'}</p>

      <div className="lower-info-grid">
        {lastCollected && (
          <div className="collected-note" aria-live="polite">
            The bee collected {lastCollected.amount} {RESOURCE_PRESENTATION[lastCollected.resource].label.toLowerCase()}!
          </div>
        )}
        {selectedTile && (
          <div className="tile-info">
            <span className="hud-label">SELECTED GARDEN TILE</span>
            <strong>{RESOURCE_PRESENTATION[selectedTile.resource].label} · {selectedTile.q}, {selectedTile.r}</strong>
            <span>
              {selectedTile.damaged ? 'Damaged' : 'Healthy'}
              {selectedTile.wildlifeReserve ? ' · Wildlife reserve' : ''}
              {selectedTile.noSprayZone ? ' · No-spray zone' : ''}
              {selectedHive ? ` · Hive ${selectedHive.damaged ? 'damaged' : 'healthy'}${selectedHive.smartHive ? ' · Smart hive' : ''}` : ''}
            </span>
            <p>{selectedTile.damaged ? 'The bee cannot enter or cross this damaged tile. Send your beekeeper to repair it, or try another path.' : 'Landing here collects this tile’s resource, subject to the current event. A healthy hive doubles the amount.'}</p>
          </div>
        )}
        <details className="event-history">
          <summary>Event and action history ({eventLog.length})</summary>
          {eventLog.length ? (
            <ol>{eventLog.map((entry, index) => <li key={`${index}-${entry}`}>{entry}</li>)}</ol>
          ) : <p>Game events and actions will appear here.</p>}
        </details>
      </div>

      <div className="supply-footnote">
        Garden tiles left: {(['pollen', 'nectar', 'water'] as const).map((resource) => (
          `${RESOURCE_PRESENTATION[resource].label} ${remainingTileSupply(tiles, resource)}/${TILE_SUPPLY[resource]}`
        )).join(' · ')}
        <span> · Improvements: {usedImprovements.smartHive}/{IMPROVEMENT_SUPPLY.smartHive} smart hives, {usedImprovements.wildlifeReserve}/{IMPROVEMENT_SUPPLY.wildlifeReserve} reserves, {usedImprovements.noSprayZone}/{IMPROVEMENT_SUPPLY.noSprayZone} no-spray zones</span>
      </div>
      <button
        ref={newGameTriggerRef}
        type="button"
        className="quiet-button start-over"
        onClick={() => setConfirmNewGame(true)}
      >Start a new game</button>
    </section>
    {confirmNewGame && (
      <div
        className="confirmation-backdrop"
        onMouseDown={(event) => {
          if (event.target === event.currentTarget) closeNewGameConfirmation();
        }}
      >
        <div
          className="confirmation-dialog"
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="new-game-title"
          onKeyDown={(event) => {
            if (event.key !== 'Tab') return;
            const buttons = event.currentTarget.querySelectorAll<HTMLButtonElement>('button:not(:disabled)');
            const first = buttons[0];
            const last = buttons[buttons.length - 1];
            if (event.shiftKey && document.activeElement === first) {
              event.preventDefault();
              last?.focus();
            } else if (!event.shiftKey && document.activeElement === last) {
              event.preventDefault();
              first?.focus();
            }
          }}
        >
          <h2 id="new-game-title">Start a new game?</h2>
          <p>Your current garden will be lost.</p>
          <div className="confirmation-actions">
            <button ref={cancelNewGameRef} type="button" className="secondary-button" onClick={closeNewGameConfirmation}>
              Cancel
            </button>
            <button type="button" className="primary-button" onClick={state.reset}>
              Start new game
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  );
}

function ResourceChoices({
  selected,
  onSelect,
  tiles,
}: {
  selected: ResourceType;
  onSelect: (resource: ResourceType) => void;
  tiles: ReturnType<typeof useGameStore.getState>['tiles'];
}) {
  return (
    <div className="resource-picker gameplay-resource-picker" role="group" aria-label="Choose a garden tile resource">
      {(['pollen', 'nectar', 'water'] as const).map((resource) => {
        const presentation = RESOURCE_PRESENTATION[resource];
        const remaining = remainingTileSupply(tiles, resource);
        return (
          <button
            className={`resource-choice ${selected === resource ? 'is-selected' : ''}`}
            key={resource}
            type="button"
            aria-pressed={selected === resource}
            disabled={remaining === 0}
            onClick={() => onSelect(resource)}
          >
            <span className="resource-icon" aria-hidden="true">{presentation.icon}</span>
            <span>{presentation.label}</span>
            <span className="supply-count">{remaining} left</span>
          </button>
        );
      })}
    </div>
  );
}
