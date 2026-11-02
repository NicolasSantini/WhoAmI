const monthFormat = new Intl.DateTimeFormat('it-IT', { month: 'short', year: 'numeric' });

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
