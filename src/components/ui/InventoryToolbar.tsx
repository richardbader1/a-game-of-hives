import { useShallow } from 'zustand/react/shallow';
import { useEffect, useRef, useState } from 'react';
import { HIVE_SUPPLY, RESOURCE_PRESENTATION, WINNING_SCORE } from '../../game/config/gameSettings';
import { canPurchase, legalHivePurchaseTiles, scoreInventory } from '../../game/engine/gameEngine';
import { PRODUCTS, canAfford, ingredients, missingIngredients, type ProductType } from '../../game/data/products';
import type { ResourceType } from '../../game/types';
import { useGameStore } from '../../store/gameStore';

export function InventoryToolbar() {
  const state = useGameStore(useShallow(s => ({
    inventory: s.inventory, tiles: s.tiles, hives: s.hives, turnPhase: s.turnPhase,
    pendingHivePurchase: s.pendingHivePurchase, trade: s.trade, beginHivePurchase: s.beginHivePurchase,
    cancelHivePurchase: s.cancelHivePurchase, finishTurn: s.finishTurn,
  })));
  const { inventory, hives, turnPhase, pendingHivePurchase } = state;
  const score = scoreInventory(inventory);
  const hiveCanBePlaced = legalHivePurchaseTiles(state).length > 0;
  const [openRecipe, setOpenRecipe] = useState<ProductType | null>(null);
  const recipePointerActivation = useRef(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout>>();
  useEffect(() => () => clearTimeout(closeTimer.current), []);
  useEffect(() => {
    if (!openRecipe) return;
    const key = (event: KeyboardEvent) => { if (event.key === 'Escape') setOpenRecipe(null); };
    const outside = (event: PointerEvent) => {
      if (event.target instanceof Element && !event.target.closest('.recipe-item')) setOpenRecipe(null);
    };
    document.addEventListener('keydown', key);
    document.addEventListener('pointerdown', outside);
    return () => { document.removeEventListener('keydown', key); document.removeEventListener('pointerdown', outside); };
  }, [openRecipe]);
  return (
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
      {(Object.keys(PRODUCTS) as ProductType[]).map((key) => {
        const product = { ...PRODUCTS[key], key,
          label: key === 'hive' ? 'Hives available' : PRODUCTS[key].label,
          quantity: key === 'hive' ? HIVE_SUPPLY - hives.length : inventory[key],
          recipe: ingredients(key),
        };
        const affordable = canPurchase(state, product.key);
        const trading = turnPhase === 'trading';
        const missing = product.key === 'honey'
          ? missingIngredients(inventory, 'honey')
          : product.key === 'beeBread'
            ? missingIngredients(inventory, 'beeBread')
            : state.hives.length >= HIVE_SUPPLY
              ? 'All hive pieces are in play.'
              : !hiveCanBePlaced
                ? 'No healthy empty tile is available.'
                : !canAfford(inventory, 'hive')
                  ? missingIngredients(inventory, 'hive')
                  : 'Ready to place on a healthy empty garden tile.';
        return (
          <div
            className="recipe-item"
            key={product.key}
            onMouseEnter={() => { clearTimeout(closeTimer.current); setOpenRecipe(product.key); }}
            onMouseLeave={(event) => {
              if (
                openRecipe === product.key &&
                !event.currentTarget.contains(document.activeElement)
              ) closeTimer.current = setTimeout(() => setOpenRecipe(null), 180);
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
                    onClick={() => { if (product.key !== 'hive') state.trade(product.key); }}
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
  );
}
