import { beforeAll, describe, expect, test } from "bun:test"
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync } from "node:fs"
import { join } from "node:path"
import { PAGES } from "../browser/pages"
import {
	EDIT_SESSION_PATH,
	EDIT_TOKEN_HEADER,
	REREAD_PATH,
	WHAT_IF_PATH,
} from "../src/lib/edit/guard"

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

/** What the loopback client holds and the hosted build must not: the write path, its token header and a POST request. */
const FORBIDDEN: ReadonlyArray<readonly [string, RegExp]> = [
	...[EDIT_SESSION_PATH, REREAD_PATH, WHAT_IF_PATH].map((path) => [path, quoted(path)] as const),
	[EDIT_TOKEN_HEADER, new RegExp(EDIT_TOKEN_HEADER)],
	["a POST request", /method\s*:\s*["'`]POST/],
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
		expect(
			found(`fetch(\`${EDIT_SESSION_PATH}\`,{method:\`POST\`,headers:{"${EDIT_TOKEN_HEADER}":1}})`),
		).toEqual([EDIT_SESSION_PATH, EDIT_TOKEN_HEADER, "a POST request"])
		const scripts = filesUnder(OUT).filter((file) => /\.(js|html)$/.test(file))
		expect(scripts.length).toBeGreaterThan(10)
		const leaks = scripts.flatMap((file) =>
			found(readFileSync(join(OUT, file), "utf8")).map((name) => `${file}: ${name}`),
		)
		expect(leaks).toEqual([])
	})

	test("puts every root-relative link and asset of every page under /demo/", () => {
		expect(PAGES.flatMap(outsideBase)).toEqual([])
	})
})
