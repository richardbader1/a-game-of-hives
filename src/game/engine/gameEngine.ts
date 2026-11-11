import { PRODUCTS, canAfford, spendIngredients, recipeText } from '../data/products';
import { HIVE_SUPPLY, IMPROVEMENT_SUPPLY, TILE_SUPPLY, WINNING_SCORE } from '../config/gameSettings';
import { hexDistance, hexKey, neighbors } from '../board/hexCoordinates';
import { isGardenPlacementLegal } from '../board/legalPlacement';
import type {
  ActionCategory,
  EnvironmentalEvent,
  GameOutcome,
  GameSnapshot,
  GardenTile,
  HexCoord,
  Hive,
  ImprovementType,
  Inventory,
  ResourceType,
} from '../types';

export const INITIAL_INVENTORY: Inventory = {
  pollen: 0,
  nectar: 0,
  water: 0,
  honey: 0,
  beeBread: 0,
};

const EVENT_NAMES: Record<EnvironmentalEvent, string> = {
  varroa: 'Varroa mite',
  climate: 'Climate change',
  pesticides: 'Pesticides',
  movementRestriction: 'Extreme weather',
  extremeWeatherDamage: 'Extreme weather',
  garden: 'Garden growth',
};

const RESOURCE_LABELS: Record<ResourceType, string> = {
  pollen: 'pollen',
  nectar: 'nectar',
  water: 'water',
};

function isPlaying(state: GameSnapshot): boolean {
  return state.phase === 'ready' && state.outcome === null;
}

const hexOrder = (a: HexCoord, b: HexCoord) => a.q - b.q || a.r - b.r;

export function scoreInventory(inventory: Inventory): number {
  return inventory.honey * PRODUCTS.honey.points + inventory.beeBread * PRODUCTS.beeBread.points;
}

export function healthyHiveCount(hives: readonly Hive[]): number {
  return hives.filter((hive) => !hive.damaged).length;
}

export function remainingTileSupply(
  tiles: readonly GardenTile[],
  resource: ResourceType,
): number {
  return TILE_SUPPLY[resource] - tiles.filter((tile) => tile.resource === resource).length;
}

export function legalGardenPositions(tiles: readonly GardenTile[]): HexCoord[] {
  const candidates = tiles.flatMap((tile) => neighbors(tile));
  const unique = new Map(candidates.map((coord) => [hexKey(coord), coord]));
  return [...unique.values()]
    .filter((coord) => isGardenPlacementLegal(coord, tiles, Infinity))
    .sort(hexOrder);
}

export function movementDestinations(
  originTileId: string | null,
  tiles: readonly GardenTile[],
  character: 'bee' | 'beekeeper',
): string[] {
  const origin = tiles.find((tile) => tile.id === originTileId);
  if (!origin) return [];
  const destinations = new Set<string>();
  const byCoordinate = new Map(tiles.map((tile) => [hexKey(tile), tile]));

  for (const direction of [
    { q: 1, r: 0 },
    { q: 1, r: -1 },
    { q: 0, r: -1 },
    { q: -1, r: 0 },
    { q: -1, r: 1 },
    { q: 0, r: 1 },
  ]) {
    let coord = { q: origin.q + direction.q, r: origin.r + direction.r };
    while (true) {
      const tile = byCoordinate.get(hexKey(coord));
      if (!tile || (character === 'bee' && tile.damaged)) break;
      destinations.add(tile.id);
      coord = { q: coord.q + direction.q, r: coord.r + direction.r };
    }
  }

  if (character === 'beekeeper') destinations.add(origin.id);
  return [...destinations];
}

export function eventDescription(state: GameSnapshot): string {
  if (!state.currentEvent || !state.dieResult) return 'Roll to discover what is happening in the garden.';
  switch (state.currentEvent) {
    case 'varroa':
      return 'Varroa mites may damage one hive.';
    case 'climate':
      return 'Climate change may damage one garden tile.';
    case 'pesticides':
      return 'The bee can collect only water, unless it visits a no-spray zone.';
    case 'movementRestriction':
      return 'Extreme weather means the bee cannot move this turn.';
    case 'extremeWeatherDamage':
      return 'Extreme weather may damage one hive.';
    case 'garden':
      return 'The garden grows! Place one free tile before taking actions.';
  }
}

