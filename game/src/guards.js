// Velvet Vault — the guards.
// One job: patrol the floor, watch with a vision cone, get suspicious,
// chase what they spot, and investigate noises they hear.

import { TILE, TUNE, HUD_H } from './config.js';
import { findPath } from './levels.js';
import { canSee } from './vision.js';

export function createGuard(def, level) {
  const start = def.waypoints[0];
  const g = {
    x: start[0] * TILE + TILE / 2,
    y: HUD_H + start[1] * TILE + TILE / 2,
    angle: 0,
    waypoints: def.waypoints,
    waypointIndex: 1,
    pause: def.pause || 1,
    pauseTimer: 0,
    path: [],
    pathIndex: 0,
    suspicion: 0,
    mode: 'patrol', // patrol | investigate | chase | return
    chaseTimer: 0,
    investigateX: 0,
    investigateY: 0,
    repathTimer: 0,
    lastSeenX: 0,
    lastSeenY: 0,
    alerted: false, // already raised the alarm for this sighting
    tx: start[0],
    ty: start[1],
  };
  return g;
}

function tileOf(g) {
  return {
    tx: Math.floor(g.x / TILE),
    ty: Math.floor((g.y - HUD_H) / TILE),
  };
}

function setPath(g, level, toX, toY, vaultOpen) {
  const { tx, ty } = tileOf(g);
  g.path = findPath(level, tx, ty, toX, toY, vaultOpen);
  g.pathIndex = 0;
}

function followPath(g, dt, speed) {
  if (g.pathIndex >= g.path.length) return true;
  const [tx, ty] = g.path[g.pathIndex];
  const px = tx * TILE + TILE / 2;
  const py = HUD_H + ty * TILE + TILE / 2;
  const dx = px - g.x;
  const dy = py - g.y;
  const dist = Math.hypot(dx, dy);
  if (dist < 3) {
    g.pathIndex++;
    return g.pathIndex >= g.path.length;
  }
  g.angle = Math.atan2(dy, dx);
  const step = Math.min(dist, speed * dt);
  g.x += (dx / dist) * step;
  g.y += (dy / dist) * step;
  return false;
}

export function updateGuard(g, dt, level, ctx) {
  const { player, alarm, audio, world } = ctx;
  const vaultOpen = world.vaultOpen;

  // --- Vision: does the guard see the thief right now? ---
  const range = player.hidden ? TUNE.guardRange * 0.45 : TUNE.guardRange;
  const sees = canSee(world, g.x, g.y, g.angle, TUNE.guardFov, range, player.x, player.y);
  g.sees = sees;
  if (sees) {
    const dist = Math.hypot(player.x - g.x, player.y - g.y);
    const rate = dist < range * 0.55 ? TUNE.guardSuspectRate : TUNE.guardSuspectFar;
    g.suspicion = Math.min(100, g.suspicion + rate * dt);
    g.lastSeenX = player.x;
    g.lastSeenY = player.y;
    if (g.suspicion > 55 && !g.warned) {
      g.warned = true;
      audio.spotted();
    }
    if (g.suspicion >= 100 && !g.alerted) {
      g.alerted = true;
      alarm.add(TUNE.guardAlertAlarm);
      g.mode = 'chase';
      g.chaseTimer = 3.0;
      setPath(g, level, Math.floor(player.x / TILE), Math.floor((player.y - HUD_H) / TILE), vaultOpen);
    }
  } else {
    g.suspicion = Math.max(0, g.suspicion - TUNE.guardDecay * dt);
    if (g.suspicion < 30) {
      g.alerted = false;
      g.warned = false;
    }
  }

  // --- Hearing: a loud move or a tossed coin pulls the guard over. ---
  if (g.mode === 'patrol' && player.noise > 0) {
    const dist = Math.hypot(player.x - g.x, player.y - g.y);
    if (dist < TUNE.hearRadius + player.noise * 1.4) {
      g.mode = 'investigate';
      g.investigateX = player.x;
      g.investigateY = player.y;
      setPath(g, level, Math.floor(player.x / TILE), Math.floor((player.y - HUD_H) / TILE), vaultOpen);
    }
  }
  if (ctx.coinEvent && g.mode === 'patrol') {
    const dist = Math.hypot(ctx.coinEvent.x - g.x, ctx.coinEvent.y - g.y);
    if (dist < TUNE.hearRadius + 60) {
      g.mode = 'investigate';
      g.investigateX = ctx.coinEvent.x;
      g.investigateY = ctx.coinEvent.y;
      setPath(g, level, Math.floor(ctx.coinEvent.x / TILE), Math.floor((ctx.coinEvent.y - HUD_H) / TILE), vaultOpen);
    }
  }

  // --- Movement by mode. ---
  if (g.mode === 'chase') {
    g.chaseTimer -= dt;
    g.repathTimer -= dt;
    if (g.repathTimer <= 0) {
      g.repathTimer = 0.5;
      setPath(g, level, Math.floor(player.x / TILE), Math.floor((player.y - HUD_H) / TILE), vaultOpen);
    }
    const arrived = followPath(g, dt, TUNE.guardChase);
    if (g.chaseTimer <= 0 || (arrived && !sees)) {
      g.mode = 'investigate';
      g.investigateX = g.lastSeenX;
      g.investigateY = g.lastSeenY;
      setPath(g, level, Math.floor(g.lastSeenX / TILE), Math.floor((g.lastSeenY - HUD_H) / TILE), vaultOpen);
    }
  } else if (g.mode === 'investigate') {
    const arrived = followPath(g, dt, TUNE.guardWalk * 1.35);
    if (arrived) {
      g.mode = 'return';
      const wp = g.waypoints[g.waypointIndex];
      setPath(g, level, wp[0], wp[1], vaultOpen);
    }
  } else if (g.mode === 'return') {
    const arrived = followPath(g, dt, TUNE.guardWalk);
    if (arrived) g.mode = 'patrol';
  } else if (g.mode === 'patrol') {
    if (g.pauseTimer > 0) {
      g.pauseTimer -= dt;
      // Look around while waiting at a waypoint.
      g.angle += Math.sin(ctx.time * 1.4 + g.x) * 0.012;
    } else {
      const wp = g.waypoints[g.waypointIndex];
      if (g.path.length === 0) {
        setPath(g, level, wp[0], wp[1], vaultOpen);
      }
      const arrived = followPath(g, dt, TUNE.guardWalk);
      if (arrived) {
        g.path = [];
        g.waypointIndex = (g.waypointIndex + 1) % g.waypoints.length;
        g.pauseTimer = g.pause;
      }
    }
  }
}
