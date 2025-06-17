import moment from "moment";
import { exportToXlsxBuffer, type FormattedData } from "./utils";

type RoutePair = {
  origen: {
    id: number;
    nombre: string;
  };
  destino: {
    id: number;
    nombre: string;
  };
};

function checkConfig() {
  const variables = ["JAKSA_BASE_URL", "JAKSA_USERNAME", "JAKSA_PASSWORD"];
  for (const variable of variables) {
    if (!process.env[variable]) {
      console.error(`❌ ${variable} no está definida`);
      process.exit(1);
    }
  }
}

async function runner(startDate: moment.Moment, endDate: moment.Moment) {
  const URL = process.env.JAKSA_BASE_URL;
  let dates = [];
  let dateiterator = startDate.clone();
  while (dateiterator.isSameOrBefore(endDate)) {
    dates.push(dateiterator.format("YYYY-MM-DD"));
    dateiterator.add(1, "days");
  }

  let info: FormattedData = {};

  console.log("📌 GENERATING TOKEN");

  const tokenResponse = await fetch(`${URL}/auth/login`, {
    method: "POST",
    body: JSON.stringify({
      username: process.env.JAKSA_USERNAME,
      password: process.env.JAKSA_PASSWORD,
    }),
    headers: {
      "Content-Type": "application/json",
    },
  });

  if (tokenResponse.status !== 200) {
    console.log("  ❌ FAILED TO GENERATE TOKEN:", tokenResponse);
    return;
  }

  const response = await tokenResponse.json();
  console.log("✅ TOKEN GENERATED");

  const TOKEN = (response as any).data.token;

  console.log("📌 CHECKING ROUTES");

  const routesResponse = await fetch(`${URL}/Route/Origen-Destino`, {
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      "Content-Type": "application/json",
    },
  });

  if (routesResponse.status !== 200) {
    if (routesResponse.status === 404) {
      console.log("  ⚠️ NO ROUTES FOUND");
      return;
    }
    console.log("  ❌ FAILED TO FETCH ROUTES:", routesResponse);
    return;
  }

  const routes = ((await routesResponse.json()) as any).data as RoutePair[];

  if (routes.length === 0) {
    console.log("  ⚠️ NO ROUTES FOUND");

    return;
  }

  console.log("  ✅ FOUND", routes.length, "ROUTES");

  for (const date of dates) {
    console.log("--------");
    console.log("  📅 CHECKING WITH DATE:", date);

    for (const route of routes) {
      console.log(
        "  📌 CHECKING ITINERARIES FOR",
        route.origen.nombre,
        "->",
        route.destino.nombre
      );

      const itinerariesResponse = await fetch(
        `${URL}/Itinerary/itinerarios-por-ruta/${route.origen.id}/${route.destino.id}/${date}`,
        {
          headers: {
            Authorization: `Bearer ${TOKEN}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (itinerariesResponse.status !== 200) {
        if (itinerariesResponse.status === 404) {
          console.log("    ⚠️ NO ITINERARIES FOUND");
          continue;
        }
        console.log("    ❌ FAILED TO FETCH ITINERARIES", itinerariesResponse);
        continue;
      }
      const itineraries = ((await itinerariesResponse.json()) as any)
        .data as any[];

      if (itineraries.length === 0) {
        console.log("    ⚠️ NO ITINERARIES FOUND");
        continue;
      }

      console.log("    ✅ FOUND", itineraries.length, "ITINERARIES");

      for (const itinerary of itineraries) {
        const asientos = itinerary.asientos;
        let precios = new Set<number>();

        for (const asiento of asientos) {
          precios.add(asiento.precio);
        }

        console.log("    📌 ITINERARY", itinerary.id);
        console.log("      ℹ️ INFO");
        console.log("         SERVICE:", itinerary.nombre);
        console.log("         FARE:", Array.from(precios).join(", "));

        info[date] = info[date] || [];

        info[date].push({
          origin: {
            id: route.origen.id,
            name: route.origen.nombre,
          },
          destination: {
            id: route.destino.id,
            name: route.destino.nombre,
          },
          departureTime: itinerary.horaSalida,
          service: itinerary.nombre,
          fares: {
            firstFloor: Array.from(precios)
              .filter((price) => price > 0)
              .join(", "),
          },
          seatsWithZeroPrice: Array.from(precios)
            .filter((price) => price === 0)
            .join(", "),
        });
      }
    }
  }

  console.log("---------------------------------------------");
  console.log("EXPORTING DATA...");

  const xlsxBuffer = exportToXlsxBuffer(info);
  const excelFileName = `./exports/jaksa-itinerarios-${startDate.format(
    "YYYY-MM-DD"
  )}-${endDate.format("YYYY-MM-DD")}.xlsx`;
  const archivo = Bun.file(excelFileName);
  await Bun.write(archivo, xlsxBuffer);

  console.log("✅ DATA EXPORTED TO", excelFileName);
}

export default { runner, checkConfig, ready: true };
