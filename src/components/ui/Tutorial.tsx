import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useGameStore } from '../../store/gameStore';
import { useTutorialStore } from '../../store/tutorialStore';
import type { EnvironmentalEvent, GameSnapshot } from '../../game/types';
import { eventDescription, eventName, movementDestinations, canPurchase } from '../../game/engine/gameEngine';

export interface TutorialStep {
  id: string; title: string; body: string; target: string; instruction: string; acknowledge?: boolean;
}
const ecology: Record<EnvironmentalEvent, string> = {
  varroa: 'Varroa mites are parasites that weaken honey bee colonies.',
  climate: 'Climate change and habitat loss can reduce the flowers and shelter bees need.',
  pesticides: 'Some pesticides harm bees. No-spray zones help protect them.',
  movementRestriction: 'Extreme weather can make it unsafe for bees to forage.',
  extremeWeatherDamage: 'Extreme weather can damage a colony’s home.',
  garden: 'More flowering habitat and water can support a healthy colony.',
};

/** Derive each task from actual state; never assume a die result, move or trade. */
export function tutorialStep(s: GameSnapshot, reviewed: string[]): TutorialStep {
  const step = (id: string, title: string, body: string, target: string, instruction: string, acknowledge = false) =>
    ({ id, title, body, target, instruction, acknowledge });
  if (s.outcome) return step('outcome', 'Keep learning together', s.message, '.outcome-banner', 'Use Help to review your next strategy.', true);
  if (s.phase === 'playerSetup') return step('team', 'Meet your colony team', 'You share one garden and inventory. Talk through decisions together.', '.setup-card', 'Enter 2–4 names, choose who starts, then choose your garden.');
  if (s.phase === 'gardenSetup') return step('garden', 'Build your garden', 'Your garden provides pollen, nectar and water. Connect five tiles so your bees can travel between them; include all three types and bend the garden rather than making one straight line.', '.setup-card', `Garden tiles: ${s.tiles.length} of 5. Choose a resource, then a highlighted space. Undo a tile if you need to change the shape.`);
  if (s.phase === 'hiveSetup') return step('hives', 'Give your bees a home', 'A healthy hive doubles collection on its tile from one resource to two. Place four hives on separate tiles.', '.setup-card', `Hives placed: ${s.hives.length} of 4. Tap a highlighted tile. The ghost shows one possible location.`);
  if (s.phase === 'characterSetup') {
    if (s.beeTileId && s.beekeeperTileId) return step('ready', 'Your garden is ready!', 'You have five garden tiles, four hives, a forager bee and a beekeeper.', '.setup-card', 'Select Start First Round to learn your first turn.');
    return s.activeCharacter === 'bee'
      ? step('bee-place', 'Meet your forager bee', 'Your bee collects pollen, nectar and water from the tile where it lands during a turn.', '.setup-card', 'Place the bee on any highlighted garden tile. The ghost suggests a starting position.')
      : step('keeper-place', 'Meet your beekeeper', 'Your beekeeper repairs damage and installs protections against environmental threats.', '.setup-card', 'Place the beekeeper on a highlighted tile. Both characters may share a tile.');
  }
  if (reviewed.includes('round-finished')) return step('complete', 'Your first round is complete!', 'Every player has taken a turn. Keep working together, protect healthy hives and hold 10 points at turn end to save the Queen Bee.', '.turn-progress', 'You’re ready to play independently. Help is always available.', true);
  if (reviewed.includes('turn-finished') && !reviewed.includes('team-turn')) return step('team-turn', 'Pass the turn to your teammate', 'Great work! Each player takes a turn before the round ends. Your resources and garden are shared.', '.turn-players', 'Select Next, then help your teammate take their turn.', true);
  const turn = `${s.roundNumber}-${s.currentPlayerIndex}`;
  if (s.turnPhase === 'roll') {
    return step('roll', 'Discover what the garden needs', 'Each turn begins with a dice roll that tells us what happens in the environment.', '[data-tour="roll"]', 'Select Roll Dice.');
  }
  if (s.currentEvent && !reviewed.includes(`event-${turn}`)) {
    // Keep the resolved result even if students try an action before reading Next.
    const rollIndex = s.eventLog.findIndex(entry => entry.includes(`rolled ${s.dieResult}:`));
    const result = rollIndex > 0 ? s.eventLog[rollIndex - 1] : eventDescription(s);
    return step(`event-${turn}`, eventName(s.currentEvent), `${ecology[s.currentEvent]} ${eventDescription(s)}`, '.dice-panel', `The actual result: ${result}`, true);
  }
  if (s.turnPhase === 'eventPlacement') return step('free-tile', 'Grow more bee habitat', 'You rolled Improvement: place one free tile before using either action.', '.gameplay-resource-picker', 'Choose a resource type, then a highlighted neighboring space.');
  if (s.lastCollected && !reviewed.includes(`resources-${turn}`)) return step(`resources-${turn}`, `Collected: +${s.lastCollected.amount} ${s.lastCollected.resource}`, 'Your team shares these resources. In this game, trading pollen, nectar and water makes honey and bee bread, which earn held points.', '.game-resource-toolbar', 'Look at the labelled counters, then select Next.', true);
  if (s.turnPhase === 'trading') {
    const affordable = canPurchase(s, 'honey') || canPurchase(s, 'beeBread');
    return step('trade', 'Turn resources into points', 'Trading makes honey and bee bread. Honey is worth 1 held point; bee bread is worth 2. Spending these products on hives lowers your held score.', '.trade-options', s.pendingHivePurchase ? 'Place your purchased hive on a highlighted tile, or cancel placement.' : affordable ? 'An affordable trade is available. Try it if you wish, then finish trading & turn.' : 'No product trade is affordable yet. Save your resources and select Finish trading & turn.');
  }
  if (!s.selectedAction) {
    const beeAvailable = !s.actionCategoriesUsed.includes('bee') && s.eventRestriction !== 'noBeeMove' && movementDestinations(s.beeTileId, s.tiles, 'bee').length > 0;
    return step('actions', 'Two actions, three ways to help', 'Bee: move and collect. Beekeeper: move, then repair or protect for free. Garden: add a tile. Choose two different categories each turn.', '.action-card', `${2 - s.actionCategoriesUsed.length} actions remaining. ${beeAvailable ? 'Try Bee to collect resources, or choose another available action.' : 'Try Beekeeper or Garden. Check the event before choosing Bee.'}`);
  }
  if (s.selectedAction === 'beekeeper' && s.selectedTileId) return step('protect', 'Protect your colony', 'At the chosen tile, your beekeeper can make one available repair or improvement without spending resources.', '.improvement-options', 'Choose a repair or protection. If none is useful, skip this action.');
  return step('destination', s.selectedAction === 'bee' ? 'Collect resources' : s.selectedAction === 'garden' ? 'Grow your garden' : 'Move your beekeeper',
    s.selectedAction === 'bee' ? 'Move in a straight line across healthy connected tiles. A healthy hive doubles collection; check the event for restrictions.' : s.selectedAction === 'garden' ? 'A new connected tile gives your colony more places to collect resources.' : 'Your beekeeper can cross damaged tiles and can also act on its current tile.',
    '.gameplay-destinations', 'Choose a highlighted board destination or use Board controls below. If none is available, skip this action.');
}

