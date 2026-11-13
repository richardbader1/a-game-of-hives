/** A bounded, deterministic throw. Visual motion never draws a new game result. */
export function tabletopPose(progress: number, width: number, height: number, dieSize: number) {
  const t = Math.max(0, Math.min(1, progress));
  const travel = 1 - (1 - t) ** 2.2;
  const margin = dieSize * 0.95;
  const halfRun = Math.max(0, width / 2 - margin);
  const x = -halfRun + 2 * halfRun * travel;
  const groundY = height * (0.1 - 0.2 * travel);
  // Successively smaller hops, with a short final rock into the settled face.
  const bounce = Math.abs(Math.sin(t * Math.PI * 5)) * (1 - t) ** 2 * dieSize * 0.65;
  const wobble = Math.sin(t * Math.PI * 10) * (1 - t) ** 2 * 0.14;
  return { x, groundY, y: groundY + bounce, bounce, wobble };
}
