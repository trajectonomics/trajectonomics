import { describe, expect, it } from "bun:test"
import { readBuildFiles } from "../../scripts/adapters/build-files"
import { readDesignTokens } from "../../scripts/adapters/design-tokens"
import { checkBuild } from "../../src/lib/build/check-build"
import { buildMode } from "../../src/lib/build/mode"

/** The Worker's assets root, which the build writes and this scan reads. */
const BUILD_ROOT = "dist"

/** The mode the build was made in; a scan named with no mode judges a production build. */
const MODE = buildMode(process.env["SITE_BUILD_MODE"])

describe("the built Site", () => {
	it("is at dist/, so a skipped build cannot look green", async () => {
		expect(await readBuildFiles(BUILD_ROOT)).toBeDefined()
	})

	it("passes every built-file rule in the build's mode", async () => {
		const files = await readBuildFiles(BUILD_ROOT)
		if (files === undefined) {
			throw new Error(`${BUILD_ROOT}/ is missing: run \`bun run build:preview\` first.`)
		}
		expect(checkBuild(files, await readDesignTokens(), MODE)).toEqual([])
	})
})
