import { afterEach, beforeEach } from "bun:test"
import { DEMO, statedCompare } from "../lib/view/what-if/fixtures.test-support"
import { editSession } from "./edit.svelte.js"
import { whatIfSession } from "./what-if.svelte.js"

export const HASH = `jcs1:sha256:${"ab".repeat(32)}`
export const realFetch = globalThis.fetch

/** The answer of a read or an Edit the server refused: the sentence the bar shows is "stub". */
export const REFUSED = { ok: false, error: { code: "x", exitCode: 1, message: "stub" } }

/** The answer of an Edit that ran: a Snapshot whose every Read failed, which the page takes as it is. */
const failed = { argv: [], ok: false, error: { code: "x", exitCode: 1, message: "none" } }
export const RAN = {
	ok: true,
	snapshot: {
		snapshotVersion: 1,
		cliVersion: "test",
		params: {
			asOf: "2026-10-31",
			horizon: "2060-12-31",
			scenarios: ["base"],
			compare: null,
			birthDate: null,
			ages: [],
			historyDates: [],
		},
		reads: {
			doctor: failed,
			accounts: failed,
			balance: failed,
			netWorth: failed,
			netWorthHistory: [],
			pnl: failed,
			transactions: failed,
			baseline: failed,
			scenarios: failed,
			documents: {},
			projections: {},
			fi: {},
			compare: null,
			chance: {},
		},
	},
}

/** The reads the fake server answers: each call is held until the test settles it. */
export type Held = {
	url: string
	body: { plan: string; removals: string[] }
	settle: (status?: number, answer?: unknown) => void
}

export const held: Held[] = []

/** Replaces `fetch` with a server that holds every `POST /what-if` until the test answers it. */
export function fakeServer(): void {
	held.length = 0
	globalThis.fetch = ((url: string, init: { body: string }) =>
		new Promise<Response>((resolve) => {
			held.push({
				url,
				body: JSON.parse(init.body),
				settle: (status = 200, answer = REFUSED) =>
					resolve(new Response(JSON.stringify(answer), { status })),
			})
		})) as unknown as typeof fetch
}

/** Waits long enough for the debounce and the microtasks that follow. */
export const settle = (ms = 400) => new Promise((resolve) => setTimeout(resolve, ms))

/** Gives each test a session token, and ends the session and answers any read still held after it. */
export function useSessionHooks(): void {
	beforeEach(() => {
		editSession.token = "token"
	})

	afterEach(async () => {
		whatIfSession.end()
		// A read still held would keep the one reader busy for the next test: answer it, and let it return.
		for (const call of held) call.settle()
		await settle(10)
		editSession.token = null
		globalThis.fetch = realFetch
	})
}

/** The server's answer to a what-if: the Demo's `retire-early` reads stand in for the what-if, with this compare. */
export function demoAnswer(compare: unknown = statedCompare()): unknown {
	return {
		ok: true,
		reads: {
			projection: DEMO.reads.projections["retire-early"],
			fi: DEMO.reads.fi["retire-early"],
			compare: { argv: [], ok: true, data: compare },
			chance: DEMO.reads.chance["retire-early"] ?? null,
		},
	}
}

/** Opens a session on `plan` with one switch and answers its read, as the server would. */
export async function openDemoSession(
	plan = "base",
	compare: unknown = statedCompare(),
): Promise<void> {
	fakeServer()
	whatIfSession.setOff(plan, HASH, "flows.rent", true)
	await settle()
	held[0]?.settle(200, demoAnswer(compare))
	await settle(50)
}
