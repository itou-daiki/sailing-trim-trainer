import type { TrimMetrics } from '../domain/types'

type MetricsRailProps = {
  metrics: TrimMetrics
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

export function MetricsRail({ metrics }: MetricsRailProps) {
  return (
    <div className="metrics-rail" aria-label="艇の推定状態">
      <Metric
        label="EST. SPEED"
        value={metrics.speed.toFixed(1)}
        unit="kt"
        detail="現在の設定による推定"
      />
      <Metric
        label="TRIM RANGE"
        value={Math.round(metrics.efficiency).toString()}
        unit="%"
        detail="基準形との近さ"
      />
      <Metric
        label="HEEL"
        value={Math.round(metrics.heel).toString()}
        unit="°"
        detail={metrics.heel > 10 ? '力が横へ逃げています' : '姿勢は安定範囲です'}
      />
      <Metric
        label="LEEWAY"
        value={metrics.leeway.toFixed(1)}
        unit="°"
        detail="センターボードと横力"
      />
    </div>
  )
}
