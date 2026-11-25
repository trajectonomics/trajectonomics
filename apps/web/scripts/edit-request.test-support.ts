// A request to the loopback server as the Dashboard's page sends it, with each header the guards read.

import { EDIT_TOKEN_HEADER } from "../src/lib/edit/guard"
import type { PlanParams } from "../src/lib/snapshot"

export const PORT = 4321
export const TOKEN = "test-session-token"

/** The Plan's parameters the write tests run with: the dates are fixed, and only one plan is projected. */
export const PARAMS: PlanParams = {
	asOf: "2026-10-31",
	horizon: "2060-12-31",
	scenarios: [],
	compare: null,
	birthDate: null,
	ages: [],
	monthly: false,
	carryIn: false,
	chance: null,
	allowances: null,
	futures: true,
	readPaths: false,
}

/** Headers of a request the page sends: this Host, this Origin, the token, and application/json. */
export function goodHeaders(): Record<string, string> {
	return {
		host: `127.0.0.1:${PORT}`,
		origin: `http://127.0.0.1:${PORT}`,
		[EDIT_TOKEN_HEADER]: TOKEN,
		"content-type": "application/json",
	}
}

/** A `POST /edit`, with the good headers, each one overridden or removed (null) by `change`. */
export function editRequest(change: Record<string, string | null>, body: string): Request {
	const headers = goodHeaders()
	for (const [name, value] of Object.entries(change)) {
		if (value === null) delete headers[name]
		else headers[name] = value
	}
	return new Request(`http://127.0.0.1:${PORT}/edit`, { method: "POST", headers, body })
}

/** A `GET` of a path with the given Host header. */
export function getRequest(path: string, host: string = `127.0.0.1:${PORT}`): Request {
	return new Request(`http://127.0.0.1:${PORT}${path}`, { headers: { host } })
}
