/** One `Accept-Language` entry: its primary subtag, and the quality the browser gives it. */
export interface LanguageTag {
	readonly subtag: string
	readonly quality: number
}

/** A missing or unreadable quality counts as 1, as the header's grammar says. */
const DEFAULT_QUALITY = 1

/** The quality a tag's parameters carry, or the default when it names none. */
function qualityOf(parameters: readonly string[]): number {
	for (const parameter of parameters) {
		const [name = "", value = ""] = parameter.split("=")
		if (name.trim().toLowerCase() !== "q") continue
		const quality = Number.parseFloat(value)
		return Number.isNaN(quality) ? DEFAULT_QUALITY : quality
	}
	return DEFAULT_QUALITY
}

/** Every tag in one `Accept-Language` header, in the order it was sent. */
export function parseAcceptLanguage(header: string | null): readonly LanguageTag[] {
	if (header === null) return Object.freeze([])
	const tags = header
		.split(",")
		.map((part) => part.trim())
		.filter((part) => part.length > 0)
		.map((part) => {
			const [tag = "", ...parameters] = part.split(";")
			const subtag = tag.trim().toLowerCase().split("-")[0] ?? ""
			return Object.freeze({ subtag, quality: qualityOf(parameters) })
		})
	return Object.freeze(tags)
}
