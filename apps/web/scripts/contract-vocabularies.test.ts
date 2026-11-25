import { describe, expect, test } from "bun:test"
import { mkdtemp, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { fileURLToPath } from "node:url"
import { scenarioAccount, scenarioFlow } from "../src/lib/contract"
import { COMPOUNDINGS } from "../src/lib/view/plan-items/accounts"
import { ROUNDINGS as ASSET_ROUNDINGS } from "../src/lib/view/plan-items/asset-shape"
import { LOAN_COMPOUNDINGS, LOAN_ROUNDINGS } from "../src/lib/view/plan-items/loan-check"
import {
	FREQUENCIES,
	KIND_CHOICES,
	PAYOUT_FREQUENCY_CHOICES,
} from "../src/lib/view/plan-items/options"
import { ROUNDINGS as WITHDRAWAL_ROUNDINGS } from "../src/lib/view/withdrawals/rule"
import { spawnCapture } from "./spawn"
import { type Follow, vocabularyProblems, wordsAt } from "./vocabulary"

/** The workspace's own traj binary, built by `turbo run build --filter=@trajectonomics/cli`. */
const BINARY = fileURLToPath(new URL("../../cli/dist/traj", import.meta.url))

/** Where the Scenario document's words are in `traj schema "scenario apply" --json`. */
const DOCUMENT = "document.schema.properties"
const FLOW = `${DOCUMENT}.flows.items.properties`
const ACCOUNT = `${DOCUMENT}.accounts.items.properties`

/** The words of a choice list, without its blank "choose" entry. */
const valuesOf = (choices: readonly { value: string }[]): string[] =>
	choices.map((choice) => choice.value).filter((value) => value !== "")

/**
 * Each web list against the word list the CLI states. `same` is a closed enum of the contract: the pages branch on
 * those words, so a word the CLI adds must reach the contract. `within` is a list a form offers: it may offer fewer
 * words than the CLI accepts, never one the CLI refuses. The words the pages only show (compounding, rounding, a
 * payout's frequency) are plain strings in the contract and have no copy here to follow.
 */
const LISTS: readonly { label: string; web: readonly string[]; path: string; follow: Follow }[] = [
	{
		label: "Flow kind",
		web: scenarioFlow.shape.kind.options,
		path: `${FLOW}.kind.enum`,
		follow: "same",
	},
	{
		label: "Flow frequency",
		web: scenarioFlow.shape.frequency.options,
		path: `${FLOW}.frequency.enum`,
		follow: "same",
	},
	{
		label: "Account kind",
		web: scenarioAccount.shape.kind.options,
		path: `${ACCOUNT}.kind.enum`,
		follow: "same",
	},
	{
		label: "the form's Flow frequencies",
		web: FREQUENCIES,
		path: `${FLOW}.frequency.enum`,
		follow: "within",
	},
	{
		label: "the form's Account kinds",
		web: valuesOf(KIND_CHOICES),
		path: `${ACCOUNT}.kind.enum`,
		follow: "within",
	},
	{
		label: "the form's compoundings",
		web: COMPOUNDINGS,
		path: `${ACCOUNT}.compounding.enum`,
		follow: "within",
	},
	{
		label: "the form's loan compoundings",
		web: LOAN_COMPOUNDINGS,
		path: `${ACCOUNT}.compounding.enum`,
		follow: "within",
	},
	{
		label: "the form's payout frequencies",
		web: valuesOf(PAYOUT_FREQUENCY_CHOICES),
		path: `${ACCOUNT}.payout.properties.frequency.enum`,
		follow: "within",
	},
	{
		label: "the form's payout roundings",
		web: ASSET_ROUNDINGS,
		path: `${ACCOUNT}.payout.properties.rounding.enum`,
		follow: "within",
	},
	{
		label: "the form's loan roundings",
		web: LOAN_ROUNDINGS,
		path: `${FLOW}.level.properties.rounding.enum`,
		follow: "within",
	},
	{
		label: "the form's spending-rule roundings",
		web: WITHDRAWAL_ROUNDINGS,
		path: `${FLOW}.rule.properties.rounding.enum`,
		follow: "within",
	},
]

/** The parsed `traj schema "scenario apply" --json`, read with a scratch ledger directory so no real ledger is touched. */
async function readSchema(): Promise<unknown> {
	const home = await mkdtemp(join(tmpdir(), "traj-vocab-"))
	try {
		if (home === "") throw new Error("no scratch directory for TRAJ_HOME")
		const captured = await spawnCapture([BINARY, "schema", "scenario apply", "--json"], {
			env: { ...process.env, DO_NOT_TRACK: "1", TRAJ_HOME: home },
		})
		if (captured.code !== 0)
			throw new Error(`traj schema failed: ${captured.stderr}${captured.stdout}`)
		return JSON.parse(captured.stdout)
	} finally {
		await rm(home, { recursive: true, force: true })
	}
}

describe("the closed vocabularies of the web contract follow `traj schema`", () => {
	test("every list names the words the built CLI states", async () => {
		const schema = await readSchema()
		const problems = LISTS.flatMap(({ label, web, path, follow }) => {
			const cli = wordsAt(schema, path)
			if (cli === null)
				return [`${label}: \`traj schema "scenario apply"\` has no word list at ${path}.`]
			return vocabularyProblems(label, web, cli, follow)
		})
		expect(problems).toEqual([])
	}, 60_000)
})
