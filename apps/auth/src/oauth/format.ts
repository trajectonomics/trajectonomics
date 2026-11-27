export function stringArray(value: unknown): string[] {
	if (Array.isArray(value)) return value.filter((item): item is string => typeof item === "string")
	if (typeof value !== "string") return []
	try {
		const parsed = JSON.parse(value)
		return Array.isArray(parsed)
			? parsed.filter((item): item is string => typeof item === "string")
			: []
	} catch {
		return []
	}
}

export function dateValue(value: unknown): number {
	if (value instanceof Date) return value.getTime()
	if (typeof value !== "string") return 0
	const parsed = new Date(value)
	return Number.isNaN(parsed.getTime()) ? 0 : parsed.getTime()
}

export function asIsoString(value: unknown): string | null {
	if (value instanceof Date) return value.toISOString()
	if (typeof value !== "string") return null
	const parsed = new Date(value)
	return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString()
}
