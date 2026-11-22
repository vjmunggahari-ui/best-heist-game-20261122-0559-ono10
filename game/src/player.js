// Velvet Vault — the thief.
// One job: move Wren through the floor, make noise, toss coins, drop smoke
// and pick the vault lock. Everything the player does lives here.

import { TILE, TUNE, HUD_H } from './config.js';

const RADIUS = 13;

export function createPlayer(startX, startY) {
  const p = {
    x: startX,
    y: startY,
    radius: RADIUS,
    faceX: 1,
    faceY: 0,
    moving: false,
    sprinting: false,
    sneaking: false,
    noise: 0,
    stepTimer: 0,
    stepped: false,
    coins: TUNE.coinCount,
    smoke: TUNE.smokeCount,
    lockProgress: 0,
    lockTicked: false,
    inShadow: false,
    hidden: false, // inside smoke or deep shadow while still
  };

  function solidAt(world, px, py) {
    const tx = Math.floor(px / TILE);
    const ty = Math.floor((py - HUD_H) / TILE);
    return world.isSolid(tx, ty);
  }

  // Circle-vs-tile movement, one axis at a time so the thief slides
  // along walls instead of sticking to them.
  function tryMove(world, dx, dy) {
    const nx = p.x + dx;
    if (!solidAt(world, nx + Math.sign(dx) * RADIUS, p.y - RADIUS + 2)
      && !solidAt(world, nx + Math.sign(dx) * RADIUS, p.y + RADIUS - 2)
      && !solidAt(world, nx + Math.sign(dx) * RADIUS, p.y)) {
      p.x = nx;
    }
    const ny = p.y + dy;
    if (!solidAt(world, p.x - RADIUS + 2, ny + Math.sign(dy) * RADIUS)
      && !solidAt(world, p.x + RADIUS - 2, ny + Math.sign(dy) * RADIUS)
      && !solidAt(world, p.x, ny + Math.sign(dy) * RADIUS)) {
      p.y = ny;
    }
  }

  p.update = function update(dt, input, world) {
    let ix = 0;
    let iy = 0;
    if (input.down('w', 'ArrowUp')) iy -= 1;
    if (input.down('s', 'ArrowDown')) iy += 1;
    if (input.down('a', 'ArrowLeft')) ix -= 1;
    if (input.down('d', 'ArrowRight')) ix += 1;
    const len = Math.hypot(ix, iy) || 1;
    ix /= len;
    iy /= len;

    p.sneaking = input.down('c', 'Control');
    p.sprinting = input.down('Shift') && !p.sneaking && (ix !== 0 || iy !== 0);
    const speed = p.sneaking ? TUNE.thiefSneak : p.sprinting ? TUNE.thiefSprint : TUNE.thiefWalk;
    p.moving = ix !== 0 || iy !== 0;
    if (p.moving) {
      p.faceX = ix;
      p.faceY = iy;
      tryMove(world, ix * speed * dt, iy * speed * dt);
      p.stepTimer -= dt;
      if (p.stepTimer <= 0) {
        p.stepTimer = p.sprinting ? 0.26 : 0.38;
        p.stepped = true;
      } else {
        p.stepped = false;
      }
    } else {
      p.stepped = false;
    }

    p.noise = !p.moving ? 0 : p.sneaking ? TUNE.noiseSneak : p.sprinting ? TUNE.noiseSprint : TUNE.noiseWalk;
    p.inShadow = world.isShadow(p.x, p.y);
    p.hidden = p.inShadow && !p.moving;

    // Lockpick: hold E beside the vault door.
    const door = world.vaultDoor;
    if (door && !door.open && input.down('e')) {
      const d = Math.hypot(p.x - door.x, p.y - door.y);
      if (d < 62) {
        const before = p.lockProgress;
        p.lockProgress = Math.min(1, p.lockProgress + dt / TUNE.lockpickSeconds);
        if (Math.floor(p.lockProgress * 8) !== Math.floor(before * 8)) p.lockTicked = true;
        if (p.lockProgress >= 1) {
          door.open = true;
          world.onVaultOpened();
        }
      } else {
        p.lockProgress = Math.max(0, p.lockProgress - dt * 2);
      }
    } else {
      p.lockProgress = Math.max(0, p.lockProgress - dt * 2);
    }

    // Tools: 1 or a mouse click tosses a coin toward the cursor,
    // 2 drops a smoke bomb at the thief's feet.
    if (input.wasPressed('1') && p.coins > 0) {
      const m = input.mouse();
      world.tossCoin(m.x, m.y);
      p.coins--;
    }
    const click = input.consumeClick();
    if (click && p.coins > 0) {
      world.tossCoin(click.x, click.y);
      p.coins--;
    }
    if (input.wasPressed('2') && p.smoke > 0) {
      world.dropSmoke(p.x, p.y);
      p.smoke--;
    }
  };

  return p;
}
