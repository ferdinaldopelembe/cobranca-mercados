export function formatMT(value) {
  const n = Number(value) || 0;
  return n.toLocaleString("pt-MZ", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }) + " MT";
}

export function formatDate(date) {
  const d = new Date(date);
  return d.toLocaleDateString("pt-MZ", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export function formatDateTime(date) {
  const d = new Date(date);
  return d.toLocaleString("pt-MZ", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

export function formatPercent(value) {
  const n = Number(value) || 0;
  const sign = n > 0 ? "+" : "";
  return `${sign}${n.toFixed(1)}%`;
}