import { describe, expect, it } from 'vitest';
import {
  availableBeekeeperActions,
  beginHivePurchase,
  canPurchase,
  cancelHivePurchase,
  completeGardenPlacement,
  completeHivePurchase,
  finishTurn,
  healthyHiveCount,
  legalGardenPositions,
  moveBee,
  moveBeekeeper,
  movementDestinations,
  performBeekeeperAction,
  remainingTileSupply,
  rollAndResolveEvent,
  scoreInventory,
  selectAction,
  skipAction,
  tradeProduct,
} from '../../src/game/engine/gameEngine';
import type { GameSnapshot, GardenTile, Hive, Player } from '../../src/game/types';

const players: Player[] = [
  { id: 'p1', name: 'Ari' },
  { id: 'p2', name: 'Sam' },
  { id: 'p3', name: 'Lee' },
  { id: 'p4', name: 'Jo' },
];

const tiles: GardenTile[] = [
  { id: 't0', q: 0, r: 0, resource: 'pollen' },
  { id: 't1', q: 1, r: 0, resource: 'nectar' },
  { id: 't2', q: 2, r: 0, resource: 'water' },
  { id: 't3', q: 3, r: 0, resource: 'pollen' },
  { id: 't4', q: 0, r: 1, resource: 'water' },
];

const hives: Hive[] = tiles.slice(0, 4).map((tile) => ({
  id: `h-${tile.id}`,
  tileId: tile.id,
  damaged: false,
  smartHive: false,
}));

function game(overrides: Partial<GameSnapshot> = {}): GameSnapshot {
  return {
    phase: 'ready',
    players: players.slice(0, 2),
    startingPlayerIndex: 0,
    tiles: tiles.map((tile) => ({ ...tile })),
    hives: hives.map((hive) => ({ ...hive })),
    beeTileId: 't0',
    beekeeperTileId: 't0',
    activeCharacter: 'bee',
    selectedResource: 'pollen',
    message: '',
    error: null,
    turnPhase: 'roll',
    currentPlayerIndex: 0,
    roundNumber: 1,
    actionCategoriesUsed: [],
    selectedAction: null,
    selectedTileId: null,
    inventory: { pollen: 0, nectar: 0, water: 0, honey: 0, beeBread: 0 },
    dieResult: null,
    currentEvent: null,
    eventRestriction: null,
    pendingHivePurchase: false,
    outcome: null,
    eventLog: [],
    lastCollected: null,
    ...overrides,
  };
}

function fixedRoll(face: number, target = 0): () => number {
  const values = [(face - 1) / 6, target];
  let index = 0;
  return () => values[index++] ?? target;
}

describe('turn sequence', () => {
  it.each([2, 3, 4])('rotates through %i players', (count) => {
    const roster = players.slice(0, count);
    let state = game({ players: roster, turnPhase: 'trading' });
    for (let index = 0; index < count; index += 1) {
      state = { ...state, turnPhase: 'trading' };
      state = finishTurn(state);
      expect(state.currentPlayerIndex).toBe((index + 1) % count);
      expect(state.turnPhase).toBe('roll');
      expect(state.roundNumber).toBe(index + 1 === count ? 2 : 1);
    }
    expect(state.currentPlayerIndex).toBe(0);
  });

  it('does not allow actions before the environmental event resolves', () => {
    const state = game();
    expect(selectAction(state, 'bee')).toBe(state);
    const attempted = moveBee({ ...state, selectedAction: 'bee' }, 't1');
    expect(attempted.beeTileId).toBe(state.beeTileId);
    expect(attempted.inventory).toEqual(state.inventory);
  });

  it('prevents selecting the same action category twice', () => {
    let state = selectAction(game({ turnPhase: 'actions' }), 'garden');
    state = skipAction(state);
    expect(state.actionCategoriesUsed).toEqual(['garden']);
    expect(selectAction(state, 'garden')).toBe(state);
  });

  it('does not get stuck when an unavailable action is skipped', () => {
    let state = rollAndResolveEvent(game(), fixedRoll(4));
    state = selectAction(state, 'bee');
    state = skipAction(state);
    state = selectAction(state, 'garden');
    state = skipAction(state);
    expect(state.turnPhase).toBe('trading');
    expect(state.actionCategoriesUsed).toEqual(['bee', 'garden']);
  });
});