function log(state: GameSnapshot, message: string): GameSnapshot {
  return { ...state, message, error: null, eventLog: [message, ...state.eventLog].slice(0, 40) };
}

function checkImmediateDefeat(state: GameSnapshot): GameSnapshot {
  if (healthyHiveCount(state.hives) > 0) return state;
  return {
    ...state,
    turnPhase: 'ended',
    outcome: 'lost',
    selectedAction: null,
    pendingHivePurchase: false,
    message: 'There are no healthy hives left. The team can try again and protect the queen!',
  };
}

function randomItem<T>(items: readonly T[], rng: () => number): T | undefined {
  if (items.length === 0) return undefined;
  const index = Math.min(items.length - 1, Math.floor(Math.max(0, rng()) * items.length));
  return items[index];
}

function removeTile(state: GameSnapshot, tile: GardenTile): GameSnapshot {
  const tiles = state.tiles.filter((item) => item.id !== tile.id);
  const removedHiveIds = state.hives.filter((hive) => hive.tileId === tile.id).map((hive) => hive.id);
  const hives = state.hives.filter((hive) => hive.tileId !== tile.id);
  let next: GameSnapshot = {
    ...state,
    tiles,
    hives,
    inventory: { ...state.inventory },
  };
  const resourceCount = next.inventory[tile.resource];
  const resourceLost = resourceCount > 0;
  if (resourceCount > 0) {
    next.inventory = { ...next.inventory, [tile.resource]: resourceCount - 1 };
  }

  const safeTiles = tiles
    .filter((candidate) => !candidate.damaged)
    .sort((a, b) => hexDistance(tile, a) - hexDistance(tile, b) || hexOrder(a, b));
  const keeperTiles = [...tiles].sort(
    (a, b) => hexDistance(tile, a) - hexDistance(tile, b) || hexOrder(a, b),
  );
  const beeDestination = safeTiles[0]?.id ?? keeperTiles[0]?.id ?? null;
  const keeperDestination = keeperTiles[0]?.id ?? null;
  const beeRelocated = state.beeTileId === tile.id;
  const keeperRelocated = state.beekeeperTileId === tile.id;
  next = {
    ...next,
    beeTileId: beeRelocated ? beeDestination : state.beeTileId,
    beekeeperTileId: keeperRelocated ? keeperDestination : state.beekeeperTileId,
  };

  const contents = [
    removedHiveIds.length ? 'Its hive and improvements were lost' : '',
    beeRelocated
      ? beeDestination
        ? safeTiles.length ? 'the bee moved to the nearest safe tile' : 'the bee sheltered on the nearest damaged tile; repair the garden to help it move again'
        : 'there is no safe tile for the bee'
      : '',
    keeperRelocated
      ? keeperDestination
        ? 'the beekeeper moved to the nearest tile'
        : 'there is no tile for the beekeeper'
      : '',
  ].filter(Boolean);
  const lossNote = resourceLost ? ` One ${RESOURCE_LABELS[tile.resource]} was lost.` : '';
  const message = `The ${RESOURCE_LABELS[tile.resource]} garden tile was destroyed.${lossNote}${contents.length ? ` ${contents.join('; ')}.` : ''}`;
  return checkImmediateDefeat(log(next, message));
}

function damageHive(
  state: GameSnapshot,
  hive: Hive,
  event: 'varroa' | 'extremeWeatherDamage',
): GameSnapshot {
  if (event === 'varroa' && hive.smartHive) {
    return log(state, `The ${EVENT_NAMES[event]} reached a smart hive, which protected it.`);
  }
  if (hive.damaged) {
    const next = {
      ...state,
      hives: state.hives.filter((item) => item.id !== hive.id),
    };
    return checkImmediateDefeat(log(next, `The damaged hive was destroyed by ${EVENT_NAMES[event]}.`));
  }
  return checkImmediateDefeat(log(
    {
      ...state,
      hives: state.hives.map((item) =>
        item.id === hive.id ? { ...item, damaged: true } : item,
      ),
    },
    `${EVENT_NAMES[event]} damaged a hive.`,
  ));
}

