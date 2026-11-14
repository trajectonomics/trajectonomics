/** A colour reduced to its three 8-bit channels, which is all a contrast ratio needs. */
export interface Rgb {
	readonly red: number
	readonly green: number
	readonly blue: number
}

/** A `#rgb`, `#rgba`, `#rrggbb` or `#rrggbbaa` value; the alpha channel does not change the ratio. */
const HEXADECIMAL = /^#([0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i

/** The colour a CSS value names, or `undefined` when this check cannot resolve it. */
export function parseRgb(value: string): Rgb | undefined {
	const digits = HEXADECIMAL.exec(value.trim())?.[1]
	if (digits === undefined) return undefined
	const short = digits.length <= 4
	const channels = short ? [...digits.slice(0, 3)].map((digit) => digit.repeat(2)) : []
	const pairs = short ? channels : [digits.slice(0, 2), digits.slice(2, 4), digits.slice(4, 6)]
	const [red = "", green = "", blue = ""] = pairs
	return Object.freeze({
		red: Number.parseInt(red, 16),
		green: Number.parseInt(green, 16),
		blue: Number.parseInt(blue, 16),
	})
}

/** WCAG relative luminance: 0 for black, 1 for white. */
export function relativeLuminance(rgb: Rgb): number {
	const linear = (channel: number): number => {
		const scaled = channel / 255
		return scaled <= 0.04045 ? scaled / 12.92 : ((scaled + 0.055) / 1.055) ** 2.4
	}
	return 0.2126 * linear(rgb.red) + 0.7152 * linear(rgb.green) + 0.0722 * linear(rgb.blue)
}

/** WCAG contrast ratio of two colours: 1 for a colour on itself, 21 for black on white. */
export function contrastRatio(a: Rgb, b: Rgb): number {
	const first = relativeLuminance(a)
	const second = relativeLuminance(b)
	const lighter = Math.max(first, second)
	const darker = Math.min(first, second)
	return (lighter + 0.05) / (darker + 0.05)
}

/** Whether two written colour values name the same colour, however the CSS wrote each one. */
export function sameColour(first: string, second: string): boolean {
	if (first.trim().toLowerCase() === second.trim().toLowerCase()) return true
	const a = parseRgb(first)
	const b = parseRgb(second)
	if (a === undefined || b === undefined) return false
	return a.red === b.red && a.green === b.green && a.blue === b.blue
}
