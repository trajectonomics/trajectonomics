import { cp, mkdir, mkdtemp, rm, symlink } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import type { ContentFile } from "../src/lib/content-pages"
import { execExamples, QUICKSTART_PAGE } from "../src/lib/exec-fences"
import { examplePages, trajArgument } from "./examples/inputs"
import { type Env, type Problem, report, runPage } from "./examples/run"

/** Runs the examples of every Quickstart-and-later page against `--traj`, and returns the exit code. */
async function main(argv: readonly string[]): Promise<number> {
	const traj = await trajArgument(argv)
	if (traj === undefined) {
		console.log("usage: bun scripts/run-examples.ts --traj <path-to-traj-binary> (from apps/docs)")
		return 2
	}
	const root = await mkdtemp(join(tmpdir(), "docs-examples-"))
	try {
		const bin = join(root, "bin")
		await mkdir(bin)
		await symlink(traj, join(bin, "traj"))
		const env: Env = {
			...process.env,
			PATH: `${bin}:${process.env["PATH"] ?? ""}`,
			NO_COLOR: "1",
		}
		const version = Bun.spawn([traj, "version"], { env, stdout: "pipe", stderr: "pipe" })
		const [versionText, versionCode] = await Promise.all([
			new Response(version.stdout).text(),
			version.exited,
		])
		if (versionCode !== 0) {
			console.log(`run-examples: ${traj} did not run "version"`)
			return 2
		}
		return await runAll(root, await examplePages(), env, versionText.trim())
	} finally {
		await rm(root, { recursive: true, force: true })
	}
}

/** Runs the Quickstart first to seed a home, then every other page in a copy of that home. */
async function runAll(
	root: string,
	pages: readonly ContentFile[],
	env: Env,
	version: string,
): Promise<number> {
	const quickstart = pages.find((page) => page.path === QUICKSTART_PAGE)
	if (quickstart === undefined) {
		console.log(`run-examples: ${QUICKSTART_PAGE} is missing, so nothing was run`)
		return 1
	}
	const quickstartExamples = execExamples(quickstart)
	if (quickstartExamples.length === 0) {
		console.log(
			`run-examples: ${QUICKSTART_PAGE} has no bash exec examples, so nothing was checked`,
		)
		return 1
	}
	const seed = join(root, "seed")
	await mkdir(seed)
	const seeded = await runPage(quickstartExamples, seed, await workdirFor(root, "quickstart"), env)
	if (seeded.problems.length > 0) {
		report(seeded.problems)
		console.log("run-examples: the Quickstart failed, so the other pages were skipped")
		return 1
	}
	let examples = seeded.count
	let pagesWithExamples = seeded.count > 0 ? 1 : 0
	const problems: Problem[] = []
	for (const [index, page] of pages.entries()) {
		const pageExamples = page === quickstart ? [] : execExamples(page)
		if (pageExamples.length === 0) {
			continue
		}
		const home = join(root, "homes", String(index))
		await cp(seed, home, { recursive: true })
		const result = await runPage(pageExamples, home, await workdirFor(root, String(index)), env)
		examples += result.count
		pagesWithExamples += 1
		problems.push(...result.problems)
	}
	report(problems)
	if (problems.length > 0) {
		return 1
	}
	console.log(
		`run-examples: ${examples} examples on ${pagesWithExamples} pages passed against traj ${version}`,
	)
	return 0
}

/** A fresh working directory for one page's examples under `root`. */
async function workdirFor(root: string, name: string): Promise<string> {
	const directory = join(root, "work", name)
	await mkdir(directory, { recursive: true })
	return directory
}

if (import.meta.main) {
	process.exitCode = await main(process.argv.slice(2))
}
