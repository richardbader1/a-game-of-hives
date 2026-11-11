import { lazy, Suspense, useEffect } from 'react';
import { CharacterPlacement } from '../components/setup/CharacterPlacement';
import { GardenBuilder } from '../components/setup/GardenBuilder';
import { HivePlacement } from '../components/setup/HivePlacement';
import { GameHUD } from '../components/ui/GameHUD';
import type { CharacterType } from '../game/types';
import { legalGardenPositions, movementDestinations, remainingTileSupply } from '../game/engine/gameEngine';
import { useGameStore } from '../store/gameStore';
import { PlayerSetup } from '../components/setup/PlayerSetup';

const IsometricBoard = lazy(() =>
  import('../components/scene/IsometricBoard').then((module) => ({ default: module.IsometricBoard })),
);

const setupSteps = [
  { phase: 'playerSetup', label: 'Team' },
  { phase: 'gardenSetup', label: 'Garden' },
  { phase: 'hiveSetup', label: 'Hives' },
  { phase: 'characterSetup', label: 'Characters' },
];

export function App() {
  const phase = useGameStore((state) => state.phase);
  const tiles = useGameStore((state) => state.tiles);
  const hives = useGameStore((state) => state.hives);
  const beeTileId = useGameStore((state) => state.beeTileId);
  const beekeeperTileId = useGameStore((state) => state.beekeeperTileId);
  const activeCharacter = useGameStore((state) => state.activeCharacter);
  const selectedResource = useGameStore((state) => state.selectedResource);
  const selectedAction = useGameStore((state) => state.selectedAction);
  const selectedTileId = useGameStore((state) => state.selectedTileId);
  const turnPhase = useGameStore((state) => state.turnPhase);
  const eventRestriction = useGameStore((state) => state.eventRestriction);
  const pendingHivePurchase = useGameStore((state) => state.pendingHivePurchase);
  const placeGardenTile = useGameStore((state) => state.placeGardenTile);
  const placeHive = useGameStore((state) => state.placeHive);
  const placeCharacter = useGameStore((state) => state.placeCharacter);
  const handleBoardTile = useGameStore((state) => state.handleBoardTile);
  const currentStep = setupSteps.findIndex((step) => step.phase === phase);
  const hiveTileIds = hives.map((hive) => hive.tileId);
  const gameSelectableTileIds =
    turnPhase === 'actions' && selectedAction === 'bee' && eventRestriction !== 'noBeeMove'
      ? movementDestinations(beeTileId, tiles, 'bee')
      : turnPhase === 'actions' && selectedAction === 'beekeeper'
      ? selectedTileId ? [] : movementDestinations(beekeeperTileId, tiles, 'beekeeper')
        : turnPhase === 'trading' && pendingHivePurchase
          ? tiles
              .filter((tile) => !tile.damaged && !hives.some((hive) => hive.tileId === tile.id))
              .map((tile) => tile.id)
          : [];
  const placementCoords =
    phase === 'ready' &&
    (turnPhase === 'eventPlacement' || (turnPhase === 'actions' && selectedAction === 'garden')) &&
    remainingTileSupply(tiles, selectedResource) > 0
      ? legalGardenPositions(tiles)
      : [];

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [phase]);

  function onCharacterTile(character: CharacterType, tileId: string) {
    placeCharacter(character, tileId);
  }

  if (phase === 'ready') {
    return (
      <main className="game-screen">
        <header className="topbar game-topbar">
          <a className="brand" href="#" aria-label="A Game of Hives home">
            <span className="brand-mark" aria-hidden="true">✿</span>
            <span>A Game <em>of</em> Hives</span>
          </a>
          <span className="topbar-note"><span className="status-dot" /> CO-OP GARDEN ADVENTURE</span>
        </header>
        <div className="game-layout">
          <div className="board-column game-board-column">
            <Suspense fallback={<div className="board-loading">Preparing your garden board…</div>}>
              <IsometricBoard
                phase={phase}
                tiles={tiles}
                hives={hives}
                beeTileId={beeTileId}
                beekeeperTileId={beekeeperTileId}
                activeCharacter={activeCharacter}
                selectedResource={selectedResource}
                onGardenTile={placeGardenTile}
                onHiveTile={placeHive}
                onCharacterTile={onCharacterTile}
                gameSelectableTileIds={gameSelectableTileIds}
                placementCoords={placementCoords}
                selectedTileId={selectedTileId}
                onGameTile={handleBoardTile}
              />
            </Suspense>
          </div>
          <GameHUD />
        </div>
      </main>
    );
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <a className="brand" href="#" aria-label="A Game of Hives home">
          <span className="brand-mark" aria-hidden="true">✿</span>
          <span>A Game <em>of</em> Hives</span>
        </a>
        <div className="topbar-note"><span className="status-dot" /> CO-OP GARDEN ADVENTURE</div>
      </header>

      <div className="page-content">
        {phase === 'playerSetup' ? (
          <div className="welcome-layout">
            <div className="welcome-art" aria-hidden="true">
              <div className="sun-disc" />
              <div className="flower flower-one">✿</div>
              <div className="flower flower-two">✿</div>
              <div className="welcome-bee">🐝</div>
              <div className="welcome-caption">A little teamwork<br />goes a long way.</div>
            </div>
            <PlayerSetup />
          </div>
        ) : (
          <div className="setup-layout">
            <div className="setup-main">
              <div className="stepper" aria-label="Setup progress">
                {setupSteps.map((step, index) => {
                  const isComplete = currentStep > index;
                  const isCurrent = currentStep === index;
                  return (
                    <div className={`step ${isCurrent ? 'current' : ''} ${isComplete ? 'complete' : ''}`} key={step.phase}>
                      <span className="step-mark">{isComplete ? '✓' : `0${index + 1}`}</span>
                      <span>{step.label}</span>
                    </div>
                  );
                })}
              </div>

              <div className="board-heading">
                <div>
                  <div className="eyebrow"><span className="eyebrow-dot" /> {phase === 'gardenSetup' ? 'POLLINATOR PRESERVE' : 'YOUR SHARED GARDEN'}</div>
                  <h2>{phase === 'gardenSetup' ? 'Shape the landscape' : 'A home for the hive'}</h2>
                </div>
                {phase !== 'gardenSetup' && (
                  <span className="board-count">{tiles.length} tiles · {hiveTileIds.length} hives</span>
                )}
              </div>
              <Suspense fallback={<div className="board-loading">Preparing your garden board…</div>}>
                <IsometricBoard
                  phase={phase}
                  tiles={tiles}
                  hives={hives}
                  beeTileId={beeTileId}
                  beekeeperTileId={beekeeperTileId}
                  activeCharacter={activeCharacter}
                  selectedResource={selectedResource}
                  onGardenTile={placeGardenTile}
                  onHiveTile={placeHive}
                  onCharacterTile={onCharacterTile}
                />
              </Suspense>
              <div className="board-legend" aria-label="Garden tile legend">
                <span><i className="legend-dot pollen" /> Pollen</span>
                <span><i className="legend-dot nectar" /> Nectar</span>
                <span><i className="legend-dot water" /> Water</span>
                {phase === 'hiveSetup' && <span><i className="legend-hive">⌂</i> Hive</span>}
                {phase === 'characterSetup' && <span><i className="legend-bee">●</i> Bee &amp; beekeeper</span>}
              </div>
              <p className="touch-hint"><span aria-hidden="true">✦</span> {phase === 'gardenSetup' ? 'Tap a highlighted space to place a tile' : 'Tap a highlighted tile to place your piece'}</p>
            </div>

            {phase === 'gardenSetup' && <GardenBuilder />}
            {phase === 'hiveSetup' && <HivePlacement />}
            {phase === 'characterSetup' && <CharacterPlacement />}
          </div>
        )}
      </div>

      <footer className="site-footer">
        <span>Made for curious minds &amp; happy pollinators</span>
        <span>Every little garden makes a difference <span aria-hidden="true">✿</span></span>
      </footer>
    </main>
  );
}
