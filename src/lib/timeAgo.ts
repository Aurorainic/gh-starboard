export function timeAgo(date: string, language: string, justNowText: string) {
  if (!date) return justNowText;
  const now = Date.now();
  const pushed = new Date(date).getTime();
  if (isNaN(pushed)) return justNowText;
  const diff = now - pushed;
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const months = Math.floor(days / 30);
  const years = Math.floor(days / 365);

  const rtf = new Intl.RelativeTimeFormat(language, {
    numeric: "always",
    style: "narrow",
  });

  if (minutes < 1) return justNowText;
  if (hours < 1) return rtf.format(-minutes, "minute");
  if (days < 1) return rtf.format(-hours, "hour");
  if (months < 1) return rtf.format(-days, "day");
  if (years < 1) return rtf.format(-months, "month");
  return rtf.format(-years, "year");
}