function damageTile(state: GameSnapshot, tile: GardenTile): GameSnapshot {
  if (tile.damaged && !tile.wildlifeReserve) {
    return removeTile(state, tile);
  }
  const inventory = { ...state.inventory };
  const resourceLost = inventory[tile.resource] > 0;
  if (inventory[tile.resource] > 0) inventory[tile.resource] -= 1;
  const tiles = state.tiles.map((item) =>
    item.id === tile.id ? { ...item, damaged: true } : item,
  );
  const lossNote = resourceLost ? ` One ${RESOURCE_LABELS[tile.resource]} was lost.` : '';
  const message = tile.damaged
    ? `A wildlife reserve stopped a damaged garden tile from being destroyed.${lossNote}`
    : `Climate change damaged a ${RESOURCE_LABELS[tile.resource]} tile.${lossNote}`;
  return log({ ...state, tiles, inventory }, message);
}

export function rollAndResolveEvent(
  state: GameSnapshot,
  rng: () => number = Math.random,
): GameSnapshot {
  if (state.phase !== 'ready' || state.turnPhase !== 'roll' || state.outcome) return state;
  const dieResult = Math.min(6, Math.floor(Math.max(0, rng()) * 6) + 1);
  const currentEvent: EnvironmentalEvent = [
    'varroa',
    'climate',
    'pesticides',
    'movementRestriction',
    'extremeWeatherDamage',
    'garden',
  ][dieResult - 1] as EnvironmentalEvent;
  let next: GameSnapshot = {
    ...state,
    dieResult,
    currentEvent,
    eventRestriction:
      currentEvent === 'pesticides'
        ? 'waterOnly'
        : currentEvent === 'movementRestriction'
          ? 'noBeeMove'
          : null,
    actionCategoriesUsed: [],
    selectedAction: null,
    selectedTileId: null,
    lastCollected: null,
  } as GameSnapshot;
  next = log(next, `🎲 ${state.players[state.currentPlayerIndex]?.name ?? 'The team'} rolled ${dieResult}: ${EVENT_NAMES[currentEvent]}.`);

  switch (currentEvent) {
    case 'varroa':
    case 'extremeWeatherDamage': {
      const target = randomItem(next.hives, rng);
      if (!target) next = log(next, `${EVENT_NAMES[currentEvent]} had no effect because there are no hives.`);
      else next = damageHive(next, target, currentEvent);
      break;
    }
    case 'climate': {
      const target = randomItem(next.tiles, rng);
      if (!target) next = log(next, 'Climate change had no effect because there are no garden tiles.');
      else next = damageTile(next, target);
      break;
    }
    case 'pesticides':
      next = log(next, 'Pesticides are in the garden. The bee may collect water only, except on a no-spray zone.');
      break;
    case 'movementRestriction':
      next = log(next, 'Extreme weather prevents the bee from moving this turn.');
      break;
    case 'garden':
      if (
        !Object.keys(TILE_SUPPLY).some(
          (resource) => remainingTileSupply(next.tiles, resource as ResourceType) > 0,
        ) ||
        legalGardenPositions(next.tiles).length === 0
      ) {
        next = log(next, 'The garden event had no effect because no tile can be placed.');
        next = { ...next, turnPhase: 'actions' };
      } else {
        next = {
          ...next,
          turnPhase: 'eventPlacement',
          selectedAction: null,
          selectedTileId: null,
        };
        next = log(next, 'Choose a tile for the free garden growth. This does not use an action.');
      }
      break;
  }

  if (next.turnPhase !== 'eventPlacement' && next.turnPhase !== 'ended') {
    next = { ...next, turnPhase: 'actions' };
  }
  return next;
}

function nextActionState(
  state: GameSnapshot,
  category: ActionCategory,
  message: string,
): GameSnapshot {
  const actionCategoriesUsed = [...state.actionCategoriesUsed, category];
  return {
    ...log(state, message),
    actionCategoriesUsed,
    selectedAction: null,
    selectedTileId: null,
    turnPhase: actionCategoriesUsed.length >= 2 ? 'trading' : 'actions',
  };
}

export function selectAction(
  state: GameSnapshot,
  category: ActionCategory,
): GameSnapshot {
  if (!isPlaying(state) || state.turnPhase !== 'actions' || state.actionCategoriesUsed.includes(category)) return state;
  if (state.selectedAction === 'beekeeper' && state.selectedTileId) {
    return {
      ...state,
      error: 'Finish or skip the beekeeper action at the chosen tile before selecting another action.',
    };
  }
  return log(
    { ...state, selectedAction: category, selectedTileId: null, selectedResource: 'pollen' },
    category === 'garden'
      ? 'Choose a resource tile, then tap an empty space next to the garden.'
      : `Choose where the ${category === 'bee' ? 'bee' : 'beekeeper'} will go.`,
  );
}

