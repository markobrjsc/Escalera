import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";

export type AudioPreferences = { music: number; effects: number; muted: boolean };
export type AudioScene = "silent" | "menu" | "lobby" | "game" | "results";
export type AudioCue =
  | "click" | "icon" | "cardSelect" | "open" | "close" | "scene" | "success" | "error"
  | "login" | "register" | "lobbyCreate" | "lobbyJoin" | "playerJoin" | "ready" | "unready"
  | "achievement" | "connection" | "disconnect" | "gameStart" | "deckDrop" | "shuffle"
  | "deal" | "draw" | "buy" | "flip" | "discard" | "dragStart" | "dropValid" | "dropInvalid"
  | "meld" | "meldAdd" | "merge" | "turn" | "warning" | "timeout"
  | "roundWin" | "roundLose" | "gameWin" | "gameLose";

export type PlayAudioOptions = { dedupeKey?: string; intensity?: number; variant?: number };

export const DEFAULT_AUDIO_PREFERENCES: AudioPreferences = { music: 60, effects: 72, muted: false };
const AUDIO_STORAGE_KEY = "escalera-audio-preferences-v1";

const CUES = new Set<AudioCue>(["click", "icon", "cardSelect", "open", "close", "scene", "success", "error", "login", "register", "lobbyCreate", "lobbyJoin", "playerJoin", "ready", "unready", "achievement", "connection", "disconnect", "gameStart", "deckDrop", "shuffle", "deal", "draw", "buy", "flip", "discard", "dragStart", "dropValid", "dropInvalid", "meld", "meldAdd", "merge", "turn", "warning", "timeout", "roundWin", "roundLose", "gameWin", "gameLose"]);

function clampPercent(value: unknown, fallback: number) {
  const numeric = typeof value === "number" ? value : Number(value);
  return Number.isFinite(numeric) ? Math.max(0, Math.min(100, Math.round(numeric))) : fallback;
}

type LegacyAudioPreferences = { master?: number; ui?: number; game?: number };

export function normalizeAudioPreferences(value: (Partial<AudioPreferences> & LegacyAudioPreferences) | null | undefined): AudioPreferences {
  const legacyEffects = value?.ui !== undefined || value?.game !== undefined
    ? (clampPercent(value?.ui, 64) + clampPercent(value?.game, 76)) / 2
    : undefined;
  return {
    music: clampPercent(value?.music, DEFAULT_AUDIO_PREFERENCES.music),
    effects: clampPercent(value?.effects ?? legacyEffects, DEFAULT_AUDIO_PREFERENCES.effects),
    muted: typeof value?.muted === "boolean" ? value.muted : DEFAULT_AUDIO_PREFERENCES.muted
  };
}

export function audioSceneForView(viewKey: string): AudioScene {
  if (viewKey === "game") return "game";
  if (viewKey === "lobby") return "lobby";
  return "menu";
}

export function audioCueForGameAction(type: string, merged = false): AudioCue | null {
  if (type === "draw") return "draw";
  if (type === "buy") return "buy";
  if (type === "discard") return "discard";
  if (type === "phase") return "meld";
  if (type === "meld") return merged ? "merge" : "meld";
  if (type === "add-to-meld") return "meldAdd";
  if (type === "timeout" || type === "disconnect-skip") return "timeout";
  return null;
}

export function audioCueCategory(_cue: AudioCue): "effects" {
  return "effects";
}

type WebkitWindow = Window & typeof globalThis & { webkitAudioContext?: typeof AudioContext };
type Track = { scene: AudioScene; gain: GainNode; timer: number; bar: number; barSeconds: number };

class AudioDirector {
  private context: AudioContext | null = null;
  private master: GainNode | null = null;
  private musicBus: GainNode | null = null;
  private effectsBus: GainNode | null = null;
  private limiter: DynamicsCompressorNode | null = null;
  private noiseBuffer: AudioBuffer | null = null;
  private preferences: AudioPreferences;
  private desiredScene: AudioScene = "silent";
  private track: Track | null = null;
  private lastCue = new Map<AudioCue, number>();
  private dedupe = new Map<string, number>();
  private disposed = false;
  private hidden = document.hidden;

