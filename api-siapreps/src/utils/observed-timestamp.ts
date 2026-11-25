const ISO_DATE_TIME_WITH_ZONE =
  /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d{1,3})?(Z|([+-])(\d{2}):(\d{2}))$/i;
export const OBSERVED_TIMESTAMP_FUTURE_TOLERANCE_MS = 5 * 60 * 1000;

export function parseObservedTimestamp(
  value: unknown,
  now: Date = new Date(),
): Date {
  if (typeof value !== "string") {
    throw new Error("Timestamp deve ser ISO-8601 date-time com timezone explícito");
  }

  const parts = ISO_DATE_TIME_WITH_ZONE.exec(value);
  if (!parts) {
    throw new Error("Timestamp deve ser ISO-8601 date-time com timezone explícito");
  }

  const [, yearText, monthText, dayText, hourText, minuteText, secondText, zone, , offsetHourText, offsetMinuteText] = parts;
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const hour = Number(hourText);
  const minute = Number(minuteText);
  const second = Number(secondText);
  const offsetHour = Number(offsetHourText ?? 0);
  const offsetMinute = Number(offsetMinuteText ?? 0);
  const leapYear = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const daysInMonth = [31, leapYear ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  if (
    month < 1 || month > 12 || day < 1 || day > daysInMonth[month - 1] ||
    hour > 23 || minute > 59 || second > 59 || offsetHour > 14 ||
    offsetMinute > 59 || (offsetHour === 14 && offsetMinute !== 0) ||
    (zone.toUpperCase() === "Z" && (offsetHour !== 0 || offsetMinute !== 0))
  ) {
    throw new Error("Timestamp observado inválido");
  }

  const milliseconds = Date.parse(value);
  if (!Number.isFinite(milliseconds) || milliseconds < 0) {
    throw new Error("Timestamp observado inválido");
  }

  if (milliseconds > now.getTime() + OBSERVED_TIMESTAMP_FUTURE_TOLERANCE_MS) {
    throw new Error("Timestamp observado excede a tolerância de 5 minutos no futuro");
  }

  return new Date(milliseconds);
}

export function timestampObservadoSchema(Joi: typeof import("joi")) {
  return Joi.string().custom((value, helpers) => {
    try {
      parseObservedTimestamp(value);
      return value;
    } catch {
      return helpers.error("date.base");
    }
  }).messages({ "date.base": "timestamp observado deve ser ISO-8601 válido, com timezone e no máximo 5 minutos no futuro" });
}
