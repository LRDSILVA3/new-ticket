// Web Audio API synthetic chimes and TTS announcer (requires no external audio files)
class SoundManager {
  constructor() {
    this.ctx = null;
  }

  init() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  // Hospital / Airport two-tone chime (Ding - Dong)
  playChime() {
    try {
      this.init();
      if (!this.ctx) return;

      const now = this.ctx.currentTime;

      // Note 1 (F5 / 698.46 Hz)
      const osc1 = this.ctx.createOscillator();
      const gain1 = this.ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(698.46, now);
      gain1.gain.setValueAtTime(0, now);
      gain1.gain.linearRampToValueAtTime(0.35, now + 0.05);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.9);
      osc1.connect(gain1);
      gain1.connect(this.ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.9);

      // Note 2 (A5 / 880 Hz) - delayed
      const osc2 = this.ctx.createOscillator();
      const gain2 = this.ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(880, now + 0.35);
      gain2.gain.setValueAtTime(0, now + 0.35);
      gain2.gain.linearRampToValueAtTime(0.4, now + 0.4);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 1.4);
      osc2.connect(gain2);
      gain2.connect(this.ctx.destination);
      osc2.start(now + 0.35);
      osc2.stop(now + 1.4);

      // Note 3 (C6 / 1046.5 Hz) - bright harmonic
      const osc3 = this.ctx.createOscillator();
      const gain3 = this.ctx.createGain();
      osc3.type = 'triangle';
      osc3.frequency.setValueAtTime(1046.5, now + 0.7);
      gain3.gain.setValueAtTime(0, now + 0.7);
      gain3.gain.linearRampToValueAtTime(0.3, now + 0.75);
      gain3.gain.exponentialRampToValueAtTime(0.001, now + 1.8);
      osc3.connect(gain3);
      gain3.connect(this.ctx.destination);
      osc3.start(now + 0.7);
      osc3.stop(now + 1.8);
    } catch (e) {
      console.warn('Audio play failed:', e);
    }
  }

  // Urgent recall chime
  playUrgentChime() {
    this.playChime();
    setTimeout(() => {
      this.playChime();
    }, 600);
  }

  // Voice announcement using browser SpeechSynthesis
  speakCall(displayCode, counterLabel) {
    try {
      if ('speechSynthesis' in window) {
        // Cancel ongoing speech
        window.speechSynthesis.cancel();

        const text = `Senha ${displayCode.replace('-', ' ')}, dirija-se à ${counterLabel}`;
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'pt-BR';
        utterance.rate = 0.95;
        utterance.pitch = 1.0;

        // Try to select a pt-BR voice
        const voices = window.speechSynthesis.getVoices();
        const ptVoice = voices.find(v => v.lang.startsWith('pt'));
        if (ptVoice) utterance.voice = ptVoice;

        // Speak after chime
        setTimeout(() => {
          window.speechSynthesis.speak(utterance);
        }, 1200);
      }
    } catch (e) {
      console.warn('Speech synthesis failed:', e);
    }
  }

  // Vibrate mobile device if supported
  vibrate() {
    try {
      if ('vibrate' in navigator) {
        navigator.vibrate([300, 150, 300, 150, 500]);
      }
    } catch (e) {
      // Ignore vibration error
    }
  }
}

export const soundManager = new SoundManager();

