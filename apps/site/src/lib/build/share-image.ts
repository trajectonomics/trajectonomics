import { LANGUAGES } from "../language/languages"
import { OPENJOT_LANGUAGES } from "../language/openjot-dictionary"
import { SHARE_IMAGE_HEIGHT, SHARE_IMAGE_WIDTH } from "../social/layout"
import { openJotShareImagePath, shareImagePath } from "../social/share-advert"
import { SHARE_IMAGE_MAX_BYTES } from "../social/share-image"
import { type BuiltFile, fileAt, fileBytes } from "./built-files"
import type { BuildFailure } from "./failures"
import { buildFailure } from "./failures"

/** The size a card states, for a message that names the size the image must be. */
const CARD_SIZE = `${SHARE_IMAGE_WIDTH} × ${SHARE_IMAGE_HEIGHT}`

/** One card the build must write: its file, and the page it advertises. */
interface CardFile {
	readonly path: string
	readonly page: string
}

/** Every share image the build writes: the home's, and the OpenJot page's, in each Language. */
function cardFiles(): readonly CardFile[] {
	return [
		...LANGUAGES.map((entry) => ({
			path: shareImagePath(entry.language),
			page: `${entry.language} home`,
		})),
		...OPENJOT_LANGUAGES.map((entry) => ({
			path: openJotShareImagePath(entry.language),
			page: `${entry.language} OpenJot page`,
		})),
	]
}

/** The size an image is, in the words a failure names it with. */
function describeSize(pixels: BuiltFile["pixels"]): string {
	return pixels === undefined ? "no size" : `${pixels.width} × ${pixels.height}`
}

/** One card: in the build, at the card's size, and light enough for a crawler. */
function failuresOf(files: readonly BuiltFile[], card: CardFile): readonly BuildFailure[] {
	const file = fileAt(files, card.path)
	if (file === undefined) {
		return [
			buildFailure(
				"SHARE_IMAGE_MISSING",
				card.path,
				`the build writes no ${card.path}, so a share of the ${card.page} renders a bare card.`,
			),
		]
	}
	if (file.pixels === undefined) {
		return [
			buildFailure(
				"SHARE_IMAGE_NOT_PNG",
				card.path,
				"is not a PNG, so no share sheet can read its size.",
			),
		]
	}
	const failures: BuildFailure[] = []
	if (file.pixels.width !== SHARE_IMAGE_WIDTH || file.pixels.height !== SHARE_IMAGE_HEIGHT) {
		failures.push(
			buildFailure(
				"SHARE_IMAGE_SIZE_WRONG",
				card.path,
				`is ${describeSize(file.pixels)}, not the ${CARD_SIZE} a large card is cut at.`,
			),
		)
	}
	const bytes = fileBytes(file)
	if (bytes > SHARE_IMAGE_MAX_BYTES) {
		failures.push(
			buildFailure(
				"SHARE_IMAGE_TOO_HEAVY",
				card.path,
				`weighs ${bytes} bytes, over the ${SHARE_IMAGE_MAX_BYTES} a crawler fetches.`,
			),
		)
	}
	return failures
}

/** Every page's share image is in the build, at the card's own size, and light enough. */
export function checkShareImage(files: readonly BuiltFile[]): readonly BuildFailure[] {
	return cardFiles().flatMap((card) => failuresOf(files, card))
}
