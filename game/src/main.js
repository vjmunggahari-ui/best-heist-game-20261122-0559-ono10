// Velvet Vault — the game itself: state, loop, rules.
// One job: load each floor, wire the thief, guards, cameras, loot and
// alarm together, and run the title / playing / caught / win screens.

import { TILE, VIEW_W, VIEW_H, HUD_H, TUNE } from './config.js';
import { LEVELS, tileWalkable } from './levels.js';
import { createInput } from './input.js';
import { createAudio } from './audio.js';
import { createAlarm } from './alarm.js';
import { parseLoot, targetTaken, lootSummary } from './loot.js';
import { createPlayer } from './player.js';
import { createGuard, updateGuard } from './guards.js';
import { createCamera, updateCamera } from './cameras.js';
import { drawGame } from './render.js';
import { applyShot } from './shots.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const input = createInput(canvas);
const audio = createAudio();
const statusEl = document.getElementById('status');

const params = new URLSearchParams(window.location.search);
const shotName = params.get('shot');

const s = {
  screen: 'title', // title | playing | caught | leveldone | win
  levelIndex: 0,
  level: LEVELS[0],
  player: null,
  guards: [],
  cameras: [],
  loot: [],
  alarm: createAlarm(0),
  vaultDoor: null,
  smoke: [],
  coinShots: [],
  coinEvent: null,
  time: 0,
  levelTime: 0,
  totalTime: 0,
  totalScore: 0,
  lootValue: 0,
  lootCount: 0,
  lootTotal: 0,
  targetDone: false,
  targetLabel: 'Golden Idol',
  targetAnnounced: false,
  message: '',
  messageTimer: 0,
  caughtReason: '',
  timesSpotted: 0,
  spottedWasOn: false,
  bestScore: 0,
  shotFreeze: false,
};

try {
  s.bestScore = Number(window.localStorage.getItem('velvet-vault-best') || 0) || 0;
} catch (e) { /* storage unavailable; best score just stays 0 */ }

function findTile(ch) {
  for (let ty = 0; ty < s.level.map.length; ty++) {
    const tx = s.level.map[ty].indexOf(ch);
    if (tx >= 0) return { tx, ty };
  }
  return null;
}

function tileCenter(tx, ty) {
  return { x: tx * TILE + TILE / 2, y: HUD_H + ty * TILE + TILE / 2 };
}

function loadLevel(index) {
  s.levelIndex = index;
  s.level = LEVELS[index];
  s.alarm = createAlarm(s.level.alarmStart);
  s.loot = parseLoot(s.level);
  s.guards = s.level.guards.map((def) => createGuard(def, s.level));
  s.cameras = s.level.cameras.map((def) => createCamera(def));
  s.smoke = [];
  s.coinShots = [];
  s.coinEvent = null;
  s.levelTime = 0;
  s.targetDone = false;
  s.targetAnnounced = false;
  s.message = '';
  s.messageTimer = 0;
  s.caughtReason = '';
  s.spottedWasOn = false;

  const start = findTile('P');
  const sp = tileCenter(start.tx, start.ty);
  s.player = createPlayer(sp.x, sp.y);

  const door = findTile('D');
  s.vaultDoor = door
    ? { tx: door.tx, ty: door.ty, x: door.tx * TILE + TILE / 2, y: HUD_H + door.ty * TILE + TILE / 2, open: false }
    : null;

  s.targetLabel = s.level.target === 'idol' ? 'Golden Idol'
    : s.level.target === 'star' ? 'Meridian Star'
    : 'all 3 paintings';
  syncLoot();
  setStatus(`${s.level.name}. ${s.level.brief}`);
}

function syncLoot() {
  const sum = lootSummary(s.loot);
  s.lootValue = sum.value;
  s.lootCount = sum.count;
  s.lootTotal = s.loot.length;
  s.targetDone = targetTaken(s.level, s.loot);
}

