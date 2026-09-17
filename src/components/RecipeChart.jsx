import { useEffect, useState } from 'react'
import { formatTemperatureInput } from '../utils/temperatureUnits'

function readNumber(value, fallback = 0) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

const BASE_TEMP_MAX = 220
const BASE_PRESSURE_MIN = -1.1
const BASE_PRESSURE_MAX = 7
const axisNumberFormatter = new Intl.NumberFormat('es-ES', {
  maximumFractionDigits: 1,
})

function formatAxisValue(value) {
  return axisNumberFormatter.format(value)
}

function formatTransition(start, end, unit) {
  const formattedStart = formatAxisValue(start)
  const formattedEnd = formatAxisValue(end)

  return start === end
    ? `Se mantiene en ${formattedStart} ${unit}`
    : `${formattedStart} → ${formattedEnd} ${unit}`
}

function formatTemperature(value, temperatureUnit) {
  return formatTemperatureInput(value, temperatureUnit)
}

function RecipeStepSummary({ steps, temperatureUnit }) {
  const temperatureUnitLabel = temperatureUnit === 'fahrenheit' ? '°F' : '°C'

  return (
    <section className="recipe-step-summary" aria-labelledby="recipe-step-summary-title">
      <h4 id="recipe-step-summary-title">Resumen por escalón</h4>
      <div
        className="recipe-step-summary-list"
        role="region"
        aria-label="Resumen de escalones desplazable"
        tabIndex="0"
      >
        {steps.map((step, index) => {
          const temperatureStart = readNumber(step.temperatura_c, 0)
          const temperatureEnd = step.temp_dwell
            ? temperatureStart
            : readNumber(step.temp_final_c, temperatureStart)
          const pressureStart = readNumber(step.presion_bar, 0)
          const pressureEnd = step.pres_dwell
            ? pressureStart
            : readNumber(step.pres_final_bar, pressureStart)
          const vacuumStart = readNumber(step.vacio_mbar, 0)
          const vacuumEnd = step.vacio_dwell
            ? vacuumStart
            : readNumber(step.vacio_final_mbar, vacuumStart)
          const duration = readNumber(step.stepDuration, 0)

          return (
            <article className="recipe-step-summary-card" key={index}>
              <h5>Escalón {index + 1} · {formatAxisValue(duration)} min</h5>
              <dl>
                <div className="temp">
                  <dt>Temperatura</dt>
                  <dd>
                    {formatTemperature(temperatureStart, temperatureUnit) ===
                    formatTemperature(temperatureEnd, temperatureUnit)
                      ? `Se mantiene en ${formatTemperature(temperatureStart, temperatureUnit)} ${temperatureUnitLabel}`
                      : `${formatTemperature(temperatureStart, temperatureUnit)} → ${formatTemperature(temperatureEnd, temperatureUnit)} ${temperatureUnitLabel}`}
                  </dd>
                </div>
                <div className="pressure">
                  <dt>Presión</dt>
                  <dd>{formatTransition(pressureStart, pressureEnd, 'bar(g)')}</dd>
                </div>
                <div className="vacuum">
                  <dt>Vacío</dt>
                  <dd>{formatTransition(vacuumStart, vacuumEnd, 'bar(g)')}</dd>
                </div>
              </dl>
            </article>
          )
        })}
      </div>
    </section>
  )
}

