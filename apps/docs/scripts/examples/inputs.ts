import { constants } from "node:fs"
import { access, readdir, stat } from "node:fs/promises"
import { join, resolve } from "node:path"
import { CONTENT_ROOT, type ContentFile, PAGE_EXTENSIONS } from "../../src/lib/content-pages"

/** The folder of pages the examples run for, relative to the content root. */
export const EXAMPLES_FOLDER = "cli"

/** The binary `--traj` names, resolved, or undefined when the argument is missing or not runnable. */
export async function trajArgument(argv: readonly string[]): Promise<string | undefined> {
	const index = argv.indexOf("--traj")
	const value = index === -1 ? undefined : argv[index + 1]
	if (value === undefined || value.startsWith("--")) {
		return undefined
	}
	const path = resolve(value)
	try {
		const info = await stat(path)
		await access(path, constants.X_OK)
		return info.isFile() ? path : undefined
	} catch {
		return undefined
	}
}

/** Every page under the `cli` folder, sorted by path, read into memory. */
export async function examplePages(): Promise<readonly ContentFile[]> {
	const entries = await readdir(join(CONTENT_ROOT, EXAMPLES_FOLDER), { recursive: true })
	const paths = entries
		.filter((entry) => PAGE_EXTENSIONS.some((extension) => entry.endsWith(extension)))
		.map((entry) => `${EXAMPLES_FOLDER}/${entry}`)
		.sort()
	return Promise.all(
		paths.map(async (path) => ({
			path,
			content: await Bun.file(join(CONTENT_ROOT, path)).text(),
		})),
	)
}
