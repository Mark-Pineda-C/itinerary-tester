import runners from "./src";

import moment from "moment";
import yargs from "yargs";
import { hideBin } from "yargs/helpers";

const argv = yargs(hideBin(process.argv))
  .option("integrations", {
    alias: "i",
    description: "Integración a ejecutar",
    array: true,
    describe: "Integraciones a ejecutar (separado por comas)",
    coerce: (args: string[]) =>
      args.flatMap((arg) => arg.split(",").map((x) => x.trim())),
  })
  .option("start-date", {
    alias: "s", // alias -s (de "start")
    type: "string",
    describe: "Fecha de inicio en formato YYYY-MM-DD",
    coerce: (date: string) => {
      if (moment(date).isValid()) {
        return moment(date);
      }
      throw new Error("La fecha de inicio no es válida");
    },
    default: moment().add(2, "days"),
  })
  .option("end-date", {
    alias: "e", // alias -e (de "end")
    type: "string",
    describe: "Fecha de fin en formato YYYY-MM-DD",
    coerce: (date: string) => {
      if (moment(date).isValid()) {
        return moment(date);
      }
      throw new Error("La fecha de fin no es válida");
    },
    default: moment().add(7, "days"),
  })
  .option("list-available-integrations", {
    alias: "l",
    type: "boolean",
    describe: "Muestra las integraciones disponibles",
  })
  .help()
  .alias("help", "h")
  .parseSync();

if (argv["list-available-integrations"]) {
  console.log("Integraciones disponibles:");
  for (const integration of Object.keys(runners)) {
    console.log(
      `- ${integration} ${
        !runners[integration as keyof typeof runners].ready ? "[not-ready]" : ""
      }`
    );
  }
  process.exit(0);
}

if (!argv.integrations) {
  console.error("❌ El parámetro --integrations es obligatorio");
  process.exit(1);
}

const startDate = argv.startDate;
const endDate = argv.endDate;

for (const integration of argv.integrations) {
  runners[integration as keyof typeof runners].checkConfig();
  console.log("---------------------------------------------");
  console.log(`🚀 Iniciando prueba para ${integration}...`);

  await runners[integration as keyof typeof runners].runner(startDate, endDate);
  console.log("---------------------------------------------");
}
