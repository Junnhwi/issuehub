import type { PricePoint, SalePeriod } from "@/types";
import { formatWon } from "@/lib/games";

const W = 720;
const H = 260;
const PAD = { left: 64, right: 16, top: 26, bottom: 30 };
const DAY = 86_400_000;

const fmtDate = (t: number, withYear = true) =>
  new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", year: withYear ? "numeric" : undefined, month: "numeric", day: "numeric" }).format(t);

/** 축 눈금용 보기 좋은 간격(1·2·5 × 10^n) */
function niceStep(max: number, count = 4) {
  const raw = max / count;
  const pow = 10 ** Math.floor(Math.log10(raw));
  return [1, 2, 5, 10].map((m) => m * pow).find((s) => s >= raw) ?? raw;
}

/**
 * 가격 추이 계단 그래프(서버 렌더 SVG). 가격은 바뀐 시점부터 다음 변경까지 유지되므로 계단으로 그린다.
 * 세일 구간은 옅은 띠 + 할인율, 각 변경점은 마우스를 올리면 날짜·가격이 보인다(<title>).
 */
export function PriceChart({ points, sales, now }: { points: PricePoint[]; sales: SalePeriod[]; now: number }) {
  const t0 = Date.parse(points[0].changedAt);
  const t1 = Math.max(now, t0 + DAY);
  const yMaxRaw = Math.max(...points.map((p) => Math.max(p.price, p.regular)));
  const step = niceStep(yMaxRaw);
  const yMax = Math.ceil((yMaxRaw * 1.08) / step) * step;
  const x = (t: number) => PAD.left + ((t - t0) / (t1 - t0)) * (W - PAD.left - PAD.right);
  const y = (v: number) => PAD.top + (1 - v / yMax) * (H - PAD.top - PAD.bottom);

  const times = points.map((p) => Date.parse(p.changedAt));
  const stepPath = (pick: (p: PricePoint) => number) =>
    points.map((p, i) => `${i === 0 ? "M" : "H"}${x(times[i]).toFixed(1)}${i === 0 ? "," : ` V`}${y(pick(p)).toFixed(1)}`).join(" ") + ` H${x(t1).toFixed(1)}`;

  // 할인율 라벨: 띠가 좁아도 표시하되, 앞 라벨과 42px 이상 떨어질 때만(겹침 방지)
  const labelX = sales.reduce<{ out: (number | null)[]; last: number }>(
    (acc, s) => {
      const mid = (x(Date.parse(s.start)) + x(s.end ? Date.parse(s.end) : t1)) / 2;
      if (mid - acc.last < 42) return { out: [...acc.out, null], last: acc.last };
      return { out: [...acc.out, Math.min(Math.max(mid, PAD.left + 14), W - PAD.right - 14)], last: mid };
    },
    { out: [], last: -Infinity },
  ).out;

  const yTicks = Array.from({ length: Math.floor(yMax / step) + 1 }, (_, i) => i * step);
  const spanDays = (t1 - t0) / DAY;
  const xTicks = Array.from({ length: 5 }, (_, i) => t0 + ((t1 - t0) * i) / 4);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full min-w-[600px]" role="img" aria-label="한국 Steam 가격 추이 그래프. 아래 표에 같은 내용이 있습니다.">
      {yTicks.map((v) => (
        <g key={v}>
          <line x1={PAD.left} x2={W - PAD.right} y1={y(v)} y2={y(v)} stroke="var(--border)" strokeWidth={1} />
          <text x={PAD.left - 8} y={y(v)} dy="0.32em" textAnchor="end" fontSize={11} fill="var(--muted)" className="tabular">
            {v === 0 ? "₩0" : formatWon(v)}
          </text>
        </g>
      ))}

      {sales.map((s, si) => {
        const a = x(Date.parse(s.start));
        const b = x(s.end ? Date.parse(s.end) : t1);
        return (
          <g key={s.start}>
            <rect x={a} y={PAD.top} width={Math.max(b - a, 2)} height={H - PAD.top - PAD.bottom} fill="var(--accent-soft)">
              <title>{`${fmtDate(Date.parse(s.start))} ~ ${s.end ? fmtDate(Date.parse(s.end)) : "진행 중"} · ${s.cut}% 할인 · ${formatWon(s.price)}`}</title>
            </rect>
            {labelX[si] !== null && (
              <text x={labelX[si]!} y={PAD.top - 8} textAnchor="middle" fontSize={11} fontWeight={600} fill="var(--text-2)">
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
          <circle cx={x(times[i])} cy={y(p.price)} r={11} fill="transparent">
            <title>{`${fmtDate(times[i])}부터 ${formatWon(p.price)}${p.cut ? ` (${p.cut}% 할인, 정가 ${formatWon(p.regular)})` : " (정가)"}`}</title>
          </circle>
        </g>
      ))}

      {xTicks.map((t, i) => (
        <text key={t} x={x(t)} y={H - 8} textAnchor={i === 0 ? "start" : i === 4 ? "end" : "middle"} fontSize={11} fill="var(--muted)">
          {i === 4 ? "오늘" : fmtDate(t, spanDays > 300 || i === 0)}
        </text>
      ))}
    </svg>
  );
}
