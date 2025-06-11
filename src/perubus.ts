import moment from "moment";
import { exportToXlsxBuffer, type FormattedData } from "./utils";
import { Builder, parseStringPromise } from "xml2js";

const builder = new Builder({
  xmldec: { version: "1.0", encoding: "UTF-8" },
  renderOpts: { pretty: true },
});

const template = {
  "soapenv:Envelope": {
    $: {
      "xmlns:soapenv": "http://schemas.xmlsoap.org/soap/envelope/",
      "xmlns:tem": "http://tempuri.org/",
    },
    "soapenv:Header": {
      "tem:SecuTokenWS": {
        "tem:UserName": process.env.PERUBUS_USERNAME as string,
        "tem:Password": process.env.PERUBUS_PASSWORD as string,
        "tem:AuthenticationToken": "?",
      },
    },
    "soapenv:Body": {},
  },
};

export async function runner(startDate: moment.Moment, endDate: moment.Moment) {
  const BASE_URL = process.env.PERUBUS_BASE_URL as string;
  let dates = [];
  let dateiterator = startDate.clone();
  while (dateiterator.isSameOrBefore(endDate)) {
    dates.push(dateiterator.format("DD/MM/YYYY"));
    dateiterator.add(1, "days");
  }

  let info: FormattedData = {};

  console.log("📌 GENERATING TOKEN");
  const prepayload = { ...template };
  prepayload["soapenv:Envelope"]["soapenv:Body"] = {
    "tem:Login": {},
  };

  const payload = builder.buildObject(prepayload);

  const tokenResponse = await fetch(BASE_URL, {
    method: "POST",
    body: payload,
    headers: {
      "Content-Type": "text/xml",
    },
  });

  if (tokenResponse.status !== 200) {
    console.log("  ❌ FAILED TO GENERATE TOKEN:", tokenResponse);
    return;
  }

  const tokenText = await tokenResponse.text();

  const tokenParsed = await parseStringPromise(tokenText);

  const token =
    tokenParsed["soap:Envelope"]["soap:Body"][0]["LoginResponse"][0][
      "LoginResult"
    ][0];

  console.log("✅ TOKEN GENERATED");

  const signedTemplate = { ...template };
  signedTemplate["soapenv:Envelope"]["soapenv:Header"]["tem:SecuTokenWS"][
    "tem:Password"
  ] = "?";
  signedTemplate["soapenv:Envelope"]["soapenv:Header"]["tem:SecuTokenWS"][
    "tem:UserName"
  ] = "?";
  signedTemplate["soapenv:Envelope"]["soapenv:Header"]["tem:SecuTokenWS"][
    "tem:AuthenticationToken"
  ] = token;

  console.log("📌 CHECKING DEPARTURES");

  const prepayloadDep = { ...signedTemplate };
  prepayloadDep["soapenv:Envelope"]["soapenv:Body"] = {
    "tem:getOrigen": {},
  };
  const payloadDep = builder.buildObject(prepayloadDep);

  const departureResponse = await fetch(BASE_URL, {
    method: "POST",
    body: payloadDep,
    headers: {
      "Content-Type": "text/xml",
    },
  });

  if (departureResponse.status !== 200) {
    console.log(
      "  ❌ FAILED TO FETCH DEPARTURES:",
      payloadDep,
      departureResponse
    );
    return;
  }

  const departureText = await departureResponse.text();

  const departureParsed = await parseStringPromise(departureText);

  const departureData = JSON.parse(
    departureParsed["soap:Envelope"]["soap:Body"][0]["getOrigenResponse"][0][
      "getOrigenResult"
    ]
  ) as {
    localidadOrigenID: number;
    denominacion: string;
  }[];

  console.log("  ✅ FOUND", departureData.length, "DEPARTURES");

  for (const departure of departureData) {
    console.log("  📌 CHECKING ARRIVALS FOR", departure.denominacion);

    const prepayloadArr = { ...signedTemplate };
    prepayloadArr["soapenv:Envelope"]["soapenv:Body"] = {
      "tem:getDestino": {
        "tem:origen": departure.denominacion,
      },
    };
    const payloadArr = builder.buildObject(prepayloadArr);

    const arrivalResponse = await fetch(BASE_URL, {
      method: "POST",
      body: payloadArr,
      headers: {
        "Content-Type": "text/xml",
      },
    });

    if (arrivalResponse.status !== 200) {
      console.log(
        "  ❌ FAILED TO FETCH ARRIVALS:",
        payloadArr,
        arrivalResponse
      );
      continue;
    }

    const arrivalText = await arrivalResponse.text();

    const arrivalParsed = await parseStringPromise(arrivalText);

    const arrivalData = JSON.parse(
      arrivalParsed["soap:Envelope"]["soap:Body"][0]["getDestinoResponse"][0][
        "getDestinoResult"
      ][0]
    ) as {
      localidadDestinoID: number;
      denominacion: string;
    }[];

    if (arrivalData.length === 0) {
      console.log("  ❌ NO ARRIVALS FOUND");
      continue;
    }

    console.log("  ✅ FOUND", arrivalData.length, "ARRIVALS");

    for (const arrival of arrivalData) {
      console.log(
        "    📌 CHECKING ITINERARIES FOR",
        departure.denominacion,
        "->",
        arrival.denominacion
      );

      for (const date of dates) {
        console.log("    📅 CHECKING WITH DATE:", date);

        const prepayloadIti = { ...signedTemplate };
        prepayloadIti["soapenv:Envelope"]["soapenv:Body"] = {
          "tem:getItinerario": {
            "tem:fechaPartida": date,
            "tem:fechaRetorno": "",
            "tem:origen": departure.denominacion,
            "tem:destino": arrival.denominacion,
          },
        };

        const payloadIti = builder.buildObject(prepayloadIti);

        const itineraryResponse = await fetch(BASE_URL, {
          method: "POST",
          body: payloadIti,
          headers: {
            "Content-Type": "text/xml",
          },
        });

        if (itineraryResponse.status !== 200) {
          console.log(
            "    ❌ FAILED TO FETCH ITINERARY:",
            payloadIti,
            itineraryResponse
          );
          continue;
        }

        const itineraryText = await itineraryResponse.text();

        const itineraryParsed = await parseStringPromise(itineraryText);

        const itineraryData = JSON.parse(
          itineraryParsed["soap:Envelope"]["soap:Body"][0][
            "getItinerarioResponse"
          ][0]["getItinerarioResult"][0]
        );

        if (
          !itineraryParsed["soap:Envelope"]["soap:Body"][0][
            "getItinerarioResponse"
          ]
        ) {
          console.log("    ❌ NO ITINERARIES FOUND");
          continue;
        }

        console.log("    ✅ FOUND", itineraryData.length, "ITINERARIES");

        for (const itinerary of itineraryData) {
          console.log("    📌 ITINERARY:", itinerary.itinerarioID);

          console.log("       ℹ️  INFO");
          console.log("          SERVICE: " + itinerary.servicio);
          console.log("          FARE: " + itinerary.tarifa);

          const sheetDate = moment(date, "DD/MM/YYYY").format("YYYY-MM-DD");

          info[sheetDate] = info[sheetDate] || [];

          info[sheetDate].push({
            origin: {
              id: itinerary.origenID,
              name: itinerary.Origen,
            },
            destination: {
              id: itinerary.destinoID,
              name: itinerary.Destino,
            },
            service: itinerary.servicio,
            fares: {
              firstFloor: itinerary.tarifa,
            },
            departureTime: itinerary.horaPartida,
          });
        }
      }
    }
  }

  console.log("EXPORTING DATA...");

  const xlsxBuffer = exportToXlsxBuffer(info);
  const excelFileName = `./exports/perubus-itinerarios-${startDate.format(
    "YYYY-MM-DD"
  )}-${endDate.format("YYYY-MM-DD")}.xlsx`;
  const archivo = Bun.file(excelFileName);
  await Bun.write(archivo, xlsxBuffer);

  console.log("✅ DATA EXPORTED TO", excelFileName);
}