describe('movement and collection', () => {
  it('allows straight-line movement but not a turn around a corner', () => {
    expect(movementDestinations('t0', tiles, 'bee')).toEqual(expect.arrayContaining(['t1', 't2', 't3', 't4']));
    const bentGarden: GardenTile[] = [
      { id: 'a', q: 0, r: 0, resource: 'pollen' },
      { id: 'b', q: 1, r: 0, resource: 'nectar' },
      { id: 'c', q: 1, r: 1, resource: 'water' },
    ];
    expect(movementDestinations('a', bentGarden, 'bee')).toEqual(['b']);
  });

  it('does not let the bee pass through a damaged garden tile', () => {
    const blocked = tiles.slice(0, 4).map((tile) => tile.id === 't2' ? { ...tile, damaged: true } : tile);
    expect(movementDestinations('t0', blocked, 'bee')).toEqual(['t1']);
  });

  it('collects one resource, or two beside a healthy hive', () => {
    const selected = selectAction(game({ turnPhase: 'actions' }), 'bee');
    expect(moveBee(selected, 't1').inventory.nectar).toBe(2);
    const noHive = { ...selected, hives: selected.hives.filter((hive) => hive.tileId !== 't1') };
    expect(moveBee(noHive, 't1').inventory.nectar).toBe(1);
    const damagedHive = { ...selected, hives: selected.hives.map((hive) => hive.tileId === 't1' ? { ...hive, damaged: true } : hive) };
    expect(moveBee(damagedHive, 't1').inventory.nectar).toBe(1);
  });

  it('applies pesticide collection limits and honors no-spray zones', () => {
    const state = rollAndResolveEvent(game(), fixedRoll(3));
    const pollenRun = moveBee(selectAction(state, 'bee'), 't1');
    expect(pollenRun.inventory.nectar).toBe(0);
    const waterRun = moveBee(selectAction(state, 'bee'), 't2');
    expect(waterRun.inventory.water).toBe(2);
    const protectedTiles = state.tiles.map((tile) => tile.id === 't1' ? { ...tile, noSprayZone: true } : tile);
    const protectedRun = moveBee(selectAction({ ...state, tiles: protectedTiles }, 'bee'), 't1');
    expect(protectedRun.inventory.nectar).toBe(2);
  });

  it('blocks bee movement during extreme weather', () => {
    const weather = rollAndResolveEvent(game(), fixedRoll(4));
    const state = moveBee(selectAction(weather, 'bee'), 't1');
    expect(state.beeTileId).toBe('t0');
    expect(state.actionCategoriesUsed).toEqual([]);
    expect(state.error).toContain('cannot move');
  });

  it('locks beekeeper movement after one destination and prevents turning corners', () => {
    const bentGarden: GardenTile[] = [
      { id: 'a', q: 0, r: 0, resource: 'pollen' },
      { id: 'b', q: 1, r: 0, resource: 'nectar' },
      { id: 'c', q: 1, r: 1, resource: 'water' },
    ];
    const selected = selectAction(game({
      turnPhase: 'actions',
      tiles: bentGarden,
      hives: [],
      beekeeperTileId: 'a',
    }), 'beekeeper');
    const moved = moveBeekeeper(selected, 'b');
    const secondMove = moveBeekeeper(moved, 'c');
    expect(moved.beekeeperTileId).toBe('b');
    expect(secondMove.beekeeperTileId).toBe('b');
    expect(secondMove.actionCategoriesUsed).toEqual([]);
    expect(secondMove.error).toContain('already moved');
  });

  it('does not let a moved beekeeper switch actions before completing or skipping', () => {
    const selected = selectAction(game({ turnPhase: 'actions' }), 'beekeeper');
    const moved = moveBeekeeper(selected, 't1');
    const switched = selectAction(moved, 'garden');
    expect(switched.selectedAction).toBe('beekeeper');
    expect(switched.beekeeperTileId).toBe('t1');
    expect(switched.actionCategoriesUsed).toEqual([]);
    expect(switched.error).toContain('Finish or skip');
  });

  it('uses one beekeeper action to move then repair at the destination', () => {
    const selected = selectAction(game({
      turnPhase: 'actions',
      hives: hives.map((hive, index) => index === 1 ? { ...hive, damaged: true } : hive),
    }), 'beekeeper');
    const moved = moveBeekeeper(selected, 't1');
    const repaired = performBeekeeperAction(moved, 'repairHive');
    expect(repaired.beekeeperTileId).toBe('t1');
    expect(repaired.hives.find((hive) => hive.tileId === 't1')?.damaged).toBe(false);
    expect(repaired.actionCategoriesUsed).toEqual(['beekeeper']);
  });

  it('allows the beekeeper to act in place and pass after choosing a destination', () => {
    const selected = selectAction(game({ turnPhase: 'actions' }), 'beekeeper');
    const inPlace = moveBeekeeper(selected, 't0');
    expect(inPlace.beekeeperTileId).toBe('t0');
    expect(performBeekeeperAction(inPlace, 'smartHive').hives[0].smartHive).toBe(true);

    const moved = moveBeekeeper(selected, 't1');
    const passed = skipAction(moved);
    expect(passed.beekeeperTileId).toBe('t1');
    expect(passed.actionCategoriesUsed).toEqual(['beekeeper']);
    expect(passed.message).toContain('passed on a repair or improvement');
    expect(moveBeekeeper(passed, 't2').beekeeperTileId).toBe('t1');
    expect(selectAction(passed, 'garden').actionCategoriesUsed).toEqual(['beekeeper']);
  });
});

