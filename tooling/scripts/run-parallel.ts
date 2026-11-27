/**
 * Runs independent shell commands concurrently in the current working directory, buffering each
 * command's stdout and stderr so outputs do not interleave mid-line, and exits with the first
 * non-zero exit code if any command fails.
 */
const commands = process.argv.slice(2)
if (commands.length === 0) {
	console.error("usage: bun tooling/scripts/run-parallel.ts <cmd1> [cmd2 ...]")
	process.exit(2)
}

type Result = { cmd: string; code: number; stdout: string; stderr: string }

const results: Result[] = await Promise.all(
	commands.map(async (cmd): Promise<Result> => {
		const proc = Bun.spawn(["sh", "-c", cmd], {
			stdout: "pipe",
			stderr: "pipe",
			env: process.env,
		})
		const [stdout, stderr, code] = await Promise.all([
			new Response(proc.stdout).text(),
			new Response(proc.stderr).text(),
			proc.exited,
		])
		return { cmd, code, stdout, stderr }
	}),
)

let failedCode = 0
for (const { cmd, code, stdout, stderr } of results) {
	if (stdout.length > 0) process.stdout.write(stdout)
	if (stderr.length > 0) process.stderr.write(stderr)
	if (code !== 0 && failedCode === 0) {
		failedCode = code
		process.stderr.write(`run-parallel: "${cmd}" exited with code ${code}\n`)
	}
}

process.exitCode = failedCode
