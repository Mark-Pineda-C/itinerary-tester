import * as XLSX from "xlsx";

// Configurar el soporte para fs en XLSX
import * as fs from "fs";
XLSX.set_fs(fs);

export const exporter = XLSX;

export type FormattedData = Record<
  string,
  {
    origin: {
      id: number;
      name: string;
    };
    destination: {
      id: number;
      name: string;
    };
    departureTime: string;
    service: string;
    fares: {
      firstFloor: string;
      secondFloor?: string;
    };
    seatsWithZeroPrice?: string;
  }[]
>;

export function exportToXlsxBuffer(info: FormattedData) {
  // Inicializar nuevo archivo Excel
  const workbook = XLSX.utils.book_new();

  // Crear una hoja para cada fecha
  for (const [date, itineraries] of Object.entries(info)) {
    if (itineraries.length === 0) continue;

    // Crear encabezados
    const headers = [
      "Origen ID",
      "Origen",
      "Destino ID",
      "Destino",
      "Hora Salida",
      "Servicio",
      "Tarifas Primer Piso",
      "Tarifas Segundo Piso",
      "Asientos Precio Cero",
    ];

    // Crear filas de datos
    const rows = itineraries.map((itinerary) => [
      itinerary.origin.id,
      itinerary.origin.name,
      itinerary.destination.id,
      itinerary.destination.name,
      itinerary.departureTime,
      itinerary.service,
      itinerary.fares.firstFloor,
      itinerary.fares.secondFloor || "",
      itinerary.seatsWithZeroPrice || "",
    ]);

    // Combinar encabezados y datos
    const sheetData = [headers, ...rows];

    // Crear worksheet y agregarlo al workbook
    const worksheet = XLSX.utils.aoa_to_sheet(sheetData);
    XLSX.utils.book_append_sheet(workbook, worksheet, date);
  }

  const xlsxBuffer = XLSX.write(workbook, {
    type: "buffer",
    bookType: "xlsx",
  });

  return xlsxBuffer;
}
