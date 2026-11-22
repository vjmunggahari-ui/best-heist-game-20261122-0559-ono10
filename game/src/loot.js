// Velvet Vault — loot: what the thief steals and what it is worth.
// One job: parse loot out of a level map, hand out pickups, and score them.

import { LOOT_VALUES, TILE, HUD_H } from './config.js';

const KINDS = {
  g: { kind: 'gold', label: 'Gold bars', value: LOOT_VALUES.gold, radius: 15 },
  p: { kind: 'painting', label: 'Painting', value: LOOT_VALUES.painting, radius: 17 },
  i: { kind: 'idol', label: 'Golden Idol', value: LOOT_VALUES.idol, radius: 17, target: true },
  S: { kind: 'star', label: 'Meridian Star', value: LOOT_VALUES.star, radius: 18, target: true },
};

export function parseLoot(level) {
  const items = [];
  level.map.forEach((row, ty) => {
    [...row].forEach((ch, tx) => {
      const def = KINDS[ch];
      if (!def) return;
      items.push({
        ...def,
        x: tx * TILE + TILE / 2,
        y: HUD_H + ty * TILE + TILE / 2,
        tx,
        ty,
        taken: false,
        sparkle: Math.random() * Math.PI * 2,
      });
    });
  });
  return items;
}

// The level's main target: the idol, the star, or (rooftop) every painting.
export function targetTaken(level, items) {
  if (level.target === 'paintings') {
    return items.filter((i) => i.kind === 'painting').every((i) => i.taken);
  }
  return items.some((i) => i.target && i.taken);
}

export function lootSummary(items) {
  const taken = items.filter((i) => i.taken);
  return {
    count: taken.length,
    total: items.length,
    value: taken.reduce((sum, i) => sum + i.value, 0),
    names: taken.map((i) => i.label),
  };
}