function buildSeries(steps) {
  let currentTime = 0
  const tempPoints = [{ x: 0, y: readNumber(steps[0]?.temperatura_c, 0) }]
  const pressurePoints = [{ x: 0, y: readNumber(steps[0]?.presion_bar, 0) }]
  const vacuumPoints = [{ x: 0, y: readNumber(steps[0]?.vacio_mbar, 0) }]
  const stepBands = []

  steps.forEach((step, index) => {
    const stepStart = currentTime
    const stepDuration = readNumber(step.stepDuration, 0)
    const tempStart = readNumber(step.temperatura_c, 0)
    const tempEnd = step.temp_dwell
      ? tempStart
      : readNumber(step.temp_final_c, tempStart)

    const pressureStart = readNumber(step.presion_bar, 0)
    const pressureEnd = step.pres_dwell
      ? pressureStart
      : readNumber(step.pres_final_bar, pressureStart)
    const vacuumStart = readNumber(step.vacio_mbar, 0)
    const vacuumEnd = step.vacio_dwell
      ? vacuumStart
      : readNumber(step.vacio_final_mbar, vacuumStart)

    tempPoints.push({ x: currentTime, y: tempStart })
    pressurePoints.push({ x: currentTime, y: pressureStart })
    vacuumPoints.push({ x: currentTime, y: vacuumStart })

    const stepEndTime = currentTime + Math.max(stepDuration, 1)
    const pressureDuration = Math.min(
      Math.max(readNumber(step.pressureTransition?.time, stepDuration), 0),
      Math.max(stepDuration, 1),
    )
    const vacuumDuration = Math.min(
      Math.max(readNumber(step.vacuumTransition?.time, stepDuration), 0),
      Math.max(stepDuration, 1),
    )

    tempPoints.push({ x: stepEndTime, y: tempEnd })
    pressurePoints.push({ x: currentTime + pressureDuration, y: pressureEnd })
    vacuumPoints.push({ x: currentTime + vacuumDuration, y: vacuumEnd })
    if (pressureDuration < stepDuration) {
      pressurePoints.push({ x: stepEndTime, y: pressureEnd })
    }
    if (vacuumDuration < stepDuration) {
      vacuumPoints.push({ x: stepEndTime, y: vacuumEnd })
    }
    stepBands.push({ index: index + 1, start: stepStart, end: stepEndTime })
    currentTime = stepEndTime
  })

  return { tempPoints, pressurePoints, vacuumPoints, stepBands, totalTime: currentTime || 1 }
}

function buildPath(points, xScale, yScale) {
  return points
    .map((point, index) => {
      const x = xScale(point.x)
      const y = yScale(point.y)
      return `${index === 0 ? 'M' : 'L'} ${x} ${y}`
    })
    .join(' ')
}

function getValueAtTime(points, time) {
  let previous = points[0]

  for (let index = 1; index < points.length; index += 1) {
    const current = points[index]
    const duration = current.x - previous.x

    if (duration <= 0) {
      previous = current
      continue
    }

    if (time <= current.x) {
      const progress = Math.max(0, Math.min(1, (time - previous.x) / duration))
      return previous.y + (current.y - previous.y) * progress
    }

    previous = current
  }

  return previous.y
}

