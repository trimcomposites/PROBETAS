const FAHRENHEIT_FACTOR = 9 / 5
const FAHRENHEIT_OFFSET = 32

function readFiniteNumber(value) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

function formatNumber(value) {
  return String(Math.round(value * 1000) / 1000)
}

export function celsiusToFahrenheit(value) {
  const numericValue = readFiniteNumber(value)
  return numericValue === null ? value : numericValue * FAHRENHEIT_FACTOR + FAHRENHEIT_OFFSET
}

export function fahrenheitToCelsius(value) {
  const numericValue = readFiniteNumber(value)
  return numericValue === null ? value : (numericValue - FAHRENHEIT_OFFSET) / FAHRENHEIT_FACTOR
}

export function celsiusRateToFahrenheit(value) {
  const numericValue = readFiniteNumber(value)
  return numericValue === null ? value : numericValue * FAHRENHEIT_FACTOR
}

export function fahrenheitRateToCelsius(value) {
  const numericValue = readFiniteNumber(value)
  return numericValue === null ? value : numericValue / FAHRENHEIT_FACTOR
}

export function formatTemperatureInput(value, unit) {
  if (value === '' || value === null || value === undefined) {
    return ''
  }

  return formatNumber(unit === 'fahrenheit' ? celsiusToFahrenheit(value) : value)
}

export function formatTemperatureRateInput(value, unit) {
  if (value === '' || value === null || value === undefined) {
    return ''
  }

  return formatNumber(unit === 'fahrenheit' ? celsiusRateToFahrenheit(value) : value)
}

export function toCelsiusTemperatureInput(value, unit) {
  if (value === '') {
    return ''
  }

  return unit === 'fahrenheit' ? fahrenheitToCelsius(value) : value
}

export function toCelsiusRateInput(value, unit) {
  if (value === '') {
    return ''
  }

  return unit === 'fahrenheit' ? fahrenheitRateToCelsius(value) : value
}
