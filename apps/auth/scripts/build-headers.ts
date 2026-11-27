/**
 * Fills `dist-site/_headers` with the hash of every inline script and style the build emitted.
 *
 * Workers static assets apply `_headers` to every asset. Astro writes the page HTML with its
 * scripts and styles already in place, so the hashes are read from the built pages, never from a
 * list a person maintains: a new inline script is hashed on the next build, and the policy cannot
 * drift from the pages. Run by `bun run build`, after `astro build`.
 */
import { readdirSync, readFileSync, writeFileSync } from "node:fs"
import { join, resolve } from "node:path"
import {
	fillHeadersTemplate,
	hashSource,
	inlineScripts,
	inlineStyles,
	sortedSources,
} from "../src/core/security-headers"

const output = resolve(process.cwd(), "dist-site")

/** Every built page, so a page that adds a script cannot hide from the hash list. */
function pages(directory: string): readonly string[] {
	return readdirSync(directory, { recursive: true, encoding: "utf8" })
		.filter((file) => file.endsWith(".html"))
		.map((file) => join(directory, file))
}

const html = pages(output).map((file) => readFileSync(file, "utf8"))
if (html.length === 0) throw new Error("build-headers: no page was built")

const scriptHashes = sortedSources(
	await Promise.all(html.flatMap((page) => inlineScripts(page)).map(hashSource)),
)
const styleHashes = sortedSources(
	await Promise.all(html.flatMap((page) => inlineStyles(page)).map(hashSource)),
)

const templateFile = join(output, "_headers")
const template = readFileSync(templateFile, "utf8")
writeFileSync(templateFile, fillHeadersTemplate(template, scriptHashes, styleHashes))

console.log(
	`build-headers: ${html.length} pages, ${scriptHashes.length} inline scripts, ${styleHashes.length} inline styles`,
)
