export class SoundSystem {
  constructor() {
    this.enabled = true;
    this.context = null;
  }

  unlock() {
    if (!this.enabled) return;
    const Context = window.AudioContext || window.webkitAudioContext;
    if (!Context) return;
    try {
      if (!this.context) this.context = new Context();
      if (this.context.state === 'suspended') void this.context.resume().catch(() => {});
    } catch {
      this.context = null;
    }
  }

  play(type) {
    if (!this.enabled || !this.context || this.context.state !== 'running') return;
    const presets = {
      paddle: [440, 0.055, 'triangle'],
      goal: [660, 0.16, 'sine'],
      lose: [185, 0.22, 'sawtooth'],
      win: [880, 0.28, 'triangle'],
      serve: [360, 0.075, 'sine'],
      power: [1100, 0.21, 'triangle'],
      shield: [220, 0.24, 'sawtooth'],
    };
    const [frequency, duration, waveform] = presets[type] || presets.paddle;
    try {
      const oscillator = this.context.createOscillator();
      const gain = this.context.createGain();
      oscillator.type = waveform;
      oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(0.0001, this.context.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.045, this.context.currentTime + 0.008);
      gain.gain.exponentialRampToValueAtTime(0.0001, this.context.currentTime + duration);
      oscillator.connect(gain);
      gain.connect(this.context.destination);
      oscillator.start();
      oscillator.stop(this.context.currentTime + duration + 0.01);
    } catch {
      /* Audio output is optional. */
    }
  }

  setEnabled(enabled) {
    this.enabled = Boolean(enabled);
    if (this.enabled) this.unlock();
  }
}
