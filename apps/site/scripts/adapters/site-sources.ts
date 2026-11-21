import { join } from "node:path"
import type { SiteSource } from "../../src/lib/design/colour-literals"

const REPOSITORY = join(import.meta.dir, "..", "..")

/** The Site's own styling: the templates, the stylesheets and any inline SVG, under `src/`. */
const STYLING_SOURCES = "**/*.{astro,css,html,svg}"

/** Every styling source the Site authors, under `src/` and nowhere else: never `node_modules` or a copy. */
export async function readSiteSources(): Promise<readonly SiteSource[]> {
	const root = join(REPOSITORY, "src")
	const paths: string[] = []
	for await (const path of new Bun.Glob(STYLING_SOURCES).scan({ cwd: root })) paths.push(path)
	return Promise.all(
		paths.sort().map(async (path) => ({
			path: join("src", path),
			content: await Bun.file(join(root, path)).text(),
		})),
	)
}
