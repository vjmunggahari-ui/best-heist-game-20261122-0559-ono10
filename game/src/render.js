// Velvet Vault — everything the player sees.
// One job: draw the floor, the cones, the thief, the loot, the HUD and
// the title / caught / win screens on the canvas. No game logic lives here.

import { TILE, VIEW_W, VIEW_H, HUD_H, COLORS, TUNE } from './config.js';

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawCone(ctx, x, y, angle, fov, range, color) {
  const grad = ctx.createRadialGradient(x, y, 10, x, y, range);
  grad.addColorStop(0, color);
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.arc(x, y, range, angle - fov / 2, angle + fov / 2);
  ctx.closePath();
  ctx.fill();
}

function star(ctx, x, y, r, points, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  for (let i = 0; i < points * 2; i++) {
    const rad = i % 2 === 0 ? r : r * 0.45;
    const a = (i / (points * 2)) * Math.PI * 2 - Math.PI / 2;
    const px = x + Math.cos(a) * rad;
    const py = y + Math.sin(a) * rad;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();
}

function drawFloor(ctx, level, time) {
  for (let ty = 0; ty < 18; ty++) {
    for (let tx = 0; tx < 32; tx++) {
      const ch = level.map[ty][tx];
      const x = tx * TILE;
      const y = HUD_H + ty * TILE;
      ctx.fillStyle = (tx + ty) % 2 === 0 ? COLORS.floorLight : COLORS.floorDark;
      ctx.fillRect(x, y, TILE, TILE);
      if (ch === 's') {
        ctx.fillStyle = COLORS.shadowZone;
        ctx.fillRect(x, y, TILE, TILE);
      }
      ctx.strokeStyle = COLORS.floorTrim;
      ctx.lineWidth = 1;
      ctx.strokeRect(x + 0.5, y + 0.5, TILE - 1, TILE - 1);
    }
  }
}

function drawWallsAndCrates(ctx, level) {
  for (let ty = 0; ty < 18; ty++) {
    for (let tx = 0; tx < 32; tx++) {
      const ch = level.map[ty][tx];
      const x = tx * TILE;
      const y = HUD_H + ty * TILE;
      if (ch === '#') {
        ctx.fillStyle = COLORS.wall;
        ctx.fillRect(x, y, TILE, TILE);
        ctx.fillStyle = COLORS.wallTop;
        ctx.fillRect(x, y, TILE, 5);
        ctx.fillStyle = 'rgba(242,193,78,0.25)';
        ctx.fillRect(x, y + 5, TILE, 1);
      } else if (ch === 'C') {
        ctx.fillStyle = '#5a4026';
        ctx.fillRect(x + 3, y + 3, TILE - 6, TILE - 6);
        ctx.strokeStyle = '#8a6a3f';
        ctx.lineWidth = 2;
        ctx.strokeRect(x + 3, y + 3, TILE - 6, TILE - 6);
        ctx.beginPath();
        ctx.moveTo(x + 3, y + 3);
        ctx.lineTo(x + TILE - 3, y + TILE - 3);
        ctx.moveTo(x + TILE - 3, y + 3);
        ctx.lineTo(x + 3, y + TILE - 3);
        ctx.stroke();
      }
    }
  }
}

function drawVaultDoor(ctx, door, player, time) {
  if (!door) return;
  const x = door.tx * TILE;
  const y = HUD_H + door.ty * TILE;
  if (door.open) {
    ctx.fillStyle = '#0a0614';
    ctx.fillRect(x, y, TILE, TILE);
    ctx.fillStyle = 'rgba(242,193,78,0.5)';
    ctx.fillRect(x + 4, y, TILE - 8, TILE);
    ctx.fillStyle = COLORS.gold;
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('OPEN', x + TILE / 2, y + TILE / 2 + 4);
    return;
  }
  ctx.fillStyle = '#6d7686';
  ctx.fillRect(x + 2, y + 2, TILE - 4, TILE - 4);
  ctx.strokeStyle = '#3a4150';
  ctx.lineWidth = 2;
  ctx.strokeRect(x + 2, y + 2, TILE - 4, TILE - 4);
  ctx.fillStyle = '#2c3340';
  for (const [rx, ry] of [[8, 8], [TILE - 8, 8], [8, TILE - 8], [TILE - 8, TILE - 8]]) {
    ctx.beginPath();
    ctx.arc(x + rx, y + ry, 2.5, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = COLORS.gold;
  ctx.beginPath();
  ctx.arc(x + TILE / 2, y + TILE / 2, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#2c3340';
  ctx.beginPath();
  ctx.arc(x + TILE / 2, y + TILE / 2, 3, 0, Math.PI * 2);
  ctx.fill();
  if (player && player.lockProgress > 0) {
    ctx.strokeStyle = COLORS.gold;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(x + TILE / 2, y + TILE / 2, 15, -Math.PI / 2, -Math.PI / 2 + player.lockProgress * Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = COLORS.text;
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('PICKING…', x + TILE / 2, y + TILE + 14);
  } else {
    ctx.fillStyle = COLORS.textDim;
    ctx.font = 'bold 10px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('VAULT — HOLD E', x + TILE / 2, y + TILE + 14);
  }
}

function drawLoot(ctx, items, time) {
  for (const item of items) {
    if (item.taken) continue;
    const pulse = 0.75 + Math.sin(time * 3 + item.sparkle) * 0.25;
    ctx.save();
    ctx.globalAlpha = pulse;
    if (item.kind === 'gold') {
      ctx.fillStyle = COLORS.gold;
      ctx.fillRect(item.x - 10, item.y - 4, 20, 8);
      ctx.fillStyle = COLORS.goldDim;
      ctx.fillRect(item.x - 7, item.y - 9, 14, 5);
    } else if (item.kind === 'painting') {
      ctx.fillStyle = '#8a6a3f';
      ctx.fillRect(item.x - 13, item.y - 10, 26, 20);
      ctx.fillStyle = '#7ec8e3';
      ctx.fillRect(item.x - 10, item.y - 7, 20, 14);
      ctx.fillStyle = '#f2c14e';
      ctx.beginPath();
      ctx.arc(item.x + 4, item.y - 3, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#3f7d4e';
      ctx.fillRect(item.x - 10, item.y + 2, 20, 5);
    } else if (item.kind === 'idol') {
      ctx.fillStyle = COLORS.gold;
      ctx.beginPath();
      ctx.moveTo(item.x, item.y - 13);
      ctx.lineTo(item.x + 8, item.y + 8);
      ctx.lineTo(item.x - 8, item.y + 8);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.arc(item.x, item.y - 13, 5, 0, Math.PI * 2);
      ctx.fill();
    } else if (item.kind === 'star') {
      star(ctx, item.x, item.y, 15, 4, '#bfe9ff');
      star(ctx, item.x, item.y, 9, 4, '#ffffff');
    }
    ctx.restore();
    // Sparkle.
    if (Math.sin(time * 4 + item.sparkle) > 0.7) {
      star(ctx, item.x + 12, item.y - 10, 4, 4, 'rgba(255,255,255,0.9)');
    }
  }
}

function drawExit(ctx, level, time, targetDone) {
  let ex = 0;
  let ey = 0;
  level.map.forEach((row, ty) => {
    [...row].forEach((ch, tx) => {
      if (ch === 'E') {
        ex = tx;
        ey = ty;
      }
    });
  });
  const x = ex * TILE;
  const y = HUD_H + ey * TILE;
  const glow = targetDone ? 0.55 + Math.sin(time * 5) * 0.3 : 0.18;
  ctx.fillStyle = targetDone ? `rgba(57,217,138,${glow})` : 'rgba(57,217,138,0.12)';
  ctx.fillRect(x - 2, y - 2, TILE + 4, TILE + 4);
  ctx.fillStyle = '#0d2b1d';
  ctx.fillRect(x + 4, y + 4, TILE - 8, TILE - 8);
  ctx.strokeStyle = COLORS.exitGlow;
  ctx.lineWidth = 2;
  ctx.strokeRect(x + 4, y + 4, TILE - 8, TILE - 8);
  ctx.fillStyle = COLORS.exitGlow;
  ctx.font = 'bold 10px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(targetDone ? 'GO!' : 'EXIT', x + TILE / 2, y + TILE / 2 + 3);
  if (targetDone) {
    ctx.font = 'bold 10px sans-serif';
    ctx.fillText('GETAWAY', x + TILE / 2, y - 6);
  }
}

function drawGuard(ctx, g, time) {
  // Vision cone first (under the figure).
  const coneColor = g.mode === 'chase' ? COLORS.coneAlert
    : g.suspicion > 40 ? COLORS.coneSuspicious : COLORS.coneCalm;
  drawCone(ctx, g.x, g.y, g.angle, TUNE.guardFov, TUNE.guardRange, coneColor);
  // Figure: maroon uniform, cap, facing tick.
  ctx.fillStyle = COLORS.guardDark;
  ctx.beginPath();
  ctx.arc(g.x, g.y, 13, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = COLORS.guard;
  ctx.beginPath();
  ctx.arc(g.x, g.y, 10, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#2b1a17';
  ctx.beginPath();
  ctx.arc(g.x, g.y, 5.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#f4ead2';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(g.x, g.y);
  ctx.lineTo(g.x + Math.cos(g.angle) * 14, g.y + Math.sin(g.angle) * 14);
  ctx.stroke();
  // Suspicion marks.
  if (g.mode === 'chase') {
    ctx.fillStyle = '#ff5a4e';
    ctx.font = 'bold 20px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('!', g.x, g.y - 20);
  } else if (g.suspicion > 25) {
    ctx.fillStyle = '#f2c14e';
    ctx.font = 'bold 18px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('?', g.x, g.y - 20);
  }
}

function drawCamera(ctx, cam) {
  drawCone(ctx, cam.x, cam.y, cam.angle, TUNE.cameraFov, TUNE.cameraRange,
    cam.hot ? COLORS.cameraConeHot : COLORS.cameraCone);
  ctx.fillStyle = '#3a3348';
  ctx.fillRect(cam.x - 9, cam.y - 7, 18, 14);
  ctx.strokeStyle = '#8f86a8';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(cam.x - 9, cam.y - 7, 18, 14);
  ctx.fillStyle = cam.hot ? '#ff3d7e' : '#39d98a';
  ctx.beginPath();
  ctx.arc(cam.x + Math.cos(cam.angle) * 6, cam.y + Math.sin(cam.angle) * 6, 3.5, 0, Math.PI * 2);
  ctx.fill();
}

function drawPlayer(ctx, player, time) {
  const { x, y } = player;
  // Noise ring while sprinting: what the guards hear.
  if (player.sprinting && player.moving) {
    const r = 26 + Math.sin(time * 10) * 5;
    ctx.strokeStyle = 'rgba(242,193,78,0.5)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.stroke();
  }
  // Shadow veil when hidden.
  if (player.inShadow) {
    ctx.fillStyle = 'rgba(38,64,120,0.35)';
    ctx.beginPath();
    ctx.arc(x, y, 17, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = COLORS.thiefCloak;
  ctx.beginPath();
  ctx.arc(x, y, 13, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = COLORS.thief;
  ctx.beginPath();
  ctx.arc(x, y, 10, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#0b2e2a';
  ctx.beginPath();
  ctx.arc(x, y, 5.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = COLORS.gold;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + player.faceX * 14, y + player.faceY * 14);
  ctx.stroke();
  ctx.fillStyle = COLORS.text;
  ctx.font = 'bold 10px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('WREN', x, y - 19);
}

function drawSmoke(ctx, smoke, time) {
  for (const s of smoke) {
    const age = 1 - (s.until - time) / TUNE.smokeSeconds;
    ctx.fillStyle = `rgba(200,205,215,${0.5 - age * 0.25})`;
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.r * (0.8 + age * 0.3), 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(160,165,180,0.35)';
    ctx.beginPath();
    ctx.arc(s.x - 18, s.y + 10, s.r * 0.45, 0, Math.PI * 2);
    ctx.arc(s.x + 20, s.y - 8, s.r * 0.4, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawCoinFlight(ctx, coins) {
  for (const c of coins) {
    ctx.fillStyle = COLORS.gold;
    ctx.beginPath();
    ctx.arc(c.x, c.y, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = COLORS.goldDim;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(c.x, c.y, 5, 0, Math.PI * 2);
    ctx.stroke();
  }
}

function drawHud(ctx, s) {
  ctx.fillStyle = COLORS.panel;
  ctx.fillRect(0, 0, VIEW_W, HUD_H);
  ctx.fillStyle = 'rgba(242,193,78,0.35)';
  ctx.fillRect(0, HUD_H - 2, VIEW_W, 2);

  ctx.textAlign = 'left';
  ctx.fillStyle = COLORS.text;
  ctx.font = 'bold 17px sans-serif';
  ctx.fillText(`FLOOR ${s.levelIndex + 1} — ${s.level.name}`, 14, 24);
  ctx.fillStyle = COLORS.textDim;
  ctx.font = '12px sans-serif';
  ctx.fillText(s.level.brief, 14, 44);

  // Alarm meter.
  const ax = 470;
  const aw = 340;
  ctx.fillStyle = COLORS.text;
  ctx.font = 'bold 12px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('ALARM', ax, 20);
  ctx.fillStyle = '#241f30';
  roundRect(ctx, ax, 26, aw, 18, 4);
  ctx.fill();
  const frac = s.alarm.value / 100;
  const alarmColor = s.alarm.value < 35 ? COLORS.alarmLow : s.alarm.value < 70 ? COLORS.alarmMid : COLORS.alarmHigh;
  if (frac > 0) {
    ctx.fillStyle = alarmColor;
    roundRect(ctx, ax, 26, Math.max(8, aw * frac), 18, 4);
    ctx.fill();
  }
  ctx.strokeStyle = 'rgba(244,234,210,0.5)';
  ctx.lineWidth = 1;
  roundRect(ctx, ax, 26, aw, 18, 4);
  ctx.stroke();
  ctx.fillStyle = COLORS.text;
  ctx.font = 'bold 12px sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText(`${Math.round(s.alarm.value)}%`, ax + aw + 44, 40);
  ctx.textAlign = 'left';
  ctx.fillStyle = COLORS.textDim;
  ctx.font = '11px sans-serif';
  ctx.fillText(s.alarm.level === 'calm' ? 'unseen' : s.alarm.level === 'warm' ? 'someone is looking…' : 'LOCKDOWN IMMINENT', ax, 58);

  // Loot, tools, time.
  const rx = 900;
  ctx.fillStyle = COLORS.gold;
  ctx.font = 'bold 16px sans-serif';
  ctx.fillText(`LOOT $${s.lootValue}  (${s.lootCount}/${s.lootTotal})`, rx, 24);
  ctx.fillStyle = COLORS.textDim;
  ctx.font = '12px sans-serif';
  ctx.fillText(`coins ${s.player.coins}   smoke ${s.player.smoke}   ⏱ ${Math.floor(s.levelTime)}s`, rx, 44);
  ctx.fillStyle = s.targetDone ? COLORS.exitGlow : COLORS.textDim;
  ctx.font = 'bold 12px sans-serif';
  ctx.fillText(s.targetDone ? 'TARGET SECURED — REACH THE EXIT' : `TARGET: ${s.targetLabel}`, rx, 60);
}

function drawHints(ctx) {
  ctx.fillStyle = 'rgba(12,9,20,0.85)';
  ctx.fillRect(0, VIEW_H - 16, VIEW_W, 16);
  ctx.fillStyle = COLORS.textDim;
  ctx.font = '11px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('WASD / arrows move   ·   SHIFT sprint (loud)   ·   C sneak   ·   1 or click: toss coin   ·   2: smoke   ·   E: pick lock   ·   M: mute', VIEW_W / 2, VIEW_H - 4);
}

function drawSpottedBanner(ctx, s) {
  if (s.alarm.spottedGrace > 0) {
    const blink = Math.sin(s.time * 16) > 0;
    if (blink) {
      ctx.fillStyle = '#ee4030';
      ctx.font = 'bold 30px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('SPOTTED!', VIEW_W / 2, HUD_H + 52);
      ctx.font = 'bold 14px sans-serif';
      ctx.fillText('break line of sight — now!', VIEW_W / 2, HUD_H + 74);
    }
  }
}

function drawMessage(ctx, s) {
  if (!s.message || s.messageTimer <= 0) return;
  // Low banner, above the hints bar, so it never covers the action.
  const y = VIEW_H - 56;
  ctx.fillStyle = 'rgba(12,9,20,0.8)';
  const w = ctx.measureText(s.message).width + 36;
  roundRect(ctx, VIEW_W / 2 - w / 2, y, w, 30, 6);
  ctx.fill();
  ctx.fillStyle = COLORS.gold;
  ctx.font = 'bold 15px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(s.message, VIEW_W / 2, y + 20);
}

function drawTitle(ctx, s) {
  ctx.fillStyle = 'rgba(8,5,16,0.82)';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  ctx.textAlign = 'center';
  ctx.fillStyle = COLORS.gold;
  ctx.font = 'bold 64px sans-serif';
  ctx.fillText('VELVET VAULT', VIEW_W / 2, 210);
  ctx.fillStyle = COLORS.text;
  ctx.font = 'bold 26px sans-serif';
  ctx.fillText('— The Meridian Heist —', VIEW_W / 2, 252);
  ctx.fillStyle = COLORS.textDim;
  ctx.font = '16px sans-serif';
  ctx.fillText('Three floors. One crew: you. Slip past the guards, dodge the cameras,', VIEW_W / 2, 310);
  ctx.fillText('lift the loot, and get out before the alarm hits 100.', VIEW_W / 2, 334);
  ctx.fillStyle = COLORS.text;
  ctx.font = '15px sans-serif';
  ctx.fillText('WASD move  ·  SHIFT sprint (loud)  ·  C sneak in the shadows', VIEW_W / 2, 392);
  ctx.fillText('1 or click tosses a coin to lure a guard  ·  2 drops smoke  ·  E picks the vault', VIEW_W / 2, 416);
  ctx.fillStyle = COLORS.gold;
  ctx.font = 'bold 22px sans-serif';
  const blink = Math.sin(s.time * 4) > -0.2;
  if (blink) ctx.fillText('Press ENTER to start the heist', VIEW_W / 2, 480);
  if (s.bestScore > 0) {
    ctx.fillStyle = COLORS.textDim;
    ctx.font = '14px sans-serif';
    ctx.fillText(`Best haul so far: $${s.bestScore}`, VIEW_W / 2, 520);
  }
  ctx.fillStyle = COLORS.textDim;
  ctx.font = '12px sans-serif';
  ctx.fillText('A completely original game — no borrowed names, art or music.', VIEW_W / 2, 640);
}

function drawEndScreen(ctx, s, title, lines, prompt) {
  ctx.fillStyle = 'rgba(8,5,16,0.85)';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  ctx.textAlign = 'center';
  ctx.fillStyle = title === 'CAUGHT!' ? '#ee4030' : COLORS.gold;
  ctx.font = 'bold 56px sans-serif';
  ctx.fillText(title, VIEW_W / 2, 250);
  ctx.fillStyle = COLORS.text;
  ctx.font = '18px sans-serif';
  lines.forEach((line, i) => ctx.fillText(line, VIEW_W / 2, 310 + i * 30));
  ctx.fillStyle = COLORS.gold;
  ctx.font = 'bold 20px sans-serif';
  const blink = Math.sin(s.time * 4) > -0.2;
  if (blink) ctx.fillText(prompt, VIEW_W / 2, 520);
}

export function drawGame(ctx, s) {
  ctx.clearRect(0, 0, VIEW_W, VIEW_H);
  ctx.fillStyle = '#0d0a16';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);

  drawFloor(ctx, s.level, s.time);
  drawLoot(ctx, s.loot, s.time);
  drawExit(ctx, s.level, s.time, s.targetDone);
  drawVaultDoor(ctx, s.vaultDoor, s.player, s.time);
  for (const cam of s.cameras) drawCamera(ctx, cam);
  for (const g of s.guards) drawGuard(ctx, g, s.time);
  drawWallsAndCrates(ctx, s.level);
  drawSmoke(ctx, s.smoke, s.time);
  drawCoinFlight(ctx, s.coinShots);
  if (s.screen !== 'title') drawPlayer(ctx, s.player, s.time);
  drawHud(ctx, s);
  drawHints(ctx);
  drawSpottedBanner(ctx, s);
  drawMessage(ctx, s);

  if (s.screen === 'title') {
    drawTitle(ctx, s);
  } else if (s.screen === 'caught') {
    drawEndScreen(ctx, s, 'CAUGHT!', [
      s.caughtReason,
      `Floor ${s.levelIndex + 1} — ${s.level.name}`,
      `Loot held: $${s.lootValue}`,
    ], 'Press R to retry this floor');
  } else if (s.screen === 'leveldone') {
    drawEndScreen(ctx, s, 'CLEAN GETAWAY', [
      `${s.level.name} cleared.`,
      `Floor haul: $${s.lootValue}   ·   Time: ${Math.floor(s.levelTime)}s`,
      `Total so far: $${s.totalScore}`,
    ], s.levelIndex + 1 < 3 ? 'Press ENTER for the next floor' : 'Press ENTER for the final score');
  } else if (s.screen === 'win') {
    drawEndScreen(ctx, s, 'THE MERIDIAN HEIST', [
      'Every floor cleared. The crew vanishes into the night.',
      `Final haul: $${s.totalScore}`,
      `Time: ${Math.floor(s.totalTime)}s   ·   Times spotted: ${s.timesSpotted}`,
    ], 'Press R to run it again');
  }
}
