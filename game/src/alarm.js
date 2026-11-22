// Velvet Vault — the alarm meter.
// One job: track heat 0-100, decay it when the thief is unseen, and report
// the lockdown moment. The meter is the game's tension dial.

import { TUNE } from './config.js';

export function createAlarm(startValue) {
  let value = startValue || 0;
  let spottedGrace = 0; // seconds of "SPOTTED!" warning left
  let everSpotted = false;

  return {
    get value() {
      return value;
    },
    get spottedGrace() {
      return spottedGrace;
    },
    get everSpotted() {
      return everSpotted;
    },
    // A guard or camera has eyes on the thief right now.
    seen(dt, rate) {
      if (spottedGrace <= 0 && value < 100) {
        spottedGrace = TUNE.spotGraceSeconds;
        everSpotted = true;
      }
      if (spottedGrace > 0) {
        spottedGrace -= dt;
      } else {
        value = Math.min(100, value + rate * dt);
      }
    },
    // Nobody sees the thief: the heat slowly bleeds off.
    unseen(dt) {
      if (spottedGrace > 0) spottedGrace -= dt;
      value = Math.max(0, value - TUNE.alarmDecay * dt);
    },
    add(amount) {
      value = Math.min(100, value + amount);
    },
    get tripped() {
      return value >= 100;
    },
    get level() {
      if (value < 35) return 'calm';
      if (value < 70) return 'warm';
      return 'hot';
    },
  };
}