  constructor(preferences: AudioPreferences) {
    this.preferences = preferences;
  }

  async unlock() {
    if (this.disposed) return;
    if (!this.context) {
      const Constructor = window.AudioContext ?? (window as WebkitWindow).webkitAudioContext;
      if (!Constructor) return;
      const context = new Constructor({ latencyHint: "interactive" });
      this.context = context;
      this.master = context.createGain();
      this.musicBus = context.createGain();
      this.effectsBus = context.createGain();
      this.limiter = context.createDynamicsCompressor();
      this.limiter.threshold.value = -8;
      this.limiter.knee.value = 16;
      this.limiter.ratio.value = 8;
      this.limiter.attack.value = .004;
      this.limiter.release.value = .18;
      this.musicBus.connect(this.master);
      this.effectsBus.connect(this.master);
      this.master.connect(this.limiter).connect(context.destination);
      this.noiseBuffer = this.makeNoiseBuffer(context);
      this.applyPreferences(true);
    }
    if (this.context.state === "suspended") await this.context.resume().catch(() => undefined);
    if (!this.track && this.desiredScene !== "silent") this.startScene(this.desiredScene);
  }

  configure(preferences: AudioPreferences) {
    this.preferences = normalizeAudioPreferences(preferences);
    this.applyPreferences(false);
  }

  setScene(scene: AudioScene) {
    this.desiredScene = scene;
    if (!this.context || this.context.state === "closed" || this.track?.scene === scene) return;
    this.startScene(scene);
  }

  play(cue: AudioCue, options: PlayAudioOptions = {}) {
    if (this.disposed) return;
    const nowMs = performance.now();
    if (options.dedupeKey) {
      const key = `${cue}:${options.dedupeKey}`;
      if (this.dedupe.has(key)) return;
      this.dedupe.set(key, nowMs);
      if (this.dedupe.size > 320) this.dedupe.delete(this.dedupe.keys().next().value as string);
    } else {
      const gaps: Partial<Record<AudioCue, number>> = { click: 45, icon: 55, cardSelect: 65, deal: 42, shuffle: 120, dragStart: 90, warning: 450 };
      const previous = this.lastCue.get(cue) ?? -Infinity;
      if (nowMs - previous < (gaps[cue] ?? 80)) return;
      this.lastCue.set(cue, nowMs);
    }
    if (this.preferences.muted || !this.context) return;
    const run = () => this.synth(cue, Math.max(.2, Math.min(1.25, options.intensity ?? 1)), options.variant ?? 0);
    if (this.context.state === "suspended") void this.context.resume().then(run).catch(() => undefined);
    else run();
  }

  setDocumentHidden(hidden: boolean) {
    this.hidden = hidden;
    if (!this.context) return;
    if (hidden) void this.context.suspend().catch(() => undefined);
    else void this.context.resume().catch(() => undefined);
  }

  dispose() {
    this.disposed = true;
    this.stopTrack(this.track, 0);
    this.track = null;
    void this.context?.close().catch(() => undefined);
    this.context = null;
  }

  private applyPreferences(immediate: boolean) {
    const context = this.context;
    if (!context || !this.master || !this.musicBus || !this.effectsBus) return;
    const at = context.currentTime;
    const values: Array<[AudioParam, number]> = [
      [this.master.gain, this.preferences.muted ? 0 : 1],
      [this.musicBus.gain, this.preferences.music / 100],
      [this.effectsBus.gain, this.preferences.effects / 100]
    ];
    for (const [parameter, value] of values) {
      parameter.cancelScheduledValues(at);
      if (immediate) parameter.setValueAtTime(value, at);
      else parameter.setTargetAtTime(value, at, .035);
    }
  }

  private makeNoiseBuffer(context: AudioContext) {
    const buffer = context.createBuffer(1, Math.ceil(context.sampleRate * 1.25), context.sampleRate);
    const data = buffer.getChannelData(0);
    let previous = 0;
    for (let index = 0; index < data.length; index += 1) {
      const white = Math.random() * 2 - 1;
      previous = previous * .62 + white * .38;
      data[index] = previous;
    }
    return buffer;
  }

  private output() {
    return this.effectsBus;
  }

