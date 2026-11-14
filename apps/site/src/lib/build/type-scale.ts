import type { BuiltFile } from "./built-files"

/** The font size in pixels and the font weight each type utility sets, read from the built CSS. */
export interface TypeScale {
	readonly sizesPx: Readonly<Record<string, number>>
	readonly weights: Readonly<Record<string, number>>
}

/** The browser's default root font size, which this Site never overrides. */
const PIXELS_PER_REM = 16

/** A length in pixels: `2.25rem` at 16px a rem, or a value already in `px`. */
function pixels(value: string): number | undefined {
	const rem = /^([\d.]+)rem$/.exec(value.trim())
	if (rem?.[1] !== undefined) return Number.parseFloat(rem[1]) * PIXELS_PER_REM
	const px = /^([\d.]+)px$/.exec(value.trim())
	return px?.[1] === undefined ? undefined : Number.parseFloat(px[1])
}

/** Every `--<prefix>-<name>` custom property in a stylesheet, first definition winning. */
function customProperties(css: string, prefix: string): ReadonlyMap<string, string> {
	const found = new Map<string, string>()
	for (const match of css.matchAll(new RegExp(`--${prefix}-([\\w-]+):\\s*([^;}]+)`, "g"))) {
		const name = match[1]
		const value = match[2]
		if (name === undefined || value === undefined) continue
		if (name.endsWith("--line-height") || found.has(name)) continue
		found.set(name, value.trim())
	}
	return found
}

/** The size each `text-*` utility sets, from `.text-4xl{font-size:var(--text-4xl)}`. */
function sizesIn(css: string): Readonly<Record<string, number>> {
	const scale = customProperties(css, "text")
	const sizes: Record<string, number> = {}
	for (const match of css.matchAll(/\.text-([\w-]+)\{[^}]*font-size:\s*var\(--text-([\w-]+)\)/g)) {
		const name = match[1]
		const size = pixels(scale.get(match[2] ?? "") ?? "")
		if (name !== undefined && size !== undefined) sizes[name] = size
	}
	return Object.freeze(sizes)
}

/** The weight each `font-*` utility sets, from `.font-bold{font-weight:var(--font-weight-bold)}`. */
function weightsIn(css: string): Readonly<Record<string, number>> {
	const scale = customProperties(css, "font-weight")
	const weights: Record<string, number> = {}
	for (const match of css.matchAll(
		/\.font-([\w-]+)\{[^}]*font-weight:\s*var\(--font-weight-([\w-]+)\)/g,
	)) {
		const weight = Number.parseFloat(scale.get(match[2] ?? "") ?? "")
		if (match[1] !== undefined && !Number.isNaN(weight)) weights[match[1]] = weight
	}
	return Object.freeze(weights)
}

/** The type scale the built stylesheets define, as a browser reads it. */
export function typeScaleOf(files: readonly BuiltFile[]): TypeScale {
	const css = files
		.filter((file) => file.path.endsWith(".css"))
		.map((file) => file.content)
		.join("\n")
	return Object.freeze({ sizesPx: sizesIn(css), weights: weightsIn(css) })
}
