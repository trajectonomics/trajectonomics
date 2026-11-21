import { readdirSync } from "node:fs"
import { fileURLToPath } from "node:url"

/** The folder that holds one directory per brand: `brands/<name>/`. */
export const BRANDS_DIRECTORY: string = fileURLToPath(new URL("../brands/", import.meta.url))

/**
 * The brand names: one per directory in `brands/`, sorted.
 * Adding a brand means adding its folder; nothing is registered by hand.
 */
export function brands(directory: string = BRANDS_DIRECTORY): readonly string[] {
	return Object.freeze(
		readdirSync(directory, { withFileTypes: true })
			.filter((entry) => entry.isDirectory())
			.map((entry) => entry.name)
			.sort(),
	)
}