  private tone(frequency: number, start: number, duration: number, amplitude: number, type: OscillatorType, destination: AudioNode, toFrequency?: number, attack = .008, release = .08) {
    const context = this.context; if (!context) return;
    const oscillator = context.createOscillator();
    const envelope = context.createGain();
    const end = start + duration;
    const peakAt = Math.min(end - .005, start + attack);
    const releaseAt = Math.max(peakAt, end - release);
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(Math.max(20, frequency), start);
    if (toFrequency) oscillator.frequency.exponentialRampToValueAtTime(Math.max(20, toFrequency), end);
    envelope.gain.setValueAtTime(.0001, start);
    envelope.gain.exponentialRampToValueAtTime(Math.max(.0002, amplitude), peakAt);
    envelope.gain.setValueAtTime(Math.max(.0002, amplitude), releaseAt);
    envelope.gain.exponentialRampToValueAtTime(.0001, end);
    oscillator.connect(envelope).connect(destination);
    oscillator.start(start);
    oscillator.stop(end + .02);
  }

  private noise(start: number, duration: number, amplitude: number, frequency: number, type: BiquadFilterType, destination: AudioNode, playbackRate = 1) {
    const context = this.context; if (!context || !this.noiseBuffer) return;
    const source = context.createBufferSource();
    const filter = context.createBiquadFilter();
    const envelope = context.createGain();
    const end = start + duration;
    source.buffer = this.noiseBuffer;
    source.playbackRate.value = playbackRate;
    filter.type = type;
    filter.frequency.setValueAtTime(frequency, start);
    filter.Q.value = type === "bandpass" ? 1.2 : .5;
    envelope.gain.setValueAtTime(.0001, start);
    envelope.gain.exponentialRampToValueAtTime(Math.max(.0002, amplitude), start + Math.min(.012, duration * .2));
    envelope.gain.exponentialRampToValueAtTime(.0001, end);
    source.connect(filter).connect(envelope).connect(destination);
    source.start(start, Math.random() * .18, Math.min(duration * playbackRate, 1));
  }

  private notes(frequencies: number[], start: number, step: number, duration: number, amplitude: number, destination: AudioNode, type: OscillatorType = "sine") {
    frequencies.forEach((frequency, index) => this.tone(frequency, start + index * step, duration, amplitude, type, destination));
  }

  private duck(amount = .42, duration = .7) {
    const context = this.context; const bus = this.musicBus; if (!context || !bus) return;
    const base = this.preferences.music / 100;
    const now = context.currentTime;
    bus.gain.cancelScheduledValues(now);
    bus.gain.setTargetAtTime(base * amount, now, .02);
    bus.gain.setTargetAtTime(base, now + duration, .16);
  }

