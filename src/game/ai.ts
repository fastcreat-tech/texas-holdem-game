import type { Card, PlayerAction } from './types'
import { bestHand } from './evaluate'
import { legalActions, type HandState } from './holdem'

/** 0..1 preflop strength of two hole cards */
function preflopStrength(hole: Card[]): number {
  const [a, b] = [...hole].sort((x, y) => y.rank - x.rank)
  if (a.rank === b.rank) {
    // pocket pair: 22 ≈ 0.55, AA ≈ 0.95
    return 0.5 + (a.rank / 14) * 0.45
  }
  let s = ((a.rank + b.rank) / 28) * 0.55
  if (a.suit === b.suit) s += 0.08
  const gap = a.rank - b.rank
  if (gap === 1) s += 0.07
  else if (gap === 2) s += 0.04
  if (a.rank === 14) s += 0.06
  return Math.min(s, 0.85)
}

/** 0..1 postflop strength: made hand + draws */
function postflopStrength(hole: Card[], community: Card[]): number {
  const all = [...hole, ...community]
  const hand = bestHand(all)
  const base = [0.15, 0.32, 0.55, 0.68, 0.78, 0.82, 0.9, 0.96, 0.99][hand.category]

  let bonus = 0
  if (community.length < 5) {
    const suitCount = new Map<string, number>()
    for (const c of all) suitCount.set(c.suit, (suitCount.get(c.suit) ?? 0) + 1)
    if ([...suitCount.values()].some((n) => n === 4)) bonus += 0.12

    const ranks = [...new Set(all.map((c) => c.rank))]
    if (ranks.includes(14)) ranks.push(1) // wheel
    ranks.sort((x, y) => x - y)
    let run = 1
    let bestRun = 1
    for (let i = 1; i < ranks.length; i++) {
      run = ranks[i] === ranks[i - 1] + 1 ? run + 1 : 1
      bestRun = Math.max(bestRun, run)
    }
    if (hand.category < 4 && bestRun === 4) bonus += 0.1
  }
  if (hand.category === 1) {
    const pairRank = hole[0].rank === hole[1].rank ? hole[0].rank : 0
    if (pairRank >= 11) bonus += 0.1
  }
  return Math.min(base + bonus, 0.99)
}

/** AI decision for the given seat — randomized, bluffs occasionally, tightens multi-way */
export function decideAI(s: HandState, seat: number): PlayerAction {
  const legal = legalActions(s, seat)
  const me = s.seats[seat]
  const call = legal.callAmount
  const potNow = s.pot + s.seats.reduce((n, p) => n + p.streetBet, 0)
  const opponents = s.seats.filter((p, i) => s.inHand[i] && !p.folded && i !== seat).length

  let strength =
    s.community.length === 0
      ? preflopStrength(me.hole)
      : postflopStrength(me.hole, s.community)
  // tighten up when more players are in the pot
  strength -= 0.05 * Math.max(0, opponents - 1)
  const rnd = Math.random()

  const raiseAmount = (potFrac: number): number => {
    const target = Math.round(s.currentBet + Math.max(s.lastRaiseSize, potNow * potFrac))
    const jitter = 0.9 + Math.random() * 0.25
    const sized = Math.round((target * jitter) / 5) * 5
    return Math.max(legal.minRaiseTo, Math.min(sized, legal.maxRaiseTo))
  }

  // nothing to call
  if (call === 0) {
    if (!legal.canRaise) return { type: 'check' }
    if (strength > 0.62 && rnd < 0.7) return { type: 'raise', raiseTo: raiseAmount(0.7) }
    if (strength > 0.35) {
      if (rnd < 0.15) return { type: 'raise', raiseTo: raiseAmount(0.5) }
      return { type: 'check' }
    }
    if (rnd < 0.06) return { type: 'raise', raiseTo: raiseAmount(0.5) } // bluff
    return { type: 'check' }
  }

  // facing a bet
  const potOdds = call / (potNow + call)
  if (strength > 0.75) {
    if (legal.canRaise && rnd < 0.6) return { type: 'raise', raiseTo: raiseAmount(1) }
    return { type: 'call' }
  }
  if (strength > 0.55) {
    if (legal.canRaise && rnd < 0.2) return { type: 'raise', raiseTo: raiseAmount(0.8) }
    return { type: 'call' }
  }
  if (strength > potOdds + 0.12) return { type: 'call' }
  if (strength > potOdds && rnd < 0.55) return { type: 'call' }
  if (rnd < 0.04 && legal.canRaise) return { type: 'raise', raiseTo: raiseAmount(0.8) } // bluff-raise
  return { type: 'fold' }
}
