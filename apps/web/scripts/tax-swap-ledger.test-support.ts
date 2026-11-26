// The scratch ledger the holder-swap test runs against (cli ADR-0075): a couple filing separately, a claim stated bare
// for the holder and another for the partner, then the household's roles swapped, served by the page's own write path.
import { join } from "node:path"
import type { TaxProfile } from "../src/lib/contract"
import { makeScratch, removeScratch } from "./scratch"
import type { Editor } from "./serve-edit"
import { openEditor } from "./swap-editor.test-support"
import { coupleDocument, household, store, taxSeparately, traj } from "./tax-notes-cli.test-support"

export { traj }
export const PLAN = "swap"

let scratch = ""
let home = ""

/** The plan as `scenario show` reads it: its stored profile, its hash and its household. */
type Shown = {
	scenario: {
		tax?: TaxProfile | null
		contentHash: string
		household: { people: { id: string; role: string }[] } & Record<string, unknown>
	}
}

const shown = (): Shown["scenario"] => (traj(home, ["scenario", "show", PLAN]) as Shown).scenario

/** The couple's ledger, with the claims written and the roles swapped before `--from-stored`, and an editor over it. */
export async function setupSwap(): Promise<Editor> {
	scratch = await makeScratch("traj-web-swap-")
	home = join(scratch, "traj-home")
	traj(home, ["init"])
	for (const [name, type] of [
		["Bank", "asset"],
		["Loan", "liability"],
		["Opening", "equity"],
	] as const) {
		traj(home, ["account", "add", name, "--type", type, "--currency", "THB"])
	}
	traj(
		home,
		"tx add --opening --from Opening --to Bank --amount 100000.00 --date 2026-01-01".split(" "),
	)
	const listed = traj(home, ["account", "list"]) as { accounts: { id: string; name: string }[] }
	const idOf = (name: string): string => {
		const found = listed.accounts.find((account) => account.name === name)
		if (found === undefined) throw new Error(`the scratch ledger has no account ${name}`)
		return found.id
	}
	store(home, PLAN, coupleDocument(idOf("Bank"), idOf("Loan")))
	traj(
		home,
		["scenario", "household", PLAN, "--file", "-"],
		JSON.stringify(household(idOf("Loan"))),
	)
	taxSeparately(
		home,
		PLAN,
		"--life-insurance 15000 --life-insurance partner=12000 --parents 2 --children partner=1".split(
			" ",
		),
	)
	swapHousehold()
	return openEditor(home, PLAN)
}

/** Swaps the household's holder and partner as the person does, before `--from-stored` runs. */
export function swapHousehold(): void {
	const { household: held } = shown()
	const people = held.people.map((person) =>
		person.role === "holder"
			? { ...person, role: "partner" }
			: person.role === "partner"
				? { ...person, role: "holder" }
				: person,
	)
	traj(home, ["scenario", "household", PLAN, "--file", "-"], JSON.stringify({ ...held, people }))
}

/** `traj scenario tax <plan> --from-stored`, the command the page names. */
export function fromStored(): void {
	traj(home, ["scenario", "tax", PLAN, "--from-stored"])
}

/** The stored profile as `scenario show` reads it. */
export function storedProfile(): TaxProfile | null {
	return shown().tax ?? null
}

/** The plan's content hash, which every Edit names. */
export function contentHash(): string {
	return shown().contentHash
}

export async function disposeSwap(): Promise<void> {
	if (scratch !== "") await removeScratch(scratch)
}
