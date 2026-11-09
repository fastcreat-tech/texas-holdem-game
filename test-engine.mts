/** engine smoke tests: evaluator + random-game chip conservation */
import { bestHand } from './src/game/evaluate'
import { newHand, applyAction, ensureProgress, legalActions, SEATS } from './src/game/holdem'
import { decideAI } from './src/game/ai'
import type { Card } from './src/game/types'

const C = (rank: number, suit: Card['suit']): Card => ({ rank, suit })
let failures = 0
const assert = (cond: boolean, msg: string) => {
  if (!cond) {
    failures++
    console.error('FAIL:', msg)
  }
}

// ── evaluator ──
const sf = bestHand([C(14, 'spades'), C(13, 'spades'), C(12, 'spades'), C(11, 'spades'), C(10, 'spades'), C(2, 'hearts'), C(3, 'clubs')])
assert(sf.category === 8 && sf.name === '皇家同花顺', `royal flush got ${sf.name}`)

const quads = bestHand([C(9, 'spades'), C(9, 'hearts'), C(9, 'diamonds'), C(9, 'clubs'), C(2, 'hearts'), C(3, 'clubs'), C(5, 'spades')])
assert(quads.category === 7, `quads got ${quads.name}`)

const wheel = bestHand([C(14, 'spades'), C(2, 'hearts'), C(3, 'diamonds'), C(4, 'clubs'), C(5, 'hearts'), C(9, 'clubs'), C(11, 'spades')])
assert(wheel.category === 4, `wheel straight got ${wheel.name}`)

const sixHigh = bestHand([C(6, 'spades'), C(2, 'hearts'), C(3, 'diamonds'), C(4, 'clubs'), C(5, 'hearts'), C(9, 'clubs'), C(11, 'spades')])
assert(sixHigh.score > wheel.score, '6-high straight should beat wheel')

const flush = bestHand([C(14, 'spades'), C(10, 'spades'), C(8, 'spades'), C(6, 'spades'), C(2, 'spades'), C(9, 'clubs'), C(11, 'hearts')])
assert(flush.category === 5 && flush.score > sixHigh.score, 'flush beats straight')

const twoPairKicker = bestHand([C(14, 'spades'), C(14, 'hearts'), C(9, 'diamonds'), C(9, 'clubs'), C(13, 'hearts'), C(2, 'clubs'), C(3, 'spades')])
const twoPairLowKicker = bestHand([C(14, 'spades'), C(14, 'hearts'), C(9, 'diamonds'), C(9, 'clubs'), C(12, 'hearts'), C(2, 'clubs'), C(3, 'spades')])
assert(twoPairKicker.score > twoPairLowKicker.score, 'kicker decides two pair')

// ── random games: chip conservation + no crashes ──
for (let game = 0; game < 60; game++) {
  let stacks = Array.from({ length: SEATS }, () => (game < 10 ? [30, 10000, 75, 10000, 10000, 10000][game % 6] : 10000))
  // give varied stacks sometimes
  if (game % 3 === 0) stacks = stacks.map((v, i) => (i === game % 6 ? 120 : v))
  const totalChips = stacks.reduce((a, b) => a + b, 0)
  let button = 0
  for (let h = 0; h < 12; h++) {
    if (stacks.filter((v) => v > 0).length < 2) break
    let s = newHand(stacks, button, h + 1)
    let guard = 0
    while (!s.handOver && guard++ < 300) {
      s = ensureProgress(s)
      if (s.handOver) break
      const seat = s.acting
      const legal = legalActions(s, seat)
      const rnd = Math.random()
      const action =
        !legal.canCheck && rnd < 0.15
          ? { type: 'fold' as const }
          : legal.canRaise && rnd > 0.85
            ? { type: 'raise' as const, raiseTo: legal.minRaiseTo }
            : legal.canCall
              ? { type: 'call' as const }
              : { type: 'check' as const }
      s = applyAction(s, seat, action)
    }
    assert(guard < 300, `game ${game} hand ${h} did not terminate`)
    assert(s.handOver, `game ${game} hand ${h} not over`)
    assert(s.results !== null && s.results.length > 0, `game ${game} hand ${h} has results`)
    stacks = s.seats.map((p) => p.stack)
    const after = stacks.reduce((a, b) => a + b, 0)
    assert(after === totalChips, `chips not conserved game ${game} hand ${h}: ${after} != ${totalChips}`)
    assert(s.seats.every((p) => p.stack >= 0), 'negative stack')
    assert(s.seats.every((p) => p.streetBet === 0), 'streetBet swept')
    assert(s.pot === 0, 'pot emptied')
    button = (button + 1) % SEATS
    while (stacks[button] <= 0) button = (button + 1) % SEATS
  }
}

// ── AI sanity: never throws, action always legal ──
for (let t = 0; t < 40; t++) {
  const stacks = [10000, 800, 10000, 5000, 10000, 200]
  let s = newHand(stacks, 3, 1)
  let guard = 0
  while (!s.handOver && guard++ < 300) {
    s = ensureProgress(s)
    if (s.handOver) break
    const seat = s.acting
    const a = decideAI(s, seat)
    const legal = legalActions(s, seat)
    const ok =
      (a.type === 'fold' && legal.canFold) ||
      (a.type === 'check' && legal.canCheck) ||
      (a.type === 'call' && legal.canCall) ||
      (a.type === 'raise' && legal.canRaise)
    assert(ok, `AI illegal action ${a.type} at seat ${seat}`)
    s = applyAction(s, seat, a)
  }
}

console.log(failures === 0 ? 'ALL ENGINE TESTS PASSED' : `${failures} FAILURES`)
process.exit(failures === 0 ? 0 : 1)