describe('environment, damage, and repairs', () => {
  it('lets a smart hive block Varroa after the target is selected', () => {
    const state = game({ hives: hives.map((hive, index) => index === 0 ? { ...hive, smartHive: true } : hive) });
    const result = rollAndResolveEvent(state, fixedRoll(1));
    expect(result.hives[0].damaged).toBe(false);
    expect(result.message).toContain('protected');
    expect(result.turnPhase).toBe('actions');
  });

  it('applies extreme-weather hive damage even to a smart hive', () => {
    const state = game({ hives: hives.map((hive, index) => index === 0 ? { ...hive, smartHive: true } : hive) });
    const result = rollAndResolveEvent(state, fixedRoll(5));
    expect(result.hives[0].damaged).toBe(true);
    expect(result.message).toContain('damaged a hive');
  });

  it('destroys a hive on the second hit and randomly targets damaged hives too', () => {
    const firstHit = rollAndResolveEvent(game(), fixedRoll(1));
    expect(firstHit.hives.find((hive) => hive.tileId === 't0')?.damaged).toBe(true);
    const secondHit = rollAndResolveEvent({ ...firstHit, turnPhase: 'roll' }, fixedRoll(1));
    expect(secondHit.hives.some((hive) => hive.tileId === 't0')).toBe(false);
    const selectedDamaged = rollAndResolveEvent(
      game({ hives: hives.map((hive, index) => index === 1 ? { ...hive, damaged: true } : hive) }),
      fixedRoll(1, 0.3),
    );
    expect(selectedDamaged.hives.some((hive) => hive.tileId === 't1')).toBe(false);
  });

  it('loses immediately when a damaging event leaves no healthy hives', () => {
    const state = game({ hives: [{ ...hives[0] }] });
    const result = rollAndResolveEvent(state, fixedRoll(1));
    expect(result.hives[0].damaged).toBe(true);
    expect(result.outcome).toBe('lost');
    expect(result.turnPhase).toBe('ended');
  });

  it('uses the six die faces for their six different event outcomes', () => {
    const expected = [
      'varroa',
      'climate',
      'pesticides',
      'movementRestriction',
      'extremeWeatherDamage',
      'garden',
    ];
    expected.forEach((event, index) => {
      const state = rollAndResolveEvent(game(), fixedRoll(index + 1));
      expect(state.currentEvent).toBe(event);
    });
  });

  it('damages a reserved climate tile but does not remove it on a later hit', () => {
    const reserved = game({
      tiles: tiles.map((tile, index) => index === 0 ? { ...tile, damaged: true, wildlifeReserve: true } : tile),
    });
    const result = rollAndResolveEvent(reserved, fixedRoll(2));
    expect(result.tiles.some((tile) => tile.id === 't0')).toBe(true);
    expect(result.tiles.find((tile) => tile.id === 't0')?.damaged).toBe(true);
    expect(result.message).toContain('wildlife reserve');
  });

  it('allows the first climate damage even when a wildlife reserve is present', () => {
    const state = game({
      tiles: tiles.map((tile, index) => index === 0 ? { ...tile, wildlifeReserve: true } : tile),
    });
    const result = rollAndResolveEvent(state, fixedRoll(2));
    expect(result.tiles.find((tile) => tile.id === 't0')?.damaged).toBe(true);
    expect(result.tiles.some((tile) => tile.id === 't0')).toBe(true);
  });

  it('damages then destroys tiles, removes the matching resource, and relocates characters', () => {
    const firstHit = rollAndResolveEvent(game(), fixedRoll(2));
    expect(firstHit.tiles.find((tile) => tile.id === 't0')?.damaged).toBe(true);
    expect(firstHit.inventory.pollen).toBe(0);
    const secondHit = rollAndResolveEvent({
      ...firstHit,
      turnPhase: 'roll',
      tiles: firstHit.tiles.map((tile) => tile.id === 't0' ? { ...tile, damaged: true } : tile),
      beeTileId: 't0',
      beekeeperTileId: 't0',
      inventory: { ...firstHit.inventory, pollen: 1 },
    }, fixedRoll(2));
    expect(secondHit.tiles.some((tile) => tile.id === 't0')).toBe(false);
    expect(secondHit.hives.some((hive) => hive.tileId === 't0')).toBe(false);
    expect(secondHit.inventory.pollen).toBe(0);
    expect(secondHit.beeTileId).not.toBe('t0');
    expect(secondHit.beekeeperTileId).not.toBe('t0');
  });

  it('allows repairs at the beekeeper destination', () => {
    const state = game({
      turnPhase: 'actions',
      selectedAction: 'beekeeper',
      selectedTileId: 't0',
      tiles: tiles.map((tile, index) => index === 0 ? { ...tile, damaged: true } : tile),
      hives: hives.map((hive, index) => index === 0 ? { ...hive, damaged: true } : hive),
    });
    expect(availableBeekeeperActions(state, 't0')).toContain('repairHive');
    expect(performBeekeeperAction(state, 'repairHive').hives[0].damaged).toBe(false);
    expect(performBeekeeperAction(state, 'repairTile').tiles[0].damaged).toBe(false);
  });

  it('handles missing environmental targets without getting stuck', () => {
    const state = rollAndResolveEvent(game({ hives: [] }), fixedRoll(1));
    expect(state.turnPhase).toBe('actions');
    expect(state.message).toContain('no hives');
    const noTiles = rollAndResolveEvent(game({ tiles: [] }), fixedRoll(2));
    expect(noTiles.turnPhase).toBe('actions');
    expect(noTiles.message).toContain('no garden tiles');
  });

  it('loses immediately when no healthy hive remains', () => {
    const damagedHives = hives.map((hive) => ({ ...hive, damaged: true }));
    const result = rollAndResolveEvent(game({ hives: damagedHives }), fixedRoll(1));
    expect(healthyHiveCount(result.hives)).toBe(0);
    expect(result.outcome).toBe('lost');
    expect(result.turnPhase).toBe('ended');
  });
});