  private synth(cue: AudioCue, intensity: number, variant: number) {
    const context = this.context; if (!context) return;
    const at = context.currentTime + .008;
    const output = this.output(); if (!output) return;
    const gain = intensity;
    switch (cue) {
      case "click": this.tone(460, at, .045, .035 * gain, "triangle", output, 590, .003, .025); break;
      case "icon": this.tone(690, at, .055, .038 * gain, "sine", output, 880, .003, .03); break;
      case "cardSelect": this.noise(at, .045, .045 * gain, 2200, "bandpass", output, 1.6); this.tone(310, at, .055, .018 * gain, "triangle", output); break;
      case "open": this.noise(at, .16, .025 * gain, 1800, "highpass", output, 1.25); this.notes([392, 587], at, .055, .18, .035 * gain, output, "triangle"); break;
      case "close": this.noise(at, .13, .02 * gain, 1300, "highpass", output, .9); this.notes([494, 330], at, .04, .13, .03 * gain, output, "triangle"); break;
      case "scene": this.noise(at, .36, .027 * gain, 950, "highpass", output, .72); this.notes([220, 330, 440], at + .03, .06, .32, .025 * gain, output, "sine"); break;
      case "success": this.notes([523.25, 659.25, 783.99], at, .075, .26, .045 * gain, output, "triangle"); break;
      case "error": this.noise(at, .12, .035 * gain, 420, "lowpass", output); this.notes([196, 146.83], at, .085, .2, .05 * gain, output, "sawtooth"); break;
      case "login": this.notes([392, 523.25, 659.25], at, .09, .34, .05 * gain, output, "triangle"); break;
      case "register": this.notes([392, 493.88, 587.33, 783.99], at, .075, .4, .045 * gain, output, "sine"); break;
      case "lobbyCreate": this.notes([293.66, 440, 587.33], at, .055, .34, .045 * gain, output, "triangle"); break;
      case "lobbyJoin": this.notes([329.63, 493.88, 659.25], at, .06, .3, .043 * gain, output, "sine"); break;
      case "playerJoin": this.notes([523.25, 659.25], at, .07, .24, .034 * gain, output, "sine"); break;
      case "ready": this.notes([440, 659.25], at, .065, .24, .045 * gain, output, "triangle"); break;
      case "unready": this.notes([523.25, 349.23], at, .065, .2, .035 * gain, output, "triangle"); break;
      case "achievement": this.duck(.35, 1.2); this.notes([523.25, 659.25, 783.99, 1046.5], at, .09, .52, .05 * gain, output, "sine"); this.noise(at + .15, .5, .018 * gain, 4200, "highpass", output, 1.4); break;
      case "connection": this.notes([659.25, 880], at, .06, .18, .025 * gain, output); break;
      case "disconnect": this.notes([440, 293.66], at, .07, .22, .028 * gain, output, "triangle"); break;
      case "gameStart": this.duck(.28, 1.7); this.noise(at, .38, .09 * gain, 180, "lowpass", output); this.tone(73.42, at, .7, .12 * gain, "sine", output, 110); this.notes([293.66, 369.99, 440, 587.33], at + .16, .045, .7, .045 * gain, output, "triangle"); break;
      case "deckDrop": this.noise(at, .22, .105 * gain, 240, "lowpass", output); this.tone(92.5, at, .28, .075 * gain, "sine", output, 73.42); break;
      case "shuffle": for (let index = 0; index < 3; index += 1) { const start = at + index * .105; this.noise(start, .15, .07 * gain, 1900 + index * 280, "bandpass", output, 1.25 + index * .12); } break;
      case "deal": this.noise(at, .055, .035 * gain, 1800 + (variant % 5) * 170, "bandpass", output, 1.55); this.tone(230 + (variant % 7) * 18, at, .06, .014 * gain, "triangle", output); break;
      case "draw": this.noise(at, .16, .06 * gain, 1600, "bandpass", output, 1.2); this.tone(260, at + .04, .18, .028 * gain, "triangle", output, 390); break;
      case "buy": this.noise(at, .12, .045 * gain, 1600, "bandpass", output, 1.25); this.notes([880, 1318.51], at + .035, .07, .26, .042 * gain, output, "sine"); break;
      case "flip": this.noise(at, .09, .05 * gain, 2400, "highpass", output, 1.7); this.tone(420, at, .11, .022 * gain, "triangle", output, 620); break;
      case "discard": this.noise(at, .11, .085 * gain, 720, "bandpass", output, .85); this.tone(160, at, .13, .035 * gain, "sine", output, 120); break;
      case "dragStart": this.noise(at, .06, .035 * gain, 2100, "bandpass", output, 1.35); break;
      case "dropValid": this.noise(at, .1, .055 * gain, 520, "lowpass", output); this.tone(293.66, at, .14, .035 * gain, "triangle", output, 440); break;
      case "dropInvalid": this.noise(at, .11, .045 * gain, 380, "lowpass", output); this.notes([220, 185], at, .05, .14, .035 * gain, output, "square"); break;
      case "meld": this.duck(.5, .65); this.noise(at, .16, .045 * gain, 1200, "bandpass", output); this.notes([293.66, 369.99, 440, 587.33], at, .055, .35, .045 * gain, output, "triangle"); break;
      case "meldAdd": this.noise(at, .11, .05 * gain, 950, "bandpass", output); this.notes([392, 523.25], at + .02, .06, .23, .038 * gain, output, "triangle"); break;
      case "merge": this.duck(.48, .75); this.noise(at, .2, .055 * gain, 920, "bandpass", output); this.notes([261.63, 392, 523.25, 659.25], at, .055, .36, .043 * gain, output, "sine"); break;
      case "turn": this.tone(880, at, .18, .034 * gain, "sine", output, 1174.66); break;
      case "warning": this.tone(1046.5, at, .12, .045 * gain, "sine", output); this.tone(1046.5, at + .16, .12, .035 * gain, "sine", output); break;
      case "timeout": this.duck(.5, .7); this.noise(at, .18, .045 * gain, 300, "lowpass", output); this.notes([293.66, 220, 146.83], at, .1, .28, .05 * gain, output, "sawtooth"); break;
      case "roundWin": this.duck(.3, 1.2); this.notes([392, 523.25, 659.25, 783.99], at, .1, .55, .055 * gain, output, "triangle"); break;
      case "roundLose": this.duck(.52, .8); this.notes([392, 349.23, 293.66], at, .11, .35, .04 * gain, output, "triangle"); break;
      case "gameWin": this.duck(.18, 2.2); this.noise(at + .18, .9, .025 * gain, 3900, "highpass", output, 1.35); this.notes([261.63, 329.63, 392, 523.25, 659.25, 783.99, 1046.5], at, .105, .72, .06 * gain, output, "triangle"); break;
      case "gameLose": this.duck(.42, 1.4); this.notes([392, 349.23, 293.66, 220], at, .12, .5, .045 * gain, output, "sine"); break;
    }
  }

