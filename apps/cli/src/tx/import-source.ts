import type { AppError } from "../errors"
import { readUtf8Source } from "../text-source"

/** The CSV's text, read as UTF-8 or refused (see `readUtf8Source`). */
export function readSource(ref: string, stdin: () => Promise<string>): Promise<string | AppError> {
	return readUtf8Source(ref, stdin, "Save the CSV as UTF-8 and retry.")
}
