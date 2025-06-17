import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import { appendFile } from "node:fs/promises";
import { join } from "node:path";

const argv = yargs(hideBin(process.argv))
  .option("name", {
    alias: "n",
    description: "Nombre de la integración",
    type: "string",
  })
  .option("env-vars", {
    alias: "e",
    description: "Variables de entorno a usar",
    array: true,
    coerce: (args: string[]) =>
      args.flatMap((arg) => arg.split(",").map((x) => x.trim())),
  })
  .help()
  .alias("help", "h")
  .parseSync();

if (!argv.name) {
  console.error("❌ El parámetro --name es obligatorio");
  process.exit(1);
}

if (!argv.envVars || argv.envVars.length === 0) {
  console.error(
    "❌ El parámetro --env-vars debe contener al menos una variable"
  );
  process.exit(1);
}

const name = argv.name;

const envFile = join(process.cwd(), ".env");
const envExampleFile = join(process.cwd(), ".env.example");
const newIntegrationFile = join(process.cwd(), `src/${name}.ts`);

try {
  const envVars = argv.envVars;
  let content = `\n# ${name.toUpperCase()}\n`;
  await appendFile(envFile, content);
  await appendFile(envExampleFile, content);

  for (const envVar of envVars) {
    const [key, value] = envVar.split("=");
    await appendFile(envFile, `${key}="${value}"\n`);
    await appendFile(envExampleFile, `${key}=""\n`);
  }

  console.log(
    "✅ Variables de entorno agregadas al archivo .env y plantilla generada en .env.example"
  );

  await Bun.file(newIntegrationFile).write(
    `
    import moment from "moment";
    import { exportToXlsxBuffer, type FormattedData } from "./utils";

    function checkConfig() {
      const variables = [${envVars
        .map((v) => `"${v.split("=")[0]}"`)
        .join(", ")}];
      for (const variable of variables) {
        if (!process.env[variable]) {
          console.error(\`❌ \${variable} no está definida\`);
          process.exit(1);
        }
      }
    }

    async function runner(startDate: moment.Moment, endDate: moment.Moment) {
      const BASE_URL = process.env.${name.toUpperCase()}_BASE_URL;
      let dates = [];
      let dateiterator = startDate.clone();
      while (dateiterator.isSameOrBefore(endDate)) {
        dates.push(dateiterator.format("YYYY-MM-DD"));
        dateiterator.add(1, "days");
      }

      let info: FormattedData = {};

      // TODO: Implement the integration

      console.log("---------------------------------------------");
      console.log("EXPORTING DATA...");

      const xlsxBuffer = exportToXlsxBuffer(info);
      const excelFileName = \`./exports/${name}-itinerarios-\${startDate.format(
        "YYYY-MM-DD"
      )}-\${endDate.format("YYYY-MM-DD")}.xlsx\`;
      const archivo = Bun.file(excelFileName);
      await Bun.write(archivo, xlsxBuffer);

      console.log("✅ DATA EXPORTED TO", excelFileName);
    }

    // TODO: Set ready to true if the integration is ready
    export default { runner, checkConfig, ready: false };
  `
  );

  console.log("✅ Archivo de integración creado");

  // Modificar src/index.ts para agregar la nueva integración
  const srcIndexPath = join(process.cwd(), "src/index.ts");
  const integrationImport = `import ${name} from \"./${name}\";\n`;
  const integrationExport = `${name},`;
  let srcIndexContent = await Bun.file(srcIndexPath).text();

  // Agregar la importación al inicio
  srcIndexContent = integrationImport + srcIndexContent;

  // Agregar al export default
  srcIndexContent = srcIndexContent.replace(
    /export default \{([^}]*)\}/,
    (match, p1) => {
      // Insertar antes del cierre
      return `export default { ${integrationExport}${p1} }`;
    }
  );

  await Bun.write(srcIndexPath, srcIndexContent);
  console.log("✅ src/index.ts actualizado con la nueva integración");
} catch (error) {
  console.error("❌ Ocurrio un error al crear el archivo de la integración");
  console.error(error);
  process.exit(1);
}
