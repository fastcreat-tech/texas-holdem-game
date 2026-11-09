import type { Card, PlayerAction, Street } from './types'
import { buildDeck, shuffle } from './cards'
import { bestHand } from './evaluate'

export const SEATS = 6
export const SMALL_BLIND = 25
export const BIG_BLIND = 50

export interface SeatState {
  stack: number
  /** chips committed this street */
  streetBet: number
  /** chips committed this hand */
  totalBet: number
  hole: Card[]
  folded: boolean
  allIn: boolean
}

export interface PotResult {
  amount: number
  winners: number[]
  handName: string | null
}

export interface HandState {
  deck: Card[]
  community: Card[]
  pot: number
  street: Street
  button: number
  acting: number
  currentBet: number
  lastRaiseSize: number
  acted: boolean[]
  seats: SeatState[]
  /** seats dealt into this hand (had chips at hand start) */
  inHand: boolean[]
  /** stacks when the hand began (for deltas) */
  startStacks: number[]
  handOver: boolean
  handNumber: number
  results: PotResult[] | null
  showdownNames: (string | null)[] | null
}

function nextInHand(s: { inHand: boolean[] }, from: number): number {
  for (let k = 1; k <= SEATS; k++) {
    const i = (from + k) % SEATS
    if (s.inHand[i]) return i
  }
  return from
}

function liveCount(s: HandState): number {
  return s.seats.reduce((n, p, i) => n + (s.inHand[i] && !p.folded ? 1 : 0), 0)
}

/** next seat that can still take an action (in hand, not folded, not all-in) */
function nextActor(s: HandState, from: number): number | null {
  for (let k = 1; k <= SEATS; k++) {
    const i = (from + k) % SEATS
    const p = s.seats[i]
    if (s.inHand[i] && !p.folded && !p.allIn) return i
  }
  return null
}

export function newHand(stacks: number[], button: number, handNumber: number): HandState {
  const deck = shuffle(buildDeck())
  const inHand = stacks.map((v) => v > 0)
  const liveSeats = inHand.filter(Boolean).length

  const s: HandState = {
    deck,
    community: [],
    pot: 0,
    street: 'preflop',
    button,
    acting: 0,
    currentBet: 0,
    lastRaiseSize: BIG_BLIND,
    acted: Array(SEATS).fill(false),
    seats: stacks.map((stack) => ({
      stack,
      streetBet: 0,
      totalBet: 0,
      hole: [],
      folded: false,
      allIn: false,
    })),
    inHand,
    startStacks: [...stacks],
    handOver: false,
    handNumber,
    results: null,
    showdownNames: null,
  }

  // heads-up: button is the small blind; 3+ handed: seat after button
  const sbSeat = liveSeats === 2 ? button : nextInHand(s, button)
  const bbSeat = nextInHand(s, sbSeat)
  postBlind(s, sbSeat, SMALL_BLIND)
  postBlind(s, bbSeat, BIG_BLIND)
  s.currentBet = Math.max(s.seats[sbSeat].streetBet, s.seats[bbSeat].streetBet)

  // deal two cards to each live seat, starting with the small blind
  for (let r = 0; r < 2; r++) {
    let i = sbSeat
    for (let k = 0; k < liveSeats; k++) {
      s.seats[i].hole.push(deck.pop()!)
      i = nextInHand(s, i)
    }
  }

  // preflop: UTG (left of BB); heads-up the button/SB acts first
  s.acting = liveSeats === 2 ? button : nextInHand(s, bbSeat)
  // if that seat is all-in from blinds, find the next who can act
  if (s.seats[s.acting].allIn) s.acting = nextActor(s, s.acting) ?? s.acting
  return s
}

function postBlind(s: HandState, seat: number, amount: number) {
  const p = s.seats[seat]
  const paid = Math.min(amount, p.stack)
  p.stack -= paid
  p.streetBet += paid
  p.totalBet += paid
  if (p.stack === 0) p.allIn = true
}

export function toCall(s: HandState, seat: number): number {
  return s.currentBet - s.seats[seat].streetBet
}

