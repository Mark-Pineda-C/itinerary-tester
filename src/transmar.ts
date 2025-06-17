import moment from "moment";
import { exportToXlsxBuffer, type FormattedData } from "./utils";

function checkConfig() {
  const variables = [
    "TRANSMAR_BASE_URL",
    "TRANSMAR_USERNAME",
    "TRANSMAR_PASSWORD",
  ];
  for (const variable of variables) {
    if (!process.env[variable]) {
      console.error(`❌ ${variable} no está definida`);
      process.exit(1);
    }
  }
}

async function runner(startDate: moment.Moment, endDate: moment.Moment) {
  const BASE_URL = process.env.TRANSMAR_BASE_URL;
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
  const excelFileName = `./exports/transmar-itinerarios-${startDate.format(
    "YYYY-MM-DD"
  )}-${endDate.format("YYYY-MM-DD")}.xlsx`;
  const archivo = Bun.file(excelFileName);
  await Bun.write(archivo, xlsxBuffer);

  console.log("✅ DATA EXPORTED TO", excelFileName);
}

export default { runner, checkConfig, ready: false };
