import { useCallback, useEffect, useRef, useState } from 'react'
import {
  newHand,
  applyAction,
  ensureProgress,
  legalActions,
  nextLiveSeat,
  SEATS,
  type HandState,
  type LegalActions,
} from '@/game/holdem'
import { bestHand } from '@/game/evaluate'
import { decideAI } from '@/game/ai'
import type { PlayerAction } from '@/game/types'
import { sfx, setMuted } from '@/game/sound'

export const PLAYER = 0

export type Phase = 'idle' | 'playing' | 'handOver'

export interface HistoryEntry {
  handNumber: number
  /** player's chip delta (negative = lost) */
  delta: number
  playerHand: string
  winnerNames: string
  showdown: boolean
}

export interface Stats {
  hands: number
  playerWins: number
  biggestWin: number
  eliminations: number
}

const START_STACK = 10000
const SAVE_KEY = 'holdem6-save-v1'

export const AI_NAMES = ['阿豪', 'Linda', '老周', 'Vicky', '坤哥']

export function seatName(seat: number): string {
  return seat === PLAYER ? '你' : AI_NAMES[seat - 1]
}

interface Save {
  stacks: number[]
  button: number
  handNumber: number
  history: HistoryEntry[]
  stats: Stats
  muted: boolean
}

function loadSave(): Save | null {
  try {
    const raw = localStorage.getItem(SAVE_KEY)
    if (!raw) return null
    const p = JSON.parse(raw) as Save
    if (!Array.isArray(p.stacks) || p.stacks.length !== SEATS) return null
    if (p.stacks.some((v) => typeof v !== 'number' || !isFinite(v) || v < 0)) return null
    return p
  } catch {
    return null
  }
}

const freshStacks = () => Array(SEATS).fill(START_STACK) as number[]

