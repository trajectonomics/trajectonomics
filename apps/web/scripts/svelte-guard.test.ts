import { describe, expect, test } from "bun:test"
import { join } from "node:path"
import { checkComponent } from "../src/lib/guard"

// The Svelte 5 guard over every component and Svelte module of the app. A failure prints each issue with
// its file, line, rule and the form to write instead. The rules are in src/lib/guard/.
const ROOT = join(import.meta.dir, "..")
const COMPONENTS = [
	...new Bun.Glob("src/**/*.svelte").scanSync({ cwd: ROOT }),
	...new Bun.Glob("src/**/*.svelte.ts").scanSync({ cwd: ROOT }),
].sort()

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
})
