import type { D1Database } from "@cloudflare/workers-types"
import type { Env } from "../../src/env"
import { handleRequest } from "../../src/http/router"
import { NOW_MS } from "./fixtures"
import { get, type harness, ingestRequest } from "./http"
import { TEST_JWKS } from "./token"

/** Seeds rows through the real ingest route, failing loudly if the seed is rejected. */
export async function seed(
	context: ReturnType<typeof harness>,
	rows: unknown[],
	quota: unknown[] = [],
): Promise<void> {
	const response = await handleRequest(ingestRequest({ usage: rows, quota }), context.env, {
		nowMs: NOW_MS,
		cache: context.cache,
		jwks: TEST_JWKS,
	})
	if (response.status !== 200) throw new Error(`seed failed with ${response.status}`)
}

/** Reads a path through the router with the harness cache and clock. */
export function read(context: ReturnType<typeof harness>, path: string): Promise<Response> {
	return handleRequest(get(path), context.env, { nowMs: NOW_MS, cache: context.cache })
}

/** An env whose D1 throws on any statement, to exercise the stale path. */
export function failingEnv(context: ReturnType<typeof harness>): Env {
	return {
		...context.env,
		DB: {
			prepare: () => {
				throw new Error("storage down")
			},
		} as unknown as D1Database,
	}
}

/** Reads a path against a chosen env but the harness cache and clock. */
export function readWith(
	context: ReturnType<typeof harness>,
	env: Env,
	path: string,
): Promise<Response> {
	return handleRequest(get(path), env, { nowMs: NOW_MS, cache: context.cache })
}
