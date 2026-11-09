import { rankLabel } from '@/game/cards'
import type { Card } from '@/game/types'
import { cn } from '@/lib/utils'

const SUIT_GLYPH: Record<string, string> = {
  spades: '♠',
  hearts: '♥',
  diamonds: '♦',
  clubs: '♣',
}

export interface DisplayCard {
  card: Card
  faceUp: boolean
  key: string
}

export function PlayingCard({
  hc,
  index,
  size = 'lg',
}: {
  hc: DisplayCard
  index: number
  size?: 'lg' | 'sm'
}) {
  const red = hc.card.suit === 'hearts' || hc.card.suit === 'diamonds'
  const label = rankLabel(hc.card.rank)
  const glyph = SUIT_GLYPH[hc.card.suit]
  return (
    <div
      className={cn('card-scene animate-deal', size === 'sm' && 'card-scene-sm')}
      style={{ animationDelay: `${index * 60}ms` }}
    >
      <div className={cn('card-inner', hc.faceUp && 'card-flipped')}>
        {/* back */}
        <div className="card-face card-back" aria-hidden="true">
          <div className="card-back-pattern" />
        </div>
        {/* front */}
        <div
          className={cn(
            'card-face card-front',
            red ? 'text-[oklch(0.5_0.22_25)]' : 'text-[oklch(0.25_0.04_260)]',
          )}
        >
          <div className="flex flex-col items-start leading-none">
            <span className={size === 'sm' ? 'text-[0.55rem] font-bold' : 'text-[clamp(0.7rem,1.8vw,1rem)] font-bold'}>
              {label}
            </span>
            <span className={size === 'sm' ? 'text-[0.5rem]' : 'text-[clamp(0.6rem,1.6vw,0.9rem)]'}>
              {glyph}
            </span>
          </div>
          <span className={size === 'sm' ? 'text-[0.8rem]' : 'text-[clamp(1.1rem,3vw,1.9rem)]'}>
            {glyph}
          </span>
          <div className="flex rotate-180 flex-col items-start leading-none">
            <span className={size === 'sm' ? 'text-[0.55rem] font-bold' : 'text-[clamp(0.7rem,1.8vw,1rem)] font-bold'}>
              {label}
            </span>
            <span className={size === 'sm' ? 'text-[0.5rem]' : 'text-[clamp(0.6rem,1.6vw,0.9rem)]'}>
              {glyph}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
