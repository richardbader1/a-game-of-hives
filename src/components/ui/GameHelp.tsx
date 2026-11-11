import { WINNING_SCORE } from '../../game/config/gameSettings';
import { PRODUCTS, recipeText } from '../../game/data/products';

export function GameHelp() {
  return <details className="game-help">
    <summary>How to play</summary>
    <p>Work together. Hold {WINNING_SCORE} points at the end of a turn to save the queen. You lose as soon as no healthy hives remain.</p>
    <ol>
      <li>Roll and resolve the event. A six gives a free garden tile before your actions.</li>
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
  </details>;
}
