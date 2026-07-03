function escapeCell(value) {
  const text = value === null || value === undefined ? "" : String(value);

  if (/[",\n]/.test(text)) {
    return `"${text.replaceAll('"', '""')}"`;
  }

  return text;
}

export function toCsv(rows) {
  if (!rows.length) return "";

  const headers = Object.keys(rows[0]);
  const lines = [headers.map(escapeCell).join(",")];

  for (const row of rows) {
    lines.push(headers.map((header) => escapeCell(row[header])).join(","));
  }

  return `${lines.join("\n")}\n`;
}
