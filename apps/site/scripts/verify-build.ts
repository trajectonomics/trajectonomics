import { existsSync } from "node:fs"
import { checkBuild } from "../src/lib/build/check-build"
import { readBuildFiles } from "./adapters/build-files"
import { reportFailures } from "./report-failures"

/** The Worker's assets root: Astro builds the Site there and the Worker serves `./dist`. */
const BUILD_ROOT = "dist"

/** Check the built Site on disk, returning the process exit code. */
export async function main(root: string): Promise<number> {
	if (!existsSync(root)) {
		console.error(`verify:build: ${root}/ is missing. Run \`bun run build\` first.`)
		return 1
	}
	return reportFailures("verify:build", checkBuild(await readBuildFiles(root)))
}

if (import.meta.main) {
	process.exitCode = await main(BUILD_ROOT)
}
