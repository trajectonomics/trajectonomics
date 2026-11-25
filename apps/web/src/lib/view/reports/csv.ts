import type { ReportRecord, ReportTable } from "./table"

/** The byte-order mark that starts the file, so a spreadsheet reads it as UTF-8 (the Thai text in it). */
export const BYTE_ORDER_MARK = "﻿"

/**
 * One field as RFC 4180 writes it: quoted when it holds a comma, a double quote or a line break, and also when
 * it starts or ends in a space, which a spreadsheet would otherwise trim. The text is never guarded against a
 * formula: a cell is exactly what the Snapshot holds (see "Report" in the GLOSSARY).
 */
export function csvField(text: string): string {
	return /[",\r\n]/.test(text) || text !== text.trim() ? `"${text.replaceAll('"', '""')}"` : text
}

/**
 * The CSV text of a list of records: a header row of the given field names, then one row per record,
 * each cell the record's string. Lines end in CRLF (RFC 4180), and the text starts with a byte-order mark.
 */
export function csvText(fields: readonly string[], records: readonly ReportRecord[]): string {
	const lines = [fields, ...records.map((record) => fields.map((field) => record[field] ?? ""))]
	return `${BYTE_ORDER_MARK}${lines.map((line) => line.map(csvField).join(",")).join("\r\n")}\r\n`
}

/**
 * The CSV of a table with its hidden columns left out. A hidden column is not in the header and not in any row.
 */
export function tableCsv(table: ReportTable, hidden: readonly string[]): string {
	const fields = table.columns.map((column) => column.key).filter((key) => !hidden.includes(key))
	return csvText(fields, table.records)
}
