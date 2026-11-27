import { form, type Session } from "./http"
import type { RequestResult } from "./types"

export function formWithResources(
	fields: Record<string, string>,
	resources: readonly string[] | undefined,
	headers?: Record<string, string>,
): RequestInit {
	const params = new URLSearchParams(fields)
	for (const resource of resources ?? []) params.append("resource", resource)
	return form(params.toString(), headers)
}

export async function requestResult(
	session: Session,
	path: string,
	init: RequestInit,
): Promise<RequestResult> {
	const response = await session.request(path, init)
	const text = await response.text()
	let body: Record<string, unknown> = {}
	try {
		const parsed = JSON.parse(text)
		if (parsed !== null && typeof parsed === "object") body = parsed as Record<string, unknown>
	} catch {
		body = { text }
	}
	return { status: response.status, body }
}
