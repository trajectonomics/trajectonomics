import { beforeAll, describe, expect, test } from "bun:test"
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync } from "node:fs"
import { join } from "node:path"
import { PAGES } from "../browser/pages"
import * as guard from "../src/lib/edit/guard"

/** The environment variable that moves the hosted build's output (vite.config.ts), so this test builds into a scratch folder. */
const OUT_VARIABLE = "TRAJ_WEB_OUT"

// Builds the hosted Demo (web ADR 0028) into a scratch folder and reads what it wrote. The build is what ships to the
// Site, so the guarantee is checked on the output: nothing in it can reach the loopback server's write path, and every
// link and asset sits under /demo/.
const ROOT = join(import.meta.dir, "..")
const OUT = join(ROOT, "node_modules", ".cache", "hosted-build-test")

/** Every file under a folder, as a path from it. */
function filesUnder(root: string): string[] {
	return readdirSync(root, { recursive: true, withFileTypes: true })
		.filter((entry) => entry.isFile())
		.map((entry) => join(entry.parentPath, entry.name).slice(root.length + 1))
}

/** A quoted path, as a string literal in minified code holds it. */
const quoted = (path: string): RegExp => new RegExp(`["'\`]${path}["'\`?/]`)

/** Every path `lib/edit/guard.ts` exports (each string export that ends in `_PATH`), so a path added there is scanned for without an edit here. */
const WRITE_PATHS: readonly string[] = Object.entries(guard)
	.filter(([name, value]) => name.endsWith("_PATH") && typeof value === "string")
	.map(([, value]) => value as string)

/** What the loopback client holds and the hosted build must not: the write path, its token header and a POST request. */
const FORBIDDEN: ReadonlyArray<readonly [string, RegExp]> = [
	...WRITE_PATHS.map((path) => [path, quoted(path)] as const),
	[guard.EDIT_TOKEN_HEADER, new RegExp(guard.EDIT_TOKEN_HEADER)],
	["a POST request", /method\s*:\s*["'`]POST/],
	["a POST form", /method=["']?post/i],
]

/** The names of what a text holds that the hosted build must not. */
const found = (text: string): string[] =>
	FORBIDDEN.filter(([, pattern]) => pattern.test(text)).map(([name]) => name)

/** The root-relative links and assets of a page's HTML that are not under /demo/, each with the page. */
function outsideBase(page: string): string[] {
	const html = readFileSync(join(OUT, page, "index.html"), "utf8")
	const targets = [...html.matchAll(/(?:href|src)="(\/[^"]*)"/g)].map((match) => match[1] ?? "")
	return targets
		.filter((target) => !target.startsWith("/demo/") && !target.startsWith("//"))
		.map((t) => `${page}: ${t}`)
}

beforeAll(async () => {
	rmSync(OUT, { recursive: true, force: true })
	mkdirSync(join(ROOT, "node_modules", ".cache"), { recursive: true })
	const build = Bun.spawn(["bun", "run", "build:hosted"], {
		cwd: ROOT,
		env: { ...process.env, [OUT_VARIABLE]: OUT },
		stdout: "pipe",
		stderr: "pipe",
	})
	const [code, output] = await Promise.all([build.exited, new Response(build.stderr).text()])
	if (code !== 0) throw new Error(`The hosted build failed:\n${output}`)
}, 240_000)

describe("the hosted build", () => {
	test("writes every page under its own folder, and the Demo snapshot beside them", () => {
		for (const page of PAGES) expect(existsSync(join(OUT, page, "index.html")), page).toBe(true)
		expect(existsSync(join(OUT, "demo", "snapshot.json"))).toBe(true)
	})

	test("holds no Snapshot but the Demo's", () => {
		const json = filesUnder(OUT).filter(
			(file) => file.endsWith(".json") && !file.startsWith("_app/"),
		)
		expect(json).toEqual(["demo/snapshot.json"])
	})

	test("has no edit client: none of the write path's names, and no POST, in anything it ships", () => {
		expect([...WRITE_PATHS].sort()).toEqual(["/edit", "/edit-session", "/reread", "/what-if"])
		expect(
			found(
				`fetch(\`${guard.EDIT_PATH}\`,{method:\`POST\`,headers:{"${guard.EDIT_TOKEN_HEADER}":1}})`,
			),
		).toEqual([guard.EDIT_PATH, guard.EDIT_TOKEN_HEADER, "a POST request"])
		expect(found('<form method="post">')).toEqual(["a POST form"])
		for (const path of WRITE_PATHS) expect(found(`fetch("${path}")`), path).toEqual([path])
		const scripts = filesUnder(OUT).filter((file) => /\.(js|html)$/.test(file))
		expect(scripts.length).toBeGreaterThan(10)
		const leaks = scripts.flatMap((file) =>
			found(readFileSync(join(OUT, file), "utf8")).map((name) => `${file}: ${name}`),
		)
		expect(leaks).toEqual([])
	})

	test("the scan can see an edit client: it reports every name in the loopback build's dist/", () => {
		const loopback = join(ROOT, "dist")
		if (!existsSync(loopback))
			throw new Error(
				"dist/ is missing. Build the loopback Dashboard first: bunx turbo run @trajectonomics/web#build (from the repository root).",
			)
		const names = new Set(
			filesUnder(loopback)
				.filter((file) => /\.js$/.test(file))
				.flatMap((file) => found(readFileSync(join(loopback, file), "utf8"))),
		)
		// Every name but the POST form, which no loopback page has: its pattern is pinned on a sample text above.
		expect([...names].sort()).toEqual(
			FORBIDDEN.map(([name]) => name)
				.filter((n) => n !== "a POST form")
				.sort(),
		)
	})

	test("puts every root-relative link and asset of every page under /demo/", () => {
		expect(PAGES.flatMap(outsideBase)).toEqual([])
	})
})