export function selectResource(state: GameSnapshot, resource: ResourceType): GameSnapshot {
  if (
    state.phase === 'gardenSetup' ||
    (isPlaying(state) && (state.turnPhase === 'actions' || state.turnPhase === 'eventPlacement'))
  ) {
    return { ...state, selectedResource: resource, error: null };
  }
  return state;
}

export function completeGardenPlacement(
  state: GameSnapshot,
  coord: HexCoord,
  resource: ResourceType,
  freeEventPlacement = false,
): GameSnapshot {
  if (!isPlaying(state)) return state;
  const allowed =
    state.turnPhase === 'eventPlacement' && freeEventPlacement
      ? true
      : state.turnPhase === 'actions' && state.selectedAction === 'garden' && !freeEventPlacement;
  if (!allowed || (!freeEventPlacement && state.actionCategoriesUsed.includes('garden'))) return state;
  if (remainingTileSupply(state.tiles, resource) <= 0) {
    return { ...state, error: `There are no ${resource} tiles left in the supply.` };
  }
  if (!isGardenPlacementLegal(coord, state.tiles, Infinity)) {
    return { ...state, error: 'Choose an empty space next to your garden.' };
  }
  const tile: GardenTile = { ...coord, id: `tile-${coord.q}-${coord.r}`, resource, damaged: false };
  const withTile = { ...state, tiles: [...state.tiles, tile], error: null };
  return freeEventPlacement
    ? {
        ...log(
          { ...withTile, turnPhase: 'actions', selectedAction: null },
          `The team added a free ${RESOURCE_LABELS[resource]} tile. No action was used.`,
        ),
      }
    : nextActionState(withTile, 'garden', `The team added a ${RESOURCE_LABELS[resource]} garden tile.`);
}

export function moveBee(state: GameSnapshot, tileId: string): GameSnapshot {
  if (!isPlaying(state) || state.turnPhase !== 'actions' || state.selectedAction !== 'bee' || state.actionCategoriesUsed.includes('bee')) return state;
  if (state.eventRestriction === 'noBeeMove') {
    return { ...state, error: 'Extreme weather means the bee cannot move this turn. Skip this action.' };
  }
  if (!movementDestinations(state.beeTileId, state.tiles, 'bee').includes(tileId)) {
    return { ...state, error: 'The bee can only move in a straight line along healthy connected tiles.' };
  }
  const tile = state.tiles.find((item) => item.id === tileId);
  if (!tile) return state;
  const hive = state.hives.find((item) => item.tileId === tileId && !item.damaged);
  const mayCollect =
    state.eventRestriction !== 'waterOnly' ||
    tile.resource === 'water' ||
    Boolean(tile.noSprayZone);
  const amount = mayCollect ? (hive ? 2 : 1) : 0;
  const inventory = {
    ...state.inventory,
    [tile.resource]: state.inventory[tile.resource] + amount,
  };
  const moved = {
    ...state,
    beeTileId: tileId,
    inventory,
    lastCollected: amount ? { resource: tile.resource, amount } : null,
  };
  const message = amount
    ? `The bee collected ${amount} ${RESOURCE_LABELS[tile.resource]}${amount > 1 ? 's' : ''}${hive ? ' beside a healthy hive' : ''}.`
    : 'The bee moved safely, but pesticides stopped it collecting on this tile.';
  return nextActionState(moved, 'bee', message);
}

export function moveBeekeeper(state: GameSnapshot, tileId: string): GameSnapshot {
  if (!isPlaying(state) || state.turnPhase !== 'actions' || state.actionCategoriesUsed.includes('beekeeper') || state.selectedAction !== 'beekeeper') return state;
  if (state.selectedTileId) {
    return { ...state, error: 'The beekeeper has already moved for this action. Repair or improve this tile, or skip the action.' };
  }
  if (!movementDestinations(state.beekeeperTileId, state.tiles, 'beekeeper').includes(tileId)) {
    return { ...state, error: 'The beekeeper can only move in a straight line along connected tiles.' };
  }
  return log(
    { ...state, beekeeperTileId: tileId, selectedTileId: tileId, error: null },
    'Choose one repair or improvement for the beekeeper’s tile.',
  );
}