function DetailedRecipeChart({ series, hoverTime, onHoverTime, temperatureUnit }) {
  const width = 1040
  const height = 540
  const padding = { top: 62, right: 72, bottom: 64, left: 72 }
  const innerWidth = width - padding.left - padding.right
  const innerHeight = height - padding.top - padding.bottom
  const maxTemp = Math.max(...series.tempPoints.map((point) => point.y), BASE_TEMP_MAX)
  const minPressure = Math.min(...series.pressurePoints.map((point) => point.y), BASE_PRESSURE_MIN)
  const maxPressure = Math.max(...series.pressurePoints.map((point) => point.y), BASE_PRESSURE_MAX)
  const xScale = (value) => padding.left + (value / series.totalTime) * innerWidth
  const zeroY = padding.top + (maxPressure / (maxPressure - minPressure)) * innerHeight
  const tempScale = (value) => zeroY - (value / maxTemp) * (zeroY - padding.top)
  const initialTemperatureY = tempScale(series.tempPoints[0].y)
  const pressureScale = (value) =>
    padding.top + ((maxPressure - value) / (maxPressure - minPressure)) * innerHeight
  const hover = hoverTime === null
    ? null
    : {
        time: hoverTime,
        step: series.stepBands.find((band) => hoverTime >= band.start && hoverTime <= band.end)
          ?? series.stepBands.at(-1),
        temperature: getValueAtTime(series.tempPoints, hoverTime),
        pressure: getValueAtTime(series.pressurePoints, hoverTime),
        vacuum: getValueAtTime(series.vacuumPoints, hoverTime),
      }

  function handleMouseMove(event) {
    const bounds = event.currentTarget.getBoundingClientRect()
    if (!bounds.width) return

    const svgX = ((event.clientX - bounds.left) / bounds.width) * width
    const time = ((svgX - padding.left) / innerWidth) * series.totalTime
    onHoverTime(Math.max(0, Math.min(series.totalTime, time)))
  }

  return (
    <svg
      className="recipe-chart detailed"
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label="Grafica detallada del ciclo"
      onMouseMove={handleMouseMove}
      onMouseLeave={() => onHoverTime(null)}
    >
      {series.stepBands.map((band) => (
        <g key={band.index}>
          <rect
            x={xScale(band.start)}
            y={padding.top}
            width={xScale(band.end) - xScale(band.start)}
            height={innerHeight}
            className={`chart-step-band ${band.index % 2 === 0 ? 'alternate' : ''}`}
          />
          <text
            x={(xScale(band.start) + xScale(band.end)) / 2}
            y={padding.top - 24}
            textAnchor="middle"
            className="chart-step-label"
          >
            Escalón {band.index}
          </text>
          {band.index < series.stepBands.length ? (
            <line
              x1={xScale(band.end)}
              y1={padding.top}
              x2={xScale(band.end)}
              y2={height - padding.bottom}
              className="chart-step-boundary"
            />
          ) : null}
        </g>
      ))}

      {Array.from({ length: 5 }, (_, index) => {
        const y = padding.top + (innerHeight / 4) * index
        return <line key={index} x1={padding.left} y1={y} x2={width - padding.right} y2={y} className="chart-grid-line" />
      })}

      <line x1={padding.left} y1={zeroY} x2={width - padding.right} y2={zeroY} className="chart-zero-line" />
      <line
        x1={padding.left}
        y1={initialTemperatureY}
        x2={width - padding.right}
        y2={initialTemperatureY}
        className="chart-initial-temperature-line"
      />
      <line x1={padding.left} y1={height - padding.bottom} x2={width - padding.right} y2={height - padding.bottom} className="chart-axis-line" />
      <line x1={padding.left} y1={padding.top} x2={padding.left} y2={height - padding.bottom} className="chart-axis-line" />
      <line x1={width - padding.right} y1={padding.top} x2={width - padding.right} y2={height - padding.bottom} className="chart-axis-line alt" />

      <path d={buildPath(series.tempPoints, xScale, tempScale)} className="chart-line temp" />
      <path d={buildPath(series.pressurePoints, xScale, pressureScale)} className="chart-line pressure" />
      <path d={buildPath(series.vacuumPoints, xScale, pressureScale)} className="chart-line vacuum" />

      {hover ? (
        <g className="chart-hover-cursor">
          <line x1={xScale(hover.time)} y1={padding.top} x2={xScale(hover.time)} y2={height - padding.bottom} className="chart-hover-line" />
          <circle cx={xScale(hover.time)} cy={tempScale(hover.temperature)} r="5" className="chart-hover-point temp" />
          <circle cx={xScale(hover.time)} cy={pressureScale(hover.pressure)} r="5" className="chart-hover-point pressure" />
          <circle cx={xScale(hover.time)} cy={pressureScale(hover.vacuum)} r="5" className="chart-hover-point vacuum" />
        </g>
      ) : null}

      <text x={padding.left} y={height - 18} className="chart-axis-label">0 min</text>
      <text x={width - padding.right} y={height - 18} textAnchor="end" className="chart-axis-label">{formatAxisValue(series.totalTime)} min</text>
      <text x={padding.left - 14} y={padding.top + 6} textAnchor="end" className="chart-axis-label temp">{formatTemperature(maxTemp, temperatureUnit)} {temperatureUnit === 'fahrenheit' ? '°F' : '°C'}</text>
      <text x={padding.left - 14} y={zeroY + 5} textAnchor="end" className="chart-axis-label temp">{formatTemperature(0, temperatureUnit)} {temperatureUnit === 'fahrenheit' ? '°F' : '°C'}</text>
      <text x={width - padding.right + 14} y={padding.top + 6} className="chart-axis-label pressure">{formatAxisValue(maxPressure)} bar(g)</text>
      <text x={width - padding.right + 14} y={zeroY + 5} className="chart-axis-label pressure">0 bar(g)</text>
      <text x={width - padding.right + 14} y={height - padding.bottom} className="chart-axis-label pressure">{formatAxisValue(minPressure)} bar(g)</text>
    </svg>
  )
}

