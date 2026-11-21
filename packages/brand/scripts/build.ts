/**
 * Builds the brand package. `bun run build` does three things:
 *
 * 1. tsdown bundles the JS API from `src/` into `dist/` (it cleans `dist/` first).
 * 2. For every folder in `brands/`, writes `dist/brands/<brand>/`: `light.css` and `dark.css`
 *    from the brand's Themes, plus the logo, favicon and font assets from its `assets/`.
 * 3. Copies the brand named by `BRAND` (default `trajectonomics`) to `dist/current/`, so apps
 *    import one fixed path and a white-label build is `BRAND=<name> bun run build`.
 *
 * The brand-agnostic `tailwind.css` and `typography.css` are copied to `dist/` unchanged.
 */
import { cp, rm, writeFile } from "node:fs/promises"
import { join } from "node:path"
import { fileURLToPath, pathToFileURL } from "node:url"
import { brands } from "../src/brands"
import { themeToCss } from "../src/theme/index"
import type { Theme } from "../src/tokens/index"
import { buildAssets } from "./build-assets"

/** The brand a build uses when `BRAND` is not set. */
export const DEFAULT_BRAND = "trajectonomics"

/** The package root, the folder that holds `src/`, `brands/` and `dist/`. */
const PACKAGE_ROOT = fileURLToPath(new URL("..", import.meta.url))

/** The brand a build mirrors into `dist/current/`: `BRAND` when set, else the default brand. */
export function selectedBrand(environment: NodeJS.ProcessEnv = process.env): string {
	return environment["BRAND"] || DEFAULT_BRAND
}

/** Fails with a message that names the brands that exist, when `brand` is not one of them. */
export function assertBrandExists(brand: string, available: readonly string[]): void {
	if (available.includes(brand)) return
	throw new Error(
		`BRAND=${brand} is not a brand. Add brands/${brand}/ or pick one of: ${available.join(", ")}.`,
	)
}

/** Imports a brand's Theme file and checks that it default-exports a Theme with the expected name. */
async function loadTheme(path: string, name: "light" | "dark"): Promise<Theme> {
	const module: { default?: unknown } = await import(pathToFileURL(path).href)
	const theme = module.default as Theme | undefined
	if (theme === undefined || theme.name !== name) {
		throw new Error(`${path} must default-export a Theme named "${name}".`)
	}
	return theme
}

/** Writes one brand's output into `outputDirectory`: its Theme CSS and its assets. */
export async function writeBrand(brandDirectory: string, outputDirectory: string): Promise<void> {
	await buildAssets({
		sourceDirectory: join(brandDirectory, "assets", "svg"),
		fontsDirectory: join(brandDirectory, "assets", "fonts"),
		outputDirectory,
	})
	for (const name of ["light", "dark"] as const) {
		const theme = await loadTheme(join(brandDirectory, `${name}.ts`), name)
		await writeFile(join(outputDirectory, `${name}.css`), themeToCss(theme))
	}
}

/** Builds every brand under `dist/brands/` and mirrors `brand` into `dist/current/`. */
export async function buildBrands(
	packageRoot: string,
	brand: string,
	dist: string = join(packageRoot, "dist"),
): Promise<void> {
	const names = brands(join(packageRoot, "brands"))
	assertBrandExists(brand, names)
	for (const name of names) {
		await writeBrand(join(packageRoot, "brands", name), join(dist, "brands", name))
	}
	for (const shared of ["tailwind.css", "typography.css"]) {
		await cp(join(packageRoot, shared), join(dist, shared))
	}
	await rm(join(dist, "current"), { recursive: true, force: true })
	await cp(join(dist, "brands", brand), join(dist, "current"), { recursive: true })
}

if (import.meta.main) {
	const brand = selectedBrand()
	assertBrandExists(brand, brands())
	const tsdown = Bun.spawn(["bunx", "tsdown"], {
		cwd: PACKAGE_ROOT,
		stdout: "inherit",
		stderr: "inherit",
	})
	if ((await tsdown.exited) !== 0) throw new Error("tsdown failed to bundle src/.")
	await buildBrands(PACKAGE_ROOT, brand)
}
