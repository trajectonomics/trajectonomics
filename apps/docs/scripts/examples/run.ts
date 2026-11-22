import { type ExecExample, normalizeOutput } from "../../src/lib/exec-fences"

/** How many trailing stderr lines a failing example reports. */
const STDERR_TAIL = 20

/** The environment every example runs in; a variable can be unset. */
export type Env = Record<string, string | undefined>

/** One problem with an example: its file:line and the message that says what went wrong. */
export interface Problem {
	readonly where: string
	readonly message: string
}

/** The last `count` lines of `text`, without its trailing newlines. */
function tail(text: string, count: number): string {
	return text.trimEnd().split("\n").slice(-count).join("\n")
}

/** Runs one example in `cwd` against `env`, and reports what it got wrong. */
async function runExample(
	example: ExecExample,
	cwd: string,
	env: Env,
): Promise<readonly Problem[]> {
	const child = Bun.spawn(["bash", "-euo", "pipefail", "-c", example.script], {
		cwd,
		env,
		stdout: "pipe",
		stderr: "pipe",
	})
	const [stdout, stderr, code] = await Promise.all([
		new Response(child.stdout).text(),
		new Response(child.stderr).text(),
		child.exited,
	])
	const where = `${example.file}:${example.line}`
	if (code !== 0) {
		return [{ where, message: `exited ${code}\n${tail(stderr, STDERR_TAIL)}` }]
	}
	if (example.expected === undefined) {
		return []
	}
	const actual = normalizeOutput(stdout)
	const expected = normalizeOutput(example.expected.text)
	if (actual === expected) {
		return []
	}
	return [{ where, message: `output differs\n--- expected\n${expected}\n--- actual\n${actual}` }]
}

/** Runs every example of `file` in order, in `home` and `workdir`, and returns what went wrong. */
export async function runPage(
	examples: readonly ExecExample[],
	home: string,
	workdir: string,
	env: Env,
): Promise<{ readonly count: number; readonly problems: readonly Problem[] }> {
	const runEnv: Env = { ...env, TRAJ_HOME: home }
	const problems: Problem[] = []
	for (const example of examples) {
		problems.push(...(await runExample(example, workdir, runEnv)))
	}
	return { count: examples.length, problems }
}

/** Prints each problem on its own line, with the location it belongs to. */
export function report(problems: readonly Problem[]): void {
	for (const problem of problems) {
		console.log(`${problem.where}: ${problem.message}`)
	}
}
