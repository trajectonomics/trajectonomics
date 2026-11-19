import type { ImagePixels } from "./image-pixels"

/** One file of the built Site, at a path relative to the Worker's assets root (`dist/`). */
export interface BuiltFile {
	readonly path: string
	readonly content: string
	/** The file's byte length on disk, so a check can measure a binary the scan does not read as text. */
	readonly bytes?: number
	/** The size an image states in its own header, which the adapter reads and no scan reads as text. */
	readonly pixels?: ImagePixels
}

/** The file at one assets-root-relative path, or `undefined` when the build produced none. */
export function fileAt(files: readonly BuiltFile[], path: string): BuiltFile | undefined {
	return files.find((file) => file.path === path)
}

/** The byte length of a built file, from the disk size when the scan read it as binary. */
export function fileBytes(file: BuiltFile): number {
	return file.bytes ?? new TextEncoder().encode(file.content).length
}

/**
 * Every page the build produced, whatever its Language: the files the page checks judge. A Locale
 * URL, and the Not-found page of each, are pages like any other ([ADR 0003]).
 */
export function builtPages(files: readonly BuiltFile[]): readonly BuiltFile[] {
	return files.filter((file) => file.path.endsWith(".html"))
}
