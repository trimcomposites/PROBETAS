import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, test, vi } from 'vitest'
import ProbetaForm from './ProbetaForm'
import { createEmptyDraft, getCalculatedDensity } from '../utils/records'

const draft = {
  created_at: '',
  updated_at: '',
  title: '',
  author: '',
  reviewed: '',
  referencia: false,
  receta_id: '',
  capas: [],
  largo_mm: '',
  ancho_mm: '',
  espesor_mm: '',
  weight_g: '',
  density: '',
  acabado_id: '',
  has_acabado_cara_b: false,
  acabado_cara_b_id: '',
  anotaciones: '',
  has_uncured_thickness: true,
  ...Object.fromEntries(Array.from({ length: 8 }, (_, index) => [`t${index + 1}`, ''])),
  ...Object.fromEntries(
    Array.from({ length: 8 }, (_, index) => [`uncured_t${index + 1}`, '']),
  ),
}

function renderResults(draftOverrides = {}) {
  const onFieldChange = vi.fn()

  const result = render(
    <ProbetaForm
      draft={{ ...draft, ...draftOverrides }}
      database={{ ACABADO: [], RECETA_ESCALONES: [], RECETAS: [] }}
      activeStep="Resultados"
      steps={['Resultados']}
      calculatedThickness=""
      calculatedThicknessWithoutCuring=""
      calculatedDensity=""
      onStepChange={vi.fn()}
      onFieldChange={onFieldChange}
      onLayerChange={vi.fn()}
      onAddLayer={vi.fn()}
      onRemoveLayer={vi.fn()}
      onReorderLayers={vi.fn()}
      getRecordLabel={vi.fn()}
      onOpenAcabadoForm={vi.fn()}
      onOpenPreImpregnadoForm={vi.fn()}
      onOpenRecetaForm={vi.fn()}
    />,
  )

  return { ...result, onFieldChange }
}

function renderCuring(draftOverrides = {}, databaseOverrides = {}) {
  return render(
    <ProbetaForm
      draft={{ ...draft, ...draftOverrides }}
      database={{ ACABADO: [], RECETA_ESCALONES: [], RECETAS: [], ...databaseOverrides }}
      activeStep="Curado"
      steps={['Curado']}
      calculatedThickness=""
      calculatedThicknessWithoutCuring=""
      calculatedDensity=""
      onStepChange={vi.fn()}
      onFieldChange={vi.fn()}
      onLayerChange={vi.fn()}
      onAddLayer={vi.fn()}
      onRemoveLayer={vi.fn()}
      onReorderLayers={vi.fn()}
      getRecordLabel={(record) => record.nombre ?? record.id}
      onOpenAcabadoForm={vi.fn()}
      onOpenPreImpregnadoForm={vi.fn()}
      onOpenRecetaForm={vi.fn()}
    />,
  )
}

afterEach(cleanup)