  private startScene(scene: AudioScene) {
    const context = this.context; const musicBus = this.musicBus; if (!context || !musicBus) return;
    if (this.track) this.stopTrack(this.track, 1.2);
    this.track = null;
    if (scene === "silent") return;
    const settings: Record<Exclude<AudioScene, "silent">, { bar: number; gain: number }> = {
      // The music synth has many deliberately soft voices. Its scene envelope
      // therefore needs substantially more headroom than one-shot effects; the
      // downstream compressor still catches summed peaks at 100% volume.
      menu: { bar: 3.75, gain: .72 }, lobby: { bar: 3.2, gain: .81 }, game: { bar: 2.72, gain: .66 }, results: { bar: 4, gain: .75 }
    };
    const gain = context.createGain();
    gain.gain.setValueAtTime(.0001, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(settings[scene].gain, context.currentTime + 1.4);
    gain.connect(musicBus);
    const track: Track = { scene, gain, timer: 0, bar: 0, barSeconds: settings[scene].bar };
    this.track = track;
    this.scheduleBar(track);
    track.timer = window.setInterval(() => this.scheduleBar(track), track.barSeconds * 1000);
  }

  private stopTrack(track: Track | null, fadeSeconds: number) {
    if (!track || !this.context) return;
    window.clearInterval(track.timer);
    const now = this.context.currentTime;
    track.gain.gain.cancelScheduledValues(now);
    track.gain.gain.setValueAtTime(Math.max(.0001, track.gain.gain.value), now);
    track.gain.gain.exponentialRampToValueAtTime(.0001, now + Math.max(.01, fadeSeconds));
    window.setTimeout(() => track.gain.disconnect(), Math.max(50, fadeSeconds * 1000 + 200));
  }

  private scheduleBar(track: Track) {
    const context = this.context; if (!context || this.hidden || this.track !== track || context.state === "closed") return;
    const at = context.currentTime + .06;
    const progressions: Record<Exclude<AudioScene, "silent">, number[][]> = {
      menu: [[164.81, 196, 246.94], [146.83, 185, 220], [130.81, 164.81, 196], [146.83, 185, 246.94]],
      lobby: [[220, 261.63, 329.63], [196, 246.94, 293.66], [174.61, 220, 261.63], [196, 246.94, 329.63]],
      game: [[146.83, 174.61, 220], [130.81, 164.81, 196], [123.47, 146.83, 185], [130.81, 164.81, 220]],
      results: [[261.63, 329.63, 392], [220, 261.63, 329.63], [233.08, 293.66, 349.23], [196, 261.63, 329.63]]
    };
    const chord = progressions[track.scene as Exclude<AudioScene, "silent">][track.bar % 4];
    chord.forEach((frequency, index) => this.tone(frequency, at, track.barSeconds * .96, .026 - index * .003, index === 0 ? "sine" : "triangle", track.gain, undefined, .6, 1.1));
    this.tone(chord[0] / 2, at, track.barSeconds * .7, .035, "sine", track.gain, undefined, .08, .55);
    const steps = track.scene === "game" ? 8 : 4;
    for (let step = 0; step < steps; step += 1) {
      const note = chord[(step + track.bar) % chord.length] * (step % 3 === 2 ? 2 : 1);
      this.tone(note, at + step * track.barSeconds / steps, track.scene === "game" ? .16 : .3, track.scene === "game" ? .014 : .011, "triangle", track.gain, undefined, .012, .08);
    }
    if (track.scene === "game") {
      for (let beat = 0; beat < 4; beat += 1) this.noise(at + beat * track.barSeconds / 4, .045, .012, 420, "lowpass", track.gain);
    }
    track.bar += 1;
  }
}

type AudioApi = {
  preferences: AudioPreferences;
  setPreferences: (next: AudioPreferences | ((current: AudioPreferences) => AudioPreferences)) => void;
  play: (cue: AudioCue, options?: PlayAudioOptions) => void;
  setScene: (scene: AudioScene) => void;
  unlock: () => Promise<void>;
};

const AudioContextValue = createContext<AudioApi | null>(null);

function storedPreferences() {
  try { return normalizeAudioPreferences(JSON.parse(localStorage.getItem(AUDIO_STORAGE_KEY) ?? "null") as Partial<AudioPreferences> | null); }
  catch { return DEFAULT_AUDIO_PREFERENCES; }
}

export function AudioProvider({ children }: { children: ReactNode }) {
  const [preferences, setPreferenceState] = useState<AudioPreferences>(storedPreferences);
  const director = useRef<AudioDirector | null>(null);
  if (!director.current) director.current = new AudioDirector(preferences);

  const setPreferences = useCallback<AudioApi["setPreferences"]>((next) => {
    setPreferenceState((current) => {
      const value = normalizeAudioPreferences(typeof next === "function" ? next(current) : next);
      try { localStorage.setItem(AUDIO_STORAGE_KEY, JSON.stringify(value)); } catch { /* storage is optional */ }
      director.current?.configure(value);
      return value;
    });
  }, []);
  const play = useCallback((cue: AudioCue, options?: PlayAudioOptions) => director.current?.play(cue, options), []);
  const setScene = useCallback((scene: AudioScene) => director.current?.setScene(scene), []);
  const unlock = useCallback(async () => { await director.current?.unlock(); }, []);

  useEffect(() => { director.current?.configure(preferences); }, [preferences]);
  useEffect(() => {
    if (!director.current) director.current = new AudioDirector(preferences);
    const wake = () => { void director.current?.unlock(); };
    const buttonSound = (event: MouseEvent) => {
      const source = event.target;
      if (!(source instanceof Element)) return;
      const control = source.closest<HTMLElement>("button, [role='button'], a[href]");
      if (!control || control.dataset.audio === "silent" || control.matches(":disabled, [aria-disabled='true']")) return;
      const requested = control.dataset.audio;
      const cue = requested && CUES.has(requested as AudioCue) ? requested as AudioCue : control.matches(".button-icon, .profile-button, .avatar-button") ? "icon" : "click";
      director.current?.play(cue);
    };
    const visibility = () => director.current?.setDocumentHidden(document.hidden);
    document.addEventListener("pointerdown", wake, true);
    document.addEventListener("keydown", wake, true);
    document.addEventListener("click", buttonSound, true);
    document.addEventListener("visibilitychange", visibility);
    return () => {
      document.removeEventListener("pointerdown", wake, true);
      document.removeEventListener("keydown", wake, true);
      document.removeEventListener("click", buttonSound, true);
      document.removeEventListener("visibilitychange", visibility);
      director.current?.dispose();
      director.current = null;
    };
  }, []);

  const value = useMemo<AudioApi>(() => ({ preferences, setPreferences, play, setScene, unlock }), [preferences, play, setPreferences, setScene, unlock]);
  return <AudioContextValue.Provider value={value}>{children}</AudioContextValue.Provider>;
}

export function useAudio() {
  const value = useContext(AudioContextValue);
  if (!value) throw new Error("useAudio muss innerhalb des AudioProvider verwendet werden.");
  return value;
}
