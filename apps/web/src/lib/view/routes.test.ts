import { describe, expect, test } from "bun:test"
import { existsSync, readFileSync } from "node:fs"
import { join } from "node:path"
import { ROUTES } from "./routes"

const SRC = join(import.meta.dir, "../..")

describe("the navigation's routes", () => {
	test("every route in the navigation has a page file that mounts its island", () => {
		for (const route of ROUTES) {
			const file = join(SRC, "pages", route.path === "/" ? "" : route.path, "index.astro")
			expect(existsSync(file), `${route.path} has a page file`).toBe(true)
			const source = readFileSync(file, "utf8")
			expect(source, `${route.path} imports ${route.page}`).toContain(route.page)
			expect(source, `${route.path} mounts ${route.page} with client:load`).toMatch(
				new RegExp(`<${route.page}[^>]*client:load`),
			)
		}
	})

	test("every page island exists as a component file", () => {
		for (const route of ROUTES) {
			const file = join(SRC, "components/pages", `${route.page}.tsx`)
			expect(existsSync(file), `${route.page} exists`).toBe(true)
		}
	})

	test("the eight pages are in navigation order, with unique paths", () => {
		expect(ROUTES.map((route) => route.path)).toEqual([
			"/",
			"/net-worth/",
			"/ledger/",
			"/projection/",
			"/fi/",
			"/compare/",
			"/tax/",
			"/health/",
		])
		expect(new Set(ROUTES.map((route) => route.path)).size).toBe(ROUTES.length)
	})
})
