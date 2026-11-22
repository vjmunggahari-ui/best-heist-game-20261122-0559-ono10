// Velvet Vault — tuning constants and palette.
// One job: every number the rest of the game balances against lives here.

export const TILE = 40;
export const VIEW_W = 1280;
export const VIEW_H = 800;
export const HUD_H = 64;

export const COLORS = {
  floorLight: '#2a2438',
  floorDark: '#241f30',
  floorTrim: '#332c44',
  wall: '#171222',
  wallTop: '#3d3358',
  gold: '#f2c14e',
  goldDim: '#a8842c',
  shadowZone: 'rgba(38, 64, 120, 0.30)',
  coneCalm: 'rgba(242, 193, 78, 0.30)',
  coneSuspicious: 'rgba(242, 140, 40, 0.45)',
  coneAlert: 'rgba(238, 64, 48, 0.55)',
  cameraCone: 'rgba(168, 92, 246, 0.38)',
  cameraConeHot: 'rgba(220, 60, 220, 0.50)',
  thief: '#1fb6a6',
  thiefCloak: '#123f3a',
  guard: '#c94f43',
  guardDark: '#7e2f28',
  exitGlow: '#39d98a',
  alarmLow: '#39d98a',
  alarmMid: '#f2c14e',
  alarmHigh: '#ee4030',
  text: '#f4ead2',
  textDim: '#b8a98a',
  panel: 'rgba(12, 9, 20, 0.88)',
};

export const TUNE = {
  thiefWalk: 165, // px per second
  thiefSprint: 265,
  thiefSneak: 105,
  guardWalk: 78,
  guardChase: 175,
  guardFov: 1.22, // radians, about 70 degrees
  guardRange: 235,
  guardSuspectRate: 95, // suspicion per second while seen, close
  guardSuspectFar: 55,
  guardDecay: 26,
  guardAlertAlarm: 34, // alarm jump when a guard fully spots the thief
  cameraRange: 265,
  cameraFov: 0.85,
  cameraAlarmRate: 16, // alarm per second while a camera sees the thief
  alarmDecay: 3.2, // alarm per second while unseen
  alarmWarnAt: 55,
  lockpickSeconds: 3.0,
  smokeSeconds: 4.5,
  smokeRadius: 110,
  coinCount: 3,
  smokeCount: 2,
  noiseWalk: 46,
  noiseSprint: 110,
  noiseSneak: 18,
  hearRadius: 240, // guards hear noise inside this radius
  spotGraceSeconds: 0.9, // "SPOTTED!" warning before the alarm jumps
};

// How much each loot item is worth, in score.
export const LOOT_VALUES = { gold: 150, painting: 300, idol: 600, star: 1200 };