function setStatus(text) {
  if (statusEl) statusEl.textContent = text;
}

function showMessage(text, seconds) {
  s.message = text;
  s.messageTimer = seconds || 3;
}

const world = {
  isSolid(tx, ty) {
    return !tileWalkable(s.level, tx, ty, s.vaultDoor ? s.vaultDoor.open : false);
  },
  isShadow(x, y) {
    const tx = Math.floor(x / TILE);
    const ty = Math.floor((y - HUD_H) / TILE);
    return s.level.map[ty] && s.level.map[ty][tx] === 's';
  },
  smokeAt(x, y) {
    return s.smoke.some((sm) => Math.hypot(x - sm.x, y - sm.y) < sm.r);
  },
  get vaultDoor() {
    return s.vaultDoor;
  },
  get vaultOpen() {
    return s.vaultDoor ? s.vaultDoor.open : true;
  },
  tossCoin(x, y) {
    const cx = Math.max(20, Math.min(VIEW_W - 20, x));
    const cy = Math.max(HUD_H + 20, Math.min(VIEW_H - 20, y));
    s.coinShots.push({ x: s.player.x, y: s.player.y, tx: cx, ty: cy, t: 0, dur: 0.28 });
    audio.coin();
  },
  dropSmoke(x, y) {
    s.smoke.push({ x, y, r: TUNE.smokeRadius, until: s.time + TUNE.smokeSeconds });
    audio.smoke();
  },
  onVaultOpened() {
    audio.lockOpen();
    showMessage('Vault open — grab the Meridian Star!', 3);
    setStatus('Vault open. Take the Meridian Star.');
  },
};

function updatePlaying(dt) {
  s.levelTime += dt;
  s.totalTime += dt;
  if (s.messageTimer > 0) s.messageTimer -= dt;

  // Coins fly, then land with a clink the guards hear.
  s.coinEvent = null;
  for (const c of s.coinShots) {
    c.t += dt;
    const k = Math.min(1, c.t / c.dur);
    c.x = c.x + (c.tx - c.x) * k;
    c.y = c.y + (c.ty - c.y) * k;
    if (k >= 1 && !c.landed) {
      c.landed = true;
      c.landedAt = s.time;
      s.coinEvent = { x: c.tx, y: c.ty };
    }
  }
  s.coinShots = s.coinShots.filter((c) => !c.landed || s.time - c.landedAt < 0.6);
  s.smoke = s.smoke.filter((sm) => sm.until > s.time);

  s.player.update(dt, input, world);
  if (s.player.stepped) audio.step();
  if (s.player.lockTicked) {
    s.player.lockTicked = false;
    audio.lockTick(s.player.lockProgress);
  }

  const ctx = { player: s.player, alarm: s.alarm, audio, world, time: s.time, coinEvent: s.coinEvent };
  for (const g of s.guards) updateGuard(g, dt, s.level, ctx);
  for (const cam of s.cameras) updateCamera(cam, dt, s.time, ctx);

  // The alarm climbs while a guard has eyes on the thief (cameras feed
  // it directly from updateCamera). A guard's full spot adds its own jump.
  const guardSees = s.guards.some((g) => g.sees);
  if (guardSees) {
    s.alarm.seen(dt, 10);
    if (!s.spottedWasOn) {
      s.timesSpotted++;
      s.spottedWasOn = true;
    }
  } else if (!s.cameras.some((c) => c.hot)) {
    s.alarm.unseen(dt);
    s.spottedWasOn = false;
  } else if (!s.spottedWasOn) {
    s.timesSpotted++;
    s.spottedWasOn = true;
  }
  audio.siren(s.alarm.value);

  // Loot pickup.
  for (const item of s.loot) {
    if (item.taken) continue;
    if (Math.hypot(s.player.x - item.x, s.player.y - item.y) < item.radius + s.player.radius) {
      item.taken = true;
      audio.pickup();
      syncLoot();
      showMessage(`${item.label} secured! (+$${item.value})`, 2);
      if (item.target) setStatus(`Target secured. Reach the exit.`);
    }
  }
  if (s.targetDone && !s.targetAnnounced) {
    s.targetAnnounced = true;
    showMessage('TARGET SECURED — reach the exit!', 3.5);
    audio.win();
  }

  // Exit: only once the target is secured.
  if (s.targetDone) {
    const exit = findTile('E');
    const ep = tileCenter(exit.tx, exit.ty);
    if (Math.hypot(s.player.x - ep.x, s.player.y - ep.y) < 30) {
      const timeBonus = Math.max(0, 300 - Math.floor(s.levelTime) * 2);
      s.totalScore += s.lootValue + timeBonus;
      saveBest();
      audio.win();
      s.screen = 'leveldone';
      setStatus(`${s.level.name} cleared. Total $${s.totalScore}.`);
      return;
    }
  }

  // Caught: lockdown, or a guard's hands on the thief.
  if (s.alarm.tripped) {
    s.caughtReason = 'The alarm hit 100 — the museum locked down.';
    return caught();
  }
  for (const g of s.guards) {
    if (g.mode === 'chase' && Math.hypot(g.x - s.player.x, g.y - s.player.y) < 26) {
      s.caughtReason = 'A guard grabbed Wren in the gallery.';
      return caught();
    }
  }
}