describe('resultados de la probeta', () => {
  test('inicia las dimensiones de una nueva probeta en 10 000 mm', () => {
    const newDraft = createEmptyDraft('PROBETA', { fields: [] })

    expect(newDraft.largo_mm).toBe(10000)
    expect(newDraft.ancho_mm).toBe(10000)
  })

  test('calcula la densidad con el espesor medio cuando no hay espesor geométrico manual', () => {
    expect(
      getCalculatedDensity({
        weight_g: 50,
        largo_mm: 100,
        ancho_mm: 100,
        espesor_mm: '',
        has_uncured_thickness: true,
        t1: 2,
        t2: 2,
      }),
    ).toBe(0.0025)
  })

  test('separa la captura de dimensiones y espesores en dos fases', () => {
    renderResults()

    expect(screen.getByRole('button', { name: 'Dimensiones' })).not.toBeNull()
    expect(screen.getByRole('button', { name: 'Espesores' })).not.toBeNull()
    expect(screen.queryByText('T1')).toBeNull()
  })

  test('muestra los ocho puntos A-H al abrir la fase de espesores', () => {
    const { container } = renderResults()

    fireEvent.click(screen.getByRole('button', { name: 'Espesores' }))

    expect(screen.getAllByText(/^[A-H]$/)).toHaveLength(8)
    expect(screen.queryByText('Centro libre')).toBeNull()
    expect(container.querySelector('.thickness-canvas--padded')).toBeNull()
    expect(container.querySelector('.thickness-specimen--dimension-sized')).toBeNull()
    expect(container.querySelector('.thickness-specimen--large')).toBeNull()
    expect(container.querySelector('.thickness-specimen--roomy')).not.toBeNull()
    expect(container.querySelector('.thickness-canvas .specimen-outline').style.aspectRatio).toBe('1 / 1')
    expect(container.querySelector('.thickness-specimen--compact')).toBeNull()
  })

  test('ordena los puntos de espesor de forma continua alrededor del perímetro', () => {
    renderResults()

    fireEvent.click(screen.getByRole('button', { name: 'Espesores' }))

    expect(screen.getByRole('spinbutton', { name: 'A' }).closest('label').className).toContain('point-1')
    expect(screen.getByRole('spinbutton', { name: 'B' }).closest('label').className).toContain('point-2')
    expect(screen.getByRole('spinbutton', { name: 'C' }).closest('label').className).toContain('point-3')
    expect(screen.getByRole('spinbutton', { name: 'D' }).closest('label').className).toContain('point-8')
    expect(screen.getByRole('spinbutton', { name: 'E' }).closest('label').className).toContain('point-4')
    expect(screen.getByRole('spinbutton', { name: 'F' }).closest('label').className).toContain('point-7')
    expect(screen.getByRole('spinbutton', { name: 'G' }).closest('label').className).toContain('point-6')
    expect(screen.getByRole('spinbutton', { name: 'H' }).closest('label').className).toContain('point-5')
  })

  test('ajusta el ancho con un control deslizante en pasos de 1 000 mm', () => {
    const { onFieldChange } = renderResults()

    fireEvent.change(screen.getByRole('slider', { name: 'Ancho' }), {
      target: { value: '11000' },
    })

    expect(onFieldChange).toHaveBeenCalledWith(
      { name: 'largo_mm', type: 'float4' },
      '11000',
    )
  })

  test('limita las cotas a 20 000 mm', () => {
    renderResults()

    expect(screen.getByRole('slider', { name: 'Ancho' }).max).toBe('20000')
    expect(screen.getByRole('slider', { name: 'Alto' }).max).toBe('20000')
  })

  test('avanza las cotas en saltos de 1 000 mm', () => {
    renderResults()

    expect(screen.getByRole('slider', { name: 'Ancho' }).step).toBe('1000')
    expect(screen.getByRole('slider', { name: 'Alto' }).step).toBe('1000')
  })

  test('permite editar el valor numérico de Ancho', () => {
    const { onFieldChange } = renderResults()
    const widthInput = screen.getByRole('spinbutton', { name: 'Valor de Ancho' })

    fireEvent.change(widthInput, { target: { value: '20500' } })
    fireEvent.blur(widthInput)

    expect(onFieldChange).toHaveBeenCalledWith(
      { name: 'largo_mm', type: 'float4' },
      '20000',
    )
  })

  test('mantiene la probeta como un cuadrado fijo al cambiar las dimensiones', () => {
    const { container } = renderResults({ largo_mm: 20000, ancho_mm: 10000 })

    expect(container.querySelector('.geometry-specimen').style.aspectRatio).toBe('1 / 1')
  })

  test('no repite la unidad mm en el encabezado de dimensiones', () => {
    const { container } = renderResults()

    expect(container.querySelector('.geometry-plane .dimensions-unit-badge')).toBeNull()
  })

  test('sitúa el tirador vertical personalizado en la posición de Alto', () => {
    const { container } = renderResults({ ancho_mm: 20000 })
    const verticalTrack = container.querySelector('.geometry-input-vertical .dimension-track')

    expect(verticalTrack.style.getPropertyValue('--dimension-progress')).toBe('0%')
    expect(verticalTrack.querySelector('.dimension-thumb')).not.toBeNull()
  })

  test('aumenta Alto en pasos de 1 000 mm al desplazar la rueda hacia arriba', () => {
    const { onFieldChange } = renderResults({ ancho_mm: 10000 })

    fireEvent.wheel(screen.getByRole('slider', { name: 'Alto' }), { deltaY: -1 })

    expect(onFieldChange).toHaveBeenCalledWith(
      { name: 'ancho_mm', type: 'float4' },
      '11000',
    )
  })
})

describe('referencias archivadas', () => {
  test('mantiene una receta archivada visible sin incluirla entre las opciones nuevas', () => {
    render(
      <ProbetaForm
        draft={{ ...draft, id: 4, receta_id: 'receta-archivada' }}
        database={{ ACABADO: [], RECETA_ESCALONES: [], RECETAS: [] }}
        archivedReferenceLabels={{ 'RECETAS:receta-archivada': 'Receta antigua (Archivado)' }}
        activeStep="Curado"
        steps={['Curado']}
        calculatedThickness=""
        calculatedThicknessWithoutCuring=""
        calculatedDensity=""
        onStepChange={vi.fn()}
        onFieldChange={vi.fn()}
        onLayerChange={vi.fn()}
        onAddLayer={vi.fn()}
        onRemoveLayer={vi.fn()}
        onReorderLayers={vi.fn()}
        getRecordLabel={(record) => record.nombre ?? record.id}
        onOpenAcabadoForm={vi.fn()}
        onOpenPreImpregnadoForm={vi.fn()}
        onOpenRecetaForm={vi.fn()}
      />,
    )

    expect(screen.getByRole('option', { name: 'Receta antigua (Archivado)' }).disabled).toBe(true)
  })
})

describe('curado de la probeta', () => {
  test('apila el selector encima de la gráfica a todo el ancho disponible', () => {
    const { container } = renderCuring()

    expect(container.querySelector('.curing-preview-stack')).not.toBeNull()
    expect(container.querySelector('.curing-recipe-selector')).not.toBeNull()
  })

  test('mantiene la gráfica de la receta al recibir el id del selector como texto', () => {
    renderCuring(
      { receta_id: '2' },
      {
        RECETAS: [{ id: 2, nombre: 'Ciclo 2', temperatura_inicial_c: 20 }],
        RECETA_ESCALONES: [
          {
            receta_id: 2,
            escalon: 1,
            temp_final_c: 50,
            temp_tiempo_min: 10,
            temp_control_mode: 'time',
            temp_dwell: false,
            presion_bar: 1,
            pres_final_bar: 1,
            pres_dwell: true,
            vacio_mbar: -0.5,
            vacio_final_mbar: -0.5,
            vacio_dwell: true,
          },
        ],
      },
    )

    expect(screen.getByText('20 → 50 °C')).toBeTruthy()
  })
})
