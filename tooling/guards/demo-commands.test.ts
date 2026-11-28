import { describe, expect, it } from "bun:test"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import type { SourceReader } from "./command-tree"
import { demoCommandProblem } from "./demo-commands"

const ROOT = join(import.meta.dir, "..", "..")

/** The Site's own source, where it declares the commands its demo prints. */
const SITE_SOURCE = readFileSync(join(ROOT, "apps/site/src/lib/site.ts"), "utf8")

/** The real CLI's source, as the walker reads it out of this repository. */
const read: SourceReader = (path) => {
	try {
		return readFileSync(join(ROOT, path), "utf8")
	} catch {
		return undefined
	}
}

/** A reader over one test's inline fixtures, and nothing else. */
const readerOf =
	(files: Record<string, string>): SourceReader =>
	(path) =>
		files[path]

/** The strings of the const the Site declares under `name`, read out of its source as text. */
const siteCommandsOf = (name: string): readonly string[] => {
	const start = SITE_SOURCE.indexOf(`export const ${name}`)
	const end = SITE_SOURCE.indexOf("\nexport ", start + 1)
	const body = SITE_SOURCE.slice(start, end === -1 ? undefined : end)
	return [...body.matchAll(/"(\S[^"\n]*)"/g)].map(([, command = ""]) => command)
}

/** The four commands the demo prints: its three setup commands, then the one it asks. */
const DEMO_COMMANDS = [
	...siteCommandsOf("FI_DEMO_SETUP_COMMANDS"),
	...siteCommandsOf("FI_DEMO_COMMAND"),
]

/** The CLI's global flags, in the one list its usage prints. */
const USAGE = `const GLOBAL_OPTIONS: readonly (readonly [string, string])[] = [
	["--json", "Print JSON"],
]`

/** The root of a fixture tree, listing the `children` it names and importing them from `./`. */
const root = (children: string) => `import { ${children.replaceAll(",", ", ")} } from "./leaf"

export const root = defineGroup({
	name: "traj",
	children: [${children}],
})
`

/** A fixture leaf that takes one flag, `kept`, and nothing else. */
const LEAF = `export const leaf = defineCommand({
	name: "leaf",
	input: z.strictObject({
		kept: z.boolean().optional(),
	}),
})
`

describe("the demo's commands against the CLI's command tree", () => {
	it("reads the four commands the Site's demo prints, three setup ones and the question", () => {
		expect(DEMO_COMMANDS).toHaveLength(4)
		expect(DEMO_COMMANDS.at(-1)).toBe(
			"traj fi --scenario base --as-of 2026-03-31 --horizon 2066-03-31 --json",
		)
	})

	it("reads a leaf whose group lists it across several lines", () => {
		const files = {
			"apps/cli/src/commands/index.ts": root("\n\t\tleaf,\n\t"),
			"apps/cli/src/commands/leaf.ts": LEAF,
		}
		expect(demoCommandProblem("traj leaf", readerOf(files))).toBeUndefined()
	})

	it("reads a leaf whose group lists it on one line", () => {
		const files = {
			"apps/cli/src/commands/index.ts": root("leaf"),
			"apps/cli/src/commands/leaf.ts": LEAF,
		}
		expect(demoCommandProblem("traj leaf --kept", readerOf(files))).toBeUndefined()
	})

	it("names the word and the file when a group has no such subcommand", () => {
		const files = {
			"apps/cli/src/commands/index.ts": root("leaf"),
			"apps/cli/src/commands/leaf.ts": LEAF,
		}
		expect(demoCommandProblem("traj gone", readerOf(files))).toBe(
			"`traj gone`: `apps/cli/src/commands/index.ts` defines no `gone`.",
		)
	})

	it("names the flag and the leaf when the leaf has no such option", () => {
		const files = {
			"apps/cli/src/commands/index.ts": root("leaf"),
			"apps/cli/src/commands/leaf.ts": LEAF,
		}
		expect(demoCommandProblem("traj leaf --gone", readerOf(files))).toBe(
			"`traj leaf --gone`: `apps/cli/src/commands/leaf.ts` has no `--gone` option.",
		)
	})

	it("reads a kebab-case flag as the camelCase option key, a redirection target aside", () => {
		const files = {
			"apps/cli/src/commands/index.ts": root("leaf"),
			"apps/cli/src/commands/leaf.ts": LEAF.replace("kept:", "asOf:"),
		}
		expect(
			demoCommandProblem("traj leaf --as-of 2026-03-31 > base.json", readerOf(files)),
		).toBeUndefined()
	})

	it("reads a global flag from the CLI's global option list", () => {
		const files = {
			"apps/cli/src/commands/index.ts": root("leaf"),
			"apps/cli/src/commands/leaf.ts": LEAF,
			"apps/cli/src/usage.ts": USAGE,
		}
		expect(demoCommandProblem("traj leaf --json", readerOf(files))).toBeUndefined()
	})

	it("runs every command the demo prints against the CLI in this repository", () => {
		for (const command of DEMO_COMMANDS) {
			expect(demoCommandProblem(command, read) ?? "").toBe("")
		}
	})
})
