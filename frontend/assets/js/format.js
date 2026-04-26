export const calcMethodLabels = {
  per_unit: "По потреблению",
  per_area: "По площади",
  per_person: "По жильцам",
  fixed: "Фиксировано",
  manual: "Вручную",
};

export function money(value) {
  return Number(value || 0).toLocaleString("ru-RU", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  });
}

export function numberValue(value) {
  return Number(value || 0).toLocaleString("ru-RU", {
    maximumFractionDigits: 2,
  });
}

export function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
