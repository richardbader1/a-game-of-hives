import { useEffect, useRef, useState } from 'react';
import { HIVE_SUPPLY, IMPROVEMENT_SUPPLY, RESOURCE_PRESENTATION, TILE_SUPPLY, WINNING_SCORE } from '../../game/config/gameSettings';
import {
  availableBeekeeperActions,
  canPurchase,
  eventDescription,
  eventName,
  healthyHiveCount,
  legalHivePurchaseTiles,
  movementDestinations,
  remainingTileSupply,
  scoreInventory,
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

function missingHoneyIngredients(state: ReturnType<typeof useGameStore.getState>): string {
  const missing = [
    state.inventory.pollen < 1 ? `${1 - state.inventory.pollen} pollen` : '',
    state.inventory.nectar < 1 ? `${1 - state.inventory.nectar} nectar` : '',
    state.inventory.water < 1 ? `${1 - state.inventory.water} water` : '',
  ].filter(Boolean);
  return missing.length ? `Still need ${missing.join(', ')}.` : 'Ready to make.';
}

function missingBreadIngredients(state: ReturnType<typeof useGameStore.getState>): string {
  const missing = [
    state.inventory.pollen < 2 ? `${2 - state.inventory.pollen} pollen` : '',
    state.inventory.nectar < 3 ? `${3 - state.inventory.nectar} nectar` : '',
  ].filter(Boolean);
  return missing.length ? `Still need ${missing.join(', ')}.` : 'Ready to make.';
}

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
    inventory,
    dieResult,
    currentEvent,
    eventRestriction,
    pendingHivePurchase,
    outcome,
    eventLog,
    lastCollected,
  } = state;
  const currentPlayer = players[currentPlayerIndex];
  const score = scoreInventory(inventory);
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
  const hiveCanBePlaced = legalHivePurchaseTiles(state).length > 0;
  const hiveCanBeBought = canPurchase(state, 'hive');
  const beeCanMove = movementDestinations(state.beeTileId, tiles, 'bee').length > 0;
  const beekeeperCanMove = movementDestinations(state.beekeeperTileId, tiles, 'beekeeper').length > 0;
  const anyGardenSupply = (['pollen', 'nectar', 'water'] as const)
    .some((resource) => remainingTileSupply(tiles, resource) > 0);
  const [openRecipe, setOpenRecipe] = useState<'honey' | 'beeBread' | 'hive' | null>(null);
  const [confirmNewGame, setConfirmNewGame] = useState(false);
  const cancelNewGameRef = useRef<HTMLButtonElement>(null);
  const newGameTriggerRef = useRef<HTMLButtonElement>(null);
  const recipePointerActivation = useRef(false);

  useEffect(() => {
    if (!openRecipe && !confirmNewGame) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (confirmNewGame) closeNewGameConfirmation();
        else setOpenRecipe(null);
      }
    };
    const handleOutsidePointer = (event: PointerEvent) => {
      if (event.target instanceof Element && !event.target.closest('.recipe-item')) {
        setOpenRecipe(null);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    if (openRecipe) document.addEventListener('pointerdown', handleOutsidePointer);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('pointerdown', handleOutsidePointer);
    };
  }, [openRecipe, confirmNewGame]);

  useEffect(() => {
    if (confirmNewGame) cancelNewGameRef.current?.focus();
  }, [confirmNewGame]);

  function closeNewGameConfirmation() {
    setConfirmNewGame(false);
    requestAnimationFrame(() => newGameTriggerRef.current?.focus());
  }

  return (
    <>
    <div className="game-resource-toolbar" aria-label="Shared team inventory and recipes">
      {(['pollen', 'nectar', 'water'] as const).map((resource) => (
        <div className="resource-token" key={resource} aria-label={`${RESOURCE_PRESENTATION[resource].label}: ${inventory[resource]}`}>
          <span className="resource-token-icon" style={{ backgroundColor: RESOURCE_PRESENTATION[resource].color }} aria-hidden="true">
            {RESOURCE_PRESENTATION[resource].icon}
          </span>
          <span className="resource-token-copy">
            <strong>{inventory[resource]}</strong>
            <small>{RESOURCE_PRESENTATION[resource].label}</small>
          </span>
        </div>
      ))}
      {([
        { key: 'honey', icon: '🍯', label: 'Honey', quantity: inventory.honey, recipe: [['pollen', 1], ['nectar', 1], ['water', 1]], points: 1 },
        { key: 'beeBread', icon: '🍞', label: 'Bee bread', quantity: inventory.beeBread, recipe: [['pollen', 2], ['nectar', 3]], points: 2 },
        { key: 'hive', icon: '⌂', label: 'Hives available', quantity: HIVE_SUPPLY - hives.length, recipe: [['honey', 2], ['beeBread', 3]], points: 0 },
      ] as const).map((product) => {
        const affordable = canPurchase(state, product.key);
        const trading = turnPhase === 'trading';
        const missing = product.key === 'honey'
          ? missingHoneyIngredients(state)
          : product.key === 'beeBread'
            ? missingBreadIngredients(state)
            : state.hives.length >= HIVE_SUPPLY
              ? 'All hive pieces are in play.'
              : !hiveCanBePlaced
                ? 'No healthy empty tile is available.'
                : inventory.honey < 2 || inventory.beeBread < 3
                  ? `Still need ${Math.max(0, 2 - inventory.honey)} honey and ${Math.max(0, 3 - inventory.beeBread)} bee bread.`
                  : 'Ready to place on a healthy empty garden tile.';
        return (
          <div
            className="recipe-item"
            key={product.key}
            onMouseEnter={() => setOpenRecipe(product.key)}
            onMouseLeave={(event) => {
              if (
                openRecipe === product.key &&
                !event.currentTarget.contains(document.activeElement)
              ) setOpenRecipe(null);
            }}
          >
            <button
              type="button"
              className="resource-token recipe-trigger"
              aria-label={`${product.label}: ${product.quantity}. Show recipe.`}
              aria-expanded={openRecipe === product.key}
              onPointerDown={() => { recipePointerActivation.current = true; }}
              onFocus={() => {
                if (!recipePointerActivation.current) setOpenRecipe(product.key);
              }}
              onClick={(event) => {
                setOpenRecipe((open) =>
                  open === product.key ? (event.detail === 0 ? open : null) : product.key,
                );
                recipePointerActivation.current = false;
              }}
            >
              <span className="resource-token-icon product-icon" aria-hidden="true">{product.icon}</span>
              <span className="resource-token-copy">
                <strong>{product.quantity}</strong>
                <small>{product.label}</small>
              </span>
            </button>
            {openRecipe === product.key && (
              <div className="recipe-popover" role="dialog" aria-label={`${product.label} recipe`}>
                <div className="recipe-popover-header">
                  <strong>{product.label}</strong>
                  <button
                    type="button"
                    className="recipe-close-button"
                    aria-label={`Close ${product.label} recipe`}
                    onClick={() => setOpenRecipe(null)}
                  >×</button>
                </div>
                <div className="recipe-ingredients">
                  {product.recipe.map(([ingredient, amount]) => {
                    const ingredientName = ingredient === 'beeBread'
                      ? 'Bee bread'
                      : ingredient[0].toUpperCase() + ingredient.slice(1);
                    const available = ingredient === 'beeBread'
                      ? inventory.beeBread
                      : inventory[ingredient as keyof typeof inventory];
                    const ingredientIcon = ingredient === 'honey'
                      ? '🍯'
                      : ingredient === 'beeBread'
                        ? '🍞'
                        : RESOURCE_PRESENTATION[ingredient as ResourceType].icon;
                    const ingredientColor = ingredient in RESOURCE_PRESENTATION
                      ? RESOURCE_PRESENTATION[ingredient as ResourceType].color
                      : '#fff0c8';
                    return (
                      <span className="recipe-ingredient" key={ingredient}>
                        <i style={{ backgroundColor: ingredientColor }} aria-hidden="true">{ingredientIcon}</i>
                        <span>{ingredientName}: {amount} needed · {available} have</span>
                      </span>
                    );
                  })}
                </div>
                <p>{product.points} {product.points === 1 ? 'point' : 'points'} when held</p>
                <p className={affordable ? 'recipe-affordability affordable' : 'recipe-affordability'}>
                  {affordable ? 'You can afford this.' : missing}
                </p>
                {product.key !== 'hive' ? (
                  <button
                    type="button"
                    className="secondary-button recipe-buy-button"
                    disabled={!trading || !affordable || pendingHivePurchase}
                    title={!trading ? 'Trading opens after both actions.' : missing}
                    onClick={() => state.trade(product.key)}
                  >
                    {trading ? `Make ${product.label.toLowerCase()}` : 'Available during trading'}
                  </button>
                ) : (
                  <button
                    type="button"
                    className="secondary-button recipe-buy-button"
                    disabled={!trading || !affordable || pendingHivePurchase}
                    title={!trading ? 'Trading opens after both actions.' : missing}
                    onClick={state.beginHivePurchase}
                  >
                    {pendingHivePurchase ? 'Choose a garden tile' : trading ? 'Buy a hive' : 'Available during trading'}
                  </button>
                )}
              </div>
            )}
          </div>
        );
      })}
      <div className="resource-score" aria-label={`Team score: ${score} out of ${WINNING_SCORE}`}>
        <strong>{score}<small> / {WINNING_SCORE}</small></strong>
        <span>TEAM SCORE</span>
      </div>
    </div>

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

      <div className="status-strip">
        <div><span className="hud-label">HEALTHY HIVES</span><strong>{livingHives}<small> / {hives.length}</small></strong></div>
        <div><span className="hud-label">TILES</span><strong>{tiles.length}</strong></div>
      </div>

      <div className="event-card" aria-live="polite">
        <div className="event-card-heading">
          <span className="event-die">{dieResult ?? '🎲'}</span>
          <div>
            <span className="hud-label">{currentEvent ? `DICE · ${eventName(currentEvent)}` : 'ENVIRONMENTAL EVENT'}</span>
            <strong>{currentEvent ? eventName(currentEvent) : 'What will happen today?'}</strong>
          </div>
        </div>
        <p>{eventDescription(state)}</p>
        {turnPhase === 'roll' && (
          <button type="button" className="primary-button full-width" onClick={() => state.rollDice()}>
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
          <p className="message-line" aria-live="polite">{state.message}</p>
          {state.error && <p className="error-message" role="alert">{state.error}</p>}
        </div>
      )}

      {turnPhase === 'trading' && (
        <div className={pendingHivePurchase ? 'trade-card placement-pending' : 'trade-card'}>
          <div className="section-heading">
            <div><span className="hud-label">TRADING</span><strong>Trade as many times as you can</strong></div>
            <span className="held-score">{score} held points</span>
          </div>
          <div className="trade-options">
            <div className="trade-option">
              <button type="button" className="secondary-button" disabled={pendingHivePurchase || !canPurchase(state, 'honey')} onClick={() => state.trade('honey')}>
                Make honey
              </button>
              <span>1 pollen + 1 nectar + 1 water</span>
              <small>{missingHoneyIngredients(state)}</small>
            </div>
            <div className="trade-option">
              <button type="button" className="secondary-button" disabled={pendingHivePurchase || !canPurchase(state, 'beeBread')} onClick={() => state.trade('beeBread')}>
                Make bee bread
              </button>
              <span>2 pollen + 3 nectar</span>
              <small>{missingBreadIngredients(state)}</small>
            </div>
            <div className="trade-option">
              <button
                type="button"
                className="secondary-button"
                disabled={pendingHivePurchase || !hiveCanBeBought}
                onClick={state.beginHivePurchase}
              >
                Buy a hive
              </button>
              <span>2 honey + 3 bee bread</span>
              <small>
                {pendingHivePurchase
                  ? 'Tap a highlighted healthy tile without a hive to complete the trade.'
                  : state.hives.length >= 15
                    ? 'All hive pieces are in play.'
                    : !hiveCanBePlaced
                      ? 'No healthy empty tile is available.'
                      : inventory.honey < 2 || inventory.beeBread < 3
                        ? `Still need ${Math.max(0, 2 - inventory.honey)} honey and ${Math.max(0, 3 - inventory.beeBread)} bee bread.`
                        : 'Place the hive on a healthy empty tile.'}
              </small>
            </div>
          </div>
          {pendingHivePurchase && (
            <button type="button" className="secondary-button cancel-placement-button" onClick={state.cancelHivePurchase}>
              Cancel placement
            </button>
          )}
          {state.error && <p className="error-message" role="alert">{state.error}</p>}
          <button type="button" className="primary-button full-width" disabled={pendingHivePurchase} onClick={state.finishTurn}>
            Finish trading &amp; turn <span aria-hidden="true">→</span>
          </button>
          <p className="helper-text">Score counts only honey and bee bread still held. Buying a hive lowers the score.</p>
        </div>
      )}

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
