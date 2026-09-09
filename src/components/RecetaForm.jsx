import { useState } from 'react'
import { getFieldLabel } from '../utils/labels'
import { deriveRecipeSteps, isRecipeDwellActive } from '../utils/recipeSteps'
import {
  formatTemperatureInput,
  formatTemperatureRateInput,
  toCelsiusRateInput,
  toCelsiusTemperatureInput,
} from '../utils/temperatureUnits'
import RecipeChart from './RecipeChart'

const RAMP_LABELS = {
  temp_grados_por_min: 'Rampa ( °C / min )',
  pres_bar_por_min: 'Rampa ( bar(g) / min )',
  vacio_mbar_por_min: 'Rampa ( bar(g) / min )',
}

function TransitionFields({
  modeField,
  timeField,
  rampField,
  step,
  transition,
  stepIndex,
  isReadOnly,
  isDwell,
  showDwellTime = false,
  maxDuration,
  onStepFieldChange,
  temperatureUnit,
}) {
  if (isDwell) {
    if (!showDwellTime) return null

    return (
      <label className="form-field">
        <span className="field-label">Tiempo de mantenimiento ( min )</span>
        <div className="input-with-clear">
          <input
            type="number"
            value={step?.[timeField] ?? ''}
            readOnly={isReadOnly}
            onChange={(event) => onStepFieldChange(stepIndex, timeField, event.target.value)}
          />
          {!isReadOnly ? (
            <button
              type="button"
              className="input-clear-button"
              aria-label="Vaciar Tiempo de mantenimiento"
              onClick={() => onStepFieldChange(stepIndex, timeField, '')}
            >
              ×
            </button>
          ) : null}
        </div>
      </label>
    )
  }

  const isTimeMode = step?.[modeField] !== 'ramp'
  const timeValue = isTimeMode ? step?.[timeField] ?? '' : transition?.time ?? ''
  const rampValue = isTimeMode ? transition?.ramp ?? '' : step?.[rampField] ?? ''
  const isTemperatureRamp = rampField === 'temp_grados_por_min'
  const temperatureUnitLabel = temperatureUnit === 'fahrenheit' ? '°F' : '°C'

  function changeControl(mode, fieldName, value) {
    if (mode === 'time' && maxDuration && Number(value) > Number(maxDuration)) return

    onStepFieldChange(stepIndex, modeField, mode)
    onStepFieldChange(stepIndex, fieldName, value)
  }

  return (
    <>
      <label className="form-field">
        <span className="field-label">Tiempo ( min )</span>
        <div className="input-with-clear">
          <input
            type="number"
            max={maxDuration || undefined}
            value={timeValue}
            readOnly={isReadOnly}
            onChange={(event) => changeControl('time', timeField, event.target.value)}
          />
          {!isReadOnly ? (
            <button
              type="button"
              className="input-clear-button"
              aria-label="Vaciar Tiempo"
              onClick={() => changeControl('time', timeField, '')}
            >
              ×
            </button>
          ) : null}
        </div>
      </label>
      <label className="form-field">
        <span className="field-label">
          {isTemperatureRamp
            ? `Rampa ( ${temperatureUnitLabel} / min )`
            : RAMP_LABELS[rampField] ?? 'Rampa'}
        </span>
        <div className="input-with-clear">
          <input
            type="number"
            value={
              isTemperatureRamp
                ? formatTemperatureRateInput(rampValue, temperatureUnit)
                : rampValue
            }
            readOnly={isReadOnly}
            onChange={(event) =>
              changeControl(
                'ramp',
                rampField,
                isTemperatureRamp
                  ? toCelsiusRateInput(event.target.value, temperatureUnit)
                  : event.target.value,
              )
            }
          />
          {!isReadOnly ? (
            <button
              type="button"
              className="input-clear-button"
              aria-label="Vaciar Rampa"
              onClick={() => changeControl('ramp', rampField, '')}
            >
              ×
            </button>
          ) : null}
        </div>
      </label>
    </>
  )
}

function DwellToggle({ checked, isReadOnly, onChange }) {
  return (
    <label className="recipe-dwell-toggle">
      <span>Mantenimiento</span>
      <input type="checkbox" checked={checked} disabled={isReadOnly} onChange={onChange} />
      <span className="recipe-dwell-switch" aria-hidden="true" />
    </label>
  )
}

