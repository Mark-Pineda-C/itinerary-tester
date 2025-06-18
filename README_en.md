# kupos-peru-itinerary-tester

[See spanish documentation](README.md)

## Prerequisites

You must install [Bun](https://bun.sh) before continuing. You can follow the official instructions on the [Bun installation page](https://bun.sh/docs/installation).

## Environment Setup

Before running the project, you must copy the `.env.example` file to a new file called `.env` and define the necessary values in this file according to your environment and needs.

```bash
cp .env.example .env
# Then edit the .env file to set the required values
```

## Installing dependencies

```bash
bun install
```

## Running the project

```bash
bun start
```

## Usage

The project accepts several command-line parameters to configure its execution:

### Available parameters

- **`--integrations, -i`**: Specifies the integrations to run. You can provide multiple integrations separated by commas.

  ```bash
  bun start --integrations integration1,integration2
  # or
  bun start -i integration1 integration2
  ```

- **`--start-date, -s`**: Start date in `YYYY-MM-DD` format. Defaults to 2 days from today.

  ```bash
  bun start --start-date 2024-01-15
  # or
  bun start -s 2024-01-15
  ```

- **`--end-date, -e`**: End date in `YYYY-MM-DD` format. Defaults to 7 days from today.

  ```bash
  bun start --end-date 2024-01-20
  # or
  bun start -e 2024-01-20
  ```

- **`--list-available-integrations, -l`**: Shows the available integrations without running the program.

  ```bash
  bun start --list-available-integrations
  # or
  bun start -l
  ```

- **`--help, -h`**: Shows help with all available parameters.
  ```bash
  bun start --help
  ```

### Usage examples

```bash
# Run with specific integrations in a date range
bun start -i integration1,integration2 -s 2024-01-15 -e 2024-01-20

# List available integrations
bun start -l
```

## Project structure

- The source code is located in the `./src` folder.
- Report files are stored in the `./exports` folder.

This project was created using `bun init` on bun v1.2.5. [Bun](https://bun.sh) is a fast all-in-one JavaScript runtime environment.

## Contributions

If you want to add a new integration, you can easily do so using the following command:

```bash
bun add-integration --name NAME --env-vars VAR1=value1,VAR2=value2
```

Or using the aliases:

```bash
bun add-integration -n NAME -e VAR1=value1,VAR2=value2
```

### Parameters

- **--name, -n**: Name of the integration. Required.
- **--env-vars, -e**: List of environment variables needed for the integration. You can separate them with commas or pass the parameter multiple times. Required; this indicates both the variables to add and their initial values in `.env` (and empty in `.env.example`).

### What does this command do?

- Adds the specified environment variables to the `.env` and `.env.example` files.
- Creates an integration file in `src/NAME.ts` with a basic template.
- Modifies `src/index.ts` to automatically import and export the new integration.

This makes it easy to add new integrations following the project's structure.
