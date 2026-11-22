/** One cookie, split into its name and the value before any parameter. */
export interface Cookie {
	readonly name: string
	readonly value: string
}

/**
 * Every cookie the `Cookie` header carries, in the order it was sent.
 *
 * Shared by the Language choice and the consent choice, so the two read a header the same way. A part
 * with no name is skipped, and a value keeps any `=` it contains.
 */
export function cookiesOf(header: string): readonly Cookie[] {
	return header.split(";").flatMap((part) => {
		const [rawName = "", ...rest] = part.split("=")
		const name = rawName.trim()
		if (name.length === 0) return []
		return [{ name, value: rest.join("=").trim() }]
	})
}

/** The value of the first cookie a header names, or `undefined` when the header names none. */
export function cookieNamed(header: string | null, name: string): string | undefined {
	if (header === null) return undefined
	return cookiesOf(header).find((cookie) => cookie.name === name)?.value
}