describe('garden, trades, and outcomes', () => {
  it('allows only adjacent garden extensions and uses finite tile supply', () => {
    const state = selectAction(game({ turnPhase: 'actions' }), 'garden');
    expect(legalGardenPositions(state.tiles).length).toBeGreaterThan(0);
    const added = completeGardenPlacement(state, { q: 0, r: 2 }, 'pollen');
    expect(added.tiles).toHaveLength(6);
    expect(added.actionCategoriesUsed).toEqual(['garden']);
    const disconnected = completeGardenPlacement(state, { q: 8, r: 8 }, 'pollen');
    expect(disconnected.tiles).toHaveLength(5);
    expect(disconnected.error).toContain('next to');
  });

  it('does not place a garden tile after that resource supply is exhausted', () => {
    const fullPollenSupply = game({
      turnPhase: 'actions',
      selectedAction: 'garden',
      tiles: Array.from({ length: 6 }, (_, index) => ({
        id: `p${index}`,
        q: index,
        r: 0,
        resource: 'pollen' as const,
      })),
    });
    expect(remainingTileSupply(fullPollenSupply.tiles, 'pollen')).toBe(0);
    const result = completeGardenPlacement(fullPollenSupply, { q: 6, r: 0 }, 'pollen');
    expect(result.tiles).toHaveLength(6);
    expect(result.error).toContain('no pollen tiles');
  });

  it('handles a free garden event placement without consuming an action', () => {
    const event = rollAndResolveEvent(game(), fixedRoll(6));
    expect(event.turnPhase).toBe('eventPlacement');
    const placed = completeGardenPlacement(event, { q: 0, r: 2 }, 'pollen', true);
    expect(placed.turnPhase).toBe('actions');
    expect(placed.actionCategoriesUsed).toEqual([]);
  });

  it('deducts the exact ingredients for honey and bee bread', () => {
    const state = game({
      turnPhase: 'trading',
      inventory: { pollen: 4, nectar: 5, water: 2, honey: 0, beeBread: 0 },
    });
    const honey = tradeProduct(state, 'honey');
    expect(honey.inventory).toEqual({ pollen: 3, nectar: 4, water: 1, honey: 1, beeBread: 0 });
    const bread = tradeProduct(state, 'beeBread');
    expect(bread.inventory).toEqual({ pollen: 2, nectar: 2, water: 2, honey: 0, beeBread: 1 });
    expect(tradeProduct(game({ turnPhase: 'trading' }), 'honey').inventory).toEqual(game().inventory);
  });

  it('makes hive purchase placement transactional and reduces held score', () => {
    const readyToBuy = game({
      turnPhase: 'trading',
      inventory: { pollen: 0, nectar: 0, water: 0, honey: 2, beeBread: 3 },
    });
    expect(canPurchase(readyToBuy, 'hive')).toBe(true);
    const pending = beginHivePurchase(readyToBuy);
    expect(pending.pendingHivePurchase).toBe(true);
    expect(pending.inventory).toEqual(readyToBuy.inventory);
    const purchased = completeHivePurchase(pending, 't4');
    expect(purchased.inventory.honey).toBe(0);
    expect(purchased.inventory.beeBread).toBe(0);
    expect(purchased.hives).toHaveLength(5);
    expect(scoreInventory(purchased.inventory)).toBe(0);
    expect(completeHivePurchase(purchased, 't3')).toBe(purchased);
  });

  it('cancels a pending hive purchase without spending resources', () => {
    const state = game({
      turnPhase: 'trading',
      inventory: { pollen: 0, nectar: 0, water: 0, honey: 2, beeBread: 3 },
    });
    const pending = beginHivePurchase(state);
    const cancelled = cancelHivePurchase(pending);
    expect(cancelled.pendingHivePurchase).toBe(false);
    expect(cancelled.inventory).toEqual(state.inventory);
    expect(cancelled.hives).toEqual(state.hives);
    expect(cancelled.message).toContain('No resources were spent');
  });

  it('keeps resources and the pending purchase intact after an invalid tile tap', () => {
    const state = beginHivePurchase(game({
      turnPhase: 'trading',
      inventory: { pollen: 0, nectar: 0, water: 0, honey: 2, beeBread: 3 },
    }));
    const invalid = completeHivePurchase(state, 't0');
    expect(invalid.pendingHivePurchase).toBe(true);
    expect(invalid.inventory).toEqual(state.inventory);
    expect(invalid.hives).toEqual(state.hives);
    expect(invalid.error).toContain('healthy tile without a hive');
  });

  it('checks held score only at turn end', () => {
    const scored = game({ turnPhase: 'trading', inventory: { pollen: 0, nectar: 0, water: 0, honey: 10, beeBread: 0 } });
    expect(scored.outcome).toBeNull();
    expect(finishTurn(scored).outcome).toBe('won');
    expect(finishTurn({ ...scored, inventory: { ...scored.inventory, honey: 9 } }).outcome).toBeNull();
  });

  it('rejects finishing a turn while hive placement is pending', () => {
    const state = beginHivePurchase(game({
      turnPhase: 'trading',
      inventory: { pollen: 0, nectar: 0, water: 0, honey: 10, beeBread: 3 },
    }));
    const result = finishTurn(state);
    expect(result.outcome).toBeNull();
    expect(result.pendingHivePurchase).toBe(true);
    expect(result.error).toContain('Place the purchased hive or cancel');
  });

  it('revalidates affordability and supply when committing a pending hive purchase', () => {
    const pending = beginHivePurchase(game({
      turnPhase: 'trading',
      inventory: { pollen: 2, nectar: 3, water: 1, honey: 2, beeBread: 3 },
    }));
    expect(tradeProduct(pending, 'honey').inventory).toEqual(pending.inventory);
    const stale = completeHivePurchase({
      ...pending,
      inventory: { ...pending.inventory, honey: 0, beeBread: 0 },
    }, 't4');
    expect(stale.inventory.honey).toBe(0);
    expect(stale.inventory.beeBread).toBe(0);
    expect(stale.hives).toEqual(pending.hives);
    expect(stale.pendingHivePurchase).toBe(true);
    expect(stale.error).toContain('no longer affordable');

    const exhausted = completeHivePurchase({
      ...pending,
      hives: Array.from({ length: 15 }, (_, index) => ({ ...hives[index % hives.length], id: `h-${index}` })),
    }, 't4');
    expect(exhausted.inventory).toEqual(pending.inventory);
    expect(exhausted.hives).toHaveLength(15);
  });

  it('respects finite improvement supplies and action targets', () => {
    const state = game({ turnPhase: 'actions', selectedAction: 'beekeeper', selectedTileId: 't0' });
    expect(availableBeekeeperActions(state, 't0')).toContain('smartHive');
    const protectedState = {
      ...state,
      hives: state.hives.map((hive) => ({ ...hive, smartHive: true })),
    };
    expect(availableBeekeeperActions(protectedState, 't0')).not.toContain('smartHive');
    expect(availableBeekeeperActions(state, 'not-a-tile')).toEqual([]);
  });
});
