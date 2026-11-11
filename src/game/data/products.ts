import type { Inventory } from '../types';

export const PRODUCTS = {
  honey: { label: 'Honey', icon: '🍯', cost: { pollen: 1, nectar: 1, water: 1 }, points: 1 },
  beeBread: { label: 'Bee bread', icon: '🍞', cost: { pollen: 2, nectar: 3 }, points: 2 },
  hive: { label: 'Hive', icon: '⌂', cost: { honey: 2, beeBread: 3 }, points: 0 },
} as const;

export type ProductType = keyof typeof PRODUCTS;
export function ingredients(product: ProductType): Array<[keyof Inventory, number]> {
  return Object.entries(PRODUCTS[product].cost) as Array<[keyof Inventory, number]>;
}

export function canAfford(inventory: Inventory, product: ProductType): boolean {
  return ingredients(product).every(([key, amount]) => inventory[key] >= amount);
}

export function spendIngredients(inventory: Inventory, product: ProductType): Inventory {
  const next = { ...inventory };
  for (const [key, amount] of ingredients(product)) next[key] -= amount;
  return next;
}

export function recipeText(product: ProductType): string {
  return ingredients(product).map(([key, amount]) =>
    `${amount} ${key === 'beeBread' ? 'bee bread' : key}`).join(' + ');
}

export function missingIngredients(inventory: Inventory, product: ProductType): string {
  const missing = ingredients(product).filter(([key, amount]) => inventory[key] < amount)
    .map(([key, amount]) => `${amount - inventory[key]} ${key === 'beeBread' ? 'bee bread' : key}`);
  return missing.length ? `Still need ${missing.join(', ')}.` : 'Ready to make.';
}
