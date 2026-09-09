# Borradores privados de probetas

## Objetivo

Permitir que una probeta nueva e incompleta se guarde como borrador al cerrar
su formulario. El borrador debe persistir entre sesiones, aparecer junto a las
probetas definitivas y ser accesible exclusivamente para el usuario que lo
creó. Al completar el formulario, el guardado normal debe convertirlo en una
probeta definitiva.

El alcance no incluye convertir una probeta ya definitiva en borrador.

## Modelo de datos y seguridad

Se añadirá la tabla `public.PROBETA_BORRADORES` en lugar de añadir un estado a
`PROBETA`. Cada fila contendrá:

- `id uuid` como identificador del borrador.
- `owner_id uuid`, con valor por defecto `auth.uid()`.
- `payload jsonb`, con la instantánea completa del formulario de probeta.
- `created_at` y `updated_at`.

No se crearán filas incompletas en `PROBETA`, `RESULTS`, `CAPA` ni sus tablas
de enlace. Esto evita datos auxiliares huérfanos y permite guardar cualquier
estado parcial del formulario.

La migración habilitará RLS y aplicará políticas para usuarios aprobados que
exijan `owner_id = auth.uid()` en SELECT, INSERT, UPDATE y DELETE. El valor de
`owner_id` se fijará por política, por lo que un cliente no podrá crear ni
reasignar borradores de otro usuario. Estas reglas se aplican también a los
administradores: solo el creador puede ver un borrador ajeno a las tablas
definitivas.

## Carga y presentación

El servicio de datos cargará los borradores permitidos por RLS y la aplicación
los combinará únicamente para la presentación con las filas de `PROBETA`.
Cada fila combinada conservará sus datos de formulario y llevará
`isDraft: true`, `draftId` y `ownerId`.

La tabla de Probetas añadirá una columna de estado. Las filas definitivas
mostrarán el estado habitual y las privadas una etiqueta visual `Borrador`.
El borrador mostrará su título si existe o `Borrador sin título` en caso
contrario, y su acción principal será `Continuar`.

## Flujo de usuario

1. Un usuario abre una nueva probeta y completa cualquier parte del formulario.
2. Al pulsar Cerrar, Cancelar o el fondo, el diálogo de confirmación ofrece:
   `Seguir editando`, `Guardar borrador` y `Descartar`.
3. `Guardar borrador` valida solo que la sesión puede crear registros, guarda
   la instantánea y cierra el formulario tras confirmar la operación.
4. Al pulsar `Continuar` desde la lista, la instantánea se restaura en el
   formulario de Probeta como una creación en progreso asociada al borrador.
5. Volver a cerrar actualiza ese mismo borrador, sin crear duplicados.
6. `Guardar probeta` ejecuta el flujo actual de creación definitiva. Solo si
   este termina correctamente se elimina el borrador. Si falla, el borrador
   permanece intacto para reintentar.
7. El creador puede usar `Descartar` en una fila de borrador. Esta acción solo
   elimina el borrador propio, incluso cuando su rol no puede borrar probetas
   definitivas.

Los formularios de edición de probetas definitivas mantienen su comportamiento
actual y no ofrecen guardar como borrador.

## Integración de componentes

- `FormModal` acepta un manejador opcional de guardado de borrador y lo muestra
  únicamente para la creación de Probeta. El estado de envío bloquea los tres
  botones para impedir operaciones duplicadas.
- `App` conserva el identificador del borrador abierto, diferencia los textos
  de crear/continuar/finalizar y coordina refresco, notificaciones y descarte.
- `databaseService` expone operaciones aisladas para listar, crear/actualizar y
  eliminar borradores. La conversión final reutiliza `saveProbetaRecord` y
  elimina el borrador después de recibir una respuesta correcta.
- `ProbetaRecordsTable` renderiza el estado, la etiqueta visual y las acciones
  adecuadas según `isDraft`.

## Errores y consistencia

Los errores de Supabase se traducen con el sistema de mensajes existente. Un
fallo al guardar o actualizar un borrador mantiene el diálogo y los datos en
pantalla. Un fallo al finalizar no borra el borrador. La protección contra
doble clic se aplica a guardar borrador, actualizar borrador, finalizar y
descartar.

## Pruebas

Se añadirán pruebas para:

- construir filas de borrador para la tabla y distinguirlas de una definitiva;
- persistir y actualizar un único borrador a partir de su identificador;
- mostrar las tres acciones del diálogo al crear una probeta;
- finalizar una probeta eliminando el borrador solo tras un guardado correcto;
- conservar el borrador cuando el guardado definitivo falla;
- mostrar la etiqueta y las acciones de borrador en la lista.

La migración SQL se entregará en `sql/` para ejecutarla manualmente en
Supabase; la aplicación no intentará aplicar cambios de esquema por sí misma.
