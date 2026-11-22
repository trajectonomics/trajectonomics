import { describe, expect, test } from "bun:test"
import { join } from "node:path"
import { checkComponent, checkModule } from "../src/lib/guard"

// The Svelte 5 guard over every component and Svelte module of the app. A failure prints each issue with
// its file, line, rule and the form to write instead. The rules are in src/lib/guard/.
const ROOT = join(import.meta.dir, "..")
const COMPONENTS = [
	...new Bun.Glob("src/**/*.svelte").scanSync({ cwd: ROOT }),
	...new Bun.Glob("src/**/*.svelte.ts").scanSync({ cwd: ROOT }),
]
	.filter((file) => !file.endsWith(".test.ts"))
	.sort()

// Plain modules are held to the boundaries too, so a forbidden call cannot hide in a helper. The
// guard's own rules name the patterns they refuse, and tests and fixtures quote bad examples.
const MODULES = [...new Bun.Glob("src/**/*.ts").scanSync({ cwd: ROOT })]
	.filter((file) => !file.endsWith(".svelte.ts") && !file.startsWith("src/lib/guard/"))
	.filter((file) => !file.endsWith(".test.ts") && !file.endsWith(".test-support.ts"))
	.sort()

describe("the Svelte 5 guard, over every component", () => {
	test("covers the layout, the shared components and the Svelte modules", () => {
		for (const file of [
			"src/routes/+layout.svelte",
			"src/components/ui/Money.svelte",
			"src/client/preferences.svelte.ts",
		]) {
			expect(COMPONENTS).toContain(file)
		}
	})

	test("every component passes: Svelte 5 syntax, TypeScript, the size limit and the browser boundary", async () => {
		const problems: string[] = []
		for (const file of COMPONENTS) {
			const source = await Bun.file(join(ROOT, file)).text()
			for (const issue of checkComponent(source, file)) {
				problems.push(`${file}:${issue.line} [${issue.rule}] ${issue.message}`)
			}
		}
		expect(problems).toEqual([])
	})

	test("every plain module passes: no store, no React or Astro, no browser call outside src/client", async () => {
		const problems: string[] = []
		for (const file of MODULES) {
			const source = await Bun.file(join(ROOT, file)).text()
			for (const issue of checkModule(source, file)) {
				problems.push(`${file}:${issue.line} [${issue.rule}] ${issue.message}`)
			}
		}
		expect(MODULES).toContain("src/lib/view/loader.ts")
		expect(problems).toEqual([])
	})
})
