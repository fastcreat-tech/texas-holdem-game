import { useMemo } from 'react'
import { useHoldem, seatName, PLAYER } from '@/hooks/useHoldem'
import { PlayingCard, type DisplayCard } from '@/components/game/PlayingCard'
import { Seat } from '@/components/game/Seat'
import { HandHistory } from '@/components/game/HandHistory'
import { currentHandName } from '@/game/holdem'
import { cn } from '@/lib/utils'

const SEAT_POS = [
  { left: '50%', top: '83%' }, // player
  { left: '16%', top: '63%' },
  { left: '16%', top: '20%' },
  { left: '50%', top: '15%' },
  { left: '84%', top: '20%' },
  { left: '84%', top: '63%' },
]

export default function Home() {
  const g = useHoldem()
  const hand = g.hand

  const community: DisplayCard[] = useMemo(() => {
    if (!hand) return []
    return hand.community.slice(0, g.boardShown).map((c, i) => ({
      card: c,
      faceUp: true,
      key: `board-${i}-${c.rank}-${c.suit}`,
    }))
  }, [hand, g.boardShown])

  const winners = useMemo(
    () => new Set((hand?.results ?? []).flatMap((r) => r.winners)),
    [hand],
  )

  const playerHandName =
    hand && g.phase === 'playing' && !hand.seats[PLAYER].folded
      ? currentHandName(hand.seats[PLAYER].hole, hand.community.slice(0, g.boardShown))
      : null

  const legal = g.legal
  const clamp = (v: number) =>
    legal ? Math.max(legal.minRaiseTo, Math.min(Math.round(v / 5) * 5, legal.maxRaiseTo)) : 0

  const raiseOptions = useMemo(() => {
    if (!legal || !hand) return []
    const pot = g.pot
    const opts = [
      { label: '最小', to: legal.minRaiseTo },
      { label: '半池', to: clamp(hand.currentBet + Math.max(hand.lastRaiseSize, pot / 2)) },
      { label: '整池', to: clamp(hand.currentBet + Math.max(hand.lastRaiseSize, pot)) },
      { label: '全下', to: legal.maxRaiseTo },
    ]
    const seen = new Set<number>()
    return opts
      .filter((o) => o.to >= legal.minRaiseTo && o.to <= legal.maxRaiseTo)
      .filter((o) => {
        if (seen.has(o.to)) return false
        seen.add(o.to)
        return true
      })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [legal, hand, g.pot])

  return (
    <div className="felt min-h-[100dvh] text-[oklch(0.93_0.02_120)]">
      {/* ── header ── */}
      <header className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 pt-4 md:px-6">
        <div className="flex items-baseline gap-3">
          <h1 className="font-casino text-xl font-black tracking-[0.2em] text-[oklch(0.85_0.13_95)] md:text-2xl">
            德州扑克
          </h1>
          <span className="text-[0.6rem] uppercase tracking-[0.35em] text-[oklch(0.65_0.06_120)]">
            6-Max Hold'em
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="rounded-full border border-[oklch(0.6_0.12_95/0.4)] bg-[oklch(0.2_0.04_160/0.8)] px-4 py-1.5">
            <span className="mr-2 text-[0.65rem] tracking-widest text-[oklch(0.65_0.05_120)]">筹码</span>
            <span
              key={g.stacks[PLAYER]}
              className="animate-balance text-base font-black tabular-nums text-[oklch(0.88_0.13_95)]"
            >
              {g.stacks[PLAYER].toLocaleString()}
            </span>
          </div>
          <div className="hidden rounded-full border border-[oklch(0.45_0.05_160/0.5)] bg-[oklch(0.2_0.04_160/0.8)] px-3 py-1.5 text-[0.65rem] text-[oklch(0.7_0.04_160)] sm:block">
            盲注 25/50 · 第 {g.handNumber} 手
          </div>
          <button
            type="button"
            onClick={g.toggleMute}
            aria-label={g.muted ? '开启音效' : '静音'}
            className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border border-[oklch(0.45_0.05_160/0.5)] bg-[oklch(0.2_0.04_160/0.8)] text-[oklch(0.75_0.05_120)] transition-colors hover:text-[oklch(0.88_0.13_95)] focus-visible:outline-2 focus-visible:outline-[oklch(0.8_0.15_95)]"
          >
            {g.muted ? (
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" /><line x1="23" y1="9" x2="17" y2="15" /><line x1="17" y1="9" x2="23" y2="15" /></svg>
            ) : (
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" /><path d="M15.54 8.46a5 5 0 0 1 0 7.07" /><path d="M19.07 4.93a10 10 0 0 1 0 14.14" /></svg>
            )}
          </button>
          <button
            type="button"
            onClick={g.resetAll}
            className="cursor-pointer rounded-full border border-[oklch(0.45_0.05_160/0.5)] bg-[oklch(0.2_0.04_160/0.8)] px-3 py-1.5 text-[0.7rem] text-[oklch(0.75_0.05_120)] transition-colors hover:text-[oklch(0.88_0.13_95)] focus-visible:outline-2 focus-visible:outline-[oklch(0.8_0.15_95)]"
          >
            重新开局
          </button>
        </div>
      </header>

      {/* ── main ── */}
      <main className="mx-auto grid max-w-6xl gap-4 px-4 py-4 md:px-6 lg:grid-cols-[1fr_240px]">
        {/* table */}
        <section className="table-felt relative aspect-[16/15] w-full overflow-hidden rounded-[2.5rem] border-[6px] border-[oklch(0.35_0.06_120/0.6)] shadow-2xl md:aspect-[16/11] md:max-h-[68vh]">
          {/* center: pot + board + message */}
          <div className="absolute left-1/2 top-[32%] -translate-x-1/2 -translate-y-1/2">
            <div className="rounded-full border border-[oklch(0.7_0.13_95/0.5)] bg-[oklch(0.16_0.03_160/0.85)] px-4 py-1 text-center shadow-lg">
              <span className="text-[0.6rem] tracking-widest text-[oklch(0.65_0.05_120)]">底池 </span>
              <span className="text-sm font-black tabular-nums text-[oklch(0.88_0.13_95)] md:text-base">
                {g.pot.toLocaleString()}
              </span>
            </div>
          </div>

          <div className="absolute left-1/2 top-[46%] flex -translate-x-1/2 -translate-y-1/2 items-center gap-1 md:gap-1.5">
            {community.map((c, i) => (
              <PlayingCard key={c.key} hc={c} index={i} size="lg" />
            ))}
          </div>

          <div className="absolute left-1/2 top-[63%] w-[70%] -translate-x-1/2 text-center">
            <p className="text-[0.7rem] font-bold tracking-[0.2em] text-[oklch(0.85_0.1_120)] md:text-sm">
              {g.message}
            </p>
          </div>

          {/* seats */}
          {SEAT_POS.map((pos, i) => {
            const inGame = g.stacks[i] > 0 || (hand?.inHand[i] ?? false)
            const seatState =
              hand?.seats[i] ?? {
                stack: g.stacks[i],
                streetBet: 0,
                totalBet: 0,
                hole: [],
                folded: false,
                allIn: false,
              }
            return (
              <div
                key={i}
                className="absolute -translate-x-1/2 -translate-y-1/2"
                style={{ left: pos.left, top: pos.top }}
              >
                <Seat
                  seat={i}
                  name={seatName(i)}
                  state={seatState}
                  inGame={inGame}
                  isButton={hand ? hand.button === i : g.button === i}
                  isActing={!!hand && g.phase === 'playing' && hand.acting === i && !hand.handOver}
                  actionTag={g.actionTags[i]}
                  revealed={g.showdownReveal}
                  handName={hand?.showdownNames?.[i] ?? null}
                  isWinner={g.showdownReveal && winners.has(i)}
                  isPlayer={i === PLAYER}
                />
              </div>
            )
          })}
        </section>

        {/* sidebar */}
        <aside className="flex flex-col gap-4">
          <HandHistory history={g.history} stats={g.stats} />
          <div className="rounded-2xl border border-[oklch(0.45_0.05_160/0.5)] bg-[oklch(0.2_0.04_160/0.75)] p-4 text-[0.7rem] leading-relaxed text-[oklch(0.7_0.04_160)] backdrop-blur-md">
            <h2 className="mb-1.5 text-xs font-bold tracking-[0.3em] text-[oklch(0.8_0.12_95)]">规则</h2>
            6 人桌无限注德州扑克，每人 10,000 筹码，盲注 25/50，按钮每手轮换。筹码归零即出局，淘汰全部 5 位对手即获胜。
            {playerHandName && (
              <p className="mt-2 border-t border-[oklch(0.4_0.05_160/0.4)] pt-2">
                你目前的牌：<span className="font-bold text-[oklch(0.88_0.13_95)]">{playerHandName}</span>
              </p>
            )}
          </div>
        </aside>
      </main>

      {/* ── action bar ── */}
      <footer className="sticky bottom-0 z-10 border-t border-[oklch(0.45_0.05_160/0.4)] bg-[oklch(0.16_0.03_160/0.92)] backdrop-blur-lg">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-2 px-4 py-3 md:justify-end md:gap-3 md:px-6">
          {legal && (
            <>
              {legal.canFold && (
                <button
                  type="button"
                  onClick={() => g.playerAct({ type: 'fold' })}
                  className="cursor-pointer rounded-full border border-[oklch(0.6_0.18_25/0.6)] px-5 py-2.5 text-sm font-bold text-[oklch(0.78_0.16_25)] transition-all hover:bg-[oklch(0.3_0.08_25/0.4)] active:scale-95 focus-visible:outline-2 focus-visible:outline-[oklch(0.8_0.15_95)]"
                >
                  弃牌
                </button>
              )}
              {legal.canCheck && (
                <button
                  type="button"
                  onClick={() => g.playerAct({ type: 'check' })}
                  className="cursor-pointer rounded-full border border-[oklch(0.55_0.05_160/0.6)] px-5 py-2.5 text-sm font-bold text-[oklch(0.85_0.05_140)] transition-all hover:bg-[oklch(0.3_0.05_160/0.5)] active:scale-95 focus-visible:outline-2 focus-visible:outline-[oklch(0.8_0.15_95)]"
                >
                  过牌
                </button>
              )}
              {legal.canCall && (
                <button
                  type="button"
                  onClick={() => g.playerAct({ type: 'call' })}
                  className="cursor-pointer rounded-full border border-[oklch(0.6_0.14_240/0.6)] px-5 py-2.5 text-sm font-bold text-[oklch(0.82_0.12_240)] transition-all hover:bg-[oklch(0.3_0.08_240/0.4)] active:scale-95 focus-visible:outline-2 focus-visible:outline-[oklch(0.8_0.15_95)]"
                >
                  跟注 {legal.callAmount.toLocaleString()}
                </button>
              )}
              {legal.canRaise &&
                raiseOptions.map((o) => (
                  <button
                    key={o.label}
                    type="button"
                    onClick={() => g.playerAct({ type: 'raise', raiseTo: o.to })}
                    className={cn(
                      'cursor-pointer rounded-full px-5 py-2.5 text-sm font-bold transition-all active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white',
                      o.label === '全下'
                        ? 'bg-gradient-to-b from-[oklch(0.72_0.19_25)] to-[oklch(0.55_0.18_25)] text-[oklch(0.95_0.02_25)] shadow-[0_4px_16px_oklch(0.6_0.18_25/0.4)] hover:brightness-110'
                        : 'bg-gradient-to-b from-[oklch(0.85_0.15_95)] to-[oklch(0.68_0.15_80)] text-[oklch(0.2_0.04_90)] shadow-[0_4px_16px_oklch(0.7_0.15_90/0.4)] hover:brightness-110',
                    )}
                  >
                    {o.label} {o.to.toLocaleString()}
                  </button>
                ))}
            </>
          )}
          {!legal && g.phase === 'playing' && (
            <span className="px-4 py-2.5 text-xs tracking-[0.3em] text-[oklch(0.7_0.05_140)]">
              {g.busy ? '进行中…' : '等待对手行动…'}
            </span>
          )}
          {g.phase === 'idle' && (
            <button
              type="button"
              onClick={() => g.startHand()}
              className="cursor-pointer rounded-full bg-gradient-to-b from-[oklch(0.85_0.15_95)] to-[oklch(0.68_0.15_80)] px-8 py-2.5 text-sm font-black tracking-[0.3em] text-[oklch(0.2_0.04_90)] shadow-[0_4px_16px_oklch(0.7_0.15_90/0.4)] transition-all hover:brightness-110 active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            >
              开始发牌
            </button>
          )}
          {g.phase === 'handOver' && !g.playerBroke && !g.victory && (
            <button
              type="button"
              onClick={g.nextHand}
              className="cursor-pointer rounded-full bg-gradient-to-b from-[oklch(0.85_0.15_95)] to-[oklch(0.68_0.15_80)] px-8 py-2.5 text-sm font-black tracking-[0.3em] text-[oklch(0.2_0.04_90)] shadow-[0_4px_16px_oklch(0.7_0.15_90/0.4)] transition-all hover:brightness-110 active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            >
              下一手
            </button>
          )}
        </div>
      </footer>

      {/* ── bankrupt / victory overlay ── */}
      {(g.playerBroke || g.victory) && (
        <div
          className="fixed inset-0 z-20 flex items-center justify-center bg-[oklch(0.12_0.02_160/0.85)] backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
        >
          <div className="animate-result mx-4 flex max-w-sm flex-col items-center gap-4 rounded-3xl border border-[oklch(0.6_0.12_95/0.5)] bg-[oklch(0.22_0.04_160)] p-8 text-center shadow-2xl">
            <span className="font-casino text-3xl font-black tracking-[0.2em] text-[oklch(0.85_0.13_95)]">
              {g.victory ? '你赢下了牌桌' : '筹码耗尽'}
            </span>
            <p className="text-sm leading-relaxed text-[oklch(0.75_0.05_140)]">
              {g.victory
                ? `淘汰了全部 5 位对手，用了 ${g.stats.hands} 手。再来一桌？`
                : '你被清台了。重整旗鼓，再来一桌？'}
            </p>
            <button
              type="button"
              onClick={g.resetAll}
              autoFocus
              className="cursor-pointer rounded-full bg-gradient-to-b from-[oklch(0.85_0.15_95)] to-[oklch(0.68_0.15_80)] px-8 py-3 text-sm font-black tracking-[0.3em] text-[oklch(0.2_0.04_90)] transition-all hover:brightness-110 active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            >
              新的一桌
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
