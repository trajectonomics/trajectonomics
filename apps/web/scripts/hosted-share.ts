import { readdir, readFile, writeFile } from "node:fs/promises"
import { dirname, join, resolve } from "node:path"
import { fileURLToPath } from "node:url"

/** The marker line `src/app.html` holds where the hosted Demo's share tags go. */
const MARKER = "<!-- hosted:share -->"

/**
 * The share tags of the hosted Demo: what a chat app shows for a pasted link. There is no `og:url`, because every page
 * shares this one block, so a fixed URL would be wrong for all but one of them.
 */
const SHARE_TAGS: readonly string[] = [
	'<meta property="og:type" content="website" />',
	'<meta property="og:site_name" content="Trajectonomics" />',
	'<meta property="og:title" content="Demo dashboard · Trajectonomics" />',
	`<meta property="og:description" content="A fictional household's plan in the Trajectonomics Dashboard: net worth, cash flow, tax and chance of success, every figure computed by traj." />`,
	'<meta property="og:image" content="https://trajectonomics.com/og/en.png" />',
	'<meta property="og:image:width" content="1200" />',
	'<meta property="og:image:height" content="630" />',
	'<meta property="og:image:type" content="image/png" />',
	'<meta property="og:image:alt" content="Trajectonomics" />',
	'<meta name="twitter:card" content="summary_large_image" />',
]

/** The Dashboard's folder: this script's own folder's parent. */
const APP = resolve(dirname(fileURLToPath(import.meta.url)), "..")

/**
 * The page with its `<!-- hosted:share -->` line replaced by the share tags, each at the marker's own indentation. A
 * page without the marker, or with two, is an error: the hosted build would ship a link with no card or with two.
 */
export function withShareTags(html: string): string {
	const lines = html.split("\n")
	const marked = lines.flatMap((line, index) => (line.trim() === MARKER ? [index] : []))
	if (marked.length === 0) throw new Error(`the ${MARKER} marker is missing`)
	if (marked.length > 1)
		throw new Error(`the ${MARKER} marker appears ${marked.length} times, not once`)
	const index = marked[0]!
	const marker = lines[index]!
	const indent = marker.slice(0, marker.indexOf(MARKER))
	lines.splice(index, 1, ...SHARE_TAGS.map((tag) => `${indent}${tag}`))
	return lines.join("\n")
}

/** Every `.html` file under a folder, each by its path. */
async function htmlFiles(root: string): Promise<string[]> {
	const entries = await readdir(root, { recursive: true, withFileTypes: true })
	return entries
		.filter((entry) => entry.isFile() && entry.name.endsWith(".html"))
		.map((entry) => join(entry.parentPath, entry.name))
}

// The hosted build's post-build step: it writes the share tags into every page it wrote. Run as a script only.
if (import.meta.main) {
	const root = resolve(APP, process.env["TRAJ_WEB_OUT"] ?? "dist-hosted")
	try {
		const files = await htmlFiles(root)
		if (files.length === 0) throw new Error(`no .html files under ${root}`)
		for (const file of files) {
			try {
				await writeFile(file, withShareTags(await readFile(file, "utf8")))
			} catch (error) {
				const reason = error instanceof Error ? error.message : String(error)
				throw new Error(`${file}: ${reason}`)
			}
		}
		console.log(`wrote the share tags into ${files.length} hosted pages`)
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error)
		console.error(`The hosted Demo's share tags were not written: ${message}`)
		process.exit(1)
	}
}
