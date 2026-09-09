import { describe, expect, test } from 'vitest'
import { createEmptyRecipeStep } from './records'
import {
  deriveRecipeSteps,
  getRecipeHeaderTemperatures,
  getTransition,
  updateRecipeStep,
} from './recipeSteps'

describe('recipe step transitions', () => {
  test('initializes independent time and control mode fields', () => {
    expect(createEmptyRecipeStep(1)).toMatchObject({
      temp_tiempo_min: '',
      temp_control_mode: 'time',
      pres_tiempo_min: '',
      pres_control_mode: 'time',
      vacio_tiempo_min: '',
      vacio_control_mode: 'time',
    })
  })

  test('calculates a ramp from a supplied duration', () => {
    expect(getTransition({ start: 20, end: 40, mode: 'time', time: 10 })).toMatchObject({
      time: 10,
      ramp: 2,
    })
  })

  test('calculates a duration from a supplied ramp', () => {
    expect(getTransition({ start: 20, end: 40, mode: 'ramp', ramp: 2 })).toMatchObject({
      time: 10,
      ramp: 2,
    })
  })

  test('uses the recipe initial temperature as the first step start', () => {
    const [step] = deriveRecipeSteps({
      temperatura_inicial_c: 20,
      escalones: [
        {
          temperatura_c: 30,
          temp_final_c: 40,
          temp_tiempo_min: 5,
          temp_dwell: false,
        },
      ],
    })

    expect(step.temperatura_c).toBe(20)
  })

  test('derives legacy recipe temperatures from the first and last step', () => {
    expect(
      getRecipeHeaderTemperatures({
        temperatura_inicial_c: 30,
        escalones: [
          {
            temp_final_c: 40,
            temp_tiempo_min: 5,
            temp_dwell: false,
          },
          {
            temp_final_c: 80,
            temp_tiempo_min: 10,
            temp_dwell: false,
          },
        ],
      }),
    ).toEqual({ initial: 30, final: 80 })
  })

  test('rejects a ramp with the opposite direction to the transition', () => {
    expect(getTransition({ start: 20, end: 40, mode: 'ramp', ramp: -2 }).time).toBe('')
  })

  test('clears pressure and vacuum durations when temperature duration changes', () => {
    expect(
      updateRecipeStep(
        { pres_tiempo_min: 5, vacio_tiempo_min: 4 },
        'temp_tiempo_min',
        10,
      ),
    ).toMatchObject({ temp_tiempo_min: 10, pres_tiempo_min: '', vacio_tiempo_min: '' })
  })

  test('permite duración de presión y vacío si temperatura está controlada por rampa', () => {
    expect(
      updateRecipeStep({ temp_tiempo_min: '', temp_control_mode: 'ramp' }, 'pres_tiempo_min', 5),
    ).toMatchObject({ pres_tiempo_min: 5 })
    expect(
      updateRecipeStep({ temp_tiempo_min: '', temp_control_mode: 'ramp' }, 'vacio_tiempo_min', 5),
    ).toMatchObject({ vacio_tiempo_min: 5 })
  })
})
