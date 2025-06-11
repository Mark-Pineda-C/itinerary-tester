import moment from "moment";
import { exporter, exportToXlsxBuffer, type FormattedData } from "./utils";

type RoutePair = {
  sourceName: string;
  sourceId: number;
  destinationName: string;
  destinationId: number;
};

export async function runner(startDate: moment.Moment, endDate: moment.Moment) {
  const BASE_URL = process.env.IFAC_BASE_URL;
  let dates = [];
  let dateiterator = startDate.clone();
  while (dateiterator.isSameOrBefore(endDate)) {
    dates.push(dateiterator.format("YYYY-MM-DD"));
    dateiterator.add(1, "days");
  }

  let info: FormattedData = {};

  console.log("📌 CHECKING ROUTES");

  let routeList = [];

  const response = await fetch(`${BASE_URL}/SourceDestinationPairs`);

  if (response.status !== 200) {
    console.log("  ❌ FAILED TO FETCH ROUTE LIST:", response);
    return;
  }
  const pariData = await response.json();
  routeList = pariData as RoutePair[];

  if (routeList.length === 0) {
    console.log("  ⚠️  NO ROUTES FOUND");
    return;
  }

  console.log("  ✅ FOUND", routeList.length, "ROUTES");

  for (const date of dates) {
    console.log("  📅 CHECKING WITH DATE:", date);

    for (const route of routeList) {
      console.log(
        "  📌 ITINERARIES FOR",
        route.sourceName,
        "->",
        route.destinationName
      );

      const response = await fetch(
        `${BASE_URL}/RouteListing/${route.sourceId}/${route.destinationId}/${date}`
      );

      if (response.status !== 200) {
        console.log("    ❌ FAILED TO FETCH ITINERARIES");

        continue;
      }

      const itineraries = await response.json();
      if ((itineraries as any).length === 0) {
        console.log("    ⚠️  NO ITINERARIES FOUND");

        continue;
      }
      console.log("    ✅ FOUND", (itineraries as any).length, "ITINERARIES");

      for (const itinerary of itineraries as any) {
        console.log("    📌 ITINERARY", itinerary.journeyId);
        console.log("      ℹ️  INFO");
        console.log("         SERVICE:", itinerary.service);
        console.log("         FARE:", itinerary.fare);

        info[date] = info[date] || [];

        info[date].push({
          origin: {
            id: route.sourceId,
            name: route.sourceName,
          },
          destination: {
            id: route.destinationId,
            name: route.destinationName,
          },
          departureTime: moment(itinerary.boardingPoints.arrivalTime).format(
            "HH:mm"
          ),
          service: itinerary.service,
          fares: {
            firstFloor: itinerary.fare,
          },
        });
      }
    }
  }

  console.log("---------------------------------------------");
  console.log("EXPORTING DATA...");

  const xlsxBuffer = exportToXlsxBuffer(info);
  const excelFileName = `./exports/ifac-itinerarios-${startDate.format(
    "YYYY-MM-DD"
  )}-${endDate.format("YYYY-MM-DD")}.xlsx`;
  const archivo = Bun.file(excelFileName);
  await Bun.write(archivo, xlsxBuffer);

  console.log("✅ DATA EXPORTED TO", excelFileName);
}
