import { fileURLToPath } from "node:url"

/**
 * The Demo step of apps/web's `check` script. Under turbo the `demo` task has already run (`build`,
 * `test`, `test:src` and `test:scripts` depend on it, see apps/web/turbo.json), so this does nothing.
 * Run directly (`bun run check` inside apps/web), it runs the same task through turbo, which builds the
 * packages the generator imports first, so the tests never read a missing or stale file.
 *
 * Turbo sets `TURBO_HASH` for every task it runs.
 */
if (process.env["TURBO_HASH"]) {
	process.exit(0)
}

const ROOT = fileURLToPath(new URL("../../../", import.meta.url))
const demo = Bun.spawnSync(["bunx", "turbo", "run", "demo", "--filter=@trajectonomics/web"], {
	cwd: ROOT,
	stdio: ["inherit", "inherit", "inherit"],
})
process.exit(demo.exitCode ?? 1)
