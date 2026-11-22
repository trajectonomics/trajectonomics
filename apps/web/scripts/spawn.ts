/** What a spawned process printed, and how it exited. */
export type Captured = { code: number; stdout: string; stderr: string }

/** The options of one spawn: the environment, an optional standard input, and a working directory. */
export type SpawnOptions = {
	env?: Record<string, string | undefined> | undefined
	stdin?: string | undefined
	cwd?: string | undefined
}

/** Runs a command to its end, capturing both streams. Throws when the command cannot start. */
export async function spawnCapture(
	argv: readonly string[],
	options: SpawnOptions = {},
): Promise<Captured> {
	const spawnOptions = {
		stdin: options.stdin === undefined ? "ignore" : new Blob([options.stdin]),
		stdout: "pipe",
		stderr: "pipe",
		env: cleanEnv(options.env ?? process.env),
		...(options.cwd === undefined ? {} : { cwd: options.cwd }),
	} as const
	const proc = Bun.spawn([...argv], spawnOptions)
	const [stdout, stderr] = await Promise.all([
		new Response(proc.stdout).text(),
		new Response(proc.stderr).text(),
	])
	return { code: await proc.exited, stdout, stderr }
}

/** The environment without its unset entries, which Bun's spawn does not accept. */
function cleanEnv(env: Record<string, string | undefined>): Record<string, string> {
	return Object.fromEntries(
		Object.entries(env).filter((entry): entry is [string, string] => entry[1] !== undefined),
	)
}
