import { describe, expect, test } from 'vitest'
import { FIELD_LABELS, SIMPLE_SECTION_FIELDS } from './appConfig'
import { getTable } from '../utils/schema'

const RESIN_FIELD_NAMES = [
  'alias',
  'description',
  'product_category_id',
  'fabricante_id',
  'outlife_at_20c',
  'initial_cure_temp_c',
  'initial_cure_time_hours',
  'post_cure_option',
  'max_tg_onset_c',
  'max_tg_peak_c',
  'toughened',
  'standard_process',
  'typical_application_areas',
  'pdf_mds_url',
  'pdf_msdt_url',
]

describe('resin system fields', () => {
  test('exposes every Product Selector Guide field in the form schema', () => {
    expect(SIMPLE_SECTION_FIELDS.RESINA_SYSTEM.map((field) => field.name)).toEqual(RESIN_FIELD_NAMES)
    expect(getTable('RESINA_SYSTEM').fields.map((field) => field.name)).toEqual(
      expect.arrayContaining(RESIN_FIELD_NAMES),
    )
  })

  test('uses text for ranges and flags the two yes/no fields as booleans', () => {
    const fieldsByName = Object.fromEntries(
      SIMPLE_SECTION_FIELDS.RESINA_SYSTEM.map((field) => [field.name, field]),
    )

    expect(fieldsByName.outlife_at_20c.type).toBe('text')
    expect(fieldsByName.initial_cure_temp_c.type).toBe('text')
    expect(fieldsByName.initial_cure_time_hours.type).toBe('text')
    expect(fieldsByName.max_tg_onset_c.type).toBe('float4')
    expect(fieldsByName.max_tg_peak_c.type).toBe('float4')
    expect(fieldsByName.post_cure_option.type).toBe('bool')
    expect(fieldsByName.toughened.type).toBe('bool')
  })

  test('labels the new fields in English', () => {
    expect(FIELD_LABELS).toMatchObject({
      description: 'Description',
      product_category_id: 'Product category',
      outlife_at_20c: 'Outlife at 20°C',
      initial_cure_temp_c: 'Initial cure temperature (°C)',
      initial_cure_time_hours: 'Initial cure time (hours)',
      post_cure_option: 'Post cure option',
      max_tg_onset_c: 'Max Tg onset (°C - DMA)',
      max_tg_peak_c: 'Max Tg peak (°C - DMA)',
      toughened: 'Toughened',
      standard_process: 'Standard process',
      typical_application_areas: 'Typical application areas',
    })
  })

  test('requires a product category and manufacturer from their catalogues', () => {
    const fieldsByName = Object.fromEntries(
      SIMPLE_SECTION_FIELDS.RESINA_SYSTEM.map((field) => [field.name, field]),
    )

    expect(fieldsByName.product_category_id).toMatchObject({
      references: 'RESIN_PRODUCT_CATEGORY.id',
      required: true,
    })
    expect(fieldsByName.fabricante_id).toMatchObject({
      references: 'FABRICANTE.id',
      required: true,
    })
    expect(SIMPLE_SECTION_FIELDS.RESIN_PRODUCT_CATEGORY).toEqual([{ name: 'alias', type: 'text' }])
  })
})
