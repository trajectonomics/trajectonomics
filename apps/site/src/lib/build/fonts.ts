import type { BuiltFile } from "./built-files"
import type { BuildFailure } from "./failures"
import { buildFailure } from "./failures"

/** The font formats a page could download instead of drawing words with the visitor's fonts. */
const FONT_FILE = /\.(?:woff2?|ttf|otf|eot)$/i

/** A `@font-face` rule is how a stylesheet asks the browser to download a font. */
const FONT_FACE = /@font-face\b/i

function failure(code: "FONT_FILE_PRESENT" | "FONT_FACE_PRESENT", file: BuiltFile): BuildFailure {
	const what = code === "FONT_FILE_PRESENT" ? "ships a font file" : "declares a font face"
	return buildFailure(code, file.path, `${what}; the Site draws Thai from the visitor's own fonts.`)
}

/** The Site downloads no font, so Thai type is a system stack ([ADR 0003]). */
export function checkNoDownloadedFonts(files: readonly BuiltFile[]): readonly BuildFailure[] {
	return files.flatMap((file) => [
		...(FONT_FILE.test(file.path) ? [failure("FONT_FILE_PRESENT", file)] : []),
		...(FONT_FACE.test(file.content) ? [failure("FONT_FACE_PRESENT", file)] : []),
	])
}
