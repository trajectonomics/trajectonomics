import { afterEach, describe, expect, it } from "bun:test"
import { join } from "node:path"
import { fileURLToPath } from "node:url"
import { type Snapshot, snapshotSchema } from "@trajectonomics/web/serve"
import { ledgerHome } from "../store/testing"
import { capture } from "../test-support"

// End to end: `bun src/index.ts dashboard` reads this ledger through itself and serves the packed
// pages. It needs apps/web's build (`turbo run build` makes it before this package's tests).
const ENTRY = fileURLToPath(new URL("../index.ts", import.meta.url))
const running: Bun.Subprocess<"ignore", "pipe", "pipe">[] = []

afterEach(() => {
	for (const child of running.splice(0)) child.kill("SIGKILL")
})

async function seededHome(): Promise<string> {
	const home = ledgerHome()
	const env = { TRAJ_HOME: home }
	await capture(["account", "add", "Cash", "--type", "asset", "--currency", "THB"], env)
	await capture(["account", "add", "Food", "--type", "expense", "--currency", "THB"], env)
	const tx = ["tx", "add", "--from", "Cash", "--to", "Food", "--amount", "120.50"]
	await capture([...tx, "--date", "2026-03-01"], env)
	return home
}

/** Starts the leaf on a free port and resolves with its URL once stderr names it. */
async function start(home: string): Promise<{ child: (typeof running)[number]; url: string }> {
	const argv = ["dashboard", "--as-of", "2026-03-31", "--horizon", "2027-03-31", "--port", "0"]
	const child = Bun.spawn([process.execPath, ENTRY, ...argv, "--json"], {
		env: { PATH: process.env["PATH"] ?? "", TRAJ_HOME: home },
		stdin: "ignore",
		stdout: "pipe",
		stderr: "pipe",
	})
	running.push(child)
	const decoder = new TextDecoder()
	let seen = ""
	for await (const chunk of child.stderr) {
		seen += decoder.decode(chunk)
		const url = /on (http:\/\/127\.0\.0\.1:\d+\/)/.exec(seen)?.[1]
		if (url !== undefined) return { child, url }
	}
	throw new Error(`traj dashboard stopped before serving: ${seen}`)
}

describe("traj dashboard, served", () => {
	it("serves the pages and this ledger's Snapshot, and prints its result on Ctrl-C", async () => {
		const { child, url } = await start(await seededHome())
		const page = await fetch(url)
		expect(page.status).toBe(200)
		expect(page.headers.get("content-type")).toBe("text/html; charset=utf-8")
		expect(await page.text()).toContain("<html")
		expect((await fetch(`${url}net-worth/`)).status).toBe(200)
		const snapshot = (await (await fetch(`${url}snapshot.json`)).json()) as Snapshot
		// The strict contract apps/web renders: a change in a read's --json output fails here too.
		expect(snapshotSchema.safeParse(snapshot).error).toBeUndefined()
		expect(snapshot.snapshotVersion).toBe(1)
		expect(snapshot.params.asOf).toBe("2026-03-31")
		expect(snapshot.reads.accounts.ok).toBe(true)
		const netWorth = snapshot.reads.netWorth
		expect(netWorth.ok ? netWorth.data.totals[0]?.amount : netWorth.error.message).toBe("-120.50")
		expect((await fetch(`${url}missing`)).status).toBe(404)
		child.kill("SIGINT")
		expect(await child.exited).toBe(0)
		const result = JSON.parse(await new Response(child.stdout).text())
		expect(result).toMatchObject({ url, asOf: "2026-03-31", horizon: "2027-03-31" })
		expect(result.reads).toBeGreaterThan(5)
	}, 30_000)

	it("refuses a request whose Host is not this machine", async () => {
		const { url } = await start(await seededHome())
		const refused = await fetch(`${url}snapshot.json`, { headers: { host: "evil.example" } })
		expect(refused.status).toBe(403)
	}, 30_000)

	it("stops with the ledger's own error when there is no ledger", async () => {
		const argv = ["dashboard", "--as-of", "2026-03-31", "--horizon", "2027-03-31", "--json"]
		const empty = join(ledgerHome(), "nothing-here")
		const res = await capture(argv, { TRAJ_HOME: empty, PATH: process.env["PATH"] })
		expect(res.code).toBe(4)
		expect(JSON.parse(res.err).error.code).toBe("ledger_missing")
	}, 30_000)
})
