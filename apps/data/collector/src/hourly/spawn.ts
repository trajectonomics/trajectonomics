/** What one spawned collector run returned. */
export type SpawnResult = { exitCode: number; stdout: string }

/** Runs one argv without a shell; tests inject a fake. */
export type Spawner = (argv: readonly string[]) => Promise<SpawnResult>

/** How long one collector run may take before it is killed, so a stalled host cannot hang a run. */
export const SPAWN_TIMEOUT_MS = 10 * 60 * 1000

/** Runs a command with stderr inherited, so the child's errors reach the journal. */
export const spawnInheritStderr: Spawner = async (argv) => {
	const proc = Bun.spawn([...argv], { stdin: "ignore", stdout: "pipe", stderr: "inherit" })
	const timer = setTimeout(() => proc.kill(), SPAWN_TIMEOUT_MS)
	try {
		const [stdout, exitCode] = await Promise.all([new Response(proc.stdout).text(), proc.exited])
		return { exitCode, stdout }
	} finally {
		clearTimeout(timer)
	}
}
