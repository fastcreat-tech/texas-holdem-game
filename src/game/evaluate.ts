import type { Card } from './types'

export const CATEGORY_NAMES = [
  '高牌',
  '一对',
  '两对',
  '三条',
  '顺子',
  '同花',
  '葫芦',
  '四条',
  '同花顺',
] as const

export interface HandScore {
  /** comparable number — bigger wins */
  score: number
  /** 0..8 */
  category: number
  name: string
}

const BASE = 15

/** score a 5-card hand: category * 15^5 + tiebreak ranks in base 15 */
function evaluate5(cards: Card[]): number {
  const ranks = cards.map((c) => c.rank).sort((a, b) => b - a)
  const flush = cards.every((c) => c.suit === cards[0].suit)

  // straight detection (wheel counts as 5-high)
  const unique = [...new Set(ranks)]
  let straightHigh = 0
  if (unique.length === 5) {
    if (unique[0] - unique[4] === 4) straightHigh = unique[0]
    else if (unique[0] === 14 && unique[1] === 5 && unique[4] === 2) straightHigh = 5
  }

  // rank counts, groups ordered by count then rank
  const counts = new Map<number, number>()
  for (const r of ranks) counts.set(r, (counts.get(r) ?? 0) + 1)
  const groups = [...counts.entries()].sort((a, b) => b[1] - a[1] || b[0] - a[0])

  const pack = (category: number, tiebreak: number[]) => {
    let s = category
    for (const t of tiebreak) s = s * BASE + t
    // pad remaining slots
    for (let i = tiebreak.length; i < 5; i++) s = s * BASE
    return s
  }

  if (flush && straightHigh) return pack(8, [straightHigh])
  if (groups[0][1] === 4) return pack(7, [groups[0][0], groups[1][0]])
  if (groups[0][1] === 3 && groups[1][1] === 2) return pack(6, [groups[0][0], groups[1][0]])
  if (flush) return pack(5, ranks)
  if (straightHigh) return pack(4, [straightHigh])
  if (groups[0][1] === 3)
    return pack(3, [groups[0][0], groups[1][0], groups[2][0]])
  if (groups[0][1] === 2 && groups[1][1] === 2)
    return pack(2, [groups[0][0], groups[1][0], groups[2][0]])
  if (groups[0][1] === 2)
    return pack(1, [groups[0][0], groups[1][0], groups[2][0], groups[3][0]])
  return pack(0, ranks)
}

function categoryOf(score: number): { category: number; name: string } {
  let s = score
  const slots: number[] = []
  for (let i = 0; i < 6; i++) {
    slots.unshift(s % BASE)
    s = Math.floor(s / BASE)
  }
  const category = slots[0]
  let name: string = CATEGORY_NAMES[category]
  if (category === 8 && slots[1] === 14) name = '皇家同花顺'
  return { category, name }
}

/** best 5-card hand out of 7 (or fewer) cards */
export function bestHand(cards: Card[]): HandScore {
  if (cards.length < 5) {
    // preflop: score by high cards / pair for display only
    const ranks = cards.map((c) => c.rank).sort((a, b) => b - a)
    const pair = ranks[0] === ranks[1]
    const s = pair ? 1 : 0
    return { score: s, category: pair ? 1 : 0, name: pair ? '一对' : '高牌' }
  }
  let best = -1
  const n = cards.length
  for (let a = 0; a < n - 4; a++)
    for (let b = a + 1; b < n - 3; b++)
      for (let c = b + 1; c < n - 2; c++)
        for (let d = c + 1; d < n - 1; d++)
          for (let e = d + 1; e < n; e++) {
            const s = evaluate5([cards[a], cards[b], cards[c], cards[d], cards[e]])
            if (s > best) best = s
          }
  const { category, name } = categoryOf(best)
  return { score: best, category, name }
}

/** compare two 7-card hands: 1 / -1 / 0 */
export function compareHands(a: Card[], b: Card[]): number {
  const sa = bestHand(a).score
  const sb = bestHand(b).score
  return sa > sb ? 1 : sa < sb ? -1 : 0
}
