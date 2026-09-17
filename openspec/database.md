# Diccionario de datos y plataforma Supabase

> Fuente del contrato de cliente: `src/data/probetasSchema.js`.
> Fuente de cambios físicos: `sql/*.sql`. Estado documentado: 17 de septiembre de 2026.

## Cómo leer este documento

El cliente conoce las entidades y relaciones necesarias para renderizar formularios,
calcular dependencias y serializar registros. Supabase es la fuente persistente. El
repositorio no contiene una DDL inicial completa de las tablas base: el listado es un
contrato lógico actual, no prueba de que una columna exista en una instancia concreta.
Antes de desplegar hay que comprobar las migraciones realmente ejecutadas en Supabase.

Las tablas con espacios o guiones se consultan normalmente entre comillas. El servicio
prueba también variantes históricas con guion bajo y minúsculas.

## Entidades de laboratorio

| Tabla | Campos principales | Relaciones | Uso |
| --- | --- | --- | --- |
| `PROBETA` | `id`, auditoría, título, autor, referencia | Espesores, resultados y receta | Muestra ensayada. |
| `CAPA` | `id`, dirección, material | `DIRECCION_CAPA`, `PRE-IMPREGNADO` | Capa del laminado. |
| `DIRECCION_CAPA` | `id`, alias | — | Orientaciones normalizadas. |
| `PRE-IMPREGNADO` | Código, alias, espesores, volumen y documentos | Tipo, fabricante, resina y dos fibras | Material de capa. |
| `FIBRAS_REFUERZO` | Alias, PDF MDS y fecha | — | Catálogo de fibras. |
| `RESINA_SYSTEM` | Guía de producto, curado, Tg, proceso, documentos | Fabricante y categoría | Sistema de resina. |
| `RESIN_PRODUCT_CATEGORY` | `id`, alias | — | Etiquetas de Product Selector Guide. |
| `FABRICANTE` | `id`, alias | — | Catálogo de fabricantes. |
| `PRE-IMPREGNADO_TYPE` | `id`, alias | — | Tipo/tricotado de material. |
| `ACABADO` | `id`, alias | — | Acabado superficial. |
| `RESULTS` | Dimensiones, medidas, peso, densidad, anotaciones | Acabado de cara A y B | Resultado físico. |
| `ESPESORES` | `id`, arreglo `t` | — | Arreglo de espesores. |
| `RECETAS` | Nombre, descripción, temperaturas cabecera | — | Ciclo de curado. |
| `RECETA_ESCALONES` | Escalón y controles de temperatura, presión y vacío | `RECETAS` | Ciclo ordenado. |
| `HORNO` | `id`, alias | — | Catálogo lógico de hornos. |
| `PROBETA_CAPA` | IDs de probeta y capa | Probeta/capa | Relación N:M. |
| `PROBETA_PRE_IMPREGNADO` | IDs de probeta y material | Probeta/material | Relación N:M. |

### Campos de material y resina

`PRE-IMPREGNADO` usa `text_id`, `alias`, `type_id`, `fabricante_id`,
`espesor_curado`, `espesor_sin_curar`, `resina_system_id`, `resina_volume`,
`fibra_refuerzo_id`, `fibra_refuerzo2_id`, `pdf_mds_url`,
`fecha_revision_mds`, `pdf_msdt_url` y `fecha_revision_msdt`.

`RESINA_SYSTEM` usa `alias`, `description`, `product_category_id` **obligatorio**,
`fabricante_id` **obligatorio**, `outlife_at_20c`, `initial_cure_temp_c`,
`initial_cure_time_hours`, `post_cure_option`, `max_tg_onset_c`, `max_tg_peak_c`,
`toughened`, `standard_process`, `typical_application_areas`, `pdf_mds_url`,
`fecha_revision_mds`, `pdf_msdt_url` y `fecha_revision_msdt`.

La migración de guía de producto siembra estas categorías:

1. `TOOLING PREPREG — Low Temperature Cure`
2. `ADHESIVE FILM`
3. `COMPONENT PREPREG — Low to Medium Temperature Cure`
4. `COMPONENT PREPREG — Versatile Temperature Cure`
5. `COMPONENT PREPREG — High Service Temperature`
6. `COMPONENT PREPREG — Flame Retardant`

