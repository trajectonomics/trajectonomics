import { type FlagTable, flagsIn } from "./calls"

/** The release under test: its label for the results file, and the argv that runs its `traj`. */
export interface Released {
	readonly label: string
	readonly argv: readonly string[]
}

/**
 * The release under test: a pinned npm version (`latest` is resolved now, so the label is the real
 * version), or a dev command the owner names with `--traj-command` and labels with `--release`.
 */
export async function resolveRelease(options: {
	release?: string | undefined
	trajCommand?: string | undefined
}): Promise<Released> {
	if (options.trajCommand !== undefined) {
		if (options.release === undefined) throw new Error("--traj-command needs --release <label>")
		return { label: options.release, argv: options.trajCommand.split(/\s+/).filter(Boolean) }
	}
	const npx = Bun.which("npx")
	if (npx === null) throw new Error("npx is not on PATH; it runs the published @trajectonomics/cli")
	const version = await versionOf(options.release ?? "latest")
	return { label: version, argv: [npx, "-y", `@trajectonomics/cli@${version}`] }
}

async function versionOf(release: string): Promise<string> {
	if (release !== "latest") return release
	const res = await fetch("https://registry.npmjs.org/@trajectonomics%2fcli")
	if (!res.ok) throw new Error(`the npm registry answered ${res.status} for @trajectonomics/cli`)
	const body = (await res.json()) as { "dist-tags": { latest: string } }
	return body["dist-tags"].latest
}

/** Runs the release's `traj` directly (no shim, no log) and returns its stdout. */
export async function trajStdout(
	argv: readonly string[],
	args: readonly string[],
	home: string,
): Promise<string> {
	const proc = Bun.spawn([...argv, ...args], {
		env: { ...process.env, TRAJ_HOME: home },
		stdout: "pipe",
		stderr: "pipe",
		stdin: "ignore",
	})
	const [stdout, stderr] = await Promise.all([
		new Response(proc.stdout).text(),
		new Response(proc.stderr).text(),
	])
	const exitCode = await proc.exited
	if (exitCode !== 0) throw new Error(`traj ${args.join(" ")} exited ${exitCode}: ${stderr.trim()}`)
	return stdout
}

/** The command names and each command's flags, from the release's own `schema` and `help`. */
export async function referenceOf(
	argv: readonly string[],
	home: string,
): Promise<{ names: string[]; table: FlagTable }> {
	const schema = JSON.parse(await trajStdout(argv, ["schema", "--json"], home)) as {
		commands: { name: string }[]
	}
	const names = schema.commands.map((command) => command.name)
	const table: Record<string, Set<string>> = { "": flagsIn(await trajStdout(argv, ["help"], home)) }
	for (const name of names) {
		table[name] = flagsIn(await trajStdout(argv, ["help", ...name.split(" ")], home))
	}
	return { names, table }
}
