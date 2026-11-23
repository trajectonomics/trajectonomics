import { describe, expect, it } from "bun:test"
import { cpSync, mkdirSync, rmSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import type { Group, Leaf } from "./command"
import { root } from "./commands"
import { dashboardDeps } from "./dashboard/deps"
import { dashboardLeaf } from "./dashboard/leaf"
import { DEFAULT_SETUP, EXPECTED_EXIT, SETUP, type Setup, STDIN } from "./help-examples-setup"
import { fixtureHome } from "./ledger-fixture"
import { projectionHome } from "./projection/testing"
import { ledgerHome } from "./store/testing"
import { makeTempDir } from "./temp-dir"
import { capture } from "./test-support"
import { leavesOf } from "./tree"

/**
 * The real tree (ADR-0043), with the Dashboard's wait swapped for an immediate stop: it serves,
 * then returns, so its example runs without blocking.
 */
const CLI: Group = {
	...root,
	children: root.children.map((node) =>
		node.name === "dashboard"
			? dashboardLeaf({ ...dashboardDeps, untilStopped: async () => {} })
			: node,
	),
}

/**
 * The words of a command line as a shell splits them: on whitespace, except inside quotes. A 'single
 * quoted' span is literal, and a "double quoted" span drops its quotes and keeps a single quote as a
 * plain character. A backslash escape is not supported, because an example never needs one.
 */
function words(command: string): string[] {
	const found = command.match(/(?:[^\s'"]|'[^']*'|"[^"]*")+/g) ?? []
	return found.map((word) => word.replaceAll(/'([^']*)'|"([^"]*)"/g, "$1$2"))
}

/** A shell's view of a command line: leading NAME=value pairs, then the words after `traj`. */
function parse(command: string): { env: Record<string, string>; argv: string[] } {
	if (/[|<>;&`$()]/.test(command)) {
		throw new Error(`not a plain command line, so it cannot run as printed: ${command}`)
	}
	const parts = words(command)
	const env: Record<string, string> = {}
	while (parts.length > 0 && /^[A-Z_][A-Z0-9_]*=/.test(parts[0]!)) {
		const [name, ...value] = parts.shift()!.split("=")
		env[name!] = value.join("=")
	}
	if (parts.shift() !== "traj") throw new Error(`an example starts with traj: ${command}`)
	return { env, argv: parts }
}

/** Unquoted `~` expands to the user's home, as the shell would before the CLI sees the word. */
function expandHome(word: string, home: string): string {
	if (word === "~") return home
	return word.startsWith("~/") ? join(home, word.slice(2)) : word
}

/** Copies the declared starting ledger into the data directory. */
async function seed(ledger: Setup["ledger"] = DEFAULT_SETUP.ledger, into: string): Promise<void> {
	const source =
		ledger === "none"
			? undefined
			: ledger === "empty"
				? ledgerHome()
				: ledger === "fixture"
					? fixtureHome()
					: await projectionHome()
	if (source !== undefined) cpSync(source, into, { recursive: true })
}

/** Runs one example as the shell would: its env, its words and its stdin, then its exit code. */
async function runExample(
	example: Leaf["examples"][number],
	env: Record<string, string>,
	user: string,
): Promise<void> {
	const parsed = parse(example.command)
	const own = Object.fromEntries(
		Object.entries(parsed.env).map(([name, value]) => [name, expandHome(value, user)]),
	)
	const argv = parsed.argv.map((word) => expandHome(word, user))
	const stdin = STDIN[example.command]
	if (argv.includes("-") && stdin === undefined) {
		throw new Error(`${example.command} reads stdin, so it needs a declared STDIN`)
	}
	const res = await capture(argv, { ...env, ...own }, CLI, stdin)
	const want = EXPECTED_EXIT[example.command] ?? 0
	if (res.code !== want) {
		throw new Error(
			`${example.command}\nexpected exit ${want}, got ${res.code}\n${res.err || res.out}`,
		)
	}
}

/** Seeds the data directory, writes the setup's files, then runs its steps; each step must exit 0. */
async function prepare(setup: Setup, env: Record<string, string>, user: string): Promise<void> {
	await seed(setup.ledger, env["TRAJ_HOME"]!)
	for (const [name, text] of Object.entries(setup.files ?? {})) writeFileSync(name, text)
	for (const step of setup.steps ?? []) {
		const argv = step.map((word) => expandHome(word, user))
		const res = await capture(argv, env, CLI)
		if (res.code !== 0) throw new Error(`setup "traj ${argv.join(" ")}" failed:\n${res.err}`)
	}
}

/** Runs one leaf's examples in order, in its own data directory and working directory. */
async function runExamples(path: string, leaf: Leaf): Promise<void> {
	const work = makeTempDir("traj-help-examples-")
	const user = join(work, "user")
	const cwd = join(work, "cwd")
	const original = process.cwd()
	mkdirSync(user)
	mkdirSync(cwd)
	// The config directory moves into the temporary user too, so `traj telemetry` never writes a real one.
	const env = {
		HOME: user,
		TRAJ_HOME: join(user, ".traj"),
		XDG_CONFIG_HOME: join(user, ".config"),
		APPDATA: join(user, "AppData", "Roaming"),
	}
	try {
		process.chdir(cwd)
		await prepare(SETUP[path] ?? DEFAULT_SETUP, env, user)
		for (const example of leaf.examples) await runExample(example, env, user)
	} finally {
		process.chdir(original)
		rmSync(work, { recursive: true, force: true })
	}
}

describe("help examples are part of the CLI contract", () => {
	for (const { path, leaf } of leavesOf(root)) {
		const name = path.join(" ")
		it(`runs every example of traj ${name} and each exits as documented`, async () => {
			expect(leaf.examples.length).toBeGreaterThan(0)
			await runExamples(name, leaf)
		}, 120_000)
	}
})
