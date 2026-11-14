/** One file of the built Site, at a path relative to the Worker's assets root (`dist/`). */
export interface BuiltFile {
	readonly path: string
	readonly content: string
}

/** Both pages the router mounts, at their paths in the assets root. */
export const PAGE_PATHS = ["index.html", "404.html"] as const

/** The file at one assets-root-relative path, or `undefined` when the build produced none. */
export function fileAt(files: readonly BuiltFile[], path: string): BuiltFile | undefined {
	return files.find((file) => file.path === path)
}

/** The built pages the router mounts, and only those: the pages the page checks judge. */
export function builtPages(files: readonly BuiltFile[]): readonly BuiltFile[] {
	return PAGE_PATHS.flatMap((path) => {
		const page = fileAt(files, path)
		return page === undefined ? [] : [page]
	})
}
