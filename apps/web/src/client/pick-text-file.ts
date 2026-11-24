import { IMPORT_MAX_BYTES } from "../lib/view/import-values/parse"

/** What choosing a file gave: its name and text, or why it was not read. Null when no file was chosen. */
export type PickedText = { name: string; text: string } | { problem: string } | null

/**
 * Reads the text of the file an input holds, then empties the input so the same file can be chosen again.
 * The file is read here, in the browser, and goes nowhere: the page parses it and `traj` is the only writer.
 */
export async function readPickedText(input: HTMLInputElement): Promise<PickedText> {
	const file = input.files?.[0]
	input.value = ""
	if (file === undefined) return null
	if (file.size > IMPORT_MAX_BYTES) {
		return {
			problem: `${file.name} is too large to import. Import a smaller range of dates at a time.`,
		}
	}
	try {
		return { name: file.name, text: await file.text() }
	} catch {
		return { problem: `${file.name} could not be read.` }
	}
}
