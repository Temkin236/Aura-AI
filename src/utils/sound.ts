/**
 * Luxury Web Audio Synthesizer for AURA AI
 * Zero external audio files, pure algorithmic harmonic frequencies.
 */

class SoundEffectsManager {
  private ctx: AudioContext | null = null;
  private isEnabled: boolean = true;

  constructor() {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('aura_sound_enabled');
        this.isEnabled = stored !== 'false';
      } catch {
        this.isEnabled = true;
      }
    }
  }

  private getContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  public setEnabled(enabled: boolean) {
    this.isEnabled = enabled;
    try {
      localStorage.setItem('aura_sound_enabled', enabled ? 'true' : 'false');
    } catch {}
  }

  public getEnabled(): boolean {
    return this.isEnabled;
  }

  /**
   * Delicate warm marimba chime when sending a message
   */
  public playSend() {
    if (!this.isEnabled) return;
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const frequencies = [523.25, 659.25]; // C5, E5 harmonic

    frequencies.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.06);

      gain.gain.setValueAtTime(0, now + idx * 0.06);
      gain.gain.linearRampToValueAtTime(0.04, now + idx * 0.06 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.06 + 0.25);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + idx * 0.06);
      osc.stop(now + idx * 0.06 + 0.28);
    });
  }

  /**
   * Soft sparkling crystal tone when response completes
   */
  public playReceive() {
    if (!this.isEnabled) return;
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const frequencies = [659.25, 783.99, 1046.5]; // E5, G5, C6 (warm major triad)

    frequencies.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.08);

      gain.gain.setValueAtTime(0, now + idx * 0.08);
      gain.gain.linearRampToValueAtTime(0.035, now + idx * 0.08 + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.08 + 0.4);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + idx * 0.08);
      osc.stop(now + idx * 0.08 + 0.45);
    });
  }

  /**
   * Subtle click for button feedback
   */
  public playClick() {
    if (!this.isEnabled) return;
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(440, now);

    gain.gain.setValueAtTime(0.015, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.05);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.06);
  }
}

export const soundFx = new SoundEffectsManager();
