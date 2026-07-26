export function toISODate(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function buildWeek(centerDate = new Date(), daysBefore = 1, daysAfter = 5) {
  const days: { date: Date; iso: string; label: string; dayNum: number; isToday: boolean }[] = [];
  const todayISO = toISODate(new Date());
  for (let offset = -daysBefore; offset <= daysAfter; offset++) {
    const d = new Date(centerDate);
    d.setDate(d.getDate() + offset);
    const iso = toISODate(d);
    days.push({
      date: d,
      iso,
      label: d.toLocaleDateString(undefined, { weekday: 'short' }),
      dayNum: d.getDate(),
      isToday: iso === todayISO,
    });
  }
  return days;
}
