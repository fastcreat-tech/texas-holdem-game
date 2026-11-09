import type { HistoryEntry, Stats } from '@/hooks/useHoldem'
import { cn } from '@/lib/utils'

export function HandHistory({ history, stats }: { history: HistoryEntry[]; stats: Stats }) {
  const recent = [...history].reverse().slice(0, 12)
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-[oklch(0.45_0.05_160/0.5)] bg-[oklch(0.2_0.04_160/0.75)] p-4 backdrop-blur-md">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-bold tracking-[0.3em] text-[oklch(0.8_0.12_95)]">战绩</h2>
        <span className="text-[0.65rem] text-[oklch(0.65_0.03_160)]">近 {recent.length} 手</span>
      </div>

      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="rounded-lg bg-[oklch(0.26_0.05_160/0.6)] py-1.5">
          <div className="text-sm font-bold text-[oklch(0.88_0.13_95)]">{stats.hands}</div>
          <div className="text-[0.6rem] text-[oklch(0.65_0.03_160)]">手数</div>
        </div>
        <div className="rounded-lg bg-[oklch(0.26_0.05_160/0.6)] py-1.5">
          <div className="text-sm font-bold text-[oklch(0.8_0.12_155)]">{stats.playerWins}</div>
          <div className="text-[0.6rem] text-[oklch(0.65_0.03_160)]">你赢</div>
        </div>
        <div className="rounded-lg bg-[oklch(0.26_0.05_160/0.6)] py-1.5">
          <div className="text-sm font-bold text-[oklch(0.78_0.16_25)]">{stats.eliminations}</div>
          <div className="text-[0.6rem] text-[oklch(0.65_0.03_160)]">淘汰</div>
        </div>
      </div>

      <div className="flex items-center justify-between border-y border-[oklch(0.4_0.05_160/0.4)] py-1.5 text-[0.7rem] text-[oklch(0.7_0.04_160)]">
        <span>最大单笔</span>
        <span className="font-bold tabular-nums text-[oklch(0.85_0.13_95)]">
          {stats.biggestWin.toLocaleString()}
        </span>
      </div>

      <div className="flex max-h-44 flex-col gap-1 overflow-y-auto pr-1">
        {recent.length === 0 && (
          <p className="py-2 text-center text-[0.65rem] text-[oklch(0.6_0.03_160)]">还没有对局</p>
        )}
        {recent.map((h) => (
          <div
            key={h.handNumber}
            className="flex items-center justify-between gap-2 rounded-lg bg-[oklch(0.25_0.05_160/0.5)] px-2 py-1 text-[0.65rem]"
          >
            <span className="text-[oklch(0.6_0.03_160)]">#{h.handNumber}</span>
            <span className="max-w-24 truncate text-[oklch(0.75_0.04_140)]" title={h.playerHand}>
              {h.playerHand}
            </span>
            <span
              className={cn(
                'font-bold tabular-nums',
                h.delta > 0
                  ? 'text-[oklch(0.8_0.14_155)]'
                  : h.delta < 0
                    ? 'text-[oklch(0.72_0.16_25)]'
                    : 'text-[oklch(0.65_0.03_160)]',
              )}
            >
              {h.delta > 0 ? `+${h.delta.toLocaleString()}` : h.delta.toLocaleString()}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
