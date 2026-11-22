import { readdir } from "node:fs/promises"
import { join } from "node:path"
import type { BuiltFile } from "../src/lib/build/failures"

/** The files whose text a check reads; everything else is checked by its path alone. */
const TEXT_FILE = /\.html$/

/** Every file under the build root, with its path relative to the root and its text when it is read. */
export async function readBuiltFiles(root: string): Promise<readonly BuiltFile[]> {
	const paths = await readdir(root, { recursive: true, withFileTypes: true })
	const files = paths.filter((entry) => entry.isFile())
	return Promise.all(
		files.map(async (entry) => {
			const absolute = join(entry.parentPath, entry.name)
			const path = absolute.slice(root.length + 1).replaceAll("\\", "/")
			return TEXT_FILE.test(path) ? { path, text: await Bun.file(absolute).text() } : { path }
		}),
	)
}
