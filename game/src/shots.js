// Velvet Vault — deterministic screenshot staging.
// One job: given a loaded level, pose it for a screenshot (?shot=...).
// The poses are real game states rendered by the game's own code: the
// thief, the guards, the cones, the loot and the alarm meter, mid-heist.

import { TILE, HUD_H } from './config.js';

function tileCenter(tx, ty) {
  return { x: tx * TILE + TILE / 2, y: HUD_H + ty * TILE + TILE / 2 };
}

function placeGuard(state, index, tx, ty, angle, suspicion) {
  const g = state.guards[index];
  if (!g) return;
  const p = tileCenter(tx, ty);
  g.x = p.x;
  g.y = p.y;
  g.angle = angle;
  g.suspicion = suspicion;
  g.mode = 'patrol';
  g.path = [];
  g.pauseTimer = 99; // hold the pose
}

function takeLoot(state, kinds) {
  for (const item of state.loot) {
    if (kinds.includes(item.kind)) item.taken = true;
  }
}

// Poses the game for one of the four screenshots. Returns true when a
// known shot was applied; the game then freezes updates so the frame
// stays exactly as posed while the render loop keeps animating.
export function applyShot(state, name) {
  if (name === 'start') {
    state.screen = 'title';
    return true;
  }
  if (name === 'play') {
    // Floor 1, mid-sneak: Wren closing on the Golden Idol while a guard's
    // cone sweeps across the gallery and the camera watches from above.
    state.screen = 'playing';
    const p = tileCenter(20, 4);
    state.player.x = p.x;
    state.player.y = p.y;
    state.player.faceX = 0.6;
    state.player.faceY = -0.8;
    placeGuard(state, 0, 17, 3, 0.35, 48);
    placeGuard(state, 1, 24, 13, -2.2, 0);
    state.alarm.add(35);
    takeLoot(state, ['gold']);
    state.loot.find((i) => i.kind === 'painting').taken = true;
    state.message = 'The Idol is just ahead — mind the patrol';
    state.messageTimer = 999;
    state.shotFreeze = true;
    return true;
  }
  if (name === 'vault') {
    // Floor 2, at the vault door: lockpick halfway, alarm warm, a guard
    // closing in on the Meridian Star's glow.
    state.screen = 'playing';
    const p = tileCenter(16, 3);
    state.player.x = p.x;
    state.player.y = p.y;
    state.player.faceX = 0;
    state.player.faceY = 1;
    state.player.lockProgress = 0.6;
    placeGuard(state, 0, 8, 12, -0.5, 20);
    placeGuard(state, 1, 20, 2, Math.PI, 55);
    placeGuard(state, 2, 3, 8, 0.9, 0);
    state.alarm.add(55);
    takeLoot(state, ['gold']);
    state.message = 'Picking the vault… keep the patrols off you';
    state.messageTimer = 999;
    state.shotFreeze = true;
    return true;
  }
  if (name === 'escape') {
    // Floor 3, the getaway: paintings secured, alarm hot, Wren sprinting
    // for the van while the patrols converge.
    state.screen = 'playing';
    const p = tileCenter(18, 3);
    state.player.x = p.x;
    state.player.y = p.y;
    state.player.faceX = 0.4;
    state.player.faceY = -0.9;
    state.player.sprinting = true;
    state.player.moving = true;
    placeGuard(state, 0, 12, 10, -1.4, 70);
    placeGuard(state, 1, 24, 6, Math.PI, 40);
    placeGuard(state, 2, 16, 9, -1.2, 85);
    state.alarm.add(55); // floor 3 starts at 25 heat; 25 + 55 = 80 on the meter
    takeLoot(state, ['painting']);
    state.message = 'GO! GO! GO! — the van is waiting';
    state.messageTimer = 999;
    state.shotFreeze = true;
    return true;
  }
  return false;
}
