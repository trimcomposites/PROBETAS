import { useState } from 'react'
import RecipeChart from './RecipeChart'
import { formatDensityValue, hasSingleMaterialAcrossLayers } from '../utils/records'
import { deriveRecipeSteps } from '../utils/recipeSteps'

const CURED_THICKNESS_FIELDS = ['t1', 't2', 't3', 't4', 't5', 't6', 't7', 't8']
const THICKNESS_POINT_LABELS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']
const UNCURED_THICKNESS_FIELDS = [
  'uncured_t1',
  'uncured_t2',
  'uncured_t3',
  'uncured_t4',
  'uncured_t5',
  'uncured_t6',
  'uncured_t7',
  'uncured_t8',
]
const THICKNESS_POINT_POSITIONS = [1, 2, 3, 8, 4, 7, 6, 5]

function formatDateTime(value) {
  if (!value) {
    return 'Sin dato'
  }

  const parsed = new Date(value)

  if (Number.isNaN(parsed.getTime())) {
    return 'Sin dato'
  }

  return parsed.toLocaleString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function getDimensionSliderValue(value) {
  const numericValue = Number(value)

  if (!Number.isFinite(numericValue) || numericValue < 100) {
    return 10000
  }

  return Math.min(20000, Math.round(numericValue / 1000) * 1000)
}

function getDimensionSliderProgress(value) {
  return `${((20000 - getDimensionSliderValue(value)) / 19900) * 100}%`
}

function ProbetaForm({
  draft,
  database,
  activeStep,
  steps,
  calculatedThickness,
  calculatedThicknessWithoutCuring,
  calculatedDensity,
  isReadOnly = false,
  archivedReferenceLabels = {},
  onStepChange,
  onFieldChange,
  onLayerChange,
  onAddLayer,
  onRemoveLayer,
  onReorderLayers,
  getRecordLabel,
  onOpenAcabadoForm,
  onOpenPreImpregnadoForm,
  onOpenRecetaForm,
}) {
  const [draggedLayerIndex, setDraggedLayerIndex] = useState(null)
  const [dropTargetIndex, setDropTargetIndex] = useState(null)
  const [resultsPhase, setResultsPhase] = useState('dimensions')
  const [thicknessSet, setThicknessSet] = useState('uncured')
  const selectedRecipeSteps = (database.RECETA_ESCALONES ?? [])
    .filter((step) => String(step.receta_id) === String(draft.receta_id))
    .sort((a, b) => (a.escalon ?? 0) - (b.escalon ?? 0))
  const selectedRecipe = (database.RECETAS ?? []).find(
    (record) => String(record.id) === String(draft.receta_id),
  )
  const usesSingleMaterialThickness = hasSingleMaterialAcrossLayers(draft)
  const derivedRecipeSteps = deriveRecipeSteps({
    ...selectedRecipe,
    escalones: selectedRecipeSteps,
  })
  const widthValue = getDimensionSliderValue(draft.largo_mm)
  const heightValue = getDimensionSliderValue(draft.ancho_mm)

  function getArchivedReferenceLabel(tableName, value) {
    if (value === null || value === undefined || value === '') {
      return null
    }

    return archivedReferenceLabels[`${tableName}:${value}`] ?? null
  }

  function handleDragStart(index) {
    if (isReadOnly) {
      return
    }

    setDraggedLayerIndex(index)
  }

  function handleDragEnter(targetIndex) {
    if (isReadOnly) {
      return
    }

    if (draggedLayerIndex === null || draggedLayerIndex === targetIndex) {
      setDropTargetIndex(null)
      return
    }

    setDropTargetIndex(targetIndex)
  }

  function handleDrop(targetIndex) {
    if (isReadOnly || draggedLayerIndex === null) {
      return
    }

    onReorderLayers(draggedLayerIndex, targetIndex)
    setDraggedLayerIndex(null)
    setDropTargetIndex(null)
  }

  function getLayerMaterialValue(layer) {
    if (layer.pre_impregnado_id === null || layer.pre_impregnado_id === undefined) {
      return ''
    }

    return String(layer.pre_impregnado_id)
  }

  function isLayerComplete(layer) {
    return getLayerMaterialValue(layer) !== '' && String(layer.direccion_id ?? '').trim() !== ''
  }

  function handleAcabadoSelectChange(fieldName, value) {
    if (value === '__new_acabado__') {
      onOpenAcabadoForm(fieldName)
      return
    }

    onFieldChange(
      { name: fieldName, type: 'uuid', references: 'ACABADO.id' },
      value,
    )
  }

  function handleMaterialSelectChange(index, value) {
    if (value === '__new_material__') {
      onOpenPreImpregnadoForm(index)
      return
    }

    onLayerChange(index, 'pre_impregnado_id', value)
  }

  function handleRecetaSelectChange(value) {
    if (value === '__new_receta__') {
      onOpenRecetaForm()
      return
    }

    onFieldChange(
      { name: 'receta_id', type: 'uuid', references: 'RECETAS.id' },
      value,
    )
  }

  function getLayerDirectionValue(layer) {
    if (layer.direccion_id === null || layer.direccion_id === undefined) {
      return ''
    }

    return String(layer.direccion_id)
  }

  function updateHeightFromPointer(event) {
    const bounds = event.currentTarget.getBoundingClientRect()

    if (bounds.height <= 0) {
      return
    }

    const ratio = Math.min(1, Math.max(0, (event.clientY - bounds.top) / bounds.height))
    const value = Math.min(20000, Math.max(100, Math.round((20000 - ratio * 19900) / 1000) * 1000))

    onFieldChange({ name: 'ancho_mm', type: 'float4' }, String(value))
  }

  function commitDimensionInput(fieldName, inputElement) {
    const normalizedValue = getDimensionSliderValue(inputElement.value)

    inputElement.value = String(normalizedValue)
    onFieldChange({ name: fieldName, type: 'float4' }, String(normalizedValue))
  }

  return (
    <>
      <section className="step-panel">
        <div className="step-header">
          <div>
            <h3>Datos generales</h3>
          </div>
        </div>

        <div className="curado-grid">
          <div className="form-field">
            <span className="field-label">Creada</span>
            <div className="readonly-field-value">{formatDateTime(draft.created_at)}</div>
          </div>

          <div className="form-field">
            <span className="field-label">Modificada</span>
            <div className="readonly-field-value">
              {formatDateTime(draft.updated_at ?? draft.created_at)}
            </div>
          </div>

          <label className="form-field">
            <span className="field-label">Titulo</span>
            <input
              type="text"
              value={draft.title}
              readOnly={isReadOnly}
              onChange={(event) => onFieldChange({ name: 'title', type: 'text' }, event.target.value)}
            />
          </label>

          <label className="form-field">
            <span className="field-label">Autor</span>
            <input
              type="text"
              value={draft.author}
              readOnly={isReadOnly}
              onChange={(event) => onFieldChange({ name: 'author', type: 'text' }, event.target.value)}
            />
          </label>

          <label className="form-field">
            <span className="field-label">Revisado por</span>
            <input
              type="text"
              value={draft.reviewed}
              readOnly={isReadOnly}
              onChange={(event) =>
                onFieldChange({ name: 'reviewed', type: 'text' }, event.target.value)
              }
            />
          </label>

          <label className="form-field">
            <span className="field-label">Referencia</span>
            <label className="switch-field">
              <input
                type="checkbox"
                checked={Boolean(draft.referencia)}
                disabled={isReadOnly}
                onChange={(event) =>
                  onFieldChange({ name: 'referencia', type: 'bool' }, event.target.checked)
                }
              />
              <span>{draft.referencia ? 'Si' : 'No'}</span>
            </label>
          </label>
        </div>
      </section>

      <div className="step-tabs">
        {steps.map((step) => (
          <button
            key={step}
            type="button"
            className={`step-tab ${activeStep === step ? 'active' : ''}`}
            onClick={() => onStepChange(step)}
          >
            {step}
          </button>
        ))}
      </div>

      {activeStep === 'Capas' ? (
        <section className="step-panel">
          <div className="step-header">
            <div>
              <h3>Capas</h3>
              <p className="step-copy">
                Anade las capas en orden con su material y direccion.
              </p>
            </div>
          </div>

          <div className="layer-list">
            {draft.capas.map((layer, index) => {
              const isLastLayer = index === draft.capas.length - 1

              return (
                <article
                  key={layer.id}
                  className={`layer-card ${draggedLayerIndex === index ? 'dragging' : ''} ${dropTargetIndex === index ? 'drop-target' : ''}`}
                  draggable={!isReadOnly}
                  onDragStart={() => handleDragStart(index)}
                  onDragEnd={() => {
                    setDraggedLayerIndex(null)
                    setDropTargetIndex(null)
                  }}
                  onDragEnter={() => handleDragEnter(index)}
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={() => handleDrop(index)}
                >
                  <div className="layer-card-header">
                    <div className="layer-title">
                      <span className="drag-handle" aria-hidden="true">
                        ::
                      </span>
                      <strong>Capa {index + 1}</strong>
                    </div>
                    <div className="layer-actions">
                      <button
                        type="button"
                        className="inline-button danger"
                        onClick={() => onRemoveLayer(index)}
                        disabled={isReadOnly}
                      >
                        Eliminar
                      </button>
                    </div>
                  </div>

                  <div className="layer-grid">
                    <label className="form-field">
                      <span className="field-label">Material</span>
                      <select
                        value={getLayerMaterialValue(layer)}
                        disabled={isReadOnly}
                        onChange={(event) =>
                          handleMaterialSelectChange(index, event.target.value)
                        }
                      >
                        <option value="">Selecciona un material</option>
                        {getArchivedReferenceLabel('PRE-IMPREGNADO', layer.pre_impregnado_id) ? (
                          <option value={layer.pre_impregnado_id} disabled>
                            {getArchivedReferenceLabel('PRE-IMPREGNADO', layer.pre_impregnado_id)}
                          </option>
                        ) : null}
                        {(database['PRE-IMPREGNADO'] ?? []).map((record, recordIndex) => (
                          <option key={record.id ?? recordIndex} value={record.id ?? ''}>
                            {getRecordLabel(record, recordIndex)}
                          </option>
                        ))}
                        {isReadOnly ? null : (
                          <option value="__new_material__">+ Anadir nuevo material</option>
                        )}
                      </select>
                    </label>

                    <label className="form-field">
                      <span className="field-label">Direccion</span>
                      <select
                        value={getLayerDirectionValue(layer)}
                        disabled={isReadOnly}
                        onChange={(event) =>
                          onLayerChange(index, 'direccion_id', event.target.value)
                        }
                      >
                        <option value="">Selecciona una direccion</option>
                        {(database.DIRECCION_CAPA ?? []).map((record, recordIndex) => (
                          <option key={record.id ?? recordIndex} value={record.id ?? ''}>
                            {getRecordLabel(record, recordIndex)}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>

                  {isLastLayer ? (
                    <div className="layer-footer">
                      <button
                        type="button"
                        className="ghost-button"
                        onClick={onAddLayer}
                        disabled={isReadOnly || !isLayerComplete(layer)}
                      >
                        Anadir capa
                      </button>
                    </div>
                  ) : null}
                </article>
              )
            })}
          </div>
        </section>
      ) : null}

      {activeStep === 'Curado' ? (
        <section className="step-panel">
          <div className="step-header">
            <div>
              <h3>Curado</h3>
            </div>
          </div>

          <div className="curing-preview-stack">
            <div className="recipe-step-editor curing-recipe-selector">
              <div className="curado-grid">
                <label className="form-field span-full">
                  <span className="field-label">Receta</span>
                  <select
                    value={draft.receta_id}
                    disabled={isReadOnly}
                    onChange={(event) =>
                      handleRecetaSelectChange(event.target.value)
                    }
                  >
                    <option value="">Selecciona una receta</option>
                    {getArchivedReferenceLabel('RECETAS', draft.receta_id) ? (
                      <option value={draft.receta_id} disabled>
                        {getArchivedReferenceLabel('RECETAS', draft.receta_id)}
                      </option>
                    ) : null}
                    {(database.RECETAS ?? []).map((record, index) => (
                      <option key={record.id ?? index} value={record.id ?? ''}>
                        {getRecordLabel(record, index)}
                      </option>
                    ))}
                    {isReadOnly ? null : <option value="__new_receta__">+ Anadir nueva receta</option>}
                  </select>
                </label>
              </div>
            </div>

            <RecipeChart
              steps={derivedRecipeSteps}
              title="Grafica de la receta"
              subtitle="Vista previa del curado de la receta seleccionada."
            />
          </div>
        </section>
      ) : null}

      {activeStep === 'Resultados' ? (
        <section className="step-panel">
          <div className="step-header">
            <div>
              <h3>Resultados</h3>
              <p className="step-copy">
                El espesor medio se calcula automaticamente con los valores T cargados.
              </p>
            </div>
          </div>

          <div className="curado-grid">
            <div className="results-phase-tabs span-full" role="tablist" aria-label="Fases de resultados">
              <button
                type="button"
                className={resultsPhase === 'dimensions' ? 'active' : ''}
                aria-selected={resultsPhase === 'dimensions'}
                onClick={() => setResultsPhase('dimensions')}
              >
                Dimensiones
              </button>
              <button
                type="button"
                className={resultsPhase === 'thickness' ? 'active' : ''}
                aria-selected={resultsPhase === 'thickness'}
                onClick={() => setResultsPhase('thickness')}
              >
                Espesores
              </button>
            </div>

            {resultsPhase === 'dimensions' ? (
              <section className="measurement-plane geometry-plane span-full">
                <div className="measurement-plane-header">
                  <div>
                    <p className="measurement-plane-kicker">Fase 1</p>
                    <h4>Dimensiones de la probeta</h4>
                  </div>
                </div>
                <div className="geometry-canvas">
                  <div className="geometry-specimen" style={{ aspectRatio: 1 }}>
                    <label className="geometry-input geometry-input-horizontal">
                      <span className="geometry-input-value">
                        <strong>Ancho</strong>
                        <input
                          key={widthValue}
                          className="dimension-value-input"
                          type="number"
                          min="100"
                          max="20000"
                          step="1000"
                          aria-label="Valor de Ancho"
                          defaultValue={widthValue}
                          disabled={isReadOnly}
                          onBlur={(event) =>
                            commitDimensionInput('largo_mm', event.currentTarget)
                          }
                          onKeyDown={(event) => {
                            if (event.key === 'Enter') {
                              event.currentTarget.blur()
                            }
                          }}
                        />
                        <small>mm</small>
                      </span>
                      <span className="dimension-track">
                        <input
                          className="dimension-slider"
                          type="range"
                          min="100"
                          max="20000"
                          step="1000"
                          aria-label="Ancho"
                          value={widthValue}
                          disabled={isReadOnly}
                          onChange={(event) =>
                            onFieldChange({ name: 'largo_mm', type: 'float4' }, event.target.value)
                          }
                        />
                      </span>
                    </label>
                    <label className="geometry-input geometry-input-vertical">
                      <span className="geometry-input-value">
                        <strong>Alto</strong>
                        <input
                          key={heightValue}
                          className="dimension-value-input"
                          type="number"
                          min="100"
                          max="20000"
                          step="1000"
                          aria-label="Valor de Alto"
                          defaultValue={heightValue}
                          disabled={isReadOnly}
                          onBlur={(event) =>
                            commitDimensionInput('ancho_mm', event.currentTarget)
                          }
                          onKeyDown={(event) => {
                            if (event.key === 'Enter') {
                              event.currentTarget.blur()
                            }
                          }}
                        />
                        <small>mm</small>
                      </span>
                      <span
                        className="dimension-track"
                        style={{ '--dimension-progress': getDimensionSliderProgress(heightValue) }}
                        onPointerDown={(event) => {
                          event.currentTarget.setPointerCapture?.(event.pointerId)
                          updateHeightFromPointer(event)
                        }}
                        onPointerMove={(event) => {
                          if (event.currentTarget.hasPointerCapture?.(event.pointerId)) {
                            updateHeightFromPointer(event)
                          }
                        }}
                        onWheel={(event) => {
                          event.preventDefault()
                          const increment = event.deltaY < 0 ? 1000 : -1000
                          const nextValue = Math.min(
                            20000,
                            Math.max(100, heightValue + increment),
                          )
                          onFieldChange(
                            { name: 'ancho_mm', type: 'float4' },
                            String(nextValue),
                          )
                        }}
                      >
                        <input
                          className="dimension-slider"
                          type="range"
                          min="100"
                          max="20000"
                          step="1000"
                          aria-label="Alto"
                          value={heightValue}
                          disabled={isReadOnly}
                          onChange={(event) =>
                            onFieldChange({ name: 'ancho_mm', type: 'float4' }, event.target.value)
                          }
                        />
                        <span className="dimension-thumb" aria-hidden="true" />
                      </span>
                    </label>
                    <div className="specimen-outline" />
                  </div>
                </div>
              </section>
            ) : (
              <section className="measurement-plane thickness-plane span-full">
                <div className="measurement-plane-header">
                  <div>
                    <p className="measurement-plane-kicker">Fase 2</p>
                    <h4>Espesores de la probeta</h4>
                  </div>
                  <div className="thickness-set-tabs" role="tablist" aria-label="Batería de espesores">
                    <button
                      type="button"
                      className={thicknessSet === 'uncured' ? 'active' : ''}
                      aria-selected={thicknessSet === 'uncured'}
                      onClick={() => setThicknessSet('uncured')}
                    >
                      Sin curar
                    </button>
                    <button
                      type="button"
                      className={thicknessSet === 'cured' ? 'active' : ''}
                      aria-selected={thicknessSet === 'cured'}
                      disabled={isReadOnly && !draft.has_uncured_thickness}
                      onClick={() => {
                        if (!draft.has_uncured_thickness && !isReadOnly) {
                          onFieldChange({ name: 'has_uncured_thickness', type: 'bool' }, true)
                        }
                        setThicknessSet('cured')
                      }}
                    >
                      Curado
                    </button>
                  </div>
                </div>
                <div className="thickness-canvas">
                  <div
                    className="specimen-outline thickness-specimen thickness-specimen--roomy"
                    style={{ aspectRatio: 1 }}
                  >
                    {(thicknessSet === 'cured' ? CURED_THICKNESS_FIELDS : UNCURED_THICKNESS_FIELDS).map(
                      (fieldName, index) => (
                        <label
                          key={fieldName}
                          className={`measurement-point point-${THICKNESS_POINT_POSITIONS[index]}`}
                        >
                          <span>{THICKNESS_POINT_LABELS[index]}</span>
                          <input
                            type="number"
                            aria-label={THICKNESS_POINT_LABELS[index]}
                            value={draft[fieldName] ?? ''}
                            readOnly={isReadOnly}
                            onChange={(event) =>
                              onFieldChange({ name: fieldName, type: 'float4' }, event.target.value)
                            }
                          />
                          <small>mm</small>
                        </label>
                      ),
                    )}
                  </div>
                </div>
                <div className="thickness-summary thickness-summary-inline">
                  <span className="thickness-summary-label">
                    {thicknessSet === 'cured' ? 'Media curado' : 'Media sin curar'}
                  </span>
                  <strong>
                    {thicknessSet === 'cured'
                      ? calculatedThickness || 'Sin dato'
                      : calculatedThicknessWithoutCuring || 'Sin dato'} mm
                  </strong>
                </div>
                {usesSingleMaterialThickness ? (
                  <p className="thickness-panel-copy">
                    Calculo por capa activo: la media medida se divide entre el numero de capas.
                  </p>
                ) : null}
              </section>
            )}

            <label className="form-field">
              <span className="field-label">Peso [g]</span>
              <input
                type="number"
                value={draft.weight_g}
                readOnly={isReadOnly}
                onChange={(event) =>
                  onFieldChange({ name: 'weight_g', type: 'float4' }, event.target.value)
                }
              />
            </label>

            <label className="form-field">
              <span className="field-label">Densidad [g/cm3]</span>
              <div className="density-field-stack">
                <input type="number" value={formatDensityValue(calculatedDensity, 'g/cm3')} readOnly />
              </div>
            </label>

            <label className="form-field">
              <span className="field-label">
                {draft.has_acabado_cara_b ? 'Acabado cara A' : 'Acabado'}
              </span>
              <select
                value={draft.acabado_id}
                disabled={isReadOnly}
                onChange={(event) => handleAcabadoSelectChange('acabado_id', event.target.value)}
              >
                <option value="">Selecciona un acabado</option>
                {(database.ACABADO ?? []).map((record, index) => (
                  <option key={record.id ?? index} value={record.id ?? ''}>
                    {getRecordLabel(record, index)}
                  </option>
                ))}
                {isReadOnly ? null : <option value="__new_acabado__">+ Anadir nuevo acabado</option>}
              </select>
            </label>

            <label className="form-field">
              <span className="field-label">Acabado cara B</span>
              <label className="switch-field">
                <input
                  type="checkbox"
                  checked={Boolean(draft.has_acabado_cara_b)}
                  disabled={isReadOnly}
                  onChange={(event) =>
                    onFieldChange(
                      { name: 'has_acabado_cara_b', type: 'bool' },
                      event.target.checked,
                    )
                  }
                />
                <span>{draft.has_acabado_cara_b ? 'Activo' : 'No'}</span>
              </label>
            </label>

            {draft.has_acabado_cara_b ? (
              <label className="form-field">
                <span className="field-label">Acabado cara B</span>
                <select
                  value={draft.acabado_cara_b_id}
                  disabled={isReadOnly}
                  onChange={(event) =>
                    handleAcabadoSelectChange('acabado_cara_b_id', event.target.value)
                  }
                >
                  <option value="">Selecciona un acabado</option>
                  {(database.ACABADO ?? []).map((record, index) => (
                    <option key={record.id ?? index} value={record.id ?? ''}>
                      {getRecordLabel(record, index)}
                    </option>
                  ))}
                  {isReadOnly ? null : (
                    <option value="__new_acabado__">+ Anadir nuevo acabado</option>
                  )}
                </select>
              </label>
            ) : null}

            <label className="form-field span-full">
              <span className="field-label">Anotaciones</span>
              <textarea
                rows="4"
                value={draft.anotaciones}
                readOnly={isReadOnly}
                onChange={(event) =>
                  onFieldChange({ name: 'anotaciones', type: 'text' }, event.target.value)
                }
              />
            </label>
          </div>
        </section>
      ) : null}
    </>
  )
}

export default ProbetaForm
