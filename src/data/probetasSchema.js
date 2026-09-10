const tables = [
  {
    name: 'PROBETA',
    description: 'Entidad principal para cada probeta analizada.',
    fields: [
      { name: 'id', type: 'int8', primaryKey: true },
      { name: 'created_at', type: 'timestamptz' },
      { name: 'updated_at', type: 'timestamptz' },
      { name: 'title', type: 'text' },
      { name: 'author', type: 'text' },
      { name: 'reviewed', type: 'text' },
      { name: 'espesores_id', type: 'int8', references: 'ESPESORES.id' },
      { name: 'results_id', type: 'int4', references: 'RESULTS.id' },
      { name: 'receta_id', type: 'int8', references: 'RECETAS.id' },
      { name: 'referencia', type: 'bool' },
    ],
  },
  {
    name: 'CAPA',
    description: 'Capas que componen una probeta y su direccion de laminado.',
    fields: [
      { name: 'id', type: 'int8', primaryKey: true },
      { name: 'created_at', type: 'timestamptz' },
      { name: 'direccion_id', type: 'int8', references: 'DIRECCION_CAPA.id' },
      { name: 'pre_impregnado_id', type: 'int8', references: 'PRE-IMPREGNADO.id' },
    ],
  },
  {
    name: 'DIRECCION_CAPA',
    description: 'Catalogo de direcciones permitidas para cada capa.',
    fields: [
      { name: 'id', type: 'int8', primaryKey: true },
      { name: 'created_at', type: 'timestamptz' },
      { name: 'alias', type: 'text' },
    ],
  },
  {
    name: 'PRE-IMPREGNADO',
    description: 'Material compuesto base usado en las capas.',
    fields: [
      { name: 'id', type: 'int8', primaryKey: true },
      { name: 'created_at', type: 'timestamptz' },
      { name: 'text_id', type: 'text' },
      { name: 'alias', type: 'text' },
      { name: 'type_id', type: 'int8', references: 'PRE-IMPREGNADO_TYPE.id' },
      { name: 'fabricante_id', type: 'int8', references: 'FABRICANTE.id' },
      { name: 'espesor_curado', type: 'float8' },
      { name: 'espesor_sin_curar', type: 'float8' },
      { name: 'resina_system_id', type: 'int8', references: 'RESINA_SYSTEM.id' },
      { name: 'resina_volume', type: 'float4' },
      { name: 'fibra_refuerzo_id', type: 'int8', references: 'FIBRAS_REFUERZO.id' },
      { name: 'fibra_refuerzo2_id', type: 'int8', references: 'FIBRAS_REFUERZO.id' },
      { name: 'pdf_mds_url', type: 'text' },
      { name: 'fecha_revision_mds', type: 'date' },
      { name: 'pdf_msdt_url', type: 'text' },
      { name: 'fecha_revision_msdt', type: 'date' },
    ],
  },
  {
    name: 'FABRICANTE',
    description: 'Catalogo de fabricantes.',
    fields: [
      { name: 'id', type: 'int8', primaryKey: true },
      { name: 'created_at', type: 'timestamptz' },
      { name: 'alias', type: 'text' },
    ],
  },
  {
    name: 'PRE-IMPREGNADO_TYPE',
    description: 'Tipos de preimpregnado.',
    fields: [
      { name: 'id', type: 'int8', primaryKey: true },
      { name: 'created_at', type: 'timestamptz' },
      { name: 'alias', type: 'text' },
    ],
  },
  {
    name: 'RESINA_SYSTEM',
    description: 'Sistemas de resina y su documentacion asociada.',
    fields: [
      { name: 'id', type: 'int8', primaryKey: true },
      { name: 'created_at', type: 'timestamptz' },
      { name: 'alias', type: 'text' },
      { name: 'pdf_mds_url', type: 'text' },
      { name: 'fecha_revision_mds', type: 'date' },
      { name: 'pdf_msdt_url', type: 'text' },
      { name: 'fecha_revision_msdt', type: 'date' },
    ],
  },
  {
    name: 'FIBRAS_REFUERZO',
    description: 'Catalogo de fibras de refuerzo.',
    fields: [
      { name: 'id', type: 'int8', primaryKey: true },
      { name: 'created_at', type: 'timestamptz' },
      { name: 'alias', type: 'text' },
      { name: 'pdf_mds_url', type: 'text' },
      { name: 'fecha_revision_mds', type: 'date' },
    ],
  },
  {
    name: 'RESULTS',
    description: 'Resultados fisicos medidos sobre una probeta.',
    fields: [
      { name: 'id', type: 'int8', primaryKey: true },
      { name: 'created_at', type: 'timestamptz' },
      { name: 'largo_mm', type: 'float4' },
      { name: 'ancho_mm', type: 'float4' },
      { name: 'espesor_mm', type: 'float4' },
      { name: 'espesor', type: 'float4' },
      { name: 't1', type: 'float4' },
      { name: 't2', type: 'float4' },
      { name: 't3', type: 'float4' },
      { name: 't4', type: 'float4' },
      { name: 't5', type: 'float4' },
      { name: 't6', type: 'float4' },
      { name: 't7', type: 'float4' },
      { name: 't8', type: 'float4' },
      { name: 'has_uncured_thickness', type: 'bool' },
      { name: 'espesor_sin_curado', type: 'float4' },
      { name: 'uncured_t1', type: 'float4' },
      { name: 'uncured_t2', type: 'float4' },
      { name: 'uncured_t3', type: 'float4' },
      { name: 'uncured_t4', type: 'float4' },
      { name: 'uncured_t5', type: 'float4' },
      { name: 'uncured_t6', type: 'float4' },
      { name: 'uncured_t7', type: 'float4' },
      { name: 'uncured_t8', type: 'float4' },
      { name: 'weight_g', type: 'float4' },
      { name: 'density', type: 'float4' },
      { name: 'acabado_id', type: 'int8', references: 'ACABADO.id' },
      { name: 'has_acabado_cara_b', type: 'bool' },
      { name: 'acabado_cara_b_id', type: 'int8', references: 'ACABADO.id' },
      { name: 'anotaciones', type: 'text' },
    ],
  },
  {
    name: 'ACABADO',
    description: 'Tipo de acabado superficial.',
    fields: [
      { name: 'id', type: 'int8', primaryKey: true },
      { name: 'created_at', type: 'timestamptz' },
      { name: 'alias', type: 'text' },
    ],
  },
  {
    name: 'ESPESORES',
    description: 'Medida de espesor asociada a una probeta.',
    fields: [
      { name: 'id', type: 'int8', primaryKey: true },
      { name: 'created_at', type: 'timestamptz' },
      { name: 't', type: '_float8' },
    ],
  },
  {
    name: 'RECETAS',
    description: 'Receta global del ciclo de curado.',
    fields: [
      { name: 'id', type: 'int8', primaryKey: true },
      { name: 'created_at', type: 'timestamptz' },
      { name: 'nombre', type: 'text' },
      { name: 'descripcion', type: 'text' },
      { name: 'temperatura_inicial_c', type: 'float8' },
      { name: 'temperatura_final_c', type: 'float8' },
    ],
  },
  {
    name: 'RECETA_ESCALONES',
    description: 'Escalones detallados de la receta.',
    fields: [
      { name: 'id', type: 'int8', primaryKey: true },
      { name: 'created_at', type: 'timestamptz' },
      { name: 'receta_id', type: 'int8', references: 'RECETAS.id' },
      { name: 'escalon', type: 'int2' },
      { name: 'temp_grados_por_min', type: 'float8' },
      { name: 'temp_tiempo_min', type: 'float8' },
      { name: 'temp_control_mode', type: 'text' },
      { name: 'temp_final_c', type: 'float8' },
      { name: 'temp_dwell', type: 'bool' },
      { name: 'pres_bar_por_min', type: 'float8' },
      { name: 'pres_tiempo_min', type: 'float8' },
      { name: 'pres_control_mode', type: 'text' },
      { name: 'pres_final_bar', type: 'float8' },
      { name: 'pres_dwell', type: 'bool' },
      { name: 'vacio_mbar_por_min', type: 'float8' },
      { name: 'vacio_tiempo_min', type: 'float8' },
      { name: 'vacio_control_mode', type: 'text' },
      { name: 'vacio_final_mbar', type: 'float8' },
      { name: 'vacio_dwell', type: 'bool' },
      { name: 'temperatura_c', type: 'float8' },
      { name: 'presion_bar', type: 'float8' },
      { name: 'vacio_mbar', type: 'float8' },
    ],
  },
  {
    name: 'HORNO',
    description: 'Catalogo de hornos.',
    fields: [
      { name: 'id', type: 'int8', primaryKey: true },
      { name: 'created_at', type: 'timestamptz' },
      { name: 'alias', type: 'text' },
    ],
  },
  {
    name: 'PROBETA_CAPA',
    description: 'Relacion N:M entre probetas y capas.',
    fields: [
      { name: 'probeta_id', type: 'int8', references: 'PROBETA.id' },
      { name: 'capa_id', type: 'int8', references: 'CAPA.id' },
    ],
  },
  {
    name: 'PROBETA_PRE_IMPREGNADO',
    description: 'Relacion N:M entre probetas y materiales preimpregnados.',
    fields: [
      { name: 'probeta_id', type: 'int8', references: 'PROBETA.id' },
      { name: 'material_id', type: 'int8', references: 'PRE-IMPREGNADO.id' },
    ],
  },
]

const localDatabase = Object.fromEntries(
  tables.map((table) => [table.name, []]),
)

const recordTemplates = Object.fromEntries(
  tables.map((table) => [
    table.name,
    Object.fromEntries(table.fields.map((field) => [field.name, null])),
  ]),
)

const tableStats = tables.map((table) => ({
  name: table.name,
  fields: table.fields.length,
  foreignKeys: table.fields.filter((field) => field.references).length,
}))

function buildRelations(schemaTables) {
  return schemaTables.flatMap((table) =>
    table.fields
      .filter((field) => field.references)
      .map((field) => {
        const [targetTable, targetField] = field.references.split('.')

        return {
          fromTable: table.name,
          fromField: field.name,
          toTable: targetTable,
          toField: targetField,
        }
      }),
  )
}

const relations = buildRelations(tables)

export { localDatabase, recordTemplates, relations, tableStats, tables }
