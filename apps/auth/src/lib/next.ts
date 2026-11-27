/**
 * `?next=` is a same-origin path, never an address. The sign-in page sends a person to it after a
 * successful sign-in, so an attacker-supplied value must not be able to leave the auth origin.
 */
export function safeNextPath(value: string | null | undefined): string | undefined {
	if (value === null || value === undefined) return undefined
	const trimmed = value.trim()
	if (!trimmed.startsWith("/") || trimmed.startsWith("//") || trimmed.startsWith("/\\")) {
		return undefined
	}
	if (trimmed.includes("\\") || hasControlCharacter(trimmed)) return undefined
	try {
		const url = new URL(trimmed, "https://auth.invalid")
		if (url.origin !== "https://auth.invalid") return undefined
		// `/..//evil.com` normalizes to `//evil.com`, which a browser reads as another host.
		if (!url.pathname.startsWith("/") || url.pathname.startsWith("//")) return undefined
		return `${url.pathname}${url.search}${url.hash}`
	} catch {
		return undefined
	}
}

/** A control character cannot appear in a path the browser is asked to open. */
function hasControlCharacter(value: string): boolean {
	for (const character of value) {
		const code = character.charCodeAt(0)
		if (code < 32 || code === 127) return true
	}
	return false
}
