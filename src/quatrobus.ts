import moment from "moment";
import { randomBytes } from "node:crypto";
import { exportToXlsxBuffer, type FormattedData } from "./utils";

function generateCID() {
  const longitud = 20;
  const caracteres =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  const bytes = randomBytes(longitud);
  let resultado = "";
  for (let i = 0; i < longitud; i++) {
    // Add null check to handle potential undefined bytes
    const byte = bytes[i];
    if (byte !== undefined) {
      resultado += caracteres[byte % caracteres.length];
    }
  }
  return resultado;
}

export async function runner(startDate: moment.Moment, endDate: moment.Moment) {
  const BASE_URL = process.env.QUATROBUS_BASE_URL;
  const U_NAME = process.env.QUATROBUS_USERNAME as string;
  const U_PASSWORD = process.env.QUATROBUS_PASSWORD as string;

  let dates = [];
  let dateiterator = startDate.clone();
  while (dateiterator.isSameOrBefore(endDate)) {
    dates.push(dateiterator.format("YYYY-MM-DD"));
    dateiterator.add(1, "days");
  }

  let info: FormattedData = {};

  console.log("📌 CHECKING DEPARTURES");

  const departureForm = new FormData();

  departureForm.append("U_NAME", U_NAME);
  departureForm.append("U_PASSWORD", U_PASSWORD);
  departureForm.append("CID", generateCID());

  const departureResponse = await fetch(`${BASE_URL}/getDepartures`, {
    method: "POST",
    body: departureForm,
  });

  if (departureResponse.status !== 200) {
    console.log("  ❌ FAILED TO FETCH DEPARTURES");
    return;
  }

  const departureData = (await departureResponse.json()) as any;

  if (departureData.code === 443) {
    console.log("  ❌ FAILED TO FETCH DEPARTURES");

    return;
  }

  console.log("  ✅ FOUND", departureData.data.length, "DEPARTURES");

  for (const departure of departureData.data) {
    console.log("  📌 CHECKING ARRIVALS FOR", departure.name);

    const routeForm = new FormData();

    routeForm.append("U_NAME", U_NAME);
    routeForm.append("U_PASSWORD", U_PASSWORD);
    routeForm.append("CID", generateCID());
    routeForm.append("ID_DEPARTURE", departure.id);

    const routeResponse = await fetch(`${BASE_URL}/getArrivals`, {
      method: "POST",
      body: routeForm,
    });

    if (routeResponse.status !== 200) {
      console.log("  ❌ FAILED TO FETCH ARRIVALS");
      return;
    }

    const arrivalData = (await routeResponse.json()) as any;

    if (arrivalData.code === 443) {
      console.log("  ❌ FAILED TO FETCH ARRIVALS");
      return;
    }

    console.log("  ✅ FOUND", arrivalData.data.length, "ARRIVALS");

    for (const arrival of arrivalData.data) {
      console.log(
        "    📌 CHECKING ITINERARIES FOR",
        departure.label,
        "->",
        arrival.label
      );

      for (const date of dates) {
        console.log("    📅 CHECKING WITH DATE:", date);

        const itineraryForm = new FormData();

        itineraryForm.append("U_NAME", U_NAME);
        itineraryForm.append("U_PASSWORD", U_PASSWORD);
        itineraryForm.append("CID", generateCID());
        itineraryForm.append("ID_DEPARTURE", departure.id);
        itineraryForm.append("ID_ARRIVAL", arrival.id);
        itineraryForm.append("DATE_DEPARTURE", date);

        const itineraryResponse = await fetch(`${BASE_URL}/getTravels`, {
          method: "POST",
          body: itineraryForm,
        });

        if (itineraryResponse.status !== 200) {
          console.log("    ❌ FAILED TO FETCH ITINERARIES");
        }

        const itineraryData = (await itineraryResponse.json()) as any;

        if (itineraryData.code === 443) {
          console.log("    ❌ FAILED TO FETCH ITINERARIES");
          return;
        }

        if (itineraryData.data.ow.length === 0) {
          console.log("    ⚠️  NO ITINERARIES FOUND");
          continue;
        }

        console.log(
          "    ✅ FOUND",
          itineraryData.data.ow.length,
          "ITINERARIES"
        );

        for (const itinerary of itineraryData.data.ow) {
          const precios = new Set<number>();

          let firstFloor = "";
          let secondFloor = "";

          for (const fare of itinerary.fare) {
            for (const price of fare.price) {
              precios.add(price.price);
              if (price.name === "1er Piso") {
                firstFloor = price.price;
              }
              if (price.name === "2do Piso") {
                secondFloor = price.price;
              }
            }
          }

          console.log("      📌 ITINERARY", itinerary.id);
          console.log("         ℹ️  INFO");
          console.log("            SERVICE: " + itinerary.travelService);
          console.log("            FARE: " + Array.from(precios).join(", "));

          info[date] = info[date] || [];

          info[date].push({
            origin: {
              id: departure.id,
              name: departure.label,
            },
            destination: {
              id: arrival.id,
              name: arrival.label,
            },
            departureTime: moment(itinerary.travelDateReal).format("HH:mm"),
            service: itinerary.travelService,
            fares: {
              firstFloor: firstFloor,
              secondFloor: secondFloor,
            },
          });
        }
      }
    }
  }

  console.log("---------------------------------------------");
  console.log("EXPORTING DATA...");

  const xlsxBuffer = exportToXlsxBuffer(info);
  const excelFileName = `./exports/quatrobus-itinerarios-${startDate.format(
    "YYYY-MM-DD"
  )}-${endDate.format("YYYY-MM-DD")}.xlsx`;
  const archivo = Bun.file(excelFileName);
  await Bun.write(archivo, xlsxBuffer);

  console.log("✅ DATA EXPORTED TO", excelFileName);
}
