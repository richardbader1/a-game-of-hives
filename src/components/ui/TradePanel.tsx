import { useShallow } from 'zustand/react/shallow';
import { HIVE_SUPPLY } from '../../game/config/gameSettings';
import { canPurchase, legalHivePurchaseTiles, scoreInventory } from '../../game/engine/gameEngine';
import { canAfford, missingIngredients, recipeText } from '../../game/data/products';
import { useGameStore } from '../../store/gameStore';

export function TradePanel() {
  const state = useGameStore(useShallow(s => ({
    inventory: s.inventory, tiles: s.tiles, hives: s.hives, turnPhase: s.turnPhase,
    pendingHivePurchase: s.pendingHivePurchase, trade: s.trade, beginHivePurchase: s.beginHivePurchase,
    cancelHivePurchase: s.cancelHivePurchase, finishTurn: s.finishTurn,
  })));
  const { inventory, pendingHivePurchase } = state;
  const score = scoreInventory(inventory);
  const hiveCanBePlaced = legalHivePurchaseTiles(state).length > 0;
  const hiveCanBeBought = canPurchase(state, 'hive');
  return (
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
          <span>{recipeText('honey')}</span>
          <small>{missingIngredients(inventory, 'honey')}</small>
        </div>
        <div className="trade-option">
          <button type="button" className="secondary-button" disabled={pendingHivePurchase || !canPurchase(state, 'beeBread')} onClick={() => state.trade('beeBread')}>
            Make bee bread
          </button>
          <span>{recipeText('beeBread')}</span>
          <small>{missingIngredients(inventory, 'beeBread')}</small>
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
          <span>{recipeText('hive')}</span>
          <small>
            {pendingHivePurchase
              ? 'Tap a highlighted healthy tile without a hive to complete the trade.'
              : state.hives.length >= HIVE_SUPPLY
                ? 'All hive pieces are in play.'
                : !hiveCanBePlaced
                  ? 'No healthy empty tile is available.'
                  : !canAfford(inventory, 'hive')
                    ? missingIngredients(inventory, 'hive')
                    : 'Place the hive on a healthy empty tile.'}
          </small>
        </div>
      </div>
      {pendingHivePurchase && (
        <button type="button" className="secondary-button cancel-placement-button" onClick={state.cancelHivePurchase}>
          Cancel placement
        </button>
      )}
      <button type="button" className="primary-button full-width" disabled={pendingHivePurchase} onClick={state.finishTurn}>
        Finish trading &amp; turn <span aria-hidden="true">→</span>
      </button>
      <p className="helper-text">Score counts only honey and bee bread still held. Buying a hive lowers the score.</p>
    </div>
  );
}
