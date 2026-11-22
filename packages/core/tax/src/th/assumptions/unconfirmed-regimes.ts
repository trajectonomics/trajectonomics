import { ThAssumptionFact as F } from "./facts"
import { figure } from "./unconfirmed-build"
import type { ThUnconfirmedFigure } from "./unconfirmed-types"

const R = "reported"
const U = "unsourced"
const E = "expenses"

/** The unconfirmed standard expense rates, final withholding rate and special-regime figures. */
export const TH_UNCONFIRMED_REGIMES: readonly ThUnconfirmedFigure[] = [
	figure(R, `${E}.section40_5.building`, "Building rental expense rate.", F.Rate40_5Building),
	figure(
		R,
		`${E}.section40_5.agriculturalLand`,
		"Farmland rental expense rate.",
		F.Rate40_5AgriculturalLand,
	),
	figure(
		R,
		`${E}.section40_5.nonAgriculturalLand`,
		"Other land rental expense rate.",
		F.Rate40_5NonAgriculturalLand,
	),
	figure(R, `${E}.section40_5.vehicles`, "Vehicle rental expense rate.", F.Rate40_5Vehicles),
	figure(R, `${E}.section40_5.other`, "Other rental expense rate.", F.Rate40_5Other),
	figure(R, `${E}.section40_6.medical`, "Medical profession expense rate.", F.Rate40_6Medical),
	figure(R, `${E}.section40_6.other`, "Other liberal profession expense rate.", F.Rate40_6Other),
	figure(
		U,
		"finalWithholding.digitalAssetRate",
		"Digital asset withholding rate; assumed equal to the interest rate.",
		F.DigitalAssetFinal,
	),
	figure(
		R,
		"separateSheet.minYearsOfService",
		"Years of service a separate sheet needs.",
		F.SeparateSheet,
	),
	figure(
		U,
		"separateSheet.exemptionCeiling",
		"Severance exemption ceiling, baht.",
		F.SeveranceExemption,
	),
	figure(
		U,
		"separateSheet.exemptionWageDays",
		"Severance exemption, days of last wage.",
		F.SeveranceExemption,
	),
	figure(
		U,
		"realEstate.expenseTable[*].minYears",
		"Real estate holding years per expense rate.",
		F.RealEstateHoldingTable,
	),
	figure(
		U,
		"realEstate.expenseTable[*].rate",
		"Real estate expense rate by holding years.",
		F.RealEstateHoldingTable,
	),
]
