/**
 * The build step of a package's `check` script. Under turbo the package's `build` task has already
 * run (`check` depends on it, see the root `turbo.json`), so this does nothing and `<pkg>#build`
 * stays the only writer of the build output. Run directly (`bun run check` inside a package), it
 * builds first, so the check never reads a stale or missing `dist/`.
 *
 * Turbo sets `TURBO_HASH` (the task's hash) for every task it runs.
 */
if (process.env.TURBO_HASH) {
	process.exit(0)
}

const build = Bun.spawnSync(["bun", "run", "build"], { stdio: ["inherit", "inherit", "inherit"] })
process.exit(build.exitCode ?? 1)
