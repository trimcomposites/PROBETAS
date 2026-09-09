import { describe, expect, test } from 'vitest'
import {
  celsiusToFahrenheit,
  celsiusRateToFahrenheit,
  fahrenheitRateToCelsius,
  fahrenheitToCelsius,
  formatTemperatureInput,
} from './temperatureUnits'

describe('temperatureUnits', () => {
  test('convierte temperaturas entre Celsius y Fahrenheit', () => {
    expect(celsiusToFahrenheit(20)).toBe(68)
    expect(fahrenheitToCelsius(68)).toBe(20)
  })

  test('convierte rampas sin aplicar el desplazamiento de temperatura', () => {
    expect(celsiusRateToFahrenheit(10)).toBe(18)
    expect(fahrenheitRateToCelsius(18)).toBe(10)
  })

  test('muestra valores de Fahrenheit con precisión legible', () => {
    expect(formatTemperatureInput(20, 'fahrenheit')).toBe('68')
    expect(formatTemperatureInput(21.111111, 'fahrenheit')).toBe('70')
    expect(formatTemperatureInput('', 'fahrenheit')).toBe('')
  })
})
