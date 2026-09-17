# PROBETAS: mapa del sistema

> Estado documentado: 17 de septiembre de 2026. Esta documentación describe la rama
> `feature/client-requests-2026-09-08` tras integrar los PR #2 a #6.

## Propósito y alcance

PROBETAS es una aplicación web de laboratorio para registrar y consultar probetas de
materiales compuestos. Centraliza la composición por capas, los ciclos de curado, las
mediciones físicas, los catálogos de materiales y los documentos PDF asociados. La
aplicación es una SPA: el navegador contiene la interfaz y Supabase suministra la
identidad, la persistencia, el almacenamiento de PDFs y una función de administración.

```text
Usuario autenticado
        |
        v
React SPA (src/App.jsx)
  |       |          |
  |       |          +--> IndexedDB: índice/local fallback de adjuntos
  |       +-------------> Supabase Storage: bucket pdfs
  +---------------------> Supabase Auth + PostgreSQL + RLS
                              |
                              +--> Edge Function admin-manage-users
```

## Arquitectura de ejecución

| Capa | Tecnología y responsabilidad |
| --- | --- |
| Cliente | React 19, React DOM y Vite 8. `src/main.jsx` instala los polyfills criptográficos y monta `App`. |
| Orquestación | `src/App.jsx` mantiene sesión, perfil, permisos, estado de tablas, formularios, búsqueda, archivos, modales y mensajes. |
| UI | Componentes en `src/components/`; la hoja `src/App.css` contiene los layouts, temas y adaptaciones responsive. |
| Modelo local | `src/data/probetasSchema.js` define tablas lógicas, relaciones, plantillas vacías y la base local inicial. |
| Datos | `src/services/databaseService.js` resuelve variantes de nombre de tablas y persiste registros, recetas, probetas y borradores. |
| Identidad | `src/services/authService.js` envuelve Supabase Auth, perfiles y la función administrativa. |
| Archivos | `src/utils/fileStorage.js` usa Storage remoto por defecto; IndexedDB está disponible como almacenamiento local explícito. |
| Backend | Supabase PostgreSQL, Auth, Storage y `supabase/functions/admin-manage-users`. |

## Puesta en marcha

```bash
npm install
npm run dev
npm test
npm run build
```

El cliente necesita `VITE_SUPABASE_URL` y `VITE_SUPABASE_PUBLISHABLE_KEY` (también
acepta el nombre anterior `VITE_SUPABASE_ANON_KEY`). `VITE_PUBLIC_APP_URL` controla
los enlaces de redirección de Auth. `VITE_SUPABASE_PDF_BUCKET` es opcional y usa
`pdfs` por defecto.

La función Edge necesita `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SERVICE_ROLE_KEY` y,
opcionalmente, `PUBLIC_APP_URL`. Las claves de servicio no pertenecen al cliente ni
al repositorio.

## Estructura del repositorio

```text
.
├── src/
│   ├── components/       # Pantallas, tablas, formularios, modales y sus pruebas
│   ├── config/           # Etiquetas, orden de secciones y campos editables
│   ├── data/             # Esquema lógico, relaciones y plantillas de registros
│   ├── lib/              # Cliente Supabase
│   ├── services/         # Persistencia y autenticación
│   ├── utils/            # Cálculos, búsqueda, permisos, archivos y errores
│   ├── App.jsx           # Composición y estado de la aplicación
│   ├── App.css           # Diseño visual y responsive
│   └── index.css         # Tokens de color y estilos globales
├── sql/                  # Migraciones manuales, ordenadas por fecha
├── supabase/functions/   # Edge Function de administración de usuarios
├── public/               # Iconos y favicon servidos estáticamente
├── docs/superpowers/     # Planes y decisiones históricas, no especificación viva
├── openspec/             # Especificaciones vivas y este mapa del sistema
├── package.json          # Scripts y dependencias de la SPA
└── vite.config.js        # Configuración del bundler
```

Los directorios `node_modules/`, `dist/` y `.vite/` son resultados locales o de
compilación. No son fuentes de producto ni deben entrar en commits.

## Especificaciones vivas

| Especificación | Contenido |
| --- | --- |
| `application-shell` | Inicialización, navegación, tema, tablas y accesibilidad operativa. |
| `identity-and-access` | Sesión, aprobación, roles, perfiles y administración. |
| `specimen-and-curing` | Probetas, capas, resultados, recetas, borradores y archivo lógico. |
| `materials-and-documents` | Catálogos, sistemas de resina, PDFs y fechas de revisión. |
| `search-and-listing` | Búsqueda global, filtros y listas de registros. |
| `data-platform` | Esquema lógico, Supabase, RLS, Storage y migraciones. |
| `repository-operations` | Dependencias, carpetas, pruebas, ramas y prácticas de entrega. |

## Base de datos y migraciones

`src/data/probetasSchema.js` es el contrato de datos que utiliza el cliente; no es
una migración ejecutable. La carpeta `sql/` conserva migraciones incrementales que
se ejecutan manualmente en el SQL Editor de Supabase. El repositorio no contiene una
migración única que cree todas las tablas base, por lo que una instancia nueva debe
partir del esquema de Supabase ya existente y recibir las migraciones en orden
cronológico.

Las migraciones recientes incorporan perfiles/RLS, Storage de PDFs, ciclos de
receta, borradores de probeta, archivo lógico, fechas de revisión y el catálogo de
categorías de sistemas de resina. Cada archivo declara si es idempotente o requiere
precauciones (por ejemplo, las migraciones de conversión de vacío generan un backup).

## Historia y ramas

| Rama | Rol y estado a la fecha documentada |
| --- | --- |
| `main` | Punto inicial vacío del repositorio. |
| `initial-app` | Base inicial de la aplicación; también es el `origin/HEAD` actual. |
| `develop` | Merge histórico de inicialización. |
| `feature/preserve-pdf-filename` | Base común de la mejora de nombres de PDF. |
| `feature/client-requests-2026-09-08` | Rama de integración vigente de solicitudes de cliente. |
| `...-pdf-review-dates` | Integrada por PR #2. Añade fechas de revisión y la presentación compacta de PDFs. |
| `...-global-record-search` | Integrada por PR #3. Añade búsqueda global, filtros y agrupación de campos. |
| `...-initial-temperature-reference` | Integrada por PR #4. Corrige la referencia de temperatura inicial. |
| `...-ramp-hour-conversion` | Integrada por PR #5. Expone equivalencias de rampas por hora. |
| `...-resin-system-fields` | Integrada por PR #6. Añade categorías, fabricante y campos de la guía de resinas. |

Las cinco ramas pequeñas permanecen como referencias históricas, pero sus puntas son
ancestros de la rama de integración. Los conflictos de los PR #3 y #6 se resolvieron
antes de su merge, preservando las funciones acumuladas.

## Límites y decisiones explícitas

- La seguridad no se delega solo al cliente: las migraciones habilitan RLS y la
  función Edge vuelve a comprobar rol y aprobación.
- El catálogo de etiquetas de producto se muestra y administra únicamente a
  administradores en la interfaz; los usuarios aprobados pueden leerlo como origen
  de selección al editar un sistema de resina.
- Los IDs de muchas tablas de catálogo son numéricos y el cliente calcula el siguiente
  valor antes de insertar; no se debe sustituir por otro mecanismo sin revisar
  `databaseService.js`.
- La aplicación carga registros activos por defecto. Solo administradores pueden ver
  o restaurar archivados.
- `npm test` y `npm run build` son las comprobaciones mínimas de entrega. El lint
  global debe ejecutarse sin caches generadas ni bundles ajenos al código fuente.
