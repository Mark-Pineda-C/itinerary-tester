# kupos-peru-itinerary-tester

## Requisitos previos

Debes instalar [Bun](https://bun.sh) antes de continuar. Puedes seguir las instrucciones oficiales en la [página de instalación de Bun](https://bun.sh/docs/installation).

## Configuración del entorno

Antes de ejecutar el proyecto, debes copiar el archivo `.env.example` a un nuevo archivo llamado `.env` y definir los valores necesarios en este archivo según tu entorno y necesidades.

```bash
cp .env.example .env
# Luego edita el archivo .env para definir los valores requeridos
```

## Instalación de dependencias

```bash
bun install
```

## Ejecución del proyecto

```bash
bun start
```

## Uso

El proyecto acepta varios parámetros de línea de comandos para configurar su ejecución:

### Parámetros disponibles

- **`--integrations, -i`**: Especifica las integraciones a ejecutar. Puedes proporcionar múltiples integraciones separadas por comas.

  ```bash
  bun start --integrations integration1,integration2
  # o
  bun start -i integration1 integration2
  ```

- **`--start-date, -s`**: Fecha de inicio en formato `YYYY-MM-DD`. Por defecto es 2 días a partir de hoy.

  ```bash
  bun start --start-date 2024-01-15
  # o
  bun start -s 2024-01-15
  ```

- **`--end-date, -e`**: Fecha de fin en formato `YYYY-MM-DD`. Por defecto es 7 días a partir de hoy.

  ```bash
  bun start --end-date 2024-01-20
  # o
  bun start -e 2024-01-20
  ```

- **`--list-available-integrations, -l`**: Muestra las integraciones disponibles sin ejecutar el programa.

  ```bash
  bun start --list-available-integrations
  # o
  bun start -l
  ```

- **`--help, -h`**: Muestra la ayuda con todos los parámetros disponibles.
  ```bash
  bun start --help
  ```

### Ejemplos de uso

```bash
# Ejecutar con integraciones específicas en un rango de fechas
bun start -i integration1,integration2 -s 2024-01-15 -e 2024-01-20

# Listar integraciones disponibles
bun start -l

```

## Estructura del proyecto

- El código fuente se encuentra en la carpeta `./src`.
- Los archivos de reporte se almacenan en la carpeta `./exports`.

Este proyecto fue creado usando `bun init` en bun v1.2.5. [Bun](https://bun.sh) es un entorno de ejecución de JavaScript rápido todo en uno.

## Contribuciones

Si deseas agregar una nueva integración, puedes hacerlo fácilmente usando el comando:

```bash
bun add-integration --name NOMBRE --env-vars VAR1=valor1,VAR2=valor2
```

O usando los alias:

```bash
bun add-integration -n NOMBRE -e VAR1=valor1,VAR2=valor2
```

### Parámetros

- **--name, -n**: Nombre de la integración. Es obligatorio.
- **--env-vars, -e**: Lista de variables de entorno necesarias para la integración. Puedes separarlas por comas o pasar varias veces el parámetro. Es obligatorio e indica tanto las variables a agregar como sus valores iniciales en `.env` (y vacíos en `.env.example`).

### ¿Qué hace este comando?

- Añade las variables de entorno especificadas a los archivos `.env` y `.env.example`.
- Crea un archivo de integración en `src/NOMBRE.ts` con una plantilla básica.
- Modifica `src/index.ts` para importar y exportar automáticamente la nueva integración.

Esto facilita la incorporación de nuevas integraciones siguiendo la estructura del proyecto.
