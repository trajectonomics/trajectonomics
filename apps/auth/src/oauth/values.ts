import { resourceValues } from "../core/resource-request"

export function readField(source: unknown, field: string): unknown {
	if (source === null || typeof source !== "object") return undefined
	return (source as Record<string, unknown>)[field]
}

export function storedResources(value: unknown): string[] {
	if (typeof value === "string") {
		try {
			return resourceValues(JSON.parse(value))
		} catch {
			return []
		}
	}
	return resourceValues(value)
}

export function deviceScopes(value: unknown): string[] {
	if (typeof value !== "string") return []
	return value.split(/\s+/).filter((scope) => scope !== "")
}

export function asDate(value: unknown): Date | null {
	if (value instanceof Date) return value
	if (typeof value !== "string") return null
	const parsed = new Date(value)
	return Number.isNaN(parsed.getTime()) ? null : parsed
}

/** The SHA-256/base64url hash Better Auth 1.7.28 stores for a refresh token. */
export async function hashToken(value: string): Promise<string> {
	const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value))
	let binary = ""
	for (const byte of new Uint8Array(digest)) binary += String.fromCharCode(byte)
	return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "")
}
