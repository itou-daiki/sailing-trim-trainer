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
  const { metrics } = result
  return (
    <div className="metrics-rail" aria-label="セール形状と推定性能">
      <Metric
        label="SHAPE FIT"
        value={Math.round(metrics.efficiency).toString()}
        unit="%"
        detail="断面ポーラの総合適合"
      />
      <Metric
        label="EST. SPEED"
        value={metrics.speed.toFixed(1)}
        unit="kt"
        detail="形状差による推定変化"
      />
      <Metric
        label="FORWARD DRIVE"
        value={Math.round(metrics.drive).toString()}
        unit="%"
        detail="同条件の基準形との比"
      />
      <Metric
        label="SECTION L / D"
        value={metrics.liftToDrag.toFixed(1)}
        unit=""
        detail={`揚力 ${metrics.liftCoefficient.toFixed(2)} / 抗力 ${metrics.dragCoefficient.toFixed(2)}`}
      />
    </div>
  )
}
