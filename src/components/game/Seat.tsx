import { PlayingCard, type DisplayCard } from './PlayingCard'
import type { SeatState } from '@/game/holdem'
import { cn } from '@/lib/utils'

export function Seat({
  seat,
  name,
  state,
  inGame,
  isButton,
  isActing,
  actionTag,
  revealed,
  handName,
  isWinner,
  isPlayer,
}: {
  seat: number
  name: string
  state: SeatState
  inGame: boolean
  isButton: boolean
  isActing: boolean
  actionTag: string | null
  revealed: boolean
  handName: string | null
  isWinner: boolean
  isPlayer: boolean
}) {
  const eliminated = !inGame
  const cards: DisplayCard[] = state.hole.map((c, i) => ({
    card: c,
    faceUp: isPlayer || revealed,
    key: `${seat}-${i}-${c.rank}-${c.suit}`,
  }))

  return (
    <div
      className={cn(
        'flex w-[26%] max-w-40 flex-col items-center gap-1 transition-opacity duration-300',
        state.folded && 'opacity-45',
        eliminated && 'opacity-30',
      )}
    >
      {/* cards */}
      <div className="flex min-h-[2.6rem] items-center gap-1 md:min-h-[3.4rem]">
        {cards.map((c, i) => (
          <PlayingCard key={c.key} hc={c} index={i} size={isPlayer ? 'lg' : 'sm'} />
        ))}
        {isWinner && handName && (
          <span className="animate-result ml-1 whitespace-nowrap rounded-full bg-[oklch(0.85_0.15_95/0.95)] px-2 py-0.5 text-[0.6rem] font-black text-[oklch(0.2_0.04_90)] md:text-xs">
            {handName}
          </span>
        )}
      </div>

      {/* plate */}
      <div
        className={cn(
          'relative flex flex-col items-center rounded-xl border px-2.5 py-1 text-center transition-all duration-200 md:px-3',
          'border-[oklch(0.45_0.05_160/0.5)] bg-[oklch(0.19_0.04_160/0.85)]',
          isActing && 'seat-acting border-[oklch(0.85_0.15_95)]',
        )}
      >
        {isButton && (
          <span className="absolute -left-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-[oklch(0.92_0.03_95)] text-[0.6rem] font-black text-[oklch(0.25_0.04_90)] shadow-md">
            D
          </span>
        )}
        <span className="max-w-20 truncate text-[0.7rem] font-bold text-[oklch(0.9_0.03_120)] md:text-xs">
          {name}
        </span>
        <span className="text-[0.65rem] tabular-nums text-[oklch(0.8_0.12_95)] md:text-[0.7rem]">
          {eliminated ? '出局' : state.stack.toLocaleString()}
        </span>
        {actionTag && !eliminated && (
          <span className="mt-0.5 whitespace-nowrap rounded-full bg-[oklch(0.35_0.06_160)] px-1.5 py-px text-[0.55rem] text-[oklch(0.85_0.05_120)] md:text-[0.6rem]">
            {actionTag}
          </span>
        )}
      </div>

      {/* street bet */}
      {state.streetBet > 0 && (
        <span className="rounded-full border border-[oklch(0.7_0.13_95/0.5)] bg-[oklch(0.25_0.05_160/0.9)] px-2 py-0.5 text-[0.6rem] font-bold tabular-nums text-[oklch(0.88_0.13_95)] md:text-[0.65rem]">
          下注 {state.streetBet.toLocaleString()}
        </span>
      )}
    </div>
  )
}
