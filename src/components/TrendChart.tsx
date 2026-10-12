// 轻量内联 SVG 折线图：零依赖，适配暗/亮主题（用 CSS 变量着色），随容器宽度自适应。
interface Series {
  name: string;
  color: string; // 接受 CSS 变量，如 "var(--accent)"
  values: number[];
}

interface Props {
  labels: string[];
  series: Series[];
  height?: number;
  className?: string;
}

export default function TrendChart({
  labels,
  series,
  height = 220,
  className = "",
}: Props) {
  const W = 720;
  const H = height;
  const padL = 10;
  const padR = 10;
  const padT = 14;
  const padB = 26;
  const innerW = W - padL - padR;
  const innerH = H - padT - padB;
  const n = labels.length;

  if (n === 0) {
    return (
      <div className={`text-center text-dim text-[13px] py-10 ${className}`}>
        暂无数据
      </div>
    );
  }

  const maxV = Math.max(1, ...series.flatMap((s) => s.values));
  const x = (i: number) =>
    n <= 1 ? padL + innerW / 2 : padL + (innerW * i) / (n - 1);
  const y = (v: number) => padT + innerH * (1 - v / maxV);

  const gridLines = 4;

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className={`w-full h-auto ${className}`}
      role="img"
      aria-label="趋势图"
    >
      {Array.from({ length: gridLines + 1 }).map((_, i) => {
        const gy = padT + (innerH * i) / gridLines;
        return (
          <line
            key={`g${i}`}
            x1={padL}
            y1={gy}
            x2={W - padR}
            y2={gy}
            stroke="var(--line)"
            strokeWidth={1}
          />
        );
      })}

      {labels.map((lb, i) => (
        <text
          key={`l${i}`}
          x={x(i)}
          y={H - 8}
          textAnchor="middle"
          fontSize={10}
          fill="var(--dim)"
        >
          {lb.slice(5)}
        </text>
      ))}

      {series.map((s, si) => {
        const pts = s.values.map((v, i) => `${x(i)},${y(v)}`).join(" ");
        return (
          <polyline
            key={`s${si}`}
            points={pts}
            fill="none"
            stroke={s.color}
            strokeWidth={2}
            strokeLinejoin="round"
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
          />
        );
      })}
    </svg>
  );
}