export function availableBeekeeperActions(
  state: GameSnapshot,
  tileId: string | null,
): Array<'repairHive' | 'repairTile' | ImprovementType> {
  const tile = state.tiles.find((item) => item.id === tileId);
  if (!tile) return [];
  const hive = state.hives.find((item) => item.tileId === tile.id);
  const actions: Array<'repairHive' | 'repairTile' | ImprovementType> = [];
  if (hive?.damaged) actions.push('repairHive');
  if (tile.damaged) actions.push('repairTile');
  if (
    hive &&
    !hive.smartHive &&
    state.hives.filter((item) => item.smartHive).length < IMPROVEMENT_SUPPLY.smartHive
  ) actions.push('smartHive');
  if (!tile.wildlifeReserve &&
    state.tiles.filter((item) => item.wildlifeReserve).length < IMPROVEMENT_SUPPLY.wildlifeReserve
  ) actions.push('wildlifeReserve');
  if (!tile.noSprayZone &&
    state.tiles.filter((item) => item.noSprayZone).length < IMPROVEMENT_SUPPLY.noSprayZone
  ) actions.push('noSprayZone');
  return actions;
}

export function performBeekeeperAction(
  state: GameSnapshot,
  action: 'repairHive' | 'repairTile' | ImprovementType,
): GameSnapshot {
  if (!isPlaying(state) || state.turnPhase !== 'actions' || state.actionCategoriesUsed.includes('beekeeper') || state.selectedAction !== 'beekeeper' || !state.selectedTileId) return state;
  if (!availableBeekeeperActions(state, state.selectedTileId).includes(action)) {
    return { ...state, error: 'That repair or improvement is not available on this tile.' };
  }
  const tileId = state.selectedTileId;
  const hive = state.hives.find((item) => item.tileId === tileId);
  let next: GameSnapshot = state;
  let message: string;
  if (action === 'repairHive' && hive) {
    next = { ...state, hives: state.hives.map((item) => item.id === hive.id ? { ...item, damaged: false } : item) };
    message = 'The beekeeper repaired the hive.';
  } else if (action === 'repairTile') {
    next = { ...state, tiles: state.tiles.map((item) => item.id === tileId ? { ...item, damaged: false } : item) };
    message = 'The beekeeper repaired the garden tile.';
  } else if (action === 'smartHive' && hive) {
    next = { ...state, hives: state.hives.map((item) => item.id === hive.id ? { ...item, smartHive: true } : item) };
    message = 'A smart hive now protects this hive from Varroa mites.';
  } else {
    next = {
      ...state,
      tiles: state.tiles.map((item) => item.id === tileId
        ? { ...item, [action]: true }
        : item),
    };
    message = action === 'wildlifeReserve'
      ? 'A wildlife reserve will stop this tile from being destroyed.'
      : 'A no-spray zone will let the bee collect normally during a pesticide event.';
  }
  return nextActionState(next, 'beekeeper', message);
}

export function skipAction(state: GameSnapshot): GameSnapshot {
  if (!isPlaying(state) || state.turnPhase !== 'actions' || !state.selectedAction || state.actionCategoriesUsed.includes(state.selectedAction)) return state;
  const message = state.selectedAction === 'beekeeper' && state.selectedTileId
    ? 'The team passed on a repair or improvement after choosing the beekeeper destination. This uses one distinct action slot so the turn can continue.'
    : `The team voluntarily passed its ${state.selectedAction} action. This uses one distinct action slot so the turn can continue.`;
  return nextActionState(
    state,
    state.selectedAction,
    message,
  );
}

export function legalHivePurchaseTiles(state: Pick<GameSnapshot, 'tiles' | 'hives'>): string[] {
  return state.tiles
    .filter((tile) => !tile.damaged && !state.hives.some((hive) => hive.tileId === tile.id))
    .map((tile) => tile.id);
}

export function canPurchase(state: Pick<GameSnapshot, 'inventory' | 'tiles' | 'hives'>, product: 'honey' | 'beeBread' | 'hive'): boolean {
  if (!canAfford(state.inventory, product)) return false;
  return product !== 'hive' || (
    state.hives.length < HIVE_SUPPLY && legalHivePurchaseTiles(state).length > 0
  );
}

