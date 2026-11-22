// Velvet Vault — the three heist floors.
// One job: the map (one string per row, 32 wide x 18 tall) and the patrols,
// cameras and loot placement for each level.
//
// Map legend:
//   # wall          . floor        C crate (blocks move + sight)
//   s shadow floor (the thief is hard to spot here)
//   P player start  E exit        D vault door (pick the lock with E)
//   g gold (150)    p painting (300)
//   i Golden Idol — level 1 target (600)
//   S Meridian Star — level 2 target (1200), behind the vault door
// Patrols and cameras are listed per level in tile coordinates.
// Guards pathfind between waypoints with BFS, so a waypoint only needs to
// stand on walkable floor; walls between waypoints are routed around.

export const LEVELS = [
  {
    name: 'The Gilded Gallery',
    brief: 'Lift the Golden Idol, then slip out the east door.',
    target: 'idol',
    alarmStart: 0,
    map: [
      '################################',
      '#......s.......#......i........#',
      '#..g...........#...............#',
      '#.............#................#',
      '#..C...........#...............#',
      '#.............#........p.......#',
      '#......#########.##########....#',
      '#.............#................#',
      '#..s...........#....C..........#',
      '#.............#................#',
      '#....p....C....#...............#',
      '#..............#######.........#',
      '#..C................#..........#',
      '#..............s......#....g...#',
      '#.....................#........#',
      '#..s......C....................#',
      '#.P..........................E.#',
      '################################',
    ],
    guards: [
      { x: 10, y: 3, waypoints: [[10, 3], [10, 12], [22, 12], [22, 3]], pause: 1.1 },
      { x: 24, y: 13, waypoints: [[24, 13], [14, 13], [14, 16], [24, 16]], pause: 0.8 },
    ],
    cameras: [
      { x: 16, y: 1, baseAngle: Math.PI / 2, sweep: 0.9, speed: 0.55 },
    ],
  },
  {
    name: 'The Vault Hall',
    brief: 'Pick the vault, take the Meridian Star, vanish.',
    target: 'star',
    alarmStart: 0,
    map: [
      '################################',
      '#P.....s........#..............#',
      '#...............#.....C........#',
      '#..g...........................#',
      '#.....##########D##########....#',
      '#.....#...................#....#',
      '#..C..#....S........p....#..g..#',
      '#.....#...................#....#',
      '#..s..#....C........C....#.....#',
      '#.....#...................#....#',
      '#.....#####################....#',
      '#..............................#',
      '#..p........C......s...........#',
      '#...........................C..#',
      '#....C...........######........#',
      '#..............s......#....g...#',
      '#....................#......E..#',
      '################################',
    ],
    guards: [
      { x: 8, y: 12, waypoints: [[8, 12], [8, 15], [24, 15], [24, 12]], pause: 0.9 },
      { x: 20, y: 2, waypoints: [[20, 2], [28, 2], [28, 11], [20, 11]], pause: 1.2 },
      { x: 3, y: 8, waypoints: [[3, 8], [3, 14], [10, 14], [10, 11]], pause: 0.7 },
    ],
    cameras: [
      { x: 14, y: 3, baseAngle: Math.PI / 2, sweep: 1.1, speed: 0.6 },
      { x: 27, y: 11, baseAngle: Math.PI, sweep: 0.8, speed: 0.45 },
    ],
  },
  {
    name: 'The Rooftop Getaway',
    brief: 'Heat is on. Grab the last three paintings and reach the van.',
    target: 'paintings',
    alarmStart: 25,
    map: [
      '################################',
      '#.....s........E.......s.......#',
      '#..............................#',
      '#..p...........C.............p.#',
      '#..............#######.........#',
      '#..C...........................#',
      '#..........s.........C....s....#',
      '#..............................#',
      '#....##########.....#########..#',
      '#..............................#',
      '#..s......C..........s......C..#',
      '#..............................#',
      '#..........p...................#',
      '#....C....................g....#',
      '#..............................#',
      '#..s............C..........s...#',
      '#.P............................#',
      '################################',
    ],
    guards: [
      { x: 8, y: 4, waypoints: [[8, 4], [8, 10], [12, 10], [12, 4]], pause: 0.8 },
      { x: 24, y: 6, waypoints: [[24, 6], [24, 14], [14, 14], [14, 6]], pause: 1.0 },
      { x: 15, y: 15, waypoints: [[15, 15], [28, 15], [28, 9], [16, 9]], pause: 0.6 },
    ],
    cameras: [
      { x: 5, y: 1, baseAngle: Math.PI / 2, sweep: 1.0, speed: 0.7 },
      { x: 26, y: 1, baseAngle: Math.PI / 2, sweep: 1.0, speed: 0.5 },
    ],
  },
];

// Validate every map: 18 rows, 32 columns, known letters only, one player
// start, one exit, and the level's target present. Throws on the first problem.
export function validateLevels() {
  const ok = new Set('#.CsPEgpiSDK'.split(''));
  for (const level of LEVELS) {
    if (level.map.length !== 18) throw new Error(level.name + ': map must be 18 rows');
    let players = 0;
    let exits = 0;
    let targets = 0;
    for (const row of level.map) {
      if (row.length !== 32) throw new Error(level.name + ': row not 32 wide: ' + row);
      for (const ch of row) {
        if (!ok.has(ch)) throw new Error(level.name + ': unknown tile ' + ch);
        if (ch === 'P') players++;
        if (ch === 'E') exits++;
        if (ch === 'i' || ch === 'S' || ch === 'p') targets++;
      }
    }
    if (players !== 1) throw new Error(level.name + ': needs exactly 1 player start');
    if (exits !== 1) throw new Error(level.name + ': needs exactly 1 exit');
    if (targets < 1) throw new Error(level.name + ': needs a loot target');
  }
  return true;
}

// Is this tile walkable for the thief and the guards? A locked vault door
// blocks until picked; an open one is floor.
export function tileWalkable(level, tx, ty, vaultOpen) {
  if (tx < 0 || ty < 0 || tx >= 32 || ty >= 18) return false;
  const ch = level.map[ty][tx];
  if (ch === '#' || ch === 'C') return false;
  if (ch === 'D') return vaultOpen;
  return true;
}

// Breadth-first path between two tiles, as a list of [x, y] steps
// (not including the start tile). Empty list when unreachable.
export function findPath(level, fromX, fromY, toX, toY, vaultOpen) {
  const key = (x, y) => y * 32 + x;
  const prev = new Map();
  const queue = [[fromX, fromY]];
  prev.set(key(fromX, fromY), null);
  while (queue.length > 0) {
    const [x, y] = queue.shift();
    if (x === toX && y === toY) {
      const path = [];
      let cur = [x, y];
      while (cur) {
        path.unshift(cur);
        cur = prev.get(key(cur[0], cur[1]));
      }
      return path.slice(1);
    }
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx;
      const ny = y + dy;
      if (prev.has(key(nx, ny))) continue;
      if (!tileWalkable(level, nx, ny, vaultOpen)) continue;
      prev.set(key(nx, ny), [x, y]);
      queue.push([nx, ny]);
    }
  }
  return [];
}