function caught() {
  audio.stopSiren();
  audio.caught();
  s.screen = 'caught';
  setStatus('Caught. Press R to retry this floor.');
}

function saveBest() {
  if (s.totalScore > s.bestScore) {
    s.bestScore = s.totalScore;
    try {
      window.localStorage.setItem('velvet-vault-best', String(s.bestScore));
    } catch (e) { /* storage unavailable */ }
  }
}

function update(dt) {
  s.time += dt;
  if (input.wasPressed('m')) {
    const muted = audio.toggleMute();
    showMessage(muted ? 'Sound off' : 'Sound on', 1.2);
  }
  if (s.screen === 'title') {
    if (input.wasPressed('Enter') || input.wasPressed(' ')) {
      audio.unlock();
      s.totalScore = 0;
      s.totalTime = 0;
      s.timesSpotted = 0;
      loadLevel(0);
      s.screen = 'playing';
      showMessage('Lift the Golden Idol — stay out of the cones', 3.5);
    }
  } else if (s.screen === 'playing') {
    if (!s.shotFreeze) updatePlaying(dt);
  } else if (s.screen === 'caught') {
    if (input.wasPressed('r')) {
      loadLevel(s.levelIndex);
      s.screen = 'playing';
    }
  } else if (s.screen === 'leveldone') {
    if (input.wasPressed('Enter') || input.wasPressed(' ')) {
      if (s.levelIndex + 1 < LEVELS.length) {
        loadLevel(s.levelIndex + 1);
        s.screen = 'playing';
        showMessage(LEVELS[s.levelIndex].brief, 3.5);
      } else {
        s.screen = 'win';
        saveBest();
        setStatus(`Heist complete. Final haul $${s.totalScore}.`);
      }
    }
  } else if (s.screen === 'win') {
    if (input.wasPressed('r')) {
      s.totalScore = 0;
      s.totalTime = 0;
      s.timesSpotted = 0;
      loadLevel(0);
      s.screen = 'playing';
    }
  }
  input.consumePressed();
}

let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000 || 0);
  last = now;
  update(dt);
  drawGame(ctx, s);
  requestAnimationFrame(frame);
}

// Boot: load floor 1 behind the title screen, pose for a screenshot
// when ?shot= is present (vault and escape pose their own floors),
// then run.
loadLevel(0);
if (shotName) {
  if (shotName === 'vault') loadLevel(1);
  if (shotName === 'escape') loadLevel(2);
  applyShot(s, shotName);
  syncLoot();
}
window.__game = s;
requestAnimationFrame(frame);
