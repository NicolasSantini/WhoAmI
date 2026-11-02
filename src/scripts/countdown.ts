const DAY = 86_400_000;

function daysUntil(isoDate: string) {
  const [year, month, day] = isoDate.split('-').map(Number);
  const now = new Date();
  return Math.round(
    (Date.UTC(year, month - 1, day) - Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())) /
      DAY,
  );
}

function label(days: number, approximate: boolean) {
  if (days < 0) return 'Risultato in arrivo';
  if (days === 0) return 'Oggi';
  if (days === 1) return 'Domani';
  return `${approximate ? 'Circa ' : ''}${days} giorni`;
}

for (const element of document.querySelectorAll<HTMLElement>('[data-countdown]')) {
  const { countdown = '', approximate } = element.dataset;
  element.textContent = label(daysUntil(countdown), approximate !== undefined);
  element.hidden = false;
}
