import { WINNING_SCORE } from '../../game/config/gameSettings';
import { PRODUCTS, recipeText } from '../../game/data/products';
import { useTutorialStore } from '../../store/tutorialStore';
import { useGameStore } from '../../store/gameStore';
import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

export function HelpButton() {
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const id = useId();
  function close() {
    setOpen(false);
    requestAnimationFrame(() => trigger.current?.focus({ preventScroll: true }));
  }
  return <>
    <button ref={trigger} type="button" className="secondary-button header-help" aria-haspopup="dialog" aria-expanded={open} aria-controls={open ? id : undefined} onClick={() => setOpen(true)}>Help</button>
    {open && <GameHelp id={id} onClose={close} />}
  </>;
}

export function GameHelp({ id, onClose }: { id: string; onClose: () => void }) {
  const phase = useGameStore(s => s.phase);
  const turnPhase = useGameStore(s => s.turnPhase);
  const dialog = useRef<HTMLDialogElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const node = dialog.current;
    node?.showModal();
    closeButton.current?.focus({ preventScroll: true });
    return () => { if (node?.open) node.close(); };
  }, []);
  return createPortal(<dialog ref={dialog} id={id} className="game-help game-help-popup" aria-labelledby={`${id}-title`} onCancel={event => { event.preventDefault(); onClose(); }}>
    <div className="game-help-popup-heading">
      <h2 id={`${id}-title`}>Help &amp; Instructions</h2>
      <button ref={closeButton} type="button" className="secondary-button" aria-label="Close Help" onClick={onClose}>×</button>
    </div>
    <div className="game-help-popup-body">
    <p><strong>Current stage:</strong> {phase === 'ready' ? turnPhase === 'eventPlacement' ? 'Place the free event tile, then take two actions.' : turnPhase === 'actions' ? 'Choose two different action categories, then trade.' : turnPhase === 'trading' ? 'Make affordable trades, then finish the turn.' : turnPhase === 'ended' ? 'Game over. Discuss your strategy and play again.' : 'Roll the die to begin this turn.' : 'Set up your team, five connected resource tiles, four hives and both characters.'}</p>
    <button type="button" className="secondary-button" onClick={() => { onClose(); useTutorialStore.getState().start(); }}>Restart guided tutorial here</button>
    <p>Work together. Hold {WINNING_SCORE} points at the end of a turn to save the queen. You lose as soon as no healthy hives remain.</p>
    <ol>
      <li>Roll and resolve the event. Both Improvement faces give a free garden tile before your actions.</li>
      <li>Choose two different actions: bee, beekeeper, or garden.</li>
      <li>Make any affordable trades, then finish the turn.</li>
    </ol>
    <p>The bee moves in a straight line over healthy tiles and collects on landing: one resource, or two at a healthy hive.</p>
    <p>The beekeeper moves in a straight line, including damaged tiles, then repairs or adds one protection for free. It can act in place.</p>
    <p>Smart hives block Varroa; reserves prevent tile removal; no-spray zones allow normal collection during pesticides.</p>
    <ul>{(Object.keys(PRODUCTS) as Array<keyof typeof PRODUCTS>).map(key =>
      <li key={key}>{PRODUCTS[key].label}: {recipeText(key)}; {PRODUCTS[key].points} held points.</li>)}</ul>
    <p>Choose a highlighted tile with mouse or touch, or use Board controls. Drag to pan, scroll or pinch to zoom, and use Reset view to fit the garden.</p>
    <p>Started games save on this browser and device. Reload to see Resume. Setup is not saved.</p>
    </div>
  </dialog>, document.body);
}
