import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, test } from 'vitest'
import RecipeChart from './RecipeChart'

describe('RecipeChart', () => {
  afterEach(cleanup)

  test('dibuja una tercera línea para el vacío', () => {
    const { container } = render(
      <RecipeChart
        steps={[
          {
            temperatura_c: 20,
            temp_final_c: 40,
            presion_bar: 1,
            pres_final_bar: 2,
            vacio_mbar: 1000,
            vacio_final_mbar: 100,
            stepDuration: 10,
            pressureTransition: { time: 5 },
            vacuumTransition: { time: 8 },
          },
        ]}
      />,
    )

    expect(screen.getByText('Vacio')).toBeTruthy()
    expect(container.querySelector('path.chart-line.vacuum')).toBeTruthy()
  })

  test('usa los límites base y alinea el cero de temperatura y presión', () => {
    render(
      <RecipeChart
        steps={[
          {
            temperatura_c: 20,
            temp_final_c: 40,
            presion_bar: 1,
            pres_final_bar: 2,
            vacio_mbar: 1000,
            vacio_final_mbar: 100,
            stepDuration: 10,
            pressureTransition: { time: 5 },
            vacuumTransition: { time: 8 },
          },
        ]}
      />,
    )

    expect(screen.getByText('220 °C')).toBeTruthy()
    expect(screen.getByText('7 bar(g)')).toBeTruthy()
    expect(screen.getByText('-1,1 bar(g)')).toBeTruthy()
    expect(screen.getByText('0 °C').getAttribute('y')).toBe(
      screen.getByText('0 bar(g)').getAttribute('y'),
    )
  })

  test('sitúa la referencia punteada en la temperatura inicial en ambas gráficas', () => {
    const { container } = render(
      <RecipeChart
        steps={[
          {
            temperatura_c: 20,
            temp_final_c: 40,
            presion_bar: 1,
            pres_final_bar: 2,
            vacio_mbar: 1000,
            vacio_final_mbar: 100,
            stepDuration: 10,
          },
        ]}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Abrir grafica detallada' }))

    const references = container.querySelectorAll('line.chart-initial-temperature-line')
    expect(references).toHaveLength(2)
    expect(Number(references[0].getAttribute('y1'))).toBeCloseTo(198.41, 2)
    expect(Number(references[1].getAttribute('y1'))).toBeCloseTo(387.25, 2)
  })

  test('amplía los límites cuando la temperatura o presión los superan', () => {
    render(
      <RecipeChart
        steps={[
          {
            temperatura_c: 240,
            temp_final_c: 260,
            presion_bar: -2,
            pres_final_bar: 8,
            vacio_mbar: 1000,
            vacio_final_mbar: 100,
            stepDuration: 10,
            pressureTransition: { time: 5 },
            vacuumTransition: { time: 8 },
          },
        ]}
      />,
    )

    expect(screen.getByText('260 °C')).toBeTruthy()
    expect(screen.getByText('8 bar(g)')).toBeTruthy()
    expect(screen.getByText('-2 bar(g)')).toBeTruthy()
  })

  test('dibuja vacío en la misma escala bar(g) que la presión', () => {
    const { container } = render(
      <RecipeChart
        steps={[
          {
            temperatura_c: 20,
            temp_final_c: 40,
            presion_bar: 1,
            pres_final_bar: 2,
            vacio_mbar: 1,
            vacio_final_mbar: 2,
            stepDuration: 10,
            pressureTransition: { time: 5 },
            vacuumTransition: { time: 5 },
          },
        ]}
      />,
    )

    expect(container.querySelector('path.chart-line.vacuum')?.getAttribute('d')).toBe(
      container.querySelector('path.chart-line.pressure')?.getAttribute('d'),
    )
    expect(screen.queryByText(/mbar/)).toBeNull()
  })

  test('resume los cambios y mantenimientos de cada escalón bajo la gráfica', () => {
    render(
      <RecipeChart
        steps={[
          {
            temperatura_c: 20,
            temp_final_c: 40,
            presion_bar: 1,
            pres_final_bar: 1,
            vacio_mbar: -0.5,
            vacio_final_mbar: -0.8,
            stepDuration: 10,
          },
          {
            temperatura_c: 40,
            temp_final_c: 40,
            presion_bar: 1,
            pres_final_bar: 2,
            vacio_mbar: -0.8,
            vacio_final_mbar: -0.8,
            stepDuration: 5,
          },
        ]}
      />,
    )

    expect(screen.getByRole('heading', { name: 'Resumen por escalón' })).toBeTruthy()
    expect(screen.getByText('Escalón 1 · 10 min')).toBeTruthy()
    expect(screen.getByText('20 → 40 °C')).toBeTruthy()
    expect(screen.getByText('Se mantiene en 1 bar(g)')).toBeTruthy()
    expect(screen.getByText('-0,5 → -0,8 bar(g)')).toBeTruthy()
    expect(screen.getByText('Escalón 2 · 5 min')).toBeTruthy()
    expect(screen.getByText('Se mantiene en 40 °C')).toBeTruthy()
    expect(screen.getByText('1 → 2 bar(g)')).toBeTruthy()
    expect(screen.getByText('Se mantiene en -0,8 bar(g)')).toBeTruthy()
  })

  test('convierte la vista de la gráfica a Fahrenheit sin alterar presión ni vacío', () => {
    render(
      <RecipeChart
        steps={[
          {
            temperatura_c: 20,
            temp_final_c: 40,
            presion_bar: 1,
            pres_final_bar: 2,
            vacio_mbar: -0.5,
            vacio_final_mbar: -0.8,
            stepDuration: 10,
          },
        ]}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: '°F' }))

    expect(screen.getByText('428 °F')).toBeTruthy()
    expect(screen.getByText('32 °F')).toBeTruthy()
    expect(screen.getByText('68 → 104 °F')).toBeTruthy()
    expect(screen.getByText('1 → 2 bar(g)')).toBeTruthy()
    expect(screen.getByText('-0,5 → -0,8 bar(g)')).toBeTruthy()
  })

  test('muestra el detalle al pasar el ratón en Fahrenheit', () => {
    render(
      <RecipeChart
        steps={[
          {
            temperatura_c: 20,
            temp_final_c: 40,
            presion_bar: 1,
            pres_final_bar: 2,
            vacio_mbar: -0.5,
            vacio_final_mbar: -0.8,
            stepDuration: 10,
            pressureTransition: { time: 10 },
            vacuumTransition: { time: 10 },
          },
        ]}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: '°F' }))
    fireEvent.click(screen.getByRole('button', { name: 'Abrir grafica detallada' }))

    const detailedChart = screen.getByRole('img', { name: 'Grafica detallada del ciclo' })
    detailedChart.getBoundingClientRect = () => ({ left: 0, width: 1040 })
    fireEvent.mouseMove(detailedChart, { clientX: 520 })

    expect(screen.getByRole('status').textContent).toContain('Temperatura 86 °F')
  })

  test('agrupa las tarjetas del resumen en una región desplazable', () => {
    const { container } = render(
      <RecipeChart
        steps={[{
          temperatura_c: 20,
          temp_final_c: 40,
          presion_bar: 1,
          pres_final_bar: 2,
          vacio_mbar: -0.5,
          vacio_final_mbar: -0.8,
          stepDuration: 10,
        }]}
      />,
    )

    expect(screen.getByRole('region', { name: 'Resumen de escalones desplazable' })).toBeTruthy()
    const chartLayout = container.querySelector('.recipe-chart-content-layout')
    expect(chartLayout).not.toBeNull()
    expect(chartLayout.className).toContain('recipe-chart-content-layout--summary-below')
    expect(chartLayout.querySelector('.recipe-chart-open-button')).not.toBeNull()
    expect(chartLayout.querySelector('.recipe-step-summary')).not.toBeNull()
  })

  test('abre una gráfica detallada con escalones e inspección al pasar el ratón', () => {
    render(
      <RecipeChart
        steps={[
          {
            temperatura_c: 20,
            temp_final_c: 40,
            presion_bar: 1,
            pres_final_bar: 2,
            vacio_mbar: 1,
            vacio_final_mbar: 2,
            stepDuration: 10,
            pressureTransition: { time: 10 },
            vacuumTransition: { time: 10 },
          },
          {
            temperatura_c: 40,
            temp_final_c: 60,
            presion_bar: 2,
            pres_final_bar: 3,
            vacio_mbar: 2,
            vacio_final_mbar: 3,
            stepDuration: 20,
            pressureTransition: { time: 20 },
            vacuumTransition: { time: 20 },
          },
        ]}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Abrir grafica detallada' }))

    expect(screen.getByRole('dialog', { name: 'Grafica detallada del ciclo' })).toBeTruthy()
    expect(screen.getByText('Escalón 1')).toBeTruthy()
    expect(screen.getByText('Escalón 2')).toBeTruthy()

    const detailedChart = screen.getByRole('img', { name: 'Grafica detallada del ciclo' })
    detailedChart.getBoundingClientRect = () => ({ left: 0, width: 1040 })
    fireEvent.mouseMove(detailedChart, { clientX: 520 })

    const hoverReadout = screen.getByRole('status').textContent
    expect(hoverReadout).toContain('Escalón 2')
    expect(hoverReadout).toContain('Tiempo 15 min')
    expect(hoverReadout).toContain('Temperatura 45 °C')
    expect(hoverReadout).toContain('Presión 2,3 bar(g)')
    expect(hoverReadout).toContain('Vacío 2,3 bar(g)')

    fireEvent.click(screen.getByRole('button', { name: 'Cerrar grafica detallada' }))
    expect(screen.queryByRole('dialog', { name: 'Grafica detallada del ciclo' })).toBeNull()
  })
})