export function useHoldem() {
  const saved = useRef<Save | null>(loadSave())

  const [hand, setHand] = useState<HandState | null>(null)
  const [phase, setPhase] = useState<Phase>('idle')
  const [boardShown, setBoardShown] = useState(0)
  const [showdownReveal, setShowdownReveal] = useState(false)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('点击「开始发牌」入座')
  const [actionTags, setActionTags] = useState<(string | null)[]>(Array(SEATS).fill(null))
  const [stacks, setStacks] = useState<number[]>(saved.current?.stacks ?? freshStacks())
  const [button, setButton] = useState(saved.current?.button ?? 0)
  const [handNumber, setHandNumber] = useState(saved.current?.handNumber ?? 0)
  const [history, setHistory] = useState<HistoryEntry[]>(saved.current?.history ?? [])
  const [stats, setStats] = useState<Stats>(
    saved.current?.stats ?? { hands: 0, playerWins: 0, biggestWin: 0, eliminations: 0 },
  )
  const [muted, setMutedState] = useState(saved.current?.muted ?? false)

  const timersRef = useRef<number[]>([])
  const flowRef = useRef<(s: HandState) => void>(() => {})
  const boardShownRef = useRef(0)

  useEffect(() => {
    setMuted(muted)
  }, [muted])

  useEffect(() => () => timersRef.current.forEach(clearTimeout), [])

  useEffect(() => {
    try {
      localStorage.setItem(
        SAVE_KEY,
        JSON.stringify({ stacks, button, handNumber, history, stats, muted }),
      )
    } catch {
      /* session-only */
    }
  }, [stacks, button, handNumber, history, stats, muted])

  const later = (fn: () => void, ms: number) => {
    timersRef.current.push(window.setTimeout(fn, ms))
  }

  const setBoard = (n: number) => {
    boardShownRef.current = n
    setBoardShown(n)
  }

  const revealBoard = useCallback((target: number, done: () => void) => {
    const step = () => {
      const next = boardShownRef.current + 1
      if (next > target) {
        later(done, 450)
        return
      }
      sfx.deal()
      setBoard(next)
      later(step, 380)
    }
    later(step, 100)
  }, [])

  const tagFor = (s: HandState, seat: number, action: PlayerAction, callAmt: number): string => {
    if (action.type === 'fold') return '弃牌'
    if (action.type === 'check') return '过牌'
    if (action.type === 'call')
      return s.seats[seat].allIn ? `全下 ${s.seats[seat].totalBet}` : `跟注 ${callAmt}`
    return s.seats[seat].allIn && s.seats[seat].stack === 0 && action.raiseTo === s.seats[seat].streetBet
      ? `全下 ${s.seats[seat].totalBet}`
      : `加注到 ${action.raiseTo}`
  }

  const aiTurn = useCallback((s: HandState) => {
    setBusy(true)
    const seat = s.acting
    setMessage(`${seatName(seat)} 思考中…`)
    later(() => {
      const action = decideAI(s, seat)
      const callAmt = legalActions(s, seat).callAmount
      const next = applyAction(s, seat, action)
      if (action.type === 'raise' || action.type === 'call') sfx.chip()
      else if (action.type === 'check') sfx.click()
      setActionTags((tags) => {
        const t = [...tags]
        t[seat] = tagFor(next, seat, action, callAmt)
        return t
      })
      flowRef.current(next)
    }, 600 + Math.random() * 600)
  }, [])

  const finishHand = useCallback((s: HandState) => {
    const isShowdown = s.street === 'showdown' && (s.showdownNames?.some(Boolean) ?? false)
    if (isShowdown) setShowdownReveal(true)

    const playerDelta = s.seats[PLAYER].stack - s.startStacks[PLAYER]
    const playerHand = bestHand([...s.seats[PLAYER].hole, ...s.community]).name
    const results = s.results ?? []
    const playerWon = results.reduce((n, r) => n + (r.winners.includes(PLAYER) ? 1 : 0), 0)

    later(() => {
      if (playerWon > 0) {
        const total = results
          .filter((r) => r.winners.includes(PLAYER))
          .reduce((sum, r) => sum + Math.floor(r.amount / r.winners.length), 0)
        if (total >= 3000) sfx.bigWin()
        else sfx.win()
        const name = results.find((r) => r.winners.includes(PLAYER))?.handName
        setMessage(
          name
            ? `你以 ${name} 赢下 ${total.toLocaleString()}`
            : `你拿下底池 ${total.toLocaleString()}`,
        )
      } else if (results.length > 0) {
        sfx.lose()
        const main = [...results].sort((a, b) => b.amount - a.amount)[0]
        const w = main.winners.map(seatName).join('、')
        setMessage(
          main.handName
            ? `${w} 以 ${main.handName} 赢下 ${main.amount.toLocaleString()}`
            : `${w} 拿下底池 ${main.amount.toLocaleString()}`,
        )
      }
      const newStacks = s.seats.map((p) => p.stack)
      setStacks(newStacks)
      setStats((prev) => ({
        hands: prev.hands + 1,
        playerWins: prev.playerWins + (playerWon > 0 ? 1 : 0),
        biggestWin: Math.max(
          prev.biggestWin,
          results
            .filter((r) => r.winners.includes(PLAYER))
            .reduce((sum, r) => sum + Math.floor(r.amount / r.winners.length), 0),
        ),
        eliminations:
          prev.eliminations +
          s.seats.filter((p, i) => i !== PLAYER && s.startStacks[i] > 0 && p.stack === 0).length,
      }))
      setHistory((h) =>
        [
          ...h,
          {
            handNumber: s.handNumber,
            delta: playerDelta,
            playerHand,
            winnerNames: results
              .flatMap((r) => r.winners.map(seatName))
              .filter((v, i, a) => a.indexOf(v) === i)
              .join('、'),
            showdown: isShowdown,
          },
        ].slice(-40),
      )
      setPhase('handOver')
      setBusy(false)
    }, isShowdown ? 1100 : 500)
  }, [])

  const flow = useCallback(
    (raw: HandState) => {
      const s = ensureProgress(raw)
      setHand(s)
      if (s.handOver) {
        finishHand(s)
        return
      }
      if (s.community.length > boardShownRef.current) {
        revealBoard(s.community.length, () => flowRef.current(s))
        return
      }
      const seat = s.acting
      const p = s.seats[seat]
      if (seat === PLAYER && !p.folded && !p.allIn) {
        setBusy(false)
        setMessage('轮到你行动')
      } else if (p.folded || p.allIn) {
        // should not happen (ensureProgress covers it), but never stall
        flowRef.current(ensureProgress(s))
      } else {
        aiTurn(s)
      }
    },
    [aiTurn, finishHand, revealBoard],
  )

  useEffect(() => {
    flowRef.current = flow
  }, [flow])

  const startHand = useCallback(
    (stacksOverride?: number[], buttonOverride?: number) => {
      timersRef.current.forEach(clearTimeout)
      timersRef.current = []
      const st = stacksOverride ?? stacks
      const bt = buttonOverride ?? button
      if (st[PLAYER] <= 0) return
      const live = st.filter((v) => v > 0).length
      if (live < 2) return
      sfx.shuffle()
      const hn = handNumber + 1
      const s = newHand(st, bt, hn)
      setHandNumber(hn)
      setBoard(0)
      setShowdownReveal(false)
      setActionTags(Array(SEATS).fill(null))
      setPhase('playing')
      setBusy(true)
      setMessage(`第 ${hn} 手 · 盲注 25/50`)
      later(() => {
        sfx.deal()
        flow(s)
      }, 700)
    },
    [stacks, button, handNumber, flow],
  )

  const playerAct = useCallback(
    (action: PlayerAction) => {
      if (!hand || phase !== 'playing' || busy || hand.acting !== PLAYER) return
      setBusy(true)
      const callAmt = legalActions(hand, PLAYER).callAmount
      const next = applyAction(hand, PLAYER, action)
      if (action.type === 'raise' || action.type === 'call') sfx.chip()
      else if (action.type === 'check') sfx.click()
      setActionTags((tags) => {
        const t = [...tags]
        t[PLAYER] = tagFor(next, PLAYER, action, callAmt)
        return t
      })
      flow(next)
    },
    [hand, phase, busy, flow],
  )

  const nextHand = useCallback(() => {
    sfx.click()
    const nb = nextLiveSeat(stacks, button)
    setButton(nb)
    startHand(stacks, nb)
  }, [stacks, button, startHand])

  const resetAll = useCallback(() => {
    sfx.click()
    timersRef.current.forEach(clearTimeout)
    timersRef.current = []
    setStacks(freshStacks())
    setButton(0)
    setHandNumber(0)
    setHistory([])
    setStats({ hands: 0, playerWins: 0, biggestWin: 0, eliminations: 0 })
    setHand(null)
    setPhase('idle')
    setBoard(0)
    setShowdownReveal(false)
    setActionTags(Array(SEATS).fill(null))
    setMessage('新的一桌，点击「开始发牌」')
  }, [])

  const legal: LegalActions | null =
    hand && phase === 'playing' && !busy && hand.acting === PLAYER
      ? legalActions(hand, PLAYER)
      : null

  const pot = hand ? hand.pot + hand.seats.reduce((n, p) => n + p.streetBet, 0) : 0
  const liveAi = stacks.filter((v, i) => i !== PLAYER && v > 0).length

  return {
    hand,
    phase,
    boardShown,
    showdownReveal,
    busy,
    message,
    actionTags,
    stacks,
    button,
    handNumber,
    history,
    stats,
    muted,
    pot,
    legal,
    liveAi,
    playerBroke: stacks[PLAYER] <= 0 && phase !== 'playing',
    victory: liveAi === 0 && phase !== 'playing' && stats.hands > 0,
    startHand,
    playerAct,
    nextHand,
    resetAll,
    toggleMute: () => setMutedState((m) => !m),
  }
}
