import { DOCS_BASE_PATH } from "../tabs"

/** One file of the built Docs Portal, at a path relative to the Worker's assets root (`dist/`). */
export interface BuiltFile {
	readonly path: string
	readonly content: string
}

/**
 * A public Portal path or an assets-relative path, as the file's path under the Worker's assets
 * root. `assets.base_path` maps `/docs/...` to the root of `dist/`, so the base is not a directory
 * in the build (ADR 0017).
 */
export function portalAsset(path: string): string {
	const pathname = path.startsWith("/") ? path : `/${path}`
	const relative =
		DOCS_BASE_PATH.length > 0 &&
		(pathname === DOCS_BASE_PATH || pathname.startsWith(`${DOCS_BASE_PATH}/`))
			? pathname.slice(DOCS_BASE_PATH.length)
			: pathname
	return relative.replace(/^\/+/, "")
}

/** The slug of a built `index.html`, or `undefined` for another file. The Landing Page's slug is empty. */
export function builtPageSlug(path: string): string | undefined {
	const file = portalAsset(path)
	if (file === "index.html") return ""
	if (!file.endsWith("/index.html")) return undefined
	return file.slice(0, -"index.html".length).replace(/\/$/, "")
}

/** The file at one assets-root-relative path, or `undefined` when the build produced none. */
export function fileAt(files: readonly BuiltFile[], path: string): BuiltFile | undefined {
	return files.find((file) => file.path === path)
}
