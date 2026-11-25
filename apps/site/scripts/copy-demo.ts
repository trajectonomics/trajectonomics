import { cpSync, existsSync, rmSync } from "node:fs"
import { join } from "node:path"

/**
 * The Site's build copies the Dashboard's hosted Demo build into its own assets, under `/demo/`
 * ([ADR 0031](../docs/adr/0031-the-site-serves-the-hosted-demo-with-a-scoped-csp.md)). The Dashboard
 * builds it as `apps/web/dist-hosted/` with `bunx turbo run @trajectonomics/web#build:hosted`, which
 * the Site's turbo `build` task depends on.
 *
 * Run under turbo, that task has already written the output, so this only copies. Run directly
 * (`bun run build` inside `apps/site`), it builds the hosted Demo first, so a direct run never copies
 * a stale or missing build. Turbo sets `TURBO_HASH` for every task it runs.
 */
const SITE_ROOT = join(import.meta.dir, "..")
const REPOSITORY_ROOT = join(SITE_ROOT, "..", "..")
const SOURCE = join(SITE_ROOT, "..", "web", "dist-hosted")
const DESTINATION = join(SITE_ROOT, "dist", "demo")

/** Build the hosted Demo with the same command the turbo task runs. */
function buildHostedDemo(): number {
	const build = Bun.spawnSync(
		["bunx", "turbo", "run", "@trajectonomics/web#build:hosted", "--concurrency=2"],
		{ cwd: REPOSITORY_ROOT, stdio: ["inherit", "inherit", "inherit"] },
	)
	return build.exitCode ?? 1
}

if (process.env["TURBO_HASH"]) {
	// Under turbo the `build` task has already run `@trajectonomics/web#build:hosted`.
	if (!existsSync(join(SOURCE, "index.html"))) {
		console.error(
			`copy-demo: ${SOURCE} is missing; the turbo task @trajectonomics/web#build:hosted must run first.`,
		)
		process.exit(1)
	}
} else {
	const code = buildHostedDemo()
	if (code !== 0) process.exit(code)
}

if (!existsSync(join(SOURCE, "index.html"))) {
	console.error(`copy-demo: ${SOURCE} has no index.html after the hosted build.`)
	process.exit(1)
}

rmSync(DESTINATION, { recursive: true, force: true })
cpSync(SOURCE, DESTINATION, { recursive: true })
console.log(`copy-demo: copied ${SOURCE} to ${DESTINATION}.`)
