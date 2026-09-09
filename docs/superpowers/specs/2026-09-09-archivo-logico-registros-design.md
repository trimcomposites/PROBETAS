# Archivo lógico de registros

## Objetivo

Permitir retirar registros que ya están siendo usados sin romper sus relaciones
existentes. Un registro archivado deja de estar disponible para nuevos usos y
desaparece de su listado activo, pero se puede consultar y restaurar con los
permisos adecuados.

## Alcance

Se aplica a las entidades gestionadas desde las secciones principales de la
aplicación:

- `PROBETA`
- `FIBRAS_REFUERZO`
- `PRE-IMPREGNADO`
- `RECETAS`
- `FABRICANTE`
- `PRE-IMPREGNADO_TYPE`
- `RESINA_SYSTEM`

Las tablas subordinadas o de relación (`CAPA`, `RESULTS`, `ESPESORES`,
`RECETA_ESCALONES`, `PROBETA_CAPA`, `PROBETA_PRE_IMPREGNADO`, etc.) no tendrán
archivo propio. Se mantienen o se eliminan como parte de las operaciones de su
registro principal actuales.

## Modelo de datos

Cada tabla del alcance incorporará:

- `archived_at timestamptz null`
- `archived_by uuid null references auth.users(id)`

Un valor nulo en `archived_at` significa que el registro está activo. Al
archivar, se escriben la fecha y el identificador del usuario que realizó la
acción. Restaurar ambos campos a `null` reactiva el registro.

La migración no modificará registros existentes: todos partirán activos. Se
crearán índices parciales para las consultas habituales de activos y
archivados.

## Relaciones y selección

- Las listas y selectores de creación muestran solo registros activos.
- Si un formulario existente ya referencia un registro archivado, conserva su
  identificador y muestra el nombre actual como `Nombre (Archivado)`.
- El usuario no puede volver a seleccionar ese registro archivado en un campo
  nuevo ni después de sustituirlo por otro valor.
- Los usuarios no administradores pueden obtener de manera puntual la etiqueta
  de un archivado únicamente cuando el registro abierto ya lo referencia. No
  pueden consultar la colección de archivados.
- Esta consulta puntual se implementará como una operación restringida del lado
  de la base de datos, validando el usuario y la relación solicitada, en vez de
  cargar todos los archivados en el cliente.

## Detección de uso y acciones

La app derivará el uso desde el esquema de relaciones existente y las tablas de
enlace cargadas. Antes de ejecutar una eliminación, el servicio repetirá la
comprobación; las claves foráneas mantienen una segunda barrera ante cambios
concurrentes.

| Situación | Acción disponible |
| --- | --- |
| Registro normal activo sin referencias | Eliminar |
| Registro normal activo con referencias | Archivar |
| Probeta activa | Archivar y Eliminar |
| Borrador de probeta | Descartar, sin archivo |
| Registro archivado | Restaurar, solo admin |

Archivar una probeta no elimina capas, materiales, resultados ni receta. La
eliminación de una probeta conserva la limpieza de enlaces auxiliares que ya
aplica el servicio.

## Interfaz

Cada listado activo mantiene su acción de edición o visualización y presenta
una acción contextual:

- **Eliminar** cuando el registro no está en uso.
- **Archivar** cuando está en uso.
- En probetas, ambas acciones están disponibles siempre.

Todo botón de eliminar o archivar abre un diálogo de confirmación antes de
efectuar la operación. El diálogo identifica el registro y explica que
archivar mantiene los enlaces existentes pero lo retira de futuras selecciones.

Los administradores ven un botón **Archivados** en cada sección. Abre el mismo
listado filtrado por estado archivado, sin creación ni eliminación, y con la
acción **Restaurar**. Tras restaurar, el elemento vuelve a la lista activa y a
los selectores.

## Permisos y seguridad

- Gestor y admin pueden eliminar o archivar, igual que el permiso actual de
  eliminación.
- Solo admin puede abrir una lista de archivados o restaurar.
- Las políticas RLS protegerán el cambio de estado y las consultas de
  archivados; la interfaz no será la única barrera.
- Los mensajes al usuario continúan usando el formato seguro actual, sin
  exponer mensajes de Supabase.

## Flujo de datos

1. La carga normal solicita registros activos para cada sección.
2. Al abrir un registro, se piden de forma limitada las etiquetas archivadas de
   sus referencias ya existentes, si las hubiera.
3. La acción contextual determina si existen referencias y abre el diálogo de
   confirmación correspondiente.
4. Al confirmar, se elimina o se actualiza el estado de archivo en Supabase.
5. La app recarga el listado afectado y muestra la notificación habitual.
6. La restauración, disponible solo en Archivados para admin, revierte el
   estado y actualiza las listas activas.

## Pruebas

- Detección de referencias directas y de enlaces N:M.
- Selección correcta de Eliminar, Archivar y ambas acciones de probeta.
- Confirmaciones que no realizan consultas al cancelar y bloquean doble envío.
- Filtrado de activos y archivados por sección.
- Exclusión de archivados de nuevos selectores y etiqueta `(Archivado)` en
  referencias preexistentes.
- Permisos: gestor puede archivar/eliminar; solo admin puede listar y
  restaurar.
- Rechazo seguro ante un intento de eliminación que pasa a estar en uso antes
  de la consulta final.
