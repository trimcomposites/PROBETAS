import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, test, vi } from 'vitest'
import RecetaForm from './RecetaForm'

const draft = {
  nombre: 'Receta de prueba',
  temperatura_inicial_c: 20,
  temperatura_final_c: 40,
  escalones: [
    {
      id: 'step-1',
      escalon: 1,
      temp_final_c: 40,
      temp_dwell: false,
      temp_tiempo_min: '',
      temp_grados_por_min: '',
      temp_control_mode: 'time',
      presion_bar: 1,
      pres_final_bar: 1,
      pres_dwell: true,
      vacio_mbar: 0,
      vacio_final_mbar: 0,
      vacio_dwell: true,
    },
  ],
}

afterEach(() => cleanup())

describe('RecetaForm', () => {
  test('marca el nombre cuando el guardado informa un duplicado', () => {
    render(
      <RecetaForm
        draft={draft}
        activeStepIndex={0}
        fieldErrors={{ nombre: true }}
        onRecipeFieldChange={vi.fn()}
        onStepFieldChange={vi.fn()}
        onAddStep={vi.fn()}
        onRemoveStep={vi.fn()}
        onReorderStep={vi.fn()}
        onSelectStep={vi.fn()}
      />,
    )

    expect(screen.getByRole('textbox', { name: 'Nombre' }).closest('.form-field').className).toContain(
      'has-field-error',
    )
  })

  test('deja solo el nombre en la cabecera de la receta', () => {
    render(
      <RecetaForm
        draft={draft}
        activeStepIndex={0}
        onRecipeFieldChange={vi.fn()}
        onStepFieldChange={vi.fn()}
        onAddStep={vi.fn()}
        onRemoveStep={vi.fn()}
        onReorderStep={vi.fn()}
        onSelectStep={vi.fn()}
      />,
    )

    const summaryGrid = document.querySelector('.recipe-summary-grid')

    expect(summaryGrid?.querySelectorAll('input')).toHaveLength(1)
  })

  test('separa los controles de cada escalón en pestañas', () => {
    render(
      <RecetaForm
        draft={draft}
        activeStepIndex={0}
        onRecipeFieldChange={vi.fn()}
        onStepFieldChange={vi.fn()}
        onAddStep={vi.fn()}
        onRemoveStep={vi.fn()}
        onReorderStep={vi.fn()}
        onSelectStep={vi.fn()}
      />,
    )

    const temperatureTab = screen.getByRole('tab', { name: 'Temperatura' })
    const pressureTab = screen.getByRole('tab', { name: 'Presion' })

    expect(temperatureTab.getAttribute('aria-selected')).toBe('true')
    expect(screen.getByRole('spinbutton', { name: 'Temperatura inicial ( °C )' })).not.toBeNull()
    expect(screen.queryByRole('spinbutton', { name: 'Presion inicial ( bar(g) )' })).toBeNull()

    fireEvent.click(pressureTab)

    expect(pressureTab.getAttribute('aria-selected')).toBe('true')
    expect(screen.getByRole('spinbutton', { name: 'Presion inicial ( bar(g) )' })).not.toBeNull()
    expect(screen.queryByRole('spinbutton', { name: 'Temperatura inicial ( °C )' })).toBeNull()
  })

  test('muestra las unidades entre paréntesis con espacio interno', () => {
    const editableDraft = {
      ...draft,
      escalones: [
        {
          ...draft.escalones[0],
          temp_dwell: false,
          pres_dwell: false,
          vacio_dwell: false,
        },
      ],
    }

    render(
      <RecetaForm
        draft={editableDraft}
        activeStepIndex={0}
        onRecipeFieldChange={vi.fn()}
        onStepFieldChange={vi.fn()}
        onAddStep={vi.fn()}
        onRemoveStep={vi.fn()}
        onReorderStep={vi.fn()}
        onSelectStep={vi.fn()}
      />,
    )

    expect(screen.getByRole('spinbutton', { name: 'Temperatura inicial ( °C )' })).not.toBeNull()
    expect(screen.getByRole('spinbutton', { name: 'Temperatura final ( °C )' })).not.toBeNull()
    expect(screen.getByRole('spinbutton', { name: /^Tiempo \( min \)/ })).not.toBeNull()
    expect(screen.getByRole('spinbutton', { name: /^Rampa \( °C \/ min \)/ })).not.toBeNull()

    fireEvent.click(screen.getByRole('tab', { name: 'Presion' }))
    expect(screen.getByRole('spinbutton', { name: 'Presion inicial ( bar(g) )' })).not.toBeNull()
    expect(screen.getByRole('spinbutton', { name: 'Presion final ( bar(g) )' })).not.toBeNull()
    expect(screen.getByRole('spinbutton', { name: /^Rampa \( bar\(g\) \/ min \)/ })).not.toBeNull()

    fireEvent.click(screen.getByRole('tab', { name: 'Vacio' }))
    expect(screen.getByRole('spinbutton', { name: 'Vacio inicial ( bar(g) )' })).not.toBeNull()
    expect(screen.getByRole('spinbutton', { name: 'Vacio final ( bar(g) )' })).not.toBeNull()
    expect(screen.getByRole('spinbutton', { name: /^Rampa \( bar\(g\) \/ min \)/ })).not.toBeNull()
  })

  test('muestra Mantenimiento como interruptor en la cabecera del panel', () => {
    render(
      <RecetaForm
        draft={draft}
        activeStepIndex={0}
        onRecipeFieldChange={vi.fn()}
        onStepFieldChange={vi.fn()}
        onAddStep={vi.fn()}
        onRemoveStep={vi.fn()}
        onReorderStep={vi.fn()}
        onSelectStep={vi.fn()}
      />,
    )

    expect(screen.getByRole('checkbox', { name: 'Mantenimiento' })).not.toBeNull()
  })

  test('guarda la temperatura inicial del primer escalón en la receta', () => {
    const onStepFieldChange = vi.fn()
    const onRecipeFieldChange = vi.fn()

    render(
      <RecetaForm
        draft={draft}
        activeStepIndex={0}
        onRecipeFieldChange={onRecipeFieldChange}
        onStepFieldChange={onStepFieldChange}
        onAddStep={vi.fn()}
        onRemoveStep={vi.fn()}
        onReorderStep={vi.fn()}
        onSelectStep={vi.fn()}
      />,
    )

    const temperature = screen.getByRole('spinbutton', { name: 'Temperatura inicial ( °C )' })
    fireEvent.change(temperature, { target: { value: '30' } })

    fireEvent.click(screen.getByRole('tab', { name: 'Presion' }))
    const pressure = screen.getByRole('spinbutton', { name: 'Presion inicial ( bar(g) )' })
    fireEvent.change(pressure, { target: { value: '3' } })

    fireEvent.click(screen.getByRole('tab', { name: 'Vacio' }))
    const vacuum = screen.getByRole('spinbutton', { name: 'Vacio inicial ( bar(g) )' })
    fireEvent.change(vacuum, { target: { value: '100' } })

    expect(pressure.readOnly).toBe(false)
    expect(vacuum.readOnly).toBe(false)
    expect(temperature.readOnly).toBe(false)
    expect(onStepFieldChange).toHaveBeenCalledWith(0, 'presion_bar', '3')
    expect(onStepFieldChange).toHaveBeenCalledWith(0, 'vacio_mbar', '100')
    expect(onRecipeFieldChange).toHaveBeenCalledWith('temperatura_inicial_c', 'float4', '30')
  })

  test('usa la última edición de Tiempo o Rampa como fuente sin selector', () => {
    const onStepFieldChange = vi.fn()

    render(
      <RecetaForm
        draft={draft}
        activeStepIndex={0}
        onRecipeFieldChange={vi.fn()}
        onStepFieldChange={onStepFieldChange}
        onAddStep={vi.fn()}
        onRemoveStep={vi.fn()}
        onReorderStep={vi.fn()}
        onSelectStep={vi.fn()}
      />,
    )

    expect(screen.queryByRole('combobox', { name: 'Control de temperatura' })).toBeNull()

    fireEvent.change(screen.getByRole('spinbutton', { name: /^Rampa/ }), {
      target: { value: '2' },
    })

    expect(onStepFieldChange).toHaveBeenCalledWith(0, 'temp_control_mode', 'ramp')
    expect(onStepFieldChange).toHaveBeenCalledWith(0, 'temp_grados_por_min', '2')
  })

  test('edita temperatura y rampa en Fahrenheit conservando Celsius en el borrador', () => {
    const onRecipeFieldChange = vi.fn()
    const onStepFieldChange = vi.fn()

    render(
      <RecetaForm
        draft={draft}
        activeStepIndex={0}
        onRecipeFieldChange={onRecipeFieldChange}
        onStepFieldChange={onStepFieldChange}
        onAddStep={vi.fn()}
        onRemoveStep={vi.fn()}
        onReorderStep={vi.fn()}
        onSelectStep={vi.fn()}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: '°F' }))

    const temperature = screen.getByRole('spinbutton', { name: 'Temperatura inicial ( °F )' })
    expect(temperature.value).toBe('68')
    fireEvent.change(temperature, { target: { value: '86' } })
    fireEvent.change(screen.getByRole('spinbutton', { name: /^Rampa \( °F \/ min \)/ }), {
      target: { value: '18' },
    })

    expect(onRecipeFieldChange).toHaveBeenCalledWith('temperatura_inicial_c', 'float4', 30)
    expect(onStepFieldChange).toHaveBeenCalledWith(0, 'temp_grados_por_min', 10)
    expect(screen.queryByText('20 → 40 °C')).toBeNull()
    expect(screen.getByText('68 → 104 °F')).toBeTruthy()
  })

  test('sitúa el interruptor de unidades en la cabecera superior del diálogo', () => {
    render(
      <RecetaForm
        draft={draft}
        activeStepIndex={0}
        onRecipeFieldChange={vi.fn()}
        onStepFieldChange={vi.fn()}
        onAddStep={vi.fn()}
        onRemoveStep={vi.fn()}
        onReorderStep={vi.fn()}
        onSelectStep={vi.fn()}
      />,
    )

    const unitToggle = screen.getByRole('button', { name: '°F' })

    expect(unitToggle.closest('.recipe-summary-head')).not.toBeNull()
    expect(screen.getByRole('button', { name: '°C' }).getAttribute('aria-pressed')).toBe('true')
    expect(unitToggle.getAttribute('aria-pressed')).toBe('false')
  })

  test('mantiene editor y gráfica en columnas, priorizando el ancho de la gráfica', () => {
    render(
      <RecetaForm
        draft={draft}
        activeStepIndex={0}
        onRecipeFieldChange={vi.fn()}
        onStepFieldChange={vi.fn()}
        onAddStep={vi.fn()}
        onRemoveStep={vi.fn()}
        onReorderStep={vi.fn()}
        onSelectStep={vi.fn()}
      />,
    )

    expect(document.querySelector('.recipe-form-shell--wide-dialog')).not.toBeNull()
    expect(document.querySelector('.recipe-main-layout--balanced-chart')).not.toBeNull()
  })

  test('permite cambiar presión y vacío desde rampa a tiempo', () => {
    const onStepFieldChange = vi.fn()
    const rampControlledDraft = {
      ...draft,
      escalones: [
        {
          ...draft.escalones[0],
          temp_tiempo_min: 10,
          pres_dwell: false,
          pres_control_mode: 'ramp',
          pres_final_bar: 2,
          pres_bar_por_min: 0.1,
          vacio_dwell: false,
          vacio_control_mode: 'ramp',
          vacio_final_mbar: 100,
          vacio_mbar_por_min: 10,
        },
      ],
    }

    render(
      <RecetaForm
        draft={rampControlledDraft}
        activeStepIndex={0}
        onRecipeFieldChange={vi.fn()}
        onStepFieldChange={onStepFieldChange}
        onAddStep={vi.fn()}
        onRemoveStep={vi.fn()}
        onReorderStep={vi.fn()}
        onSelectStep={vi.fn()}
      />,
    )

    fireEvent.click(screen.getByRole('tab', { name: 'Presion' }))
    fireEvent.change(screen.getByRole('spinbutton', { name: /^Tiempo \( min \)/ }), {
      target: { value: '5' },
    })

    fireEvent.click(screen.getByRole('tab', { name: 'Vacio' }))
    fireEvent.change(screen.getByRole('spinbutton', { name: /^Tiempo \( min \)/ }), {
      target: { value: '6' },
    })

    expect(onStepFieldChange).toHaveBeenCalledWith(0, 'pres_control_mode', 'time')
    expect(onStepFieldChange).toHaveBeenCalledWith(0, 'pres_tiempo_min', '5')
    expect(onStepFieldChange).toHaveBeenCalledWith(0, 'vacio_control_mode', 'time')
    expect(onStepFieldChange).toHaveBeenCalledWith(0, 'vacio_tiempo_min', '6')
  })

  test('muestra los controles de presión cuando Mantenimiento llega como false', () => {
    const persistedFalseDraft = {
      ...draft,
      escalones: [
        {
          ...draft.escalones[0],
          pres_dwell: 'false',
          vacio_dwell: false,
        },
      ],
    }

    render(
      <RecetaForm
        draft={persistedFalseDraft}
        activeStepIndex={0}
        onRecipeFieldChange={vi.fn()}
        onStepFieldChange={vi.fn()}
        onAddStep={vi.fn()}
        onRemoveStep={vi.fn()}
        onReorderStep={vi.fn()}
        onSelectStep={vi.fn()}
      />,
    )

    fireEvent.click(screen.getByRole('tab', { name: 'Presion' }))

    expect(screen.getAllByRole('spinbutton', { name: /^Tiempo \( min \)/ })).toHaveLength(1)
  })
})
