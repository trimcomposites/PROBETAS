function readNumber(value) {
  if (value === null || value === undefined || (typeof value === 'string' && value.trim() === '')) {
    return null
  }

  const numericValue = Number(value)
  return Number.isFinite(numericValue) ? numericValue : null
}

function round(value) {
  return Number(value.toFixed(3))
}

export function isRecipeDwellActive(value) {
  return value === true || value === 'true' || value === 1
}

export function getTransition({ start, end, mode = 'time', time = '', ramp = '', isDwell = false }) {
  const startValue = readNumber(start)
  const endValue = isDwell ? startValue : readNumber(end)

  if (startValue === null || endValue === null) {
    return { time: '', ramp: '' }
  }

  if (isDwell) {
    const duration = readNumber(time)
    return { time: duration !== null && duration > 0 ? duration : '', ramp: '' }
  }

  const delta = endValue - startValue

  if (mode === 'ramp') {
    const rampValue = readNumber(ramp)
    if (
      rampValue === null ||
      rampValue === 0 ||
      (delta !== 0 && Math.sign(rampValue) !== Math.sign(delta))
    ) {
      return { time: '', ramp: '' }
    }

    return { time: round(Math.abs(delta / rampValue)), ramp: rampValue }
  }

  const timeValue = readNumber(time)
  if (timeValue === null || timeValue <= 0) {
    return { time: '', ramp: '' }
  }

  return { time: timeValue, ramp: round(delta / timeValue) }
}

export function updateRecipeStep(step, name, value) {
  if (
    ['pres_tiempo_min', 'vacio_tiempo_min'].includes(name) &&
    readNumber(step.temp_tiempo_min) !== null &&
    readNumber(value) !== null &&
    readNumber(value) > readNumber(step.temp_tiempo_min)
  ) {
    return step
  }

  const nextStep = { ...step, [name]: value }

  if (['temp_tiempo_min', 'temp_grados_por_min'].includes(name)) {
    nextStep.pres_tiempo_min = ''
    nextStep.vacio_tiempo_min = ''
  }

  return nextStep
}

function getEnd(step, dwellField, endField, start) {
  return isRecipeDwellActive(step[dwellField]) ? start : step[endField] ?? start
}

export function deriveRecipeSteps(draft) {
  const derivedSteps = []

  ;(draft.escalones ?? []).forEach((step, index) => {
    const previousStep = derivedSteps[index - 1]
    const temperatureStart = index === 0 ? draft.temperatura_inicial_c : previousStep.temperatureEnd
    const pressureStart = index === 0
      ? step.presion_bar
      : previousStep.pressureEnd
    const vacuumStart = index === 0
      ? step.vacio_mbar
      : previousStep.vacuumEnd
    const temperatureEnd = getEnd(step, 'temp_dwell', 'temp_final_c', temperatureStart)
    const pressureEnd = getEnd(step, 'pres_dwell', 'pres_final_bar', pressureStart)
    const vacuumEnd = getEnd(step, 'vacio_dwell', 'vacio_final_mbar', vacuumStart)
    const tempTransition = getTransition({
      start: temperatureStart,
      end: temperatureEnd,
      mode: step.temp_control_mode,
      time: step.temp_tiempo_min,
      ramp: step.temp_grados_por_min,
      isDwell: isRecipeDwellActive(step.temp_dwell),
    })
    const pressureTransition = getTransition({
      start: pressureStart,
      end: pressureEnd,
      mode: step.pres_control_mode,
      time: step.pres_tiempo_min,
      ramp: step.pres_bar_por_min,
      isDwell: isRecipeDwellActive(step.pres_dwell),
    })
    const vacuumTransition = getTransition({
      start: vacuumStart,
      end: vacuumEnd,
      mode: step.vacio_control_mode,
      time: step.vacio_tiempo_min,
      ramp: step.vacio_mbar_por_min,
      isDwell: isRecipeDwellActive(step.vacio_dwell),
    })

    derivedSteps.push({
      ...step,
      temperatura_c: temperatureStart,
      presion_bar: pressureStart,
      vacio_mbar: vacuumStart,
      temperatureEnd,
      pressureEnd,
      vacuumEnd,
      stepDuration: tempTransition.time,
      tempTransition,
      pressureTransition,
      vacuumTransition,
      temp_grados_por_min: tempTransition.ramp,
      pres_bar_por_min: pressureTransition.ramp,
      vacio_mbar_por_min: vacuumTransition.ramp,
    })
  })

  return derivedSteps
}

export function getRecipeHeaderTemperatures(draft) {
  const derivedSteps = deriveRecipeSteps(draft)
  const lastStep = derivedSteps.at(-1)

  return {
    initial: draft.temperatura_inicial_c,
    final:
      readNumber(lastStep?.temperatureEnd) === null
        ? draft.temperatura_final_c
        : lastStep.temperatureEnd,
  }
}
