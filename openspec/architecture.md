# Arquitectura de cliente y mapa de módulos

## Flujo principal

```text
main.jsx -> ensureCryptoRandomUuid() -> <App />
                                  |
                                  +-> sesión, perfil y permisos
                                  +-> tablas Supabase y archivos
                                  +-> búsqueda, navegación, formularios y modales
                                  +-> servicios de datos, Auth, Storage y Edge Function
```

`App.jsx` compone componentes de presentación y delega las operaciones remotas en
servicios. Mantiene borradores en memoria hasta que guardar, crear un borrador o
archivar ejecuta el servicio correspondiente y refresca la base local.

## Componentes

| Componente | Responsabilidad |
| --- | --- |
| `AppHeader` | Cabecera, tema, identidad y accesos administrativos. |
| `AuthScreen` / `PasswordRecoveryScreen` | Inicio de sesión, alta y recuperación/cambio de contraseña. |
| `UserManagementModal` | Roles, aprobación, creación, recuperación y baja de cuentas. |
| `SectionSidebar` | Navegación y recuentos de secciones disponibles. |
| `SectionTable` | Marco de lista, estado vacío y scroll horizontal superior sincronizado. |
| `SimpleRecordsTable` | Tabla de catálogos y registros simples. |
| `ProbetaRecordsTable` | Lista de probetas, estado de borrador y acciones. |
| `ProbetaForm` | Composición, curado y resultados de probeta. |
| `RecetaForm` / `RecipeChart` | Formulario y representación de receta/escalones. |
| `SimpleSectionForm` | Formulario dirigido por `SIMPLE_SECTION_FIELDS`. |
| `GlobalRecordSearch` | Selector de sección, filtros y búsqueda diferida. |
| `PdfDropzone` / `PdfReviewCell` | Adjuntar, revisar, previsualizar y descargar PDFs. |
| Modales y toggles | `FormModal`, confirmación de acción, archivo y consola SQL. |

Cada componente con comportamiento relevante tiene una prueba `*.test.jsx`. Los
assets compilados bajo `src/components/assets/` no son lugar de edición manual de
lógica de aplicación.

## Servicios y utilidades

| Módulo | Responsabilidad |
| --- | --- |
| `lib/supabaseClient.js` | Construye o valida el cliente Supabase desde Vite. |
| `services/authService.js` | Sesión, Auth, perfil, roles y Edge Function. |
| `services/databaseService.js` | Lectura, inserción, edición, borrado y serialización de probetas/recetas. |
| `utils/records.js` | Plantillas, conversiones, etiquetas de fila y cálculos de probeta. |
| `utils/recipeSteps.js` | Normalización y derivación de escalones. |
| `utils/temperatureUnits.js` | Conversión y formato Celsius/Fahrenheit. |
| `utils/recordSearch.js` | Campos disponibles, agrupación y filtrado local. |
| `utils/recordArchiving.js` | Dependencias, archivo y etiquetas archivadas. |
| `utils/fileStorage.js` | Paths, IndexedDB, Storage, descarga y previsualización. |
| `utils/permissions.js` | Roles y permisos de interfaz. |
| `utils/operationGate.js` | Exclusión mutua de operaciones mutantes. |
| `utils/userError.js` | Traduce errores técnicos a mensajes y campos. |
| `utils/schema.js` / `labels.js` | Tablas, referencias y textos de interfaz. |

## Estado relevante de `App`

| Estado | Significado |
| --- | --- |
| `session`, `currentUser`, `currentProfile` | Identidad y autorización. |
| `database` | Snapshot local de tablas cargadas. |
| `selectedTableName`, `recordListMode` | Sección y vista activa/archivada. |
| `draft`, `formMode`, `selectedRecordIndex` | Registro editado, creado o visto. |
| `draftSearch`, `appliedSearch` | Búsqueda preparada y aplicada. |
| `attachmentIndex` | Metadatos de adjuntos. |
| `pendingRecordAction`, `pendingDeleteKeys` | Confirmación y exclusión mutua de acciones destructivas. |
| `archivedReferenceLabels` | Etiquetas seguras de referencias archivadas. |

## Estilos y contratos

`index.css` define tokens de tema. `App.css` define autenticación, workspace de dos
paneles, formularios, tarjetas, gráficos, modales, tablas sticky y breakpoints a
980 px, 960 px, 820 px y 760 px. Los inputs numéricos evitan cambios por rueda de
ratón. Las tablas usan `SectionTable` para conservar scroll horizontal y estados vacíos.

`src/config/appConfig.js` define orden de secciones, sección administrativa, etiquetas,
campos editables, columnas reducidas y campos de escalones. Al añadir un campo hay que
actualizar ese contrato, `probetasSchema.js`, servicios, formularios, pruebas y SQL.
