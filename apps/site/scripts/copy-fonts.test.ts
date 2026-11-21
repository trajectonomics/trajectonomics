import { describe, expect, it } from "bun:test"
import { mkdtemp, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { copyBrandFonts } from "./copy-fonts"

const FACES = ["aleo-latin-300.woff2", "aleo-latin-400.woff2", "azeret-mono-latin-500.woff2"]

describe("the Brand Typeface copy step", () => {
	it("copies the three faces the Site draws with, at their published sizes", async () => {
		const destination = await mkdtemp(join(tmpdir(), "site-fonts-"))
		try {
			expect(await copyBrandFonts(destination)).toEqual(FACES)
			const sizes = await Promise.all(
				FACES.map(async (face) => Bun.file(join(destination, face)).size),
			)
			expect(sizes).toEqual([14_900, 14_848, 10_884])
		} finally {
			await rm(destination, { recursive: true, force: true })
		}
	})

	it("fails loudly when the package ships no such file", async () => {
		const destination = await mkdtemp(join(tmpdir(), "site-fonts-"))
		try {
			await expect(copyBrandFonts(destination, destination)).rejects.toThrow(/missing/)
		} finally {
			await rm(destination, { recursive: true, force: true })
		}
	})
})
