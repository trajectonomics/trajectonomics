import { DOCS_BASE_PATH } from "../tabs"

/** One file of the built Docs Portal, at a path relative to the Worker's assets root (`dist/`). */
export interface BuiltFile {
	readonly path: string
	readonly content: string
}

/** A portal file's path relative to the Worker's assets root. */
export function portalAsset(relative: string): string {
	const dir = DOCS_BASE_PATH.replace(/^\//, "")
	const file = relative.replace(/^\//, "")
	return dir.length === 0 ? file : `${dir}/${file}`
}

/** The slug of a built `index.html` below the Docs Portal's base, or `undefined` for another file. */
export function builtPageSlug(path: string): string | undefined {
	const dir = DOCS_BASE_PATH.replace(/^\//, "")
	const rest =
		dir.length === 0 ? path : path.startsWith(`${dir}/`) ? path.slice(dir.length + 1) : undefined
	if (rest === undefined) return undefined
	if (rest === "index.html") return ""
	if (!rest.endsWith("/index.html")) return undefined
	return rest.slice(0, -"index.html".length).replace(/\/$/, "")
}

/** The file at one assets-root-relative path, or `undefined` when the build produced none. */
export function fileAt(files: readonly BuiltFile[], path: string): BuiltFile | undefined {
	return files.find((file) => file.path === path)
}
