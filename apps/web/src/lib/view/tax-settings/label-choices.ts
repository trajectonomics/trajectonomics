/**
 * The tax labels an income Flow may carry, as `traj scenario tax --label` lists them (`--help`), each with the words a person
 * reads. The ids are the Edit's own list (`src/lib/edit/tax-labels.ts`), which `scripts/tax-cards.test.ts` reads from the
 * binary, so a label `traj` adds or drops fails the test. Pure.
 */
import { INCOME_LABEL_IDS } from "../../edit/tax-labels"
import type { Choice } from "../plan-items/options"

const NAMES: Readonly<Record<(typeof INCOME_LABEL_IDS)[number], string>> = {
	"income.section40_1": "Salary and wages, section 40(1)",
	"income.section40_2": "Fees for services, section 40(2)",
	"income.section40_3": "Royalties and copyright, section 40(3)",
	"income.section40_4": "Other investment income, section 40(4)",
	"income.section40_4.interest": "Interest, section 40(4)",
	"income.section40_4.dividends": "Dividends, section 40(4)",
	"income.section40_4.digitalAssets": "Digital assets, section 40(4)",
	"income.section40_5.building": "Rent of a building, section 40(5)",
	"income.section40_5.agriculturalLand": "Rent of farm land, section 40(5)",
	"income.section40_5.nonAgriculturalLand": "Rent of other land, section 40(5)",
	"income.section40_5.vehicles": "Rent of vehicles, section 40(5)",
	"income.section40_5.other": "Other rent, section 40(5)",
	"income.section40_6.medical": "Medical profession, section 40(6)",
	"income.section40_6.law": "Law profession, section 40(6)",
	"income.section40_6.engineering": "Engineering profession, section 40(6)",
	"income.section40_6.architecture": "Architecture profession, section 40(6)",
	"income.section40_6.accounting": "Accounting profession, section 40(6)",
	"income.section40_6.fineArts": "Fine arts profession, section 40(6)",
	"income.section40_6.other": "Other liberal profession, section 40(6)",
	"income.section40_7": "Contracting, section 40(7)",
	"income.section40_8.general": "Business and commerce, section 40(8)",
	"income.section40_8.entertainer": "Entertainer, section 40(8)",
}

/** The income labels in the CLI's order, with the statute section each one is. */
export const INCOME_LABELS: readonly Choice[] = INCOME_LABEL_IDS.map((id) => ({
	value: id,
	label: NAMES[id],
}))

/** The choices of the label field: nothing chosen first, because no label is a default. */
export const LABEL_CHOICES: readonly Choice[] = [
	{ value: "", label: "Choose a tax label" },
	...INCOME_LABELS,
]
