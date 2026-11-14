import { type AssetGraph, walkAssets } from "./asset-graph"
import { sameOriginPath } from "./asset-url"
import type { BuiltFile } from "./built-files"
import { scanHtml } from "./html"
import { parseAttributes } from "./html-tag"
import { staticImportPaths } from "./module-graph"

const SCRIPT = /<script\b([^>]*)>([\s\S]*?)<\/script>/gi
const JSON_LD = /\bapplication\/ld\+json\b/i

/** The text a page runs itself, the script files it loads, and the scripts the build did not produce. */
export interface PageScripts extends AssetGraph {
	readonly inline: readonly string[]
}

/** The inline text and same-origin sources a page names, before their imports are followed. */
interface PageScriptElements {
	readonly inline: readonly string[]
	readonly sources: readonly string[]
}

/** The text or the same-origin source one `<script>` names; neither for a data block. */
interface ScriptElement {
	readonly inline: string | null
	readonly source: string | null
}

/** What one `<script>` element contributes: its text, or the file it loads, or nothing. */
function scriptOf(page: BuiltFile, match: RegExpMatchArray): ScriptElement {
	const attributes = parseAttributes(match[1] ?? "")
	if (JSON_LD.test(attributes["type"] ?? "")) return { inline: null, source: null }
	const src = attributes["src"]
	if (src === undefined) return { inline: match[2] ?? "", source: null }
	return { inline: null, source: sameOriginPath(page.path, src) ?? null }
}

/** The inline text and same-origin sources each `<script>` names, leaving out data blocks. */
function scriptsOf(page: BuiltFile): PageScriptElements {
	const inline: string[] = []
	const sources: string[] = []
	for (const match of page.content.matchAll(SCRIPT)) {
		const element = scriptOf(page, match)
		if (element.inline !== null) inline.push(element.inline)
		if (element.source !== null) sources.push(element.source)
	}
	return { inline, sources }
}

/** The href of a link that preloads a script or a module, or `undefined` for any other link. */
function preloadOf(
	page: BuiltFile,
	attributes: Readonly<Record<string, string>>,
): string | undefined {
	const rel = (attributes["rel"] ?? "").toLowerCase()
	const as = (attributes["as"] ?? "").toLowerCase()
	const loadsScript = /\bmodulepreload\b/.test(rel) || (/\bpreload\b/.test(rel) && as === "script")
	const href = attributes["href"]
	return loadsScript && href !== undefined ? sameOriginPath(page.path, href) : undefined
}

/** The same-origin sources the page's script and module preloads name. */
function preloadsOf(page: BuiltFile): readonly string[] {
	return scanHtml(page.content).elements.flatMap((element) => {
		const path = preloadOf(page, element.attributes)
		return path === undefined ? [] : [path]
	})
}

/** The same-origin files one script names in its static imports and re-exports. */
function importsOf(fromPath: string, script: string): readonly string[] {
	return staticImportPaths(script).flatMap((specifier) => {
		const path = sameOriginPath(fromPath, specifier)
		return path === undefined ? [] : [path]
	})
}

/** Every script file a page runs, each once, plus the same-origin ones the build did not produce. */
export function pageScripts(files: readonly BuiltFile[], page: BuiltFile): PageScripts {
	const { inline, sources } = scriptsOf(page)
	const queue = [
		...sources,
		...preloadsOf(page),
		...inline.flatMap((text) => importsOf(page.path, text)),
	]
	const graph = walkAssets(files, queue, (file) => importsOf(file.path, file.content))
	return Object.freeze({ inline: Object.freeze(inline), ...graph })
}
