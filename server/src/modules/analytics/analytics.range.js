import { env } from '../../config/env.js';

const formatterCache = new Map();

function getDateTimeFormatter(timezone) {
  if (!formatterCache.has(timezone)) {
    formatterCache.set(
      timezone,
      new Intl.DateTimeFormat('en-US-u-ca-gregory-nu-latn', {
        timeZone: timezone,

        year: 'numeric',
        month: '2-digit',
        day: '2-digit',

        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',

        hourCycle: 'h23',
      }),
    );
  }

  return formatterCache.get(timezone);
}

function getZonedDateTimeParts(date, timezone) {
  const formatter = getDateTimeFormatter(timezone);

  const parts = Object.fromEntries(
    formatter
      .formatToParts(date)
      .filter((part) => part.type !== 'literal')
      .map((part) => [part.type, part.value]),
  );

  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),

    hour: Number(parts.hour),
    minute: Number(parts.minute),
    second: Number(parts.second),
  };
}

function getTimezoneOffsetMilliseconds(date, timezone) {
  const parts = getZonedDateTimeParts(date, timezone);

  const localPartsRepresentedAsUtc = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second,
  );

  const dateWithoutMilliseconds = Math.floor(date.getTime() / 1000) * 1000;

  return localPartsRepresentedAsUtc - dateWithoutMilliseconds;
}

function zonedCalendarStartToUtc({ year, month, day }, timezone) {
  /*
   * First represent the desired local midnight as if
   * it were UTC, then subtract the timezone offset.
   *
   * The second offset check keeps this helper safe for
   * IANA zones whose offset can change around DST.
   */
  const wallClockMilliseconds = Date.UTC(year, month - 1, day, 0, 0, 0, 0);

  let candidate = new Date(wallClockMilliseconds);

  const firstOffset = getTimezoneOffsetMilliseconds(candidate, timezone);

  candidate = new Date(wallClockMilliseconds - firstOffset);

  const correctedOffset = getTimezoneOffsetMilliseconds(candidate, timezone);

  if (correctedOffset !== firstOffset) {
    candidate = new Date(wallClockMilliseconds - correctedOffset);
  }

  return candidate;
}

function shiftCalendarDays({ year, month, day }, amount) {
  const date = new Date(Date.UTC(year, month - 1, day));

  date.setUTCDate(date.getUTCDate() + amount);

  return {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate(),
  };
}

function padNumber(value) {
  return String(value).padStart(2, '0');
}

function createDayPeriod({ year, month, day }) {
  return `${year}-${padNumber(month)}-${padNumber(day)}`;
}

function createMonthPeriod({ year, month }) {
  return `${year}-${padNumber(month)}`;
}

export function resolveAnalyticsRange(rangeKey, now = new Date()) {
  const timezone = env.appTimezone;

  const current = getZonedDateTimeParts(now, timezone);

  const currentCalendar = {
    year: current.year,
    month: current.month,
    day: current.day,
  };

  let startCalendar;
  let bucket;

  if (rangeKey === '7d') {
    startCalendar = shiftCalendarDays(currentCalendar, -6);

    bucket = 'day';
  } else if (rangeKey === '30d') {
    startCalendar = shiftCalendarDays(currentCalendar, -29);

    bucket = 'day';
  } else if (rangeKey === 'month') {
    startCalendar = {
      year: current.year,
      month: current.month,
      day: 1,
    };

    bucket = 'day';
  } else {
    startCalendar = {
      year: current.year,
      month: 1,
      day: 1,
    };

    bucket = 'month';
  }

  return {
    key: rangeKey,

    startAt: zonedCalendarStartToUtc(startCalendar, timezone),

    endAt: new Date(now.getTime()),

    timezone,
    bucket,
  };
}

export function createAnalyticsBucketKeys({
  startAt,
  endAt,
  timezone,
  bucket,
}) {
  const start = getZonedDateTimeParts(startAt, timezone);

  const end = getZonedDateTimeParts(endAt, timezone);

  if (bucket === 'month') {
    const periods = [];

    let year = start.year;
    let month = start.month;

    while (year < end.year || (year === end.year && month <= end.month)) {
      periods.push(
        createMonthPeriod({
          year,
          month,
        }),
      );

      month += 1;

      if (month === 13) {
        month = 1;
        year += 1;
      }
    }

    return periods;
  }

  const periods = [];

  const cursor = new Date(Date.UTC(start.year, start.month - 1, start.day));

  const endMarker = Date.UTC(end.year, end.month - 1, end.day);

  while (cursor.getTime() <= endMarker) {
    periods.push(
      createDayPeriod({
        year: cursor.getUTCFullYear(),
        month: cursor.getUTCMonth() + 1,
        day: cursor.getUTCDate(),
      }),
    );

    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  return periods;
}