export interface LegalActions {
  canFold: boolean
  canCheck: boolean
  canCall: boolean
  callAmount: number
  canRaise: boolean
  minRaiseTo: number
  maxRaiseTo: number
}

export function legalActions(s: HandState, seat: number): LegalActions {
  const p = s.seats[seat]
  const call = Math.min(Math.max(toCall(s, seat), 0), p.stack)
  const maxTo = p.streetBet + p.stack
  const minTo = Math.min(s.currentBet + s.lastRaiseSize, maxTo)
  return {
    canFold: call > 0,
    canCheck: call === 0,
    canCall: call > 0,
    callAmount: call,
    canRaise: p.stack > call && maxTo > s.currentBet,
    minRaiseTo: minTo,
    maxRaiseTo: maxTo,
  }
}

function clone(s: HandState): HandState {
  return {
    ...s,
    seats: s.seats.map((p) => ({ ...p, hole: [...p.hole] })),
    community: [...s.community],
    deck: [...s.deck],
    acted: [...s.acted],
    inHand: [...s.inHand],
    startStacks: [...s.startStacks],
    results: s.results ? s.results.map((r) => ({ ...r, winners: [...r.winners] })) : null,
    showdownNames: s.showdownNames ? [...s.showdownNames] : null,
  }
}

function streetComplete(s: HandState): boolean {
  for (let i = 0; i < SEATS; i++) {
    const p = s.seats[i]
    if (!s.inHand[i] || p.folded || p.allIn) continue
    if (!s.acted[i] || p.streetBet !== s.currentBet) return false
  }
  return true
}

function sweepBets(s: HandState) {
  for (const p of s.seats) {
    s.pot += p.streetBet
    p.streetBet = 0
  }
  s.currentBet = 0
  s.lastRaiseSize = BIG_BLIND
  s.acted = s.acted.map(() => false)
}

/** apply an action; returns a new state (input is not mutated) */
export function applyAction(s: HandState, seat: number, action: PlayerAction): HandState {
  const n = clone(s)
  const p = n.seats[seat]
  const legal = legalActions(n, seat)

  if (action.type === 'fold') {
    if (!legal.canFold) throw new Error('illegal fold')
    p.folded = true
    n.acted[seat] = true
    if (liveCount(n) === 1) {
      const winner = n.seats.findIndex((q, i) => n.inHand[i] && !q.folded)
      return finishFoldWin(n, winner)
    }
  } else if (action.type === 'check') {
    if (!legal.canCheck) throw new Error('illegal check')
    n.acted[seat] = true
  } else if (action.type === 'call') {
    const amt = legal.callAmount
    p.stack -= amt
    p.streetBet += amt
    p.totalBet += amt
    if (p.stack === 0) p.allIn = true
    n.acted[seat] = true
  } else {
    if (!legal.canRaise) throw new Error('illegal raise')
    const raiseTo = Math.max(
      legal.minRaiseTo,
      Math.min(action.raiseTo ?? legal.minRaiseTo, legal.maxRaiseTo),
    )
    const size = raiseTo - n.currentBet
    if (size >= n.lastRaiseSize) n.lastRaiseSize = size
    const amt = raiseTo - p.streetBet
    p.stack -= amt
    p.streetBet = raiseTo
    p.totalBet += amt
    if (p.stack === 0) p.allIn = true
    n.currentBet = raiseTo
    n.acted = n.acted.map(() => false)
    n.acted[seat] = true
  }

  if (streetComplete(n)) return advanceStreet(n)
  const next = nextActor(n, seat)
  n.acting = next ?? n.acting
  return n
}

/** advance the hand automatically when no further action is possible on this street */
export function ensureProgress(s: HandState): HandState {
  if (!s.handOver && streetComplete(s)) return advanceStreet(s)
  return s
}

function finishFoldWin(n: HandState, winner: number): HandState {
  sweepBets(n)
  n.handOver = true
  n.street = 'showdown'
  n.seats[winner].stack += n.pot
  n.results = [{ amount: n.pot, winners: [winner], handName: null }]
  n.pot = 0
  return n
}

