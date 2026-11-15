import { existsSync } from "node:fs"
import type { BuiltFile } from "../../src/lib/build/check-build"

/** The files whose bytes are an image or a font, so no built-file check can read them as text. */
const BINARY = /\.(?:ico|png|jpe?g|gif|webp|avif|woff2?|ttf|otf|wasm|mp4)$/i

/** The files of the build output under `root`, at paths relative to that root; `undefined` when there is no build. */
export async function readBuildFiles(root: string): Promise<readonly BuiltFile[] | undefined> {
	if (!existsSync(root)) return undefined
	const paths: string[] = []
	for await (const path of new Bun.Glob("**/*").scan({ cwd: root })) {
		paths.push(path)
	}
	paths.sort()
	const files: BuiltFile[] = []
	for (const path of paths) {
		const file = Bun.file(`${root}/${path}`)
		files.push({
			path,
			content: BINARY.test(path) ? "" : await file.text(),
			bytes: file.size,
		})
	}
	return files
}