`RESULTS` contiene dimensiones, `t1` a `t8`, medidas sin curar, peso, densidad,
acabados y anotaciones. Cada `RECETA_ESCALONES` guarda valor actual, rampa, tiempo de
transición, modo de control, valor final y flag dwell para temperatura, presión y
vacío. Los nombres históricos de vacío conservan `_mbar`, aunque la migración del 4
de septiembre de 2026 convirtió valores a bar(g); no deben reinterpretarse sin
revisar las vistas dependientes.

## Entidades de plataforma

| Recurso | Propósito y seguridad |
| --- | --- |
| `auth.users` | Identidad de Supabase Auth; un trigger crea el perfil público. |
| `public.profiles` | Perfil, rol, aprobación y auditoría. Un usuario lee el suyo; admins aprobados pueden listar y actualizar. |
| `PROBETA_BORRADORES` | UUID, dueño, payload JSONB y timestamps; RLS limita todas las operaciones al dueño aprobado. |
| `storage.buckets/pdfs` | Bucket privado de documentos. Las políticas dependen de aprobación y rol. |
| `admin-manage-users` | Edge Function que revalida al administrador antes de usar la service role key. |

## Control de acceso

| Rol | Leer | Crear | Editar | Borrar/archivar | Ver/restaurar archivados | Gestionar usuarios/categorías |
| --- | --- | --- | --- | --- | --- | --- |
| `lector` | Sí | No | No | No | No | No |
| `creador` | Sí | Sí | No | No | No | No |
| `editor` | Sí | Sí | Sí | No | No | No |
| `gestor` | Sí | Sí | Sí | Sí | No | No |
| `admin` | Sí | Sí | Sí | Sí | Sí | Sí |

Todas las tablas protegidas requieren además un perfil aprobado.
`RESIN_PRODUCT_CATEGORY` permite lectura a usuarios aprobados como origen de un
selector; solo administradores aprobados pueden mutarla y solo ellos ven su sección.

Las tablas archivables son `PROBETA`, `FIBRAS_REFUERZO`, `PRE-IMPREGNADO`,
`RECETAS`, `FABRICANTE`, `PRE-IMPREGNADO_TYPE` y `RESINA_SYSTEM`. La migración crea
`archived_at`, `archived_by`, índices parciales, política restrictiva y el trigger
`enforce_record_archive_transition`. La RPC `get_archived_reference_labels(jsonb)`
resuelve referencias archivadas de forma segura para la interfaz.

## Catálogo de migraciones

| Fecha | Archivos | Cambio principal |
| --- | --- | --- |
| 2026-06-25 | `add_espesor_to_capa*` | Espesor de capa y backfill. |
| 2026-06-29 | `normalize_capa_direccion` | Crea y normaliza direcciones de capa. |
| 2026-06-30 | `add_acabado...`, `add_pressure...`, `convert_weight...`, `move_thickness...`, `rename_reflexion...`, `replace_dimensions...`, `restore_temperature...`, `simplify_temperature...`, `split_preimpregnado...`, `unify_recipe...` | Evolución de resultados, capas, materiales y receta. |
| 2026-07-01 | `add_updated_at_to_probeta` | Auditoría de actualización. |
| 2026-07-06 | `add_auth_profiles_and_rls`, `add_role_permissions`, `require_admin_approval` | Perfiles, roles, aprobación y RLS. |
| 2026-07-14 | `add_pdf_storage` | Bucket y políticas de PDFs. |
| 2026-09-03 | `add_independent_recipe_control_times` | Tiempos independientes de receta. |
| 2026-09-04 | `convert_recipe_vacuum_mbar_to_barg` | Backup y conversión única de vacío. |
| 2026-09-07 | `add_probeta_borradores`, `allow_editor_replace_probeta_relations` | Borradores personales y edición de relaciones. |
| 2026-09-09 | `add_record_archiving` | Archivo lógico, RLS, trigger y RPC. |
| 2026-09-10 | `add_pdf_review_dates` | Fechas de revisión de documentos. |
| 2026-09-10 | `add_resin_system_product_guide_fields` | Categorías, campos de guía, FKs y RLS de resina. |

## Operación segura

1. Respaldar la base antes de cualquier migración transformadora.
2. Ejecutar SQL en orden cronológico y revisar sus comentarios de verificación.
3. Confirmar las recargas de esquema PostgREST indicadas por `notify pgrst`.
4. Probar políticas con cuentas de los roles afectados.
5. No borrar migraciones históricas: son el único registro ejecutable de evolución
   física disponible en este repositorio.
