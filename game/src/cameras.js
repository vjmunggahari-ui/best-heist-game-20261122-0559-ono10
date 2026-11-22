// Velvet Vault — the security cameras.
// One job: sweep a cone across the floor and raise the alarm while the
// thief is caught in it. Cameras never sleep; only smoke blinds them.

import { TILE, TUNE, HUD_H } from './config.js';
import { canSee } from './vision.js';

export function createCamera(def) {
  return {
    x: def.x * TILE + TILE / 2,
    y: HUD_H + def.y * TILE + TILE / 2,
    baseAngle: def.baseAngle,
    sweep: def.sweep,
    speed: def.speed,
    angle: def.baseAngle,
    hot: false, // seeing the thief right now
    phase: Math.random() * Math.PI * 2,
  };
}

export function updateCamera(cam, dt, time, ctx) {
  const { player, alarm, world } = ctx;
  cam.angle = cam.baseAngle + Math.sin(time * cam.speed + cam.phase) * cam.sweep;
  const range = player.hidden ? TUNE.cameraRange * 0.4 : TUNE.cameraRange;
  cam.hot = canSee(world, cam.x, cam.y, cam.angle, TUNE.cameraFov, range, player.x, player.y);
  if (cam.hot) {
    alarm.seen(dt, TUNE.cameraAlarmRate);
  }
}
