// Velvet Vault — synthesized sound effects, no audio files.
// One job: every blip, chime and siren the game plays, built from oscillators.

export function createAudio() {
  let ctx = null;
  let muted = false;
  let sirenNodes = null;

  function ensure() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  function tone(freq, dur, type, vol, slideTo) {
    if (muted) return;
    const ac = ensure();
    if (!ac) return;
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = type || 'sine';
    osc.frequency.setValueAtTime(freq, ac.currentTime);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, ac.currentTime + dur);
    gain.gain.setValueAtTime(vol || 0.12, ac.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + dur);
    osc.connect(gain);
    gain.connect(ac.destination);
    osc.start();
    osc.stop(ac.currentTime + dur);
  }

  return {
    unlock() {
      ensure();
    },
    toggleMute() {
      muted = !muted;
      if (muted) this.stopSiren();
      return muted;
    },
    isMuted() {
      return muted;
    },
    pickup() {
      tone(880, 0.12, 'triangle', 0.14);
      setTimeout(() => tone(1320, 0.16, 'triangle', 0.12), 70);
    },
    coin() {
      tone(1568, 0.09, 'square', 0.06);
      setTimeout(() => tone(2093, 0.12, 'square', 0.05), 60);
    },
    smoke() {
      tone(300, 0.35, 'sawtooth', 0.05, 90);
    },
    lockTick(progress) {
      tone(500 + progress * 500, 0.05, 'square', 0.05);
    },
    lockOpen() {
      tone(392, 0.1, 'triangle', 0.12);
      setTimeout(() => tone(523, 0.1, 'triangle', 0.12), 90);
      setTimeout(() => tone(784, 0.22, 'triangle', 0.12), 180);
    },
    spotted() {
      tone(220, 0.18, 'sawtooth', 0.14, 440);
    },
    caught() {
      tone(196, 0.5, 'sawtooth', 0.16, 98);
      setTimeout(() => tone(147, 0.6, 'sawtooth', 0.14, 73), 200);
    },
    win() {
      [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => tone(f, 0.22, 'triangle', 0.13), i * 110));
    },
    step() {
      tone(140 + Math.random() * 40, 0.04, 'sine', 0.03);
    },
    // A quiet two-tone siren while the alarm is hot; call every frame.
    siren(alarm) {
      if (muted || alarm < 55) {
        this.stopSiren();
        return;
      }
      const ac = ensure();
      if (!ac) return;
      if (!sirenNodes) {
        const osc = ac.createOscillator();
        const gain = ac.createGain();
        const lfo = ac.createOscillator();
        const lfoGain = ac.createGain();
        osc.type = 'sine';
        osc.frequency.value = 660;
        lfo.type = 'sine';
        lfo.frequency.value = 1.6;
        lfoGain.gain.value = 220;
        lfo.connect(lfoGain);
        lfoGain.connect(osc.frequency);
        gain.gain.value = 0.0;
        osc.connect(gain);
        gain.connect(ac.destination);
        osc.start();
        lfo.start();
        sirenNodes = { osc, gain, lfo };
      }
      const target = 0.02 + (alarm - 55) * 0.0009;
      sirenNodes.gain.gain.setTargetAtTime(target, ac.currentTime, 0.2);
    },
    stopSiren() {
      if (!sirenNodes) return;
      try {
        sirenNodes.gain.gain.setTargetAtTime(0, ctx.currentTime, 0.05);
        const nodes = sirenNodes;
        setTimeout(() => {
          try {
            nodes.osc.stop();
            nodes.lfo.stop();
          } catch (e) { /* already stopped */ }
        }, 300);
      } catch (e) { /* no context */ }
      sirenNodes = null;
    },
  };
}
