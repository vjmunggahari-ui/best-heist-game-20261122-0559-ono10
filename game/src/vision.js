// Velvet Vault — seeing: cones and line of sight.
// One job: answer "can this watcher see that point?" for guards and cameras.

import { TILE, HUD_H } from './config.js';

// True when the watcher at (x, y) facing `angle` can see the target:
// inside the field of view, inside range, and with no wall, crate or
// closed vault door between them. Smoke blocks sight too.
export function canSee(world, x, y, angle, fov, range, tx, ty) {
  const dx = tx - x;
  const dy = ty - y;
  const dist = Math.hypot(dx, dy);
  if (dist > range) return false;
  if (dist < 1) return true;
  let diff = Math.atan2(dy, dx) - angle;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  if (Math.abs(diff) > fov / 2) return false;
  return lineOfSight(world, x, y, tx, ty);
}

// Step along the segment in small hops; any solid tile blocks the view.
export function lineOfSight(world, x1, y1, x2, y2) {
  const dist = Math.hypot(x2 - x1, y2 - y1);
  const steps = Math.max(1, Math.ceil(dist / 8));
  for (let i = 1; i < steps; i++) {
    const t = i / steps;
    const px = x1 + (x2 - x1) * t;
    const py = y1 + (y2 - y1) * t;
    const tx = Math.floor(px / TILE);
    const ty = Math.floor((py - HUD_H) / TILE);
    if (world.isSolid(tx, ty)) return false;
    if (world.smokeAt(px, py)) return false;
  }
  return true;
}
