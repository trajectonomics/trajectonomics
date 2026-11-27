import { BASE_URL } from "./config"

/** A cookie jar and JSON/form helpers: the spike's half of a browser, without a browser. */
export class Session {
	private readonly cookies = new Map<string, string>()

	async request(path: string, init: RequestInit = {}): Promise<Response> {
		const headers = new Headers(init.headers)
		headers.set("origin", BASE_URL)
		// Cloudflare sets this in production. Sending it locally exercises the rate-limit key.
		headers.set("cf-connecting-ip", "127.0.0.1")
		if (this.cookies.size > 0) {
			headers.set("cookie", this.cookieHeader())
		}
		const response = await fetch(new URL(path, BASE_URL), { ...init, headers })
		this.absorb(response)
		return response
	}

	async json<T>(path: string, init: RequestInit = {}): Promise<T> {
		const response = await this.request(path, init)
		const text = await response.text()
		if (!response.ok) {
			throw new Error(`${init.method ?? "GET"} ${path} -> ${response.status}: ${text}`)
		}
		return JSON.parse(text) as T
	}

	private absorb(response: Response): void {
		for (const header of response.headers.getSetCookie()) {
			const pair = header.split(";", 1)[0] ?? ""
			const separator = pair.indexOf("=")
			if (separator <= 0) continue
			const name = pair.slice(0, separator)
			const value = pair.slice(separator + 1)
			if (value === "") this.cookies.delete(name)
			else this.cookies.set(name, value)
		}
	}

	private cookieHeader(): string {
		return [...this.cookies].map(([name, value]) => `${name}=${value}`).join("; ")
	}
}

/** A form-encoded POST, which the OAuth and device endpoints accept. */
export function form(
	fields: Record<string, string> | string,
	headers: Record<string, string> = {},
): RequestInit {
	return {
		method: "POST",
		headers: { "content-type": "application/x-www-form-urlencoded", ...headers },
		body: typeof fields === "string" ? fields : new URLSearchParams(fields).toString(),
	}
}

/** A JSON POST. */
export function json(body: Record<string, unknown>): RequestInit {
	return {
		method: "POST",
		headers: { "content-type": "application/json" },
		body: JSON.stringify(body),
	}
}
