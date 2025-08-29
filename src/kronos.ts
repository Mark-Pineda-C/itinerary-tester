import moment from "moment";
import { exportToXlsxBuffer, type FormattedData } from "./utils";

function checkConfig() {
  const variables = ["KRONOS_BASE_URL", "KRONOS_USERNAME", "KRONOS_PASSWORD"];
  for (const variable of variables) {
    if (!process.env[variable]) {
      console.error(`❌ ${variable} no está definida`);
      process.exit(1);
    }
  }
}

function obtainPairs<T>(array: T[]): [T, T][] {
  const pairs: [T, T][] = [];
  for (let i = 0; i < array.length; i++) {
    for (let j = 0; j < array.length; j++) {
      if (i !== j) {
        pairs.push([array[i]!, array[j]!]);
      }
    }
  }
  return pairs;
}

async function runner(startDate: moment.Moment, endDate: moment.Moment) {
  const BASE_URL = process.env.KRONOS_BASE_URL;
  let dates = [];
  let dateiterator = startDate.clone();
  while (dateiterator.isSameOrBefore(endDate)) {
    dates.push(dateiterator.format("YYYY-MM-DD"));
    dateiterator.add(1, "days");
  }

  let info: FormattedData = {};

  console.log("📌 GENERATING TOKEN");

  const tokenData = new FormData();
  tokenData.append("usuario", process.env.KRONOS_USERNAME as string);
  tokenData.append("contrasena", process.env.KRONOS_PASSWORD as string);

  const tokenResponse = await fetch(`${BASE_URL}/crearsesion`, {
    method: "POST",
    body: tokenData,
  });

  if (tokenResponse.status !== 200) {
    console.log("  ❌ FAILED TO GENERATE TOKEN:", tokenResponse);
    return;
  }

  const tokenResponseJson = await tokenResponse.json();
  // const token = (tokenResponseJson as any).idsesion;
  const token = "fJvjIcYEwm";

  console.log("✅ TOKEN GENERATED");

  console.log("📌 CHECKING ROUTES");

  const routesResponse = await fetch(`${BASE_URL}/verciudades`);

  if (routesResponse.status !== 200) {
    console.log("  ❌ FAILED TO FETCH ROUTES:", routesResponse);
    return;
  }

  const routesPrev = await routesResponse.json();

  const routes = (routesPrev as any).ciudades.filter(
    (c: any) => c.pais === "Peru"
  ) as { ciudad: string; pais: string; idciudad: string }[];

  if (routes.length === 0) {
    console.log("  ⚠️ NO ROUTES FOUND");
    return;
  }

  const pairs = obtainPairs(routes);

  console.log(`✅ ${pairs.length} ROUTES FOUND`);

  for (const date of dates) {
    console.log("--------");
    console.log("  📅 CHECKING WITH DATE:", date);

    for (const pair of pairs) {
      console.log(
        "  📌 CHECKING ITINERARIES FOR",
        pair[0].ciudad,
        "->",
        pair[1].ciudad
      );

      const itineraryData = new FormData();
      itineraryData.append("idsesion", token);
      itineraryData.append("idorigen", pair[0].idciudad);
      itineraryData.append("iddestino", pair[1].idciudad);
      itineraryData.append("fecha", date);

      const itinerariesResponse = await fetch(`${BASE_URL}/buscarutas/SOL`, {
        method: "POST",
        body: itineraryData,
      });

      if (itinerariesResponse.status !== 200) {
        console.log("  ❌ FAILED TO FETCH ITINERARIES:", itinerariesResponse);
        return;
      }
      
      const itineraries = (await itinerariesResponse.json()) as any;
      
      if (!itineraries.viajes) {
        console.log("  ❌ NO ITINERARIES FOUND");
        continue;
      }

      console.log(`  ✅ ${itineraries.viajes.length} ITINERARIES FOUND:`);

      for (const itinerary of itineraries.viajes) {
        console.log("    📌 CHECKING ITINERARY:", itinerary.idcalendario);
        console.log("      ℹ️ INFO");
        console.log("         SERVICE:", itinerary.tipobus);
        console.log("         FARE:", itinerary.precio);

        info[date] = info[date] || [];

        info[date].push({
          origin: {
            id: Number.parseInt(pair[0].idciudad),
            name: pair[0].ciudad,
          },
          destination: {
            id: Number.parseInt(pair[1].idciudad),
            name: pair[1].ciudad,
          },
          departureTime: itinerary.horasalida,
          service: itinerary.tipobus,
          fares: {
            firstFloor: itinerary.precio,
          },
        });
      }
    }
  }

  console.log("---------------------------------------------");
  console.log("EXPORTING DATA...");

  const xlsxBuffer = exportToXlsxBuffer(info);
  const excelFileName = `./exports/kronos-itinerarios-${startDate.format(
    "YYYY-MM-DD"
  )}-${endDate.format("YYYY-MM-DD")}.xlsx`;
  const archivo = Bun.file(excelFileName);
  await Bun.write(archivo, xlsxBuffer);

  console.log("✅ DATA EXPORTED TO", excelFileName);
}

export default { runner, checkConfig, ready: true };