function RecipeChart({
  steps,
  title = 'Grafica del ciclo',
  subtitle = 'Tiempo en horizontal, temperatura, presion y vacio superpuestos en la misma vista.',
  temperatureUnit: controlledTemperatureUnit,
  onTemperatureUnitChange,
  showTemperatureUnitToggle = true,
}) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [hoverTime, setHoverTime] = useState(null)
  const [localTemperatureUnit, setLocalTemperatureUnit] = useState('celsius')
  const temperatureUnit = controlledTemperatureUnit ?? localTemperatureUnit
  const temperatureUnitLabel = temperatureUnit === 'fahrenheit' ? '°F' : '°C'
  const safeSteps = steps.length
    ? steps
    : [{ temperatura_c: 0, temp_final_c: 0, presion_bar: 0, pres_final_bar: 0, vacio_mbar: 0, vacio_final_mbar: 0 }]
  const series = buildSeries(safeSteps)
  const { tempPoints, pressurePoints, vacuumPoints, totalTime } = series
  const hoverDetails = hoverTime === null
    ? null
    : {
        time: hoverTime,
        step: series.stepBands.find((band) => hoverTime >= band.start && hoverTime <= band.end)
          ?? series.stepBands.at(-1),
        temperature: getValueAtTime(series.tempPoints, hoverTime),
        pressure: getValueAtTime(series.pressurePoints, hoverTime),
        vacuum: getValueAtTime(series.vacuumPoints, hoverTime),
      }

  useEffect(() => {
    if (!isExpanded) return undefined

    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        setIsExpanded(false)
        setHoverTime(null)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isExpanded])

  function closeDetailedChart() {
    setIsExpanded(false)
    setHoverTime(null)
  }

  const width = 820
  const height = 280
  const padding = { top: 24, right: 56, bottom: 34, left: 56 }
  const innerWidth = width - padding.left - padding.right
  const innerHeight = height - padding.top - padding.bottom

  const maxTemp = Math.max(...tempPoints.map((point) => point.y), BASE_TEMP_MAX)
  const minPressure = Math.min(...pressurePoints.map((point) => point.y), BASE_PRESSURE_MIN)
  const maxPressure = Math.max(...pressurePoints.map((point) => point.y), BASE_PRESSURE_MAX)

  const xScale = (value) => padding.left + (value / totalTime) * innerWidth
  const zeroY = padding.top + (maxPressure / (maxPressure - minPressure)) * innerHeight
  const tempScale = (value) => zeroY - (value / maxTemp) * (zeroY - padding.top)
  const initialTemperatureY = tempScale(tempPoints[0].y)
  const pressureScale = (value) =>
    padding.top + ((maxPressure - value) / (maxPressure - minPressure)) * innerHeight

  const tempPath = buildPath(tempPoints, xScale, tempScale)
  const pressurePath = buildPath(pressurePoints, xScale, pressureScale)
  const vacuumPath = buildPath(vacuumPoints, xScale, pressureScale)
  const gridLines = 4

  return (
    <section className="recipe-chart-card">
      <div className="recipe-chart-header">
        <div>
          <h4>{title}</h4>
          <p className="step-copy">{subtitle}</p>
        </div>
        <div className="recipe-chart-header-actions">
          {showTemperatureUnitToggle ? (
            <div className="recipe-temperature-unit-control" aria-label="Unidades de temperatura">
              <span className="recipe-temperature-unit-label">Unidades</span>
              <div className="recipe-temperature-unit-options">
                {['celsius', 'fahrenheit'].map((unit) => {
                  const isActive = temperatureUnit === unit
                  const label = unit === 'fahrenheit' ? '°F' : '°C'

                  return (
                    <button
                      key={unit}
                      type="button"
                      className={isActive ? 'active' : ''}
                      aria-pressed={isActive}
                      onClick={() => {
                        if (onTemperatureUnitChange) {
                          onTemperatureUnitChange(unit)
                          return
                        }
                        setLocalTemperatureUnit(unit)
                      }}
                    >
                      {label}
                    </button>
                  )
                })}
              </div>
            </div>
          ) : null}
          <div className="recipe-chart-legend">
            <span className="legend-chip temp">Temperatura</span>
            <span className="legend-chip pressure">Presion</span>
            <span className="legend-chip vacuum">Vacio</span>
          </div>
        </div>
      </div>

      <div className="recipe-chart-content-layout recipe-chart-content-layout--summary-below">
        <button
          type="button"
          className="recipe-chart-open-button"
          aria-label="Abrir grafica detallada"
          onClick={() => setIsExpanded(true)}
        >
        <svg
          className="recipe-chart"
          viewBox={`0 0 ${width} ${height}`}
          role="img"
          aria-label="Grafica de temperatura, presion y vacio en bar(g) de la receta"
        >
        {Array.from({ length: gridLines + 1 }, (_, index) => {
          const y = padding.top + (innerHeight / gridLines) * index
          return (
            <line
              key={index}
              x1={padding.left}
              y1={y}
              x2={width - padding.right}
              y2={y}
              className="chart-grid-line"
            />
          )
        })}

        <line
          x1={padding.left}
          y1={zeroY}
          x2={width - padding.right}
          y2={zeroY}
          className="chart-zero-line"
        />

        <line
          x1={padding.left}
          y1={initialTemperatureY}
          x2={width - padding.right}
          y2={initialTemperatureY}
          className="chart-initial-temperature-line"
        />

        <line
          x1={padding.left}
          y1={height - padding.bottom}
          x2={width - padding.right}
          y2={height - padding.bottom}
          className="chart-axis-line"
        />
        <line
          x1={padding.left}
          y1={padding.top}
          x2={padding.left}
          y2={height - padding.bottom}
          className="chart-axis-line"
        />
        <line
          x1={width - padding.right}
          y1={padding.top}
          x2={width - padding.right}
          y2={height - padding.bottom}
          className="chart-axis-line alt"
        />

        <path d={tempPath} className="chart-line temp" />
        <path d={pressurePath} className="chart-line pressure" />
        <path d={vacuumPath} className="chart-line vacuum" />

        <text x={padding.left} y={height - 8} className="chart-axis-label">
          0 min
        </text>
        <text x={width - padding.right} y={height - 8} textAnchor="end" className="chart-axis-label">
          {totalTime} min
        </text>
        <text
          x={padding.left - 12}
          y={padding.top + 6}
          textAnchor="end"
          className="chart-axis-label temp"
        >
          {formatTemperature(maxTemp, temperatureUnit)} {temperatureUnitLabel}
        </text>
        <text
          x={padding.left - 12}
          y={zeroY + 5}
          textAnchor="end"
          className="chart-axis-label temp"
        >
          {formatTemperature(0, temperatureUnit)} {temperatureUnitLabel}
        </text>
        <text
          x={width - padding.right + 12}
          y={padding.top + 6}
          className="chart-axis-label pressure"
        >
          {formatAxisValue(maxPressure)} bar(g)
        </text>
        <text
          x={width - padding.right + 12}
          y={zeroY + 5}
          className="chart-axis-label pressure"
        >
          0 bar(g)
        </text>
        <text
          x={width - padding.right + 12}
          y={height - padding.bottom}
          className="chart-axis-label pressure"
        >
          {formatAxisValue(minPressure)} bar(g)
        </text>
        </svg>
        </button>

        <RecipeStepSummary steps={safeSteps} temperatureUnit={temperatureUnit} />
      </div>

      {isExpanded ? (
        <div
          className="form-overlay chart-dialog-overlay"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeDetailedChart()
          }}
        >
          <section className="form-panel chart-dialog-panel" role="dialog" aria-modal="true" aria-label="Grafica detallada del ciclo">
            <div className="chart-dialog-header">
              <div>
                <p className="eyebrow">Inspeccion de receta</p>
                <h3>Grafica detallada del ciclo</h3>
                <p className="step-copy">Pasa el cursor por la gráfica para inspeccionar cada punto.</p>
              </div>
              <button type="button" className="inline-button" aria-label="Cerrar grafica detallada" onClick={closeDetailedChart}>×</button>
            </div>
            <DetailedRecipeChart
              series={series}
              hoverTime={hoverTime}
              onHoverTime={setHoverTime}
              temperatureUnit={temperatureUnit}
            />
            {hoverDetails ? (
              <div className="chart-hover-readout" role="status">
                <strong>Escalón {hoverDetails.step?.index}</strong>
                <span>Tiempo {formatAxisValue(hoverDetails.time)} min</span>
                <span>Temperatura {formatTemperature(hoverDetails.temperature, temperatureUnit)} {temperatureUnitLabel}</span>
                <span>Presión {formatAxisValue(hoverDetails.pressure)} bar(g)</span>
                <span>Vacío {formatAxisValue(hoverDetails.vacuum)} bar(g)</span>
              </div>
            ) : (
              <p className="chart-hover-hint">Mueve el cursor sobre la gráfica para consultar el detalle.</p>
            )}
          </section>
        </div>
      ) : null}
    </section>
  )
}

export default RecipeChart