export function tradeProduct(
  state: GameSnapshot,
  product: 'honey' | 'beeBread',
): GameSnapshot {
  if (!isPlaying(state) || state.turnPhase !== 'trading' || state.pendingHivePurchase) return state;
  if (!canPurchase(state, product)) {
    return { ...state, error: `There are not enough resources to make ${product === 'honey' ? 'honey' : 'bee bread'}.` };
  }
  const inventory = spendIngredients(state.inventory, product);
  inventory[product] += 1;
  return log({ ...state, inventory }, `The team made ${product === 'honey' ? '1 honey' : '1 bee bread'}.`);
}

export function beginHivePurchase(state: GameSnapshot): GameSnapshot {
  if (!isPlaying(state) || state.turnPhase !== 'trading') return state;
  if (state.pendingHivePurchase) return state;
  if (state.hives.length >= HIVE_SUPPLY) return { ...state, error: 'All hive pieces are already in play.' };
  if (!canAfford(state.inventory, 'hive')) {
    return { ...state, error: `A hive costs ${recipeText('hive')}.` };
  }
  if (legalHivePurchaseTiles(state).length === 0) {
    return { ...state, error: 'There is no healthy garden tile available for a hive.' };
  }
  return log({ ...state, pendingHivePurchase: true }, 'Choose a healthy garden tile for the new hive. The trade completes when you place it.');
}

export function completeHivePurchase(state: GameSnapshot, tileId: string): GameSnapshot {
  if (!isPlaying(state) || state.turnPhase !== 'trading' || !state.pendingHivePurchase) return state;
  if (
    state.hives.length >= HIVE_SUPPLY ||
    !canAfford(state.inventory, 'hive')
  ) {
    return {
      ...state,
      error: 'The hive purchase is no longer affordable or available. Cancel placement to return to trading.',
    };
  }
  if (!legalHivePurchaseTiles(state).includes(tileId)) {
    return { ...state, error: 'Choose a healthy tile without a hive to complete this purchase.' };
  }
  const inventory = spendIngredients(state.inventory, 'hive');
  const hive: Hive = {
    id: `hive-${state.hives.length + 1}-${tileId}`,
    tileId,
    damaged: false,
    smartHive: false,
  };
  return log(
    { ...state, inventory, hives: [...state.hives, hive], pendingHivePurchase: false },
    `The team traded ${recipeText('hive')} for a healthy hive.`,
  );
}

export function cancelHivePurchase(state: GameSnapshot): GameSnapshot {
  if (!isPlaying(state) || state.turnPhase !== 'trading' || !state.pendingHivePurchase) return state;
  return log(
    { ...state, pendingHivePurchase: false },
    'Hive placement was cancelled. No resources were spent.',
  );
}

export function finishTurn(state: GameSnapshot): GameSnapshot {
  if (!isPlaying(state) || state.turnPhase !== 'trading' || state.outcome) return state;
  if (state.pendingHivePurchase) {
    return { ...state, error: 'Place the purchased hive or cancel placement before finishing the turn.' };
  }
  if (scoreInventory(state.inventory) >= WINNING_SCORE) {
    return {
      ...log(
        { ...state, turnPhase: 'ended', outcome: 'won', pendingHivePurchase: false },
        'The team saved the queen bee! You have 10 or more points in honey and bee bread.',
      ),
    };
  }
  const currentPlayerIndex = (state.currentPlayerIndex + 1) % state.players.length;
  const roundNumber = currentPlayerIndex === state.startingPlayerIndex
    ? state.roundNumber + 1
    : state.roundNumber;
  return log(
    {
      ...state,
      currentPlayerIndex,
      roundNumber,
      turnPhase: 'roll',
      actionCategoriesUsed: [],
      selectedAction: null,
      selectedTileId: null,
      currentEvent: null,
      dieResult: null,
      eventRestriction: null,
      pendingHivePurchase: false,
      lastCollected: null,
    },
    `Trading is finished. It is now ${state.players[currentPlayerIndex]?.name ?? 'the next player'}’s turn.`,
  );
}

export function eventName(event: EnvironmentalEvent | null): string {
  return event ? EVENT_NAMES[event] : 'No event yet';
}

export function outcomeMessage(outcome: GameOutcome): string {
  return outcome === 'won'
    ? 'The team saved the queen bee!'
    : 'The team ran out of healthy hives. Try again and protect the garden!';
}