function RecetaForm({
  draft,
  activeStepIndex,
  isReadOnly = false,
  onRecipeFieldChange,
  onStepFieldChange,
  onAddStep,
  onRemoveStep,
  onReorderStep,
  onSelectStep,
  fieldErrors = {},
}) {
  const activeStep = draft.escalones[activeStepIndex] ?? draft.escalones[0]
  const derivedSteps = deriveRecipeSteps(draft)
  const activeDerivedStep = derivedSteps[activeStepIndex] ?? derivedSteps[0]
  const isFirstStep = activeStepIndex === 0
  const temperatureDwell = isRecipeDwellActive(activeStep?.temp_dwell)
  const pressureDwell = isRecipeDwellActive(activeStep?.pres_dwell)
  const vacuumDwell = isRecipeDwellActive(activeStep?.vacio_dwell)
  const [activeControlTab, setActiveControlTab] = useState('temperature')
  const [temperatureUnit, setTemperatureUnit] = useState('celsius')
  const [draggedStepIndex, setDraggedStepIndex] = useState(null)
  const [dropTargetIndex, setDropTargetIndex] = useState(null)

  function handleDragStart(index) {
    if (isReadOnly) {
      return
    }

    setDraggedStepIndex(index)
  }

  function handleDragEnter(targetIndex) {
    if (isReadOnly) {
      return
    }

    if (draggedStepIndex === null || draggedStepIndex === targetIndex) {
      setDropTargetIndex(null)
      return
    }

    setDropTargetIndex(targetIndex)
  }

  function handleDrop(targetIndex) {
    if (isReadOnly || draggedStepIndex === null) {
      return
    }

    onReorderStep(draggedStepIndex, targetIndex)
    setDraggedStepIndex(null)
    setDropTargetIndex(null)
  }

  return (
    <div className="recipe-form-shell recipe-form-shell--wide-dialog">
      <section className="recipe-summary-panel compact">
        <div className="recipe-summary-head">
          <div>
            <h3>Datos generales</h3>
            <p className="step-copy">
              La cabecera queda compacta para que los escalones ocupen el centro de trabajo.
            </p>
          </div>
          <div className="recipe-badge-row">
            <div className="recipe-temperature-unit-control" aria-label="Unidades de temperatura">
              <span className="recipe-temperature-unit-label">Unidades</span>
              <div className="recipe-temperature-unit-options">
                <button
                  type="button"
                  className={temperatureUnit === 'celsius' ? 'active' : ''}
                  aria-pressed={temperatureUnit === 'celsius'}
                  onClick={() => setTemperatureUnit('celsius')}
                >
                  °C
                </button>
                <button
                  type="button"
                  className={temperatureUnit === 'fahrenheit' ? 'active' : ''}
                  aria-pressed={temperatureUnit === 'fahrenheit'}
                  onClick={() => setTemperatureUnit('fahrenheit')}
                >
                  °F
                </button>
              </div>
            </div>
            <span className="recipe-badge">{draft.escalones.length} escalones</span>
          </div>
        </div>

        <div className="recipe-summary-grid compact">
          <label className={`form-field ${fieldErrors.nombre ? 'has-field-error' : ''}`}>
            <span className="field-label">Nombre</span>
            <input
              type="text"
              value={draft.nombre}
              readOnly={isReadOnly}
              onChange={(event) => onRecipeFieldChange('nombre', 'text', event.target.value)}
            />
          </label>

        </div>
      </section>

      <section className="recipe-workspace-panel">
        <div className="step-header">
          <div>
            <h3>Escalones de curado</h3>
            <p className="step-copy">
              Arrastra los nodos para cambiar el orden y trabaja un escalon cada vez.
            </p>
          </div>
          {isReadOnly ? null : (
            <button type="button" className="ghost-button" onClick={onAddStep}>
              Anadir escalon
            </button>
          )}
        </div>

        <div className="recipe-step-strip">
          {draft.escalones.map((step, index) => {
              const stepInitialTemp = derivedSteps[index]?.temperatura_c
              const temperatureUnitLabel = temperatureUnit === 'fahrenheit' ? '°F' : '°C'
              const formattedInitialTemp = formatTemperatureInput(stepInitialTemp, temperatureUnit)
              const formattedFinalTemp = formatTemperatureInput(
                step.temp_dwell ? stepInitialTemp : step.temp_final_c,
                temperatureUnit,
              )

              return (
              <button
                key={step.id}
                type="button"
              draggable={!isReadOnly}
              className={`recipe-step-node ${activeStepIndex === index ? 'active' : ''} ${draggedStepIndex === index ? 'dragging' : ''} ${dropTargetIndex === index ? 'drop-target' : ''}`}
              onClick={() => {
                setActiveControlTab('temperature')
                onSelectStep(index)
              }}
              onDragStart={() => handleDragStart(index)}
              onDragEnd={() => {
                setDraggedStepIndex(null)
                setDropTargetIndex(null)
              }}
              onDragEnter={() => handleDragEnter(index)}
              onDragOver={(event) => event.preventDefault()}
              onDrop={() => handleDrop(index)}
              >
                <span className="recipe-step-node-number">{index + 1}</span>
                <span className="recipe-step-node-values">
                  {(formattedInitialTemp || '-') + temperatureUnitLabel}
                  <span className="recipe-step-arrow">→</span>
                  {(formattedFinalTemp || '-') + temperatureUnitLabel}
                </span>
              </button>
            )})}
        </div>

        <div className="recipe-main-layout recipe-main-layout--balanced-chart">
          {activeStep ? (
            <div className="recipe-step-editor full">
              <div className="recipe-step-toolbar">
                <div>
                  <strong>Escalon {activeStepIndex + 1}</strong>
                  <p className="step-copy">
                    Ajusta los bloques de temperatura, presion y vacio de este escalon.
                  </p>
                </div>
                <div className="layer-actions">
                  <button
                    type="button"
                    className="inline-button danger"
                    onClick={() => onRemoveStep(activeStepIndex)}
                    disabled={isReadOnly || draft.escalones.length === 1}
                  >
                    Eliminar
                  </button>
                </div>
              </div>

              <div className="recipe-editor-stack">
                <div className="recipe-control-tabs" role="tablist" aria-label="Control del escalon">
                  {[
                    ['temperature', 'Temperatura'],
                    ['pressure', 'Presion'],
                    ['vacuum', 'Vacio'],
                  ].map(([tabId, label]) => (
                    <button
                      key={tabId}
                      id={`recipe-control-tab-${tabId}`}
                      type="button"
                      role="tab"
                      aria-selected={activeControlTab === tabId}
                      aria-controls={`recipe-control-panel-${tabId}`}
                      className={`recipe-control-tab ${activeControlTab === tabId ? 'active' : ''}`}
                      onClick={() => setActiveControlTab(tabId)}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                {activeControlTab === 'temperature' ? (
                  <div
                    id="recipe-control-panel-temperature"
                    role="tabpanel"
                    aria-labelledby="recipe-control-tab-temperature"
                  >
                    <section className="recipe-group">
                  <div className="recipe-group-header">
                    <h4>Temperatura</h4>
                    <DwellToggle
                      checked={temperatureDwell}
                      isReadOnly={isReadOnly}
                      onChange={(event) =>
                        onStepFieldChange(activeStepIndex, 'temp_dwell', event.target.checked)
                      }
                    />
                  </div>
                  <div className="recipe-fields-grid">
                    <label className="form-field">
                      <span className="field-label">
                        Temperatura inicial ( {temperatureUnit === 'fahrenheit' ? '°F' : '°C'} )
                      </span>
                      <input
                        type="number"
                        value={formatTemperatureInput(activeDerivedStep?.temperatura_c, temperatureUnit)}
                        readOnly={isReadOnly || !isFirstStep}
                        onChange={(event) =>
                          onRecipeFieldChange(
                            'temperatura_inicial_c',
                            'float4',
                            toCelsiusTemperatureInput(event.target.value, temperatureUnit),
                          )
                        }
                      />
                    </label>
                    {!temperatureDwell ? (
                      <>
                        <label className="form-field">
                          <span className="field-label">
                            Temperatura final ( {temperatureUnit === 'fahrenheit' ? '°F' : '°C'} )
                          </span>
                          <input
                            type="number"
                            value={formatTemperatureInput(activeStep?.temp_final_c, temperatureUnit)}
                            readOnly={isReadOnly}
                            onChange={(event) =>
                              onStepFieldChange(
                                activeStepIndex,
                                'temp_final_c',
                                toCelsiusTemperatureInput(event.target.value, temperatureUnit),
                              )
                            }
                          />
                        </label>
                        <TransitionFields
                          label="temperatura"
                          modeField="temp_control_mode"
                          timeField="temp_tiempo_min"
                          rampField="temp_grados_por_min"
                          step={activeStep}
                          transition={activeDerivedStep?.tempTransition}
                          stepIndex={activeStepIndex}
                          isReadOnly={isReadOnly}
                          isDwell={false}
                          maxDuration={undefined}
                          onStepFieldChange={onStepFieldChange}
                          temperatureUnit={temperatureUnit}
                        />
                      </>
                    ) : (
                      <TransitionFields
                        label="temperatura"
                        modeField="temp_control_mode"
                        timeField="temp_tiempo_min"
                        rampField="temp_grados_por_min"
                        step={activeStep}
                        transition={activeDerivedStep?.tempTransition}
                        stepIndex={activeStepIndex}
                        isReadOnly={isReadOnly}
                        isDwell
                        showDwellTime
                        onStepFieldChange={onStepFieldChange}
                        temperatureUnit={temperatureUnit}
                      />
                    )}
                  </div>
                    </section>
                  </div>
                ) : null}

                {activeControlTab === 'pressure' ? (
                  <div
                    id="recipe-control-panel-pressure"
                    role="tabpanel"
                    aria-labelledby="recipe-control-tab-pressure"
                  >
                    <section className="recipe-group">
                  <div className="recipe-group-header">
                    <h4>Presion</h4>
                    <DwellToggle
                      checked={pressureDwell}
                      isReadOnly={isReadOnly}
                      onChange={(event) =>
                        onStepFieldChange(activeStepIndex, 'pres_dwell', event.target.checked)
                      }
                    />
                  </div>
                  <div className="recipe-fields-grid">
                    <label className="form-field">
                      <span className="field-label">Presion inicial ( bar(g) )</span>
                      <input
                        type="number"
                        value={isFirstStep ? activeStep?.presion_bar ?? '' : activeDerivedStep?.presion_bar ?? ''}
                        readOnly={isReadOnly || !isFirstStep}
                        onChange={(event) =>
                          onStepFieldChange(activeStepIndex, 'presion_bar', event.target.value)
                        }
                      />
                    </label>
                    {!pressureDwell ? (
                      <>
                        <label className="form-field">
                          <span className="field-label">{getFieldLabel('pres_final_bar')}</span>
                          <input
                            type="number"
                            value={activeStep?.pres_final_bar ?? ''}
                            readOnly={isReadOnly}
                            onChange={(event) =>
                              onStepFieldChange(activeStepIndex, 'pres_final_bar', event.target.value)
                            }
                          />
                        </label>
                        <TransitionFields
                          label="presion"
                          modeField="pres_control_mode"
                          timeField="pres_tiempo_min"
                          rampField="pres_bar_por_min"
                          step={activeStep}
                          transition={activeDerivedStep?.pressureTransition}
                          stepIndex={activeStepIndex}
                          isReadOnly={isReadOnly}
                          isDwell={false}
                          maxDuration={activeDerivedStep?.stepDuration}
                          onStepFieldChange={onStepFieldChange}
                          temperatureUnit={temperatureUnit}
                        />
                      </>
                    ) : null}
                  </div>
                    </section>
                  </div>
                ) : null}

                {activeControlTab === 'vacuum' ? (
                  <div
                    id="recipe-control-panel-vacuum"
                    role="tabpanel"
                    aria-labelledby="recipe-control-tab-vacuum"
                  >
                    <section className="recipe-group">
                  <div className="recipe-group-header">
                    <h4>Vacio</h4>
                    <DwellToggle
                      checked={vacuumDwell}
                      isReadOnly={isReadOnly}
                      onChange={(event) =>
                        onStepFieldChange(activeStepIndex, 'vacio_dwell', event.target.checked)
                      }
                    />
                  </div>
                  <div className="recipe-fields-grid">
                    <label className="form-field">
                      <span className="field-label">Vacio inicial ( bar(g) )</span>
                      <input
                        type="number"
                        value={isFirstStep ? activeStep?.vacio_mbar ?? '' : activeDerivedStep?.vacio_mbar ?? ''}
                        readOnly={isReadOnly || !isFirstStep}
                        onChange={(event) =>
                          onStepFieldChange(activeStepIndex, 'vacio_mbar', event.target.value)
                        }
                      />
                    </label>
                    {!vacuumDwell ? (
                      <>
                        <label className="form-field">
                          <span className="field-label">{getFieldLabel('vacio_final_mbar')}</span>
                          <input
                            type="number"
                            value={activeStep?.vacio_final_mbar ?? ''}
                            readOnly={isReadOnly}
                            onChange={(event) =>
                              onStepFieldChange(activeStepIndex, 'vacio_final_mbar', event.target.value)
                            }
                          />
                        </label>
                        <TransitionFields
                          label="vacio"
                          modeField="vacio_control_mode"
                          timeField="vacio_tiempo_min"
                          rampField="vacio_mbar_por_min"
                          step={activeStep}
                          transition={activeDerivedStep?.vacuumTransition}
                          stepIndex={activeStepIndex}
                          isReadOnly={isReadOnly}
                          isDwell={false}
                          maxDuration={activeDerivedStep?.stepDuration}
                          onStepFieldChange={onStepFieldChange}
                          temperatureUnit={temperatureUnit}
                        />
                      </>
                    ) : null}
                  </div>
                    </section>
                  </div>
                ) : null}
              </div>
            </div>
          ) : null}

          <RecipeChart
            steps={derivedSteps}
            temperatureUnit={temperatureUnit}
            onTemperatureUnitChange={setTemperatureUnit}
            showTemperatureUnitToggle={false}
          />
        </div>
      </section>
    </div>
  )
}

export default RecetaForm
