import type { PricePoint, SalePeriod } from "@/types";
import { formatWon } from "@/lib/games";
import { ChartScroller } from "./chart-scroller";

const H = 300;
const AXIS_W = 68;
const PAD = { left: 12, right: 24, top: 30, bottom: 34 };
const DAY = 86_400_000;
const KST = 9 * 3600_000;
/** 하루당 가로 폭(px). 2주 세일이 약 36px가 되어 띠와 할인율을 알아볼 수 있다 */
const PX_PER_DAY = 2.6;
const MIN_PLOT_W = 760;

const fmtDate = (t: number) => new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", year: "numeric", month: "numeric", day: "numeric" }).format(t);

/** 축 눈금용 보기 좋은 간격(1·2·5 × 10^n) */
function niceStep(max: number, count = 4) {
  const raw = max / count;
  const pow = 10 ** Math.floor(Math.log10(raw));
  return [1, 2, 5, 10].map((m) => m * pow).find((s) => s >= raw) ?? raw;
}

/** t0~t1 사이 매월 1일(한국 시간) */
function monthStarts(t0: number, t1: number) {
  const d = new Date(t0 + KST);
  let y = d.getUTCFullYear();
  let m = d.getUTCMonth() + 1;
  const out: { t: number; y: number; m: number }[] = [];
  for (;;) {
    if (m > 11) {
      y++;
      m = 0;
    }
    const t = Date.UTC(y, m, 1) - KST;
    if (t > t1) return out;
    out.push({ t, y, m: m + 1 });
    m++;
  }
}

/**
 * 가격 추이 계단 그래프(서버 렌더 SVG). 가격은 바뀐 시점부터 다음 변경까지 유지되므로 계단으로 그린다.
 * 기간이 길면 가로로 넓게 그리고 스크롤(막대·마우스 휠)로 이동한다. 가격 축은 왼쪽에 고정.
 * 세일 구간은 옅은 띠 + 할인율, 각 변경점은 마우스를 올리면 날짜·가격이 보인다(<title>).
 */
export function PriceChart({ points, sales, now }: { points: PricePoint[]; sales: SalePeriod[]; now: number }) {
  const t0 = Date.parse(points[0].changedAt);
  const t1 = Math.max(now, t0 + DAY);
  const plotW = Math.max(MIN_PLOT_W, Math.round(((t1 - t0) / DAY) * PX_PER_DAY) + PAD.left + PAD.right);
  const yMaxRaw = Math.max(...points.map((p) => Math.max(p.price, p.regular)));
  const step = niceStep(yMaxRaw);
  const yMax = Math.ceil((yMaxRaw * 1.08) / step) * step;
  const x = (t: number) => PAD.left + ((t - t0) / (t1 - t0)) * (plotW - PAD.left - PAD.right);
  const y = (v: number) => PAD.top + (1 - v / yMax) * (H - PAD.top - PAD.bottom);

  const times = points.map((p) => Date.parse(p.changedAt));
  const stepPath = (pick: (p: PricePoint) => number) =>
    points.map((p, i) => `${i === 0 ? "M" : "H"}${x(times[i]).toFixed(1)}${i === 0 ? "," : " V"}${y(pick(p)).toFixed(1)}`).join(" ") + ` H${x(t1).toFixed(1)}`;

  // 할인율 라벨: 앞 라벨과 40px 이상 떨어질 때만(겹침 방지)
  const labelX = sales.reduce<{ out: (number | null)[]; last: number }>(
    (acc, s) => {
      const mid = (x(Date.parse(s.start)) + x(s.end ? Date.parse(s.end) : t1)) / 2;
      if (mid - acc.last < 40) return { out: [...acc.out, null], last: acc.last };
      return { out: [...acc.out, Math.min(mid, plotW - 18)], last: mid };
    },
    { out: [], last: -Infinity },
  ).out;

  const yTicks = Array.from({ length: Math.floor(yMax / step) + 1 }, (_, i) => i * step);
  // "오늘" 라벨과 겹치지 않게 오른쪽 끝 근처의 월 라벨은 뺀다
  const months = monthStarts(t0, t1).filter(({ t }) => x(t) < x(t1) - 48);

  return (
    <figure className="m-0">
      <figcaption className="sr-only">한국 Steam 가격 추이 그래프. 아래 세일 기록 표에 같은 내용이 있습니다.</figcaption>
      <div className="flex">
        <svg width={AXIS_W} height={H} className="shrink-0" aria-hidden>
          {yTicks.map((v) => (
            <text key={v} x={AXIS_W - 8} y={y(v)} dy="0.32em" textAnchor="end" fontSize={12} fill="var(--muted)" className="tabular">
              {v === 0 ? "₩0" : formatWon(v)}
            </text>
          ))}
        </svg>
        <ChartScroller label="가격 추이 그래프(가로 스크롤)">
          <svg width={plotW} height={H} className="block" role="img" aria-label="한국 Steam 가격 추이">
            {yTicks.map((v) => (
              <line key={v} x1={0} x2={plotW} y1={y(v)} y2={y(v)} stroke="var(--border)" strokeWidth={1} />
            ))}

            {months.map(({ t, y: yr, m }) => (
              <g key={t}>
                <line x1={x(t)} x2={x(t)} y1={PAD.top} y2={H - PAD.bottom} stroke="var(--border)" strokeWidth={1} strokeDasharray={m === 1 ? undefined : "2 4"} />
                <text x={x(t) + 4} y={H - 12} fontSize={12} fontWeight={m === 1 ? 600 : 400} fill={m === 1 ? "var(--text-2)" : "var(--muted)"}>
                  {m === 1 ? `${yr}년 1월` : `${m}월`}
                </text>
              </g>
            ))}

            {sales.map((s, si) => {
              const a = x(Date.parse(s.start));
              const b = x(s.end ? Date.parse(s.end) : t1);
              return (
                <g key={s.start}>
                  <rect x={a} y={PAD.top} width={Math.max(b - a, 3)} height={H - PAD.top - PAD.bottom} fill="var(--accent-soft)">
                    <title>{`${fmtDate(Date.parse(s.start))} ~ ${s.end ? fmtDate(Date.parse(s.end)) : "진행 중"} · ${s.cut}% 할인 · ${formatWon(s.price)}`}</title>
                  </rect>
                  {labelX[si] !== null && (
                    <text x={labelX[si]!} y={PAD.top - 10} textAnchor="middle" fontSize={12} fontWeight={600} fill="var(--text-2)">
                      -{s.cut}%
                    </text>
                  )}
                </g>
              );
            })}

            <path d={stepPath((p) => p.regular)} fill="none" stroke="var(--muted)" strokeWidth={1.5} strokeDasharray="4 4" />
            <path d={stepPath((p) => p.price)} fill="none" stroke="var(--accent)" strokeWidth={2} strokeLinejoin="round" />

            {points.map((p, i) => (
              <g key={p.changedAt}>
                <circle cx={x(times[i])} cy={y(p.price)} r={4} fill="var(--accent)" stroke="var(--surface)" strokeWidth={2} />
                <circle cx={x(times[i])} cy={y(p.price)} r={12} fill="transparent">
                  <title>{`${fmtDate(times[i])}부터 ${formatWon(p.price)}${p.cut ? ` (${p.cut}% 할인, 정가 ${formatWon(p.regular)})` : " (정가)"}`}</title>
                </circle>
              </g>
            ))}

            <text x={x(t1) - 2} y={H - 12} textAnchor="end" fontSize={12} fontWeight={600} fill="var(--text-2)">
              오늘
            </text>
          </svg>
        </ChartScroller>
      </div>
    </figure>
  );
}
