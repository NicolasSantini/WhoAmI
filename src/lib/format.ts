const monthFormat = new Intl.DateTimeFormat('it-IT', { month: 'short', year: 'numeric' });
const dateFormat = new Intl.DateTimeFormat('it-IT', { dateStyle: 'long', timeZone: 'UTC' });

export const formatDate = (date: Date) => dateFormat.format(date);

export const formatNumber = (value: number, decimals = 0) =>
  value.toLocaleString('it-IT', { maximumFractionDigits: decimals });

// "1:50:00" reads as "1:50": a race time known only to the minute.
export const formatTime = (value: string) => value.replace(/^(\d+:\d{2}):00$/, '$1');

export function formatMonth(value: string): string {
  const [year, month] = value.split('-').map(Number);
  return monthFormat.format(new Date(year, month - 1, 1));
}

export function formatRange(start: string, end?: string): string {
  if (end === start) return formatMonth(start);
  return `${formatMonth(start)} – ${end ? formatMonth(end) : 'oggi'}`;
}

// HTML entities keep the mailto link working without JavaScript and hide it from naive scrapers.
export function encodeEntities(value: string): string {
  return [...value].map((char) => `&#${char.codePointAt(0)};`).join('');
}
