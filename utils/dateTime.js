const DEFAULT_APP_TIME_ZONE = process.env.APP_TIMEZONE || 'America/Sao_Paulo';

const LOCAL_DATE_TIME_PATTERN = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{1,3}))?)?$/;
const EXPLICIT_TIME_ZONE_PATTERN = /(Z|[+-]\d{2}:\d{2})$/i;

function parseTimeZoneOffsetMinutes(offsetLabel) {
  const match = String(offsetLabel || '').match(/GMT([+-])(\d{2})(?::?(\d{2}))?/i);

  if (!match) {
    throw new Error(`Unsupported timezone offset label: ${offsetLabel}`);
  }

  const sign = match[1] === '-' ? -1 : 1;
  const hours = parseInt(match[2], 10);
  const minutes = parseInt(match[3] || '0', 10);

  return sign * ((hours * 60) + minutes);
}

function getTimeZoneOffsetMinutes(timeZone, date) {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    timeZoneName: 'longOffset',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });

  const timeZoneNamePart = formatter.formatToParts(date).find((part) => part.type === 'timeZoneName');

  if (!timeZoneNamePart?.value) {
    throw new Error(`Unable to resolve timezone offset for ${timeZone}`);
  }

  return parseTimeZoneOffsetMinutes(timeZoneNamePart.value);
}

function parseNaiveDateTimeInTimeZone(value, timeZone = DEFAULT_APP_TIME_ZONE) {
  const match = String(value || '').trim().match(LOCAL_DATE_TIME_PATTERN);

  if (!match) {
    throw new Error(`Invalid local datetime: ${value}`);
  }

  const [, year, month, day, hour, minute, second = '0', millisecond = '0'] = match;
  const normalizedMillisecond = millisecond.padEnd(3, '0');
  const utcTimestamp = Date.UTC(
    parseInt(year, 10),
    parseInt(month, 10) - 1,
    parseInt(day, 10),
    parseInt(hour, 10),
    parseInt(minute, 10),
    parseInt(second, 10),
    parseInt(normalizedMillisecond, 10)
  );

  const initialOffsetMinutes = getTimeZoneOffsetMinutes(timeZone, new Date(utcTimestamp));
  let resolvedDate = new Date(utcTimestamp - (initialOffsetMinutes * 60 * 1000));
  const resolvedOffsetMinutes = getTimeZoneOffsetMinutes(timeZone, resolvedDate);

  if (resolvedOffsetMinutes !== initialOffsetMinutes) {
    resolvedDate = new Date(utcTimestamp - (resolvedOffsetMinutes * 60 * 1000));
  }

  return resolvedDate;
}

function parseDateTimeInput(value, options = {}) {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) {
      throw new Error('Invalid datetime value');
    }

    return new Date(value.getTime());
  }

  const normalizedValue = String(value).trim();

  if (!normalizedValue) {
    return null;
  }

  if (LOCAL_DATE_TIME_PATTERN.test(normalizedValue) && !EXPLICIT_TIME_ZONE_PATTERN.test(normalizedValue)) {
    return parseNaiveDateTimeInTimeZone(normalizedValue, options.timeZone || DEFAULT_APP_TIME_ZONE);
  }

  const parsedDate = new Date(normalizedValue);

  if (Number.isNaN(parsedDate.getTime())) {
    throw new Error(`Invalid datetime value: ${value}`);
  }

  return parsedDate;
}

module.exports = {
  DEFAULT_APP_TIME_ZONE,
  parseDateTimeInput,
  parseNaiveDateTimeInTimeZone
};
