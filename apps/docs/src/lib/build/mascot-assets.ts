import type { BuiltFile } from "./built-files"
import type { BuildFailure } from "./failures"
import { buildFailure } from "./failures"

/** A Mascot file a built page points at, as the URL names it under the Portal's base (ADR 0017). */
const MASCOT_REFERENCE = /\/docs\/mascot\/([\w-]+\.webp)/g

/** Whether a built file is an HTML page, the 404 page included. */
function isPage(path: string): boolean {
	return path.endsWith(".html")
}

/** Every Mascot a built page points at that the build does not contain; empty when all are there. */
export function checkMascotAssets(files: readonly BuiltFile[]): readonly BuildFailure[] {
	const present = new Set(files.map((file) => file.path))
	const reported = new Set<string>()
	const failures: BuildFailure[] = []
	for (const page of files) {
		if (!isPage(page.path)) continue
		for (const match of page.content.matchAll(MASCOT_REFERENCE)) {
			const asset = `mascot/${match[1]}`
			const key = `${page.path}\0${asset}`
			if (present.has(asset) || reported.has(key)) continue
			reported.add(key)
			failures.push(
				buildFailure(
					"MASCOT_ASSET_MISSING",
					page.path,
					`the page points at /docs/${asset}, which the build does not contain`,
				),
			)
		}
	}
	return failures
}
