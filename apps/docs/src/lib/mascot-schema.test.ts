import { describe, expect, test } from "bun:test"
import { existsSync } from "node:fs"
import { join, resolve } from "node:path"
import { MASCOT_POSES, mascotUrl, PAGE_MASCOT_POSES } from "./mascot"
import { pageMascotSchema } from "./mascot-schema"

const APP_DIR = resolve(import.meta.dir, "../..")

describe("the docs pages' mascot frontmatter", () => {
	test("accepts each pose a docs page may draw", () => {
		for (const pose of PAGE_MASCOT_POSES) {
			expect(pageMascotSchema.safeParse(pose).success, pose).toBe(true)
		}
	})

	test("accepts a page with no mascot, so most pages stay without one", () => {
		expect(pageMascotSchema.safeParse(undefined).success).toBe(true)
	})

	test("rejects an unknown pose, so a typo never draws nothing", () => {
		const result = pageMascotSchema.safeParse("dance")
		expect(result.success).toBe(false)
	})
})

describe("the Mascot's files", () => {
	test("every pose the Portal draws is a WebP in public/mascot", () => {
		const missing = MASCOT_POSES.filter(
			(pose) => !existsSync(join(APP_DIR, "public/mascot", `${pose}.webp`)),
		)
		expect(missing).toEqual([])
	})

	test("every pose is served under the Portal's own base", () => {
		for (const pose of MASCOT_POSES) {
			expect(mascotUrl(pose)).toBe(`/docs/mascot/${pose}.webp`)
		}
	})
})