export function runOut(n: HandState): HandState {
  while (n.community.length < 5) {
    const target = n.community.length < 3 ? 3 : n.community.length + 1
    while (n.community.length < target) n.community.push(n.deck.pop()!)
  }
  return n
}

function advanceStreet(n: HandState): HandState {
  sweepBets(n)
  if (n.street === 'river') return showdown(n)

  // fewer than 2 seats can still bet → run the board out
  const canAct = n.seats.filter((p, i) => n.inHand[i] && !p.folded && !p.allIn).length
  if (canAct < 2) {
    runOut(n)
    return showdown(n)
  }

  n.street = n.street === 'preflop' ? 'flop' : n.street === 'flop' ? 'turn' : 'river'
  if (n.street === 'flop') {
    n.community.push(n.deck.pop()!, n.deck.pop()!, n.deck.pop()!)
  } else {
    n.community.push(n.deck.pop()!)
  }
  n.acting = nextActor(n, n.button) ?? n.acting
  return n
}

/** build side pots from totalBet; folded chips stay in but folded seats cannot win */
function buildPots(s: HandState): { amount: number; eligible: number[] }[] {
  const remaining = s.seats.map((p) => p.totalBet)
  const pots: { amount: number; eligible: number[] }[] = []
  for (;;) {
    const contributors = remaining.map((v, i) => (v > 0 ? i : -1)).filter((i) => i >= 0)
    if (contributors.length === 0) break
    const level = Math.min(...contributors.map((i) => remaining[i]))
    const amount = level * contributors.length
    const eligible = contributors.filter((i) => !s.seats[i].folded)
    for (const i of contributors) remaining[i] -= level
    if (eligible.length === 0) continue
    const last = pots[pots.length - 1]
    if (last && last.eligible.length === eligible.length && last.eligible.every((v, j) => v === eligible[j])) {
      last.amount += amount
    } else {
      pots.push({ amount, eligible })
    }
  }
  return pots
}

function showdown(n: HandState): HandState {
  runOut(n)
  // bets were already swept by advanceStreet / streetComplete path
  n.handOver = true
  n.street = 'showdown'

  const names: (string | null)[] = n.seats.map((p, i) =>
    n.inHand[i] && !p.folded ? bestHand([...p.hole, ...n.community]).name : null,
  )
  n.showdownNames = names

  const results: PotResult[] = []
  for (const pot of buildPots(n)) {
    let bestScore = -1
    let winners: number[] = []
    for (const i of pot.eligible) {
      const { score } = bestHand([...n.seats[i].hole, ...n.community])
      if (score > bestScore) {
        bestScore = score
        winners = [i]
      } else if (score === bestScore) {
        winners.push(i)
      }
    }
    const share = Math.floor(pot.amount / winners.length)
    for (const w of winners) n.seats[w].stack += share
    // odd chips go to the winner(s) closest left of the button
    let remainder = pot.amount - share * winners.length
    const ordered = [...winners].sort(
      (a, b) =>
        ((a - n.button - 1 + SEATS) % SEATS) - ((b - n.button - 1 + SEATS) % SEATS),
    )
    for (let i = 0; remainder > 0; i = (i + 1) % ordered.length, remainder--) {
      n.seats[ordered[i]].stack += 1
    }
    results.push({
      amount: pot.amount,
      winners,
      handName: names[winners[0]],
    })
  }
  n.results = results
  n.pot = 0
  return n
}

/** a seat's current best hand name (UI display) */
export function currentHandName(hole: Card[], community: Card[]): string {
  if (community.length === 0) return bestHand(hole).name
  return bestHand([...hole, ...community]).name
}

/** next live seat with chips, for rotating the button between hands */
export function nextLiveSeat(stacks: number[], from: number): number {
  for (let k = 1; k <= SEATS; k++) {
    const i = (from + k) % SEATS
    if (stacks[i] > 0) return i
  }
  return from
}
