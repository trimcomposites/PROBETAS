# Búsqueda global de registros

## Objetivo

Permitir localizar registros desde una única barra compacta. La persona elige un
tipo de registro, añade texto y/o condiciones agrupadas y decide cuándo aplicar
la búsqueda pulsando el icono de lupa. Preparar una búsqueda nunca cambia la
tabla que se está consultando.

## Alcance

La búsqueda cubre los registros ya cargados de probetas, preimpregnados, fibras
de refuerzo, resinas, recetas, fabricantes y tricotados. No introduce consultas
nuevas a Supabase, migraciones ni búsqueda en históricos.

La lista habitual se abre como hasta ahora. La barra siempre está disponible,
pero sus sugerencias y controles solo se despliegan al recibir foco.

## Barra única

La interfaz usa la paleta neutra y verde existente, sin azul. Todos los pasos
ocurren dentro del mismo contenedor:

1. En reposo muestra el texto `Buscar registros…`.
2. Al enfocarla, propone tipos de registro y admite encontrarlos escribiendo
   texto, incluidos plural, mayúsculas y acentos.
3. Al elegir, por ejemplo, **Probetas**, ese nombre pasa a ser el primer
   segmento de la propia barra; no se convierte en un chip ni aparece una
   segunda barra. A su derecha quedan el texto de búsqueda y el botón de lupa.
4. Debajo de esa primera línea, pero dentro del mismo borde, se muestran los
   grupos de campos. Abrir un grupo permite añadir una condición de columna con
   operador y valor. Las condiciones preparadas permanecen como chips dentro de
   la barra y se eliminan con su `×`.
5. Solo la lupa aplica el tipo, el texto y las condiciones preparados. Antes de
   pulsarla, se conserva tanto la tabla seleccionada como sus resultados.
6. Cambiar de sección con la navegación lateral descarta la búsqueda preparada y
   la aplicada. Quitar el tipo de la barra también descarta ambas y mantiene la
   lista normal de la sección actual.

## Grupos de campos

Los grupos son una configuración explícita por tipo. Así los textos de la UI no
dependen de inferir nombres técnicos de columnas y cada tipo muestra únicamente
campos que puede buscar.

Para **Probetas** los grupos iniciales son:

- **Datos generales:** identificador, título, autor, fecha de revisión, receta
  y referencia.
- **Capas:** número de capas y materiales.
- **Curado:** receta asociada.
- **Resultados:** largo, ancho, espesor, medidas de espesor, peso, densidad,
  acabado, observaciones y estado.

Preimpregnados muestran Material, Composición y Documentación; fibras y resinas
muestran Datos y Documentación; recetas muestran Datos, Temperatura y
Escalones (incluido el número de escalones); fabricantes y tricotados muestran
sus campos de Datos. Cuando un tipo dispone de documentos, el grupo de
Documentación incluye sus PDF y, si existe en el registro, la fecha de revisión.

## Datos y estado

La aplicación mantiene dos estados distintos:

- Un borrador con tipo, texto y condiciones que la barra está editando.
- Una instantánea aplicada que se crea al pulsar la lupa.

La tabla y los resultados se derivan exclusivamente de la instantánea aplicada.
El componente de búsqueda solo modifica el borrador y emite una búsqueda
completa al confirmar. La configuración de grupos se separa de los utilitarios
puros que normalizan valores y filtran filas.

Las filas derivadas de probetas se amplían para exponer los resultados de
medición, incluidas las dimensiones, sin modificar los datos almacenados. Esto
permite buscar por los valores que se presentan en pantalla.

## Semántica de filtrado

El texto libre y todas las condiciones se combinan con `AND`. Las comparaciones
de texto ignoran mayúsculas, espacios sobrantes y acentos. Las relaciones se
buscan mediante su etiqueta legible además de su identificador.

Cada columna ofrece los operadores que correspondan a su dato: contiene e
igual para texto y referencias; igual, mayor que y menor que para números y
fechas; sí/no para booleanos; y con/sin archivo para PDFs. Un valor ausente no
coincide y una condición incompleta no lanza errores ni se aplica.

## Accesibilidad y adaptación

El selector de tipos funciona con flechas, Enter y Escape, y cada control tiene
etiqueta accesible. La barra y sus grupos se adaptan a pantallas estrechas sin
ocultar el botón de búsqueda ni impedir quitar condiciones.

## Pruebas

Las pruebas cubren:

- Activación por foco, selección textual del tipo y su presencia integrada en
  la misma barra.
- Grupos por tipo, incluidos número de capas y dimensiones en Probetas.
- Separación entre borrador y resultado: editar no altera la tabla; pulsar la
  lupa sí lo hace.
- Alta y eliminación de condiciones en el borrador y la aplicación posterior
  con la lupa.
- Normalización, relaciones y operadores de texto, referencia, número, fecha,
  booleano y PDF.
- Conservación del índice fuente para las acciones sobre un resultado filtrado.
