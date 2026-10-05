import moment from 'moment';
import 'moment/locale/de';
import 'moment/locale/en-gb';
import 'moment/locale/vi';

export const SHORT_DATE_FORMAT = 'DD/MM/YYYY';
export const SHORT_DATE_FORMAT_ISO = 'YYYY-MM-DD';
export const DATE_FORMATS = ['D/MM/YYYY', 'DD/M/YYYY', 'D/M/YYYY', 'D/MM/YY', 'DD/M/YY', 'D/M/YY'];
export const shortDateFormat = (timeUtc: number | string, addition = 0) => {
  return timeUtc ? moment.utc(timeUtc).add(addition).local().format(SHORT_DATE_FORMAT) : '-/-';
};

export const DATE_ISO_STRING_FORMAT = 'YYYY-MM-DDTHH:mm:ss.SSS[Z]';

const getDaysToNow = (date: string | number, now: string | number): number => {
  const date1 = new Date(now).getTime();
  const date2 = new Date(date).getTime();
  const diffTime = Math.abs(date1 - date2);
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

export const DATE_TIME_FROM_NOW_FORMAT = 'DD/MM/YYYY HH:mm';

export const relativeTimeFormat = (timeUtc: number | string, addition = 0, locale: string) => {
  const language = locale.split('-')[0];
  const time = moment.utc(timeUtc).add(addition, 'seconds').local().locale(['en', 'de', 'vi'].includes(language) ? language : 'en');
  return time.fromNow();
};

export const dateTimeFormat = (timeUtc: number | string, addition = 0) =>
  moment.utc(timeUtc).add(addition).local().format(DATE_TIME_FROM_NOW_FORMAT);

