import type { TrimResult } from '../domain/types'

type MetricsRailProps = {
  result: TrimResult
}

const Metric = ({
  label,
  value,
  unit,
  detail,
}: {
  label: string
  value: string
  unit: string
  detail: string
}) => (
  <div className="metric">
    <span>{label}</span>
    <strong>{value}<small>{unit}</small></strong>
    <p>{detail}</p>
  </div>
)

export function MetricsRail({ result }: MetricsRailProps) {
  const { metrics, actual } = result
  return (
    <div className="metrics-rail" aria-label="セール形状と推定性能">
      <Metric
        label="SHAPE FIT"
        value={Math.round(metrics.efficiency).toString()}
        unit="%"
        detail="基準形状との近さ"
      />
      <Metric
        label="EST. SPEED"
        value={metrics.speed.toFixed(1)}
        unit="kt"
        detail="形状差による推定変化"
      />
      <Metric
        label="MAIN SHAPE"
        value={(actual.main.draftDepth * 100).toFixed(1)}
        unit="%"
        detail={`最大深さ位置 ${Math.round(actual.main.draftPosition * 100)}%`}
      />
      <Metric
        label="JIB SHAPE"
        value={(actual.jib.draftDepth * 100).toFixed(1)}
        unit="%"
        detail={`最大深さ位置 ${Math.round(actual.jib.draftPosition * 100)}%`}
      />
    </div>
  )
}
