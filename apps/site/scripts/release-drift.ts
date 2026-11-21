/**
 * Reports a stale Release snapshot as one GitHub issue.
 *
 *   bun release-drift.ts
 *
 * `.github/workflows/release-drift.yml` runs it weekly and by hand. It opens, updates or closes the
 * issue titled "Release drift: ..." and stays green: a snapshot the owner has not refreshed yet is a
 * report, not a red run. It opens no branch and merges nothing.
 */
import { $ } from "bun"
import { RELEASE_SNAPSHOT } from "../src/lib/site/release-snapshot"
import { DRIFT_TITLE_PREFIX, driftBody, driftTitle, NOTHING_STALE } from "./release-drift-report"
import { checkRelease } from "./release-status"

/** One GitHub issue, as `gh issue list` writes it. */
interface Issue {
	readonly number: number
	readonly title: string
}

/** The one open issue whose title carries the prefix, so a second drift never opens a second issue. */
async function findIssue(): Promise<Issue | undefined> {
	const listed = await $`gh issue list --state open --limit 1000 --json number,title`.text()
	const issues = JSON.parse(listed) as readonly Issue[]
	return issues.find((issue) => issue.title.startsWith(DRIFT_TITLE_PREFIX))
}

async function main(): Promise<void> {
	const check = await checkRelease()
	const issue = await findIssue()
	console.log(`release:drift: ${check.message}`)
	if (check.status === "current") {
		if (issue !== undefined)
			await $`gh issue close ${issue.number} --comment ${NOTHING_STALE}`.quiet()
		return
	}
	if (check.status === "waiting") return
	const title = driftTitle(RELEASE_SNAPSHOT, check.feed)
	const body = driftBody(RELEASE_SNAPSHOT, check.feed)
	if (issue === undefined) {
		console.log((await $`gh issue create --title ${title} --body ${body}`.text()).trim())
		return
	}
	await $`gh issue edit ${issue.number} --title ${title} --body ${body}`.quiet()
	console.log(`release:drift: updated #${issue.number}`)
}

if (import.meta.main) await main()
