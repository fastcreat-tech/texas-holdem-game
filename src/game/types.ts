export type Suit = 'spades' | 'hearts' | 'diamonds' | 'clubs'

export interface Card {
  suit: Suit
  rank: number // 2..14 (14 = A)
}

export type Street = 'preflop' | 'flop' | 'turn' | 'river' | 'showdown'

export type ActionType = 'fold' | 'check' | 'call' | 'raise'

export interface PlayerAction {
  type: ActionType
  /** raise-to total for the current street (only when type === 'raise') */
  raiseTo?: number
}
