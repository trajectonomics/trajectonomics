/**
 * Runs independent shell commands concurrently in the current working directory, buffering each
 * command's stdout and stderr so outputs do not interleave mid-line, forwarding SIGINT/SIGTERM
 * to running children, and exiting with the first non-zero exit code if any command fails.
 */
const commands = process.argv.slice(2)
if (commands.length === 0) {
	console.error("usage: bun tooling/scripts/run-parallel.ts <cmd1> [cmd2 ...]")
	process.exit(2)
}

type Result = {
	cmd: string
	code: number | null
	signal: NodeJS.Signals | null
	stdout: string
	stderr: string
}

const active = new Set<ReturnType<typeof Bun.spawn>>()
for (const signal of ["SIGINT", "SIGTERM"] as const) {
	process.on(signal, () => {
		for (const child of active) {
			try {
				child.kill(signal)
			} catch {
				// Child already exited.
			}
		}
		process.removeAllListeners(signal)
		process.kill(process.pid, signal)
	})
}

const results: Result[] = await Promise.all(
	commands.map(async (cmd): Promise<Result> => {
		const proc = Bun.spawn(["sh", "-c", cmd], {
			stdout: "pipe",
			stderr: "pipe",
			env: process.env,
		})
		active.add(proc)
		const [stdout, stderr, code] = await Promise.all([
			new Response(proc.stdout).text(),
			new Response(proc.stderr).text(),
			proc.exited,
		])
		active.delete(proc)
		return { cmd, code, signal: proc.signalCode, stdout, stderr }
	}),
)

function writeChunk(stream: NodeJS.WriteStream, text: string): void {
	if (text.length === 0) return
	stream.write(text.endsWith("\n") ? text : `${text}\n`)
}

let failedCode = 0
for (const { cmd, code, signal, stdout, stderr } of results) {
	writeChunk(process.stdout, stdout)
	writeChunk(process.stderr, stderr)
	if (code !== 0) {
		const status = signal !== null ? `signal ${signal}` : `code ${code ?? 1}`
		process.stderr.write(`run-parallel: "${cmd}" exited with ${status}\n`)
		if (failedCode === 0) failedCode = code !== null && code > 0 ? code : 1
	}
}

process.exitCode = failedCode
