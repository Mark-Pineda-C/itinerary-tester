import moment from "moment";
import { exportToXlsxBuffer, type FormattedData } from "./utils";

function checkConfig() {
  const variables = ["PIDESOFT_BASE_URL", "PIDESOFT_X_API_KEY"];
  for (const variable of variables) {
    if (!process.env[variable]) {
      console.error(`❌ ${variable} no está definida`);
      process.exit(1);
    }
  }
}

async function runner(startDate: moment.Moment, endDate: moment.Moment) {
  const BASE_URL = process.env.PIDESOFT_BASE_URL;
  const AUTHORIZATION = process.env.PIDESOFT_X_API_KEY as string;
  let dates = [];
  let dateiterator = startDate.clone();
  while (dateiterator.isSameOrBefore(endDate)) {
    dates.push(dateiterator.format("YYYY-MM-DD"));
    dateiterator.add(1, "days");
  }

  let info: FormattedData = {};

  console.log("📌 CHECKING ROUTES");

  const response = await fetch(`${BASE_URL}/rutas`, {
    headers: {
      "x-api-key": AUTHORIZATION,
    },
  });

  if (response.status !== 200) {
    console.log("  ❌ FAILED TO FETCH ROUTES:", response);
    return;
  }

  const routes = (await response.json()) as any;

  console.log(`✅ ${routes.data.length} ROUTES FOUND`);

  for (const route of routes.data) {
    console.log(
      "  📌 CHECKING ITINERARIES FOR",
      route.origen,
      "->",
      route.destino
    );

    const itinerariesResponse = await fetch(
      `${BASE_URL}/itinerarios?origen_id=${route.origen_id}&destino_id=${route.destino_id}&fecha_partida=2025-12-31`,
      {
        headers: {
          "x-api-key": AUTHORIZATION,
        },
      }
    );

    if (itinerariesResponse.status !== 200) {
      console.log("  ❌ FAILED TO FETCH ITINERARIES:", itinerariesResponse);
      return;
    }

    const itineraries = (await itinerariesResponse.json()) as any;

    if (itineraries.data.length === 0) {
      console.log("  ⚠️ NO ITINERARIES FOUND");
      continue;
    }

    console.log(`✅ ${itineraries.data.length} ITINERARIES FOUND`);

    for (const itinerary of itineraries.data) {
      console.log("    📌 CHECKING ITINERARY:", itinerary.ruta_id);

      console.log("      ℹ️ INFO");
      console.log("         SERVICE:", itinerary.servicio);
      console.log("         FARE:", itinerary.tarifa);

      info["2025-12-31"] = info["2025-12-31"] || [];

      info["2025-12-31"].push({
        origin: {
          id: itinerary.origen_id,
          name: itinerary.origen,
        },
        destination: {
          id: itinerary.destino_id,
          name: itinerary.destino,
        },
        departureTime: itinerary.hora_partida,
        service: itinerary.servicio,
        fares: {
          firstFloor: itinerary.tarifa,
        },
      });
    }
  }

  console.log("---------------------------------------------");
  console.log("EXPORTING DATA...");

  const xlsxBuffer = exportToXlsxBuffer(info);
  const excelFileName = `./exports/pidesoft-itinerarios-${startDate.format(
    "YYYY-MM-DD"
  )}-${endDate.format("YYYY-MM-DD")}.xlsx`;
  const archivo = Bun.file(excelFileName);
  await Bun.write(archivo, xlsxBuffer);

  console.log("✅ DATA EXPORTED TO", excelFileName);
}

export default { runner, checkConfig, ready: true };
