import { describe, expect, test } from "bun:test"
import { readFileSync } from "node:fs"
import { join } from "node:path"

/** The Dashboard's folder, from this file in scripts/. */
const APP = join(import.meta.dir, "..")

/** A file of the app, read as text. */
function read(path: string): string {
	return readFileSync(join(APP, path), "utf8")
}

/** A brand Theme's CSS, found through the package's own exports, as the app imports it. */
function themeCss(theme: "light" | "dark"): string {
	return readFileSync(Bun.resolveSync(`@trajectonomics/brand/current/${theme}.css`, APP), "utf8")
}

/** The value of one custom property in a Theme's CSS. */
function token(css: string, name: string): string {
	const value = css.match(new RegExp(`--${name}:\\s*([^;]+);`))?.[1]
	if (value === undefined) throw new Error(`the Theme does not state --${name}`)
	return value.trim()
}

/** The web app manifest, as a browser reads it. */
interface Manifest {
	readonly background_color: string
	readonly theme_color: string
}

const manifest: Manifest = JSON.parse(read("public/manifest.webmanifest"))

describe("the app's head", () => {
	test("takes both theme colours from the brand Theme's background", () => {
		const html = read("src/app.html")
		const light = token(themeCss("light"), "ds-color-background")
		const dark = token(themeCss("dark"), "ds-color-background")
		expect(light).toBe("#ffffff")
		expect(dark).toBe("#0a0a0a")
		expect(html).toContain(
			`<meta name="theme-color" media="(prefers-color-scheme: light)" content="${light}" />`,
		)
		expect(html).toContain(
			`<meta name="theme-color" media="(prefers-color-scheme: dark)" content="${dark}" />`,
		)
	})

	test("states the light Theme's background in the manifest too", () => {
		const light = token(themeCss("light"), "ds-color-background")
		expect(manifest.theme_color).toBe(light)
		expect(manifest.background_color).toBe(light)
	})

	test("links the icon set, the touch icon and the manifest under the assets path", () => {
		const html = read("src/app.html")
		for (const link of [
			'<link rel="icon" href="%sveltekit.assets%/favicon/favicon.svg" type="image/svg+xml" />',
			'<link rel="icon" href="%sveltekit.assets%/favicon/favicon.ico" sizes="16x16 32x32 48x48" />',
			'<link rel="apple-touch-icon" href="%sveltekit.assets%/favicon/apple-touch-icon.png" />',
			'<link rel="manifest" href="%sveltekit.assets%/manifest.webmanifest" />',
		])
			expect(html).toContain(link)
	})

	test("titles a page with the product's name", () => {
		expect(read("src/app.html")).toContain("<title>Dashboard · Trajectonomics</title>")
	})

	test("holds the hosted share marker exactly once", () => {
		expect(read("src/app.html").match(/<!-- hosted:share -->/g)).toHaveLength(1)
	})
})
