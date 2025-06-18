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
  const AUTHORIZATION = `Basic ${Buffer.from(
    `${process.env.TRANSMAR_USERNAME}:${process.env.TRANSMAR_PASSWORD}`
  ).toString("base64")}`;

  let dates = [];
  let dateiterator = startDate.clone();
  while (dateiterator.isSameOrBefore(endDate)) {
    dates.push(dateiterator.format("YYYY-MM-DD"));
    dateiterator.add(1, "days");
  }

  let info: FormattedData = {};

  console.log(
    "CHECKING ITINERARIES BETWEEN ",
    startDate.format("YYYY-MM-DD"),
    "AND ",
    endDate.format("YYYY-MM-DD")
  );

  const response = await fetch(
    `${BASE_URL}/v1/listItinerariosAll?fechaInicio=${startDate.format(
      "DD/MM/YYYY"
    )}&fechaFin=${endDate.format("DD/MM/YYYY")}`,

    {
      method: "GET",
      headers: {
        Authorization: AUTHORIZATION,
      },
    }
  );

  if (response.status !== 200) {
    console.log("  ❌ FAILED TO FETCH ITINERARIES:", response);
    return;
  }

  const itineraries = (await response.json()) as any;

  console.log(`✅ ${itineraries.length} ITINERARIES FOUND`);

  for (const itinerary of itineraries) {
    console.log("📌 CHECKING ITINERARY:", itinerary.id);
    console.log("      ℹ️ INFO");
    console.log("         ORIGIN:", itinerary.ruta.origen);
    console.log("         DESTINATION:", itinerary.ruta.destino);
    console.log("         SERVICE:", itinerary.servicio.denominacion);
    console.log(
      "         FARE:",
      itinerary.tarifaPiso1,
      ", ",
      itinerary.tarifaPiso2
    );

    let newDate = moment(itinerary.fechaPartida, "DD/MM/YYYY").format(
      "YYYY-MM-DD"
    );

    info[newDate] = info[newDate] || [];

    info[newDate].push({
      origin: {
        id: itinerary.ruta.origen.id,
        name: itinerary.ruta.origen.denominacion,
      },
      destination: {
        id: itinerary.ruta.destino.id,
        name: itinerary.ruta.destino.denominacion,
      },
      departureTime: itinerary.horaPartida,
      service: itinerary.servicio.denominacion,
      fares: {
        firstFloor: itinerary.tarifaPiso1,
        secondFloor: itinerary.tarifaPiso2,
      },
    });
  }

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

export default { runner, checkConfig, ready: true };
