export type ResourceType = 'pollen' | 'nectar' | 'water';
export type GamePhase =
  | 'playerSetup'
  | 'gardenSetup'
  | 'hiveSetup'
  | 'characterSetup'
  | 'ready';
export type CharacterType = 'bee' | 'beekeeper';
export type TurnPhase = 'roll' | 'eventPlacement' | 'actions' | 'trading' | 'ended';
export type ActionCategory = 'bee' | 'beekeeper' | 'garden';
export type EnvironmentalEvent =
  | 'varroa'
  | 'climate'
  | 'pesticides'
  | 'movementRestriction'
  | 'extremeWeatherDamage'
  | 'garden';
export type GameOutcome = 'won' | 'lost' | null;
export type ImprovementType = 'smartHive' | 'wildlifeReserve' | 'noSprayZone';

export interface Inventory {
  pollen: number;
  nectar: number;
  water: number;
  honey: number;
  beeBread: number;
}

export interface Player {
  id: string;
  name: string;
}

export interface HexCoord {
  q: number;
  r: number;
}

export interface GardenTile extends HexCoord {
  id: string;
  resource: ResourceType;
  damaged?: boolean;
  wildlifeReserve?: boolean;
  noSprayZone?: boolean;
}

export interface Hive {
  id: string;
  tileId: string;
  damaged: boolean;
  smartHive: boolean;
}

export interface GameSnapshot {
  phase: GamePhase;
  players: Player[];
  startingPlayerIndex: number;
  tiles: GardenTile[];
  hives: Hive[];
  beeTileId: string | null;
  beekeeperTileId: string | null;
  activeCharacter: CharacterType;
  selectedResource: ResourceType;
  message: string;
  error: string | null;
  turnPhase: TurnPhase;
  currentPlayerIndex: number;
  roundNumber: number;
  actionCategoriesUsed: ActionCategory[];
  selectedAction: ActionCategory | null;
  selectedTileId: string | null;
  inventory: Inventory;
  dieResult: number | null;
  currentEvent: EnvironmentalEvent | null;
  eventRestriction: 'waterOnly' | 'noBeeMove' | null;
  pendingHivePurchase: boolean;
  outcome: GameOutcome;
  eventLog: string[];
  lastCollected: { resource: ResourceType; amount: number } | null;
}

export interface SetupValidation {
  valid: boolean;
  errors: string[];
}