/** Reusable viewport spotlight. It never captures clicks on the game underneath. */
function useTargetBounds(target: string) {
  const [rect, setRect] = useState<DOMRect | null>(null);
  useLayoutEffect(() => {
    const update = () => {
      const element = target ? document.querySelector(target) : null;
      const bounds = element?.getBoundingClientRect();
      setRect(previous => {
        const next = bounds && bounds.width && bounds.height ? bounds : null;
        return previous?.left === next?.left && previous?.top === next?.top && previous?.width === next?.width && previous?.height === next?.height ? previous : next;
      });
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(document.body);
    const element = target ? document.querySelector(target) : null;
    if (element) observer.observe(element);
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);
    const timer = window.setInterval(update, 400); // Also handles a lazy target appearing later.
    return () => { observer.disconnect(); window.clearInterval(timer); window.removeEventListener('resize', update); window.removeEventListener('scroll', update, true); };
  }, [target]);
  return rect;
}

export function Tutorial() {
  const game = useGameStore();
  const tour = useTutorialStore();
  const step = tutorialStep(game, tour.reviewed);
  useEffect(() => {
    if (game.eventNotice && tour.active) tour.acknowledge(`event-${game.roundNumber}-${game.currentPlayerIndex}`);
  }, [game.eventNotice?.id, tour.active]);
  const viewingHistory = tour.reviewIndex !== null;
  const rect = useTargetBounds(tour.active && !viewingHistory ? step.target : '');
  const cardRef = useRef<HTMLElement>(null);
  const [cardSize, setCardSize] = useState({ width: 400, height: 280 });
  useLayoutEffect(() => {
    if (!tour.active || !cardRef.current) return;
    const update = () => {
      const bounds = cardRef.current?.getBoundingClientRect();
      if (bounds) setCardSize(previous => previous.width === bounds.width && previous.height === bounds.height ? previous : { width: bounds.width, height: bounds.height });
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(cardRef.current);
    return () => observer.disconnect();
  }, [tour.active, step.id, viewingHistory, Boolean(game.diceAnimation), Boolean(game.eventNotice)]);
  useEffect(() => useGameStore.subscribe((next, previous) => {
    if (useTutorialStore.getState().active && previous.turnPhase === 'trading' && next.turnPhase === 'roll') {
      useTutorialStore.getState().acknowledge(next.roundNumber > previous.roundNumber ? 'round-finished' : 'turn-finished');
    }
    if (previous.phase === 'ready' && next.phase === 'playerSetup') useTutorialStore.getState().skip();
  }), []);
  useEffect(() => {
    if (!tour.active) return;
    useTutorialStore.setState(state => {
      if (state.history[state.history.length - 1]?.id === step.id) return state;
      return { history: [...state.history, step], reviewIndex: null };
    });
  }, [tour.active, step.id]);
  useEffect(() => {
    document.body.classList.toggle('tutorial-active', tour.active);
    return () => document.body.classList.remove('tutorial-active');
  }, [tour.active]);
  if (!tour.active || game.diceAnimation || game.eventNotice) return null;
  const shown = viewingHistory ? tour.history[tour.reviewIndex!] ?? step : step;
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const width = Math.min(cardSize.width, viewportWidth - 32);
  const height = Math.min(cardSize.height, viewportHeight * 0.65);
  let left = 16;
  let top = viewportHeight - height - 16;
  if (rect && rect.bottom > 0 && rect.top < viewportHeight) {
    if (viewportWidth - rect.right > width + 32) { left = rect.right + 16; top = rect.top; }
    else if (rect.left > width + 32) { left = rect.left - width - 16; top = rect.top; }
    else if (rect.top > height + 32) { left = rect.left; top = rect.top - height - 16; }
    else if (viewportHeight - rect.bottom > height + 32) { left = rect.left; top = rect.bottom + 16; }
  }
  // In a stacked layout, a card just above the controls can cover the garden.
  // Prefer free space outside the canvas so real hex taps remain available.
  const board = document.querySelector('.board-canvas')?.getBoundingClientRect();
  if (board && left < board.right && left + width > board.left && top < board.bottom && top + height > board.top) {
    if (viewportHeight - board.bottom > height + 32) top = board.bottom + 16;
    else if (board.top > height + 32) top = board.top - height - 16;
  }
  left = Math.max(16, Math.min(left, viewportWidth - width - 16));
  top = Math.max(16, Math.min(top, viewportHeight - height - 16));
  return <>
    {rect && <div aria-hidden="true" className="tutorial-spotlight" style={{ left: rect.left - 4, top: rect.top - 4, width: rect.width + 8, height: rect.height + 8 }} />}
    <aside ref={cardRef} className="tutorial-card" style={{ left, top, bottom: 'auto' }} aria-label="Guided tutorial" onKeyDown={e => { if (e.key === 'Escape') tour.skip(); }}>
      <div className="tutorial-caption"><span>YOUR COLONY GUIDE {viewingHistory ? '· REVIEW' : ''}</span><button type="button" onClick={tour.skip}>Skip Tutorial</button></div>
      <div aria-live="polite" aria-atomic="true"><h2>{shown.title}</h2><p>{shown.body}</p><p className="tutorial-instruction">{shown.instruction}</p></div>
      <div className="tutorial-navigation">
        <button type="button" className="secondary-button" disabled={tour.history.length < 2 || tour.reviewIndex === 0} onClick={() => useTutorialStore.setState({ reviewIndex: (tour.reviewIndex ?? tour.history.length - 1) - 1 })}>Back</button>
        {viewingHistory ? <button type="button" className="primary-button" onClick={() => useTutorialStore.setState({ reviewIndex: null })}>Return to current step</button>
          : <button type="button" className="primary-button" onClick={() => {
            if (step.id === 'complete' || step.id === 'outcome') tour.skip();
            else if (step.acknowledge) tour.acknowledge(step.id);
            else document.querySelector<HTMLElement>(step.target)?.scrollIntoView({ block: 'center', behavior: 'instant' });
          }}>{step.id === 'complete' || step.id === 'outcome' ? 'Continue Playing' : step.acknowledge ? 'Next' : 'Show me where'}</button>}
      </div>
    </aside>
  </>;
}
