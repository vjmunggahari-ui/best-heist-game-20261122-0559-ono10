// Velvet Vault — a tiny seeded RNG so screenshot staging is deterministic.
// One job: repeatable pseudo-random numbers from a 32-bit seed.

export function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Pick an element from an array with a seeded RNG.
export function pick(rng, arr) {
  return arr[Math.floor(rng() * arr.length)];
}
