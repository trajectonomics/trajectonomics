/** The packages the Dashboard may not depend on: React and Astro, which it has left for Svelte 5. */
const FORBIDDEN = new Set(["react", "react-dom", "astro"])

/** The shape of a package.json that the guard reads: its two dependency maps. */
export interface PackageManifest {
	readonly dependencies?: Readonly<Record<string, string>>
	readonly devDependencies?: Readonly<Record<string, string>>
}

/**
 * The dependencies a package lists that the Dashboard may not have: react, react-dom, astro and any
 * @astrojs package. Sorted, so a failure reads the same each time. Empty when the manifest is clean.
 */
export function forbiddenDependencies(manifest: PackageManifest): string[] {
	const names = [
		...Object.keys(manifest.dependencies ?? {}),
		...Object.keys(manifest.devDependencies ?? {}),
	]
	return [
		...new Set(names.filter((name) => FORBIDDEN.has(name) || name.startsWith("@astrojs/"))),
	].sort()
}
