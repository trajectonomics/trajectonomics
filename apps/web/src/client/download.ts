// The one module of the Reports page that writes a file or prints. The text it saves is built in
// `src/lib/view/reports/`; this module only hands it to the browser.
import type { ReportFile } from "../lib/view/reports/files"
import { preferences } from "./preferences.svelte.js"

/** Whether the person has already confirmed a download of figures while amounts are hidden, for this visit. */
let figuresConfirmed = false

/**
 * Writes a report file to the person's downloads. While amounts are hidden the file holds figures, so the
 * first download of the visit asks once. Returns false when the person declines.
 */
export function saveFile(file: ReportFile): boolean {
	if (preferences.hidden && !figuresConfirmed) {
		if (
			!window.confirm("Amounts are hidden on this page. The file holds the amounts. Download it?")
		) {
			return false
		}
		figuresConfirmed = true
	}
	const url = URL.createObjectURL(new Blob([file.text], { type: file.type }))
	const link = document.createElement("a")
	link.href = url
	link.download = file.name
	document.body.append(link)
	link.click()
	link.remove()
	setTimeout(() => URL.revokeObjectURL(url), 1000)
	return true
}

/** Opens the browser's print dialog for this page. The print stylesheet decides what is printed. */
export function printPage(): void {
	window.print()
}
