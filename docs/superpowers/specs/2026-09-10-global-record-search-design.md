# Búsqueda global de registros

## Objetivo

Incorporar un buscador global que permita localizar registros sin navegar por
cada listado. La persona usuaria primero elige un único tipo de registro
escribiendo su nombre, por ejemplo `probetas`, y después acota ese conjunto con
texto libre y filtros por columna.

## Alcance

El selector de tipo ofrece exclusivamente las secciones principales ya visibles
en la barra lateral:

- `PROBETA`
- `FIBRAS_REFUERZO`
- `PRE-IMPREGNADO`
- `RECETAS`
- `FABRICANTE`
- `PRE-IMPREGNADO_TYPE`
- `RESINA_SYSTEM`

La búsqueda no es transversal mientras no se haya escogido un tipo. Al
seleccionarlo se muestran todos sus registros activos. No modifica el esquema
de Supabase ni añade consultas: opera en el conjunto ya cargado por la
aplicación. Los listados de archivados quedan fuera de esta primera versión.

## Interfaz y flujo

Una barra fija sobre el área de trabajo contendrá el control de búsqueda y los
filtros activos.

1. En el estado inicial, el campo permite escribir para encontrar un tipo de
   registro. La lista de sugerencias se filtra sin distinguir mayúsculas,
   minúsculas ni acentos.
2. Al elegir una sugerencia se añade un chip, por ejemplo `Probetas ×`, se
   sincroniza la sección lateral y se carga el listado activo correspondiente.
   Solo puede existir un chip de tipo.
3. Con un tipo elegido, el campo de texto busca en los valores legibles de sus
   registros. El texto es un filtro adicional y puede limpiarse sin retirar el
   tipo.
4. El control **Añadir filtro** permite escoger una columna del tipo actual,
   seleccionar un operador válido y aportar el valor. Cada condición aparece
   como chip con una `×` para eliminarla.
5. Al quitar el chip de tipo se eliminan el texto y todos los filtros de
   columna, y el buscador vuelve a pedir un tipo.

La tabla conserva todas sus acciones actuales —ver, editar, archivar o
eliminar— sobre los resultados filtrados. Si no hay coincidencias, muestra un
estado vacío que explica que se pueden corregir o retirar filtros, sin borrar
los chips aplicados.

## Semántica de filtrado

Las condiciones se combinan con **Y**: un registro debe cumplir el texto libre
y cada filtro de columna para aparecer.

La búsqueda de texto se normaliza eliminando acentos y comparando sin distinguir
mayúsculas. Busca por los valores que ve la persona usuaria, incluidos los
nombres resueltos de relaciones, no solo por los identificadores internos.

Los operadores disponibles dependen del tipo de dato:

| Tipo de campo | Operadores | Entrada |
| --- | --- | --- |
| Texto y URL | contiene | texto libre |
| Relación | es | sugerencias por nombre del registro relacionado |
| Número | es, mayor que, menor que | número |
| Fecha | es, posterior a, anterior a | fecha |
| Booleano | es | Sí o No |
| PDF | tiene, no tiene | sin valor adicional |

Los campos sin dato no cumplen una búsqueda de texto ni una condición de valor.
Los campos calculados o presentados por los listados consolidados de probetas y
recetas participarán con el mismo valor legible que se muestra en su tabla.

## Arquitectura

Se separará la lógica de la interfaz:

- `GlobalRecordSearch` gestiona la barra, las sugerencias, la creación de
  filtros y los chips.
- Un módulo de utilidades de búsqueda normaliza texto, genera valores
  buscables, resuelve relaciones mediante la base cargada y filtra registros.
  Sus funciones serán puras y no dependerán de React.
- `App` conserva el tipo seleccionado y el estado de filtros, obtiene las
  filas consolidadas existentes y entrega a la tabla únicamente las filas que
  pasan el filtro.

El cambio de sección desde la barra lateral actualiza el filtro principal al
tipo elegido y elimina texto y condiciones secundarios para no arrastrar
criterios incompatibles entre entidades.

## Errores y accesibilidad

Los valores no válidos, incompletos o eliminados de una relación no rompen el
filtrado: simplemente no producen coincidencia y el control mantiene un mensaje
de ayuda claro. Los botones para retirar filtros tendrán una etiqueta accesible
que identifique el filtro que eliminan. El teclado podrá elegir sugerencias y
cerrar filtros sin depender del ratón.

## Pruebas

- Selección de una sección escribiendo su nombre, también con diferencias de
  acentos y capitalización.
- Estado inicial sin resultados hasta seleccionar un único tipo y limpieza total
  al retirar ese tipo.
- Búsqueda de texto en campos directos y en etiquetas de relaciones como
  `Receta`.
- Operadores de texto, relación, número, fecha, booleano y presencia de PDF.
- Combinación de varias condiciones con semántica Y y eliminación individual
  mediante cada `×`.
- Sin coincidencias, relaciones ausentes y valores incompletos sin errores.
- La tabla filtrada conserva sus acciones y los registros correctos para
  editar, archivar o eliminar.
