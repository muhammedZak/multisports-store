import { SeedValidationError } from './seed.utils.js';

const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

function readZonedParts(date, timeZone) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);

  return Object.fromEntries(
    parts
      .filter((part) => part.type !== 'literal')
      .map((part) => [part.type, Number(part.value)]),
  );
}

function toIsoDate({ year, month, day }) {
  return [year, month, day]
    .map((value, index) => String(value).padStart(index === 0 ? 4 : 2, '0'))
    .join('-');
}

function parseAnchorDate(value) {
  const match = value.match(DATE_PATTERN);

  if (!match) {
    throw new SeedValidationError(
      'DEMO_SEED_ANCHOR_DATE_INVALID',
      'DEMO_SEED_ANCHOR_DATE must use YYYY-MM-DD format.',
    );
  }

  const parts = {
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3]),
  };

  const roundTrip = new Date(
    Date.UTC(parts.year, parts.month - 1, parts.day),
  );

  if (
    roundTrip.getUTCFullYear() !== parts.year ||
    roundTrip.getUTCMonth() + 1 !== parts.month ||
    roundTrip.getUTCDate() !== parts.day
  ) {
    throw new SeedValidationError(
      'DEMO_SEED_ANCHOR_DATE_INVALID',
      'DEMO_SEED_ANCHOR_DATE must be a real calendar date.',
    );
  }

  return parts;
}

function localPartsToUtc(parts, timeZone) {
  const targetMilliseconds = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second,
    parts.millisecond,
  );

  let result = new Date(targetMilliseconds);

  for (let iteration = 0; iteration < 3; iteration += 1) {
    const observed = readZonedParts(result, timeZone);
    const observedMilliseconds = Date.UTC(
      observed.year,
      observed.month - 1,
      observed.day,
      observed.hour,
      observed.minute,
      observed.second,
      parts.millisecond,
    );

    result = new Date(result.getTime() + targetMilliseconds - observedMilliseconds);
  }

  const confirmed = readZonedParts(result, timeZone);

  if (
    confirmed.year !== parts.year ||
    confirmed.month !== parts.month ||
    confirmed.day !== parts.day ||
    confirmed.hour !== parts.hour ||
    confirmed.minute !== parts.minute ||
    confirmed.second !== parts.second
  ) {
    throw new SeedValidationError(
      'DEMO_SEED_LOCAL_TIME_INVALID',
      'The requested local scenario time does not exist in APP_TIMEZONE.',
    );
  }

  return result;
}

export function createSeedClock({
  anchorDate,
  timeZone = 'Asia/Kolkata',
  now = new Date(),
} = {}) {
  const currentParts = readZonedParts(now, timeZone);
  const anchorParts = anchorDate
    ? parseAnchorDate(anchorDate)
    : {
        year: currentParts.year,
        month: currentParts.month,
        day: currentParts.day,
      };

  function localDateTime({
    year,
    month,
    day,
    hour = 12,
    minute = 0,
    second = 0,
    millisecond = 0,
  }) {
    return localPartsToUtc(
      { year, month, day, hour, minute, second, millisecond },
      timeZone,
    );
  }

  function shiftedCalendarDate({ days = 0, months = 0 }) {
    const totalMonths =
      anchorParts.year * 12 + (anchorParts.month - 1) - months;
    const targetYear = Math.floor(totalMonths / 12);
    const targetMonthIndex = ((totalMonths % 12) + 12) % 12;
    const lastTargetDay = new Date(
      Date.UTC(targetYear, targetMonthIndex + 1, 0),
    ).getUTCDate();
    const value = new Date(
      Date.UTC(
        targetYear,
        targetMonthIndex,
        Math.min(anchorParts.day, lastTargetDay),
      ),
    );

    value.setUTCDate(value.getUTCDate() - days);

    return localDateTime({
      year: value.getUTCFullYear(),
      month: value.getUTCMonth() + 1,
      day: value.getUTCDate(),
    });
  }

  const anchorMilliseconds = localDateTime({
    ...anchorParts,
    hour: 12,
  }).getTime();

  return Object.freeze({
    timeZone,
    anchorDate: toIsoDate(anchorParts),
    get anchorTime() {
      return new Date(anchorMilliseconds);
    },
    localDateTime,
    atLocalTime(
      date,
      { hour = 12, minute = 0, second = 0, millisecond = 0 } = {},
    ) {
      if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
        throw new TypeError('atLocalTime requires a valid Date.');
      }

      const parts = readZonedParts(date, timeZone);

      return localDateTime({
        year: parts.year,
        month: parts.month,
        day: parts.day,
        hour,
        minute,
        second,
        millisecond,
      });
    },
    daysAgo(days) {
      if (!Number.isInteger(days) || days < 0) {
        throw new TypeError('daysAgo requires a non-negative integer.');
      }

      return shiftedCalendarDate({ days });
    },
    daysAfter(days) {
      if (!Number.isInteger(days) || days < 0) {
        throw new TypeError('daysAfter requires a non-negative integer.');
      }

      return shiftedCalendarDate({ days: -days });
    },
    monthsAgo(months) {
      if (!Number.isInteger(months) || months < 0) {
        throw new TypeError('monthsAgo requires a non-negative integer.');
      }

      return shiftedCalendarDate({ months });
    },
    orderedTimestamps(
      count,
      {
        start = new Date(anchorMilliseconds),
        stepMilliseconds = 1000,
      } = {},
    ) {
      if (!Number.isInteger(count) || count < 0) {
        throw new TypeError('orderedTimestamps count must be non-negative.');
      }

      if (!Number.isInteger(stepMilliseconds) || stepMilliseconds <= 0) {
        throw new TypeError('orderedTimestamps step must be positive.');
      }

      return Array.from(
        { length: count },
        (_, index) => new Date(start.getTime() + index * stepMilliseconds),
      );
    },
  });
}
