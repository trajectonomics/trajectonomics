import { existsSync } from "node:fs"
import { resolve } from "node:path"
import { checkBuild } from "../src/lib/build/check-build"
import { MOVED_POSTS, movedPostRedirects } from "../src/lib/moved-posts"
import { readBuiltFiles } from "./read-built-files"

/** The Worker's assets root, where Astro builds the blog. */
const BUILD_ROOT = "dist"

/** Checks the built blog on disk and returns the process exit code. */
export async function main(root: string): Promise<number> {
	if (!existsSync(root)) {
		console.error(`verify:build: ${root}/ is missing. Run \`bun run build\` first.`)
		return 1
	}
	const failures = checkBuild(await readBuiltFiles(resolve(root)), movedPostRedirects(MOVED_POSTS))
	for (const failure of failures) {
		console.error(`${failure.code} ${failure.path}: ${failure.message}`)
	}
	if (failures.length > 0) {
		console.error(`verify:build: ${failures.length} failed check(s) in ${root}/`)
		return 1
	}
	console.log("verify:build: ok")
	return 0
}

if (import.meta.main) {
	process.exitCode = await main(BUILD_ROOT)
}
