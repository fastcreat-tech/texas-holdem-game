/** Synthesized casino SFX via Web Audio — no assets needed. */

let ctx: AudioContext | null = null
let muted = false

export function setMuted(m: boolean) {
  muted = m
}

function ac(): AudioContext | null {
  if (muted) return null
  try {
    if (!ctx) ctx = new AudioContext()
    if (ctx.state === 'suspended') void ctx.resume()
    return ctx
  } catch {
    return null
  }
}

function tone(
  freq: number,
  dur: number,
  type: OscillatorType,
  gain: number,
  when = 0,
  slideTo?: number,
) {
  const a = ac()
  if (!a) return
  const t0 = a.currentTime + when
  const osc = a.createOscillator()
  const g = a.createGain()
  osc.type = type
  osc.frequency.setValueAtTime(freq, t0)
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur)
  g.gain.setValueAtTime(0, t0)
  g.gain.linearRampToValueAtTime(gain, t0 + 0.01)
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur)
  osc.connect(g).connect(a.destination)
  osc.start(t0)
  osc.stop(t0 + dur + 0.05)
}

function noise(dur: number, gain: number, when = 0, filterFreq = 2000) {
  const a = ac()
  if (!a) return
  const t0 = a.currentTime + when
  const len = Math.max(1, Math.floor(a.sampleRate * dur))
  const buf = a.createBuffer(1, len, a.sampleRate)
  const data = buf.getChannelData(0)
  for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1
  const src = a.createBufferSource()
  src.buffer = buf
  const f = a.createBiquadFilter()
  f.type = 'bandpass'
  f.frequency.value = filterFreq
  f.Q.value = 0.8
  const g = a.createGain()
  g.gain.setValueAtTime(gain, t0)
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur)
  src.connect(f).connect(g).connect(a.destination)
  src.start(t0)
}

export const sfx = {
  chip() {
    tone(2400, 0.06, 'square', 0.08)
    tone(3100, 0.05, 'square', 0.06, 0.03)
  },
  deal() {
    noise(0.12, 0.12, 0, 1600)
    tone(320, 0.1, 'sine', 0.05, 0, 180)
  },
  flip() {
    noise(0.08, 0.1, 0, 3200)
  },
  shuffle() {
    for (let i = 0; i < 8; i++) noise(0.07, 0.06, i * 0.07, 1400 + (i % 3) * 500)
  },
  win() {
    const notes = [523.25, 659.25, 783.99, 1046.5]
    notes.forEach((f, i) => tone(f, 0.35, 'triangle', 0.12, i * 0.09))
  },
  bigWin() {
    const notes = [392, 523.25, 659.25, 783.99, 1046.5, 1318.5]
    notes.forEach((f, i) => tone(f, 0.4, 'triangle', 0.12, i * 0.08))
  },
  push() {
    tone(440, 0.15, 'sine', 0.08)
    tone(440, 0.15, 'sine', 0.08, 0.2)
  },
  lose() {
    tone(220, 0.3, 'sine', 0.08, 0, 110)
  },
  click() {
    tone(1200, 0.04, 'square', 0.05)
  },
  deal2() {
    noise(0.1, 0.1, 0, 1800)
  },
}
