import {
	INDEXNOW_ENDPOINT,
	INDEXNOW_KEY,
	INDEXNOW_KEY_FILE,
	INDEXNOW_KEY_URL,
	indexNowPayload,
} from "../src/lib/crawl/indexnow"

/**
 * How long the key file may take to answer. The run refuses to ping anything else, so a slow network
 * fails the run rather than the site's reputation with the endpoint.
 */
const KEY_TIMEOUT_MS = 10_000

/** Whether the deployed Site serves the key file, with the key in it: what the endpoint checks first. */
export async function keyIsLive(): Promise<boolean> {
	const response = await fetch(INDEXNOW_KEY_URL, { signal: AbortSignal.timeout(KEY_TIMEOUT_MS) })
	if (response.status !== 200) return false
	return (await response.text()).trim() === INDEXNOW_KEY
}

/** The submission, once the key is live: what the endpoint answered, or the reason it was not asked. */
export async function submit(): Promise<number> {
	if (!(await keyIsLive())) {
		throw new Error(
			`${INDEXNOW_KEY_URL} does not serve the key yet. Deploy the Site first, then run this again.`,
		)
	}
	const response = await fetch(INDEXNOW_ENDPOINT, {
		method: "POST",
		headers: { "content-type": "application/json; charset=utf-8" },
		body: JSON.stringify(indexNowPayload()),
	})
	if (!response.ok) {
		throw new Error(`${INDEXNOW_ENDPOINT} answered ${response.status} ${response.statusText}.`)
	}
	return response.status
}

if (import.meta.main) {
	try {
		const status = await submit()
		console.log(
			`indexnow: ${indexNowPayload().urlList.length} URLs submitted as ${INDEXNOW_KEY_FILE}, ${status}`,
		)
	} catch (error) {
		console.error(`indexnow: ${error instanceof Error ? error.message : String(error)}`)
		process.exitCode = 1
	}
}
