#!/usr/bin/env bun
/**
 * Reads collector JSON lines from stdin and POSTs them to a local data Worker.
 * This is a development helper; wrangler bundles only src/worker.ts.
 */
export {}

const url = process.env.INGEST_URL ?? "http://127.0.0.1:8787/ingest"
const key = process.env.INGEST_BOOTSTRAP_KEY ?? "local-test"
const text = await Bun.stdin.text()
const usage = text
	.split("\n")
	.map((line) => line.trim())
	.filter((line) => line.length > 0)
	.map((line) => JSON.parse(line) as unknown)
const response = await fetch(url, {
	method: "POST",
	headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
	body: JSON.stringify({ usage }),
})
console.log(response.status, await response.text())
