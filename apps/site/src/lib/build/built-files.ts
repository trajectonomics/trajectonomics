/** One file of the built Site, at a path relative to the Worker's assets root (`dist/`). */
export interface BuiltFile {
	readonly path: string
	readonly content: string
}

/** The file at one assets-root-relative path, or `undefined` when the build produced none. */
export function fileAt(files: readonly BuiltFile[], path: string): BuiltFile | undefined {
	return files.find((file) => file.path === path)
}

/**
 * Every page the build produced, whatever its Language: the files the page checks judge. A Locale
 * URL, and the Not-found page of each, are pages like any other ([ADR 0003]).
 */
export function builtPages(files: readonly BuiltFile[]): readonly BuiltFile[] {
	return files.filter((file) => file.path.endsWith(".html"))
}
