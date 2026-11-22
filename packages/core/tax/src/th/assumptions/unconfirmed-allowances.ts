import { ThAssumptionFact as F } from "./facts"
import { figure } from "./unconfirmed-build"
import type { ThUnconfirmedFigure } from "./unconfirmed-types"

const R = "reported"
const P = "allowances.retirementCluster"
const ALL = [F.ClaimRmf, F.ClaimSsf, F.ClaimPvd, F.ClaimGpf, F.ClaimNsf, F.ClaimPensionLife]

/** The unconfirmed Section 47 allowance figures. */
export const TH_UNCONFIRMED_ALLOWANCES: readonly ThUnconfirmedFigure[] = [
	figure(R, "allowances.donations.donation2xMultiplier", "Donation multiplier.", F.ClaimDonation2x),
	figure(
		R,
		"allowances.lifeInsurance.combinedCeiling",
		"Life and health insurance ceiling, baht.",
		F.ClaimLifeInsurance,
		F.ClaimHealthInsurance,
	),
	figure(
		R,
		"allowances.lifeInsurance.healthCeiling",
		"Health insurance ceiling, baht.",
		F.ClaimHealthInsurance,
	),
	figure(
		R,
		"allowances.mortgageInterestCeiling",
		"Home-loan interest ceiling, baht.",
		F.ClaimMortgageInterest,
	),
	figure(
		R,
		"allowances.parentHealthInsuranceCeiling",
		"Parent health insurance ceiling, baht.",
		F.ClaimParentHealthInsurance,
	),
	figure(
		R,
		"allowances.socialSecurityFundCeiling",
		"Social security ceiling, baht a year.",
		F.ClaimSocialSecurity,
	),
	figure(R, `${P}.combinedCeiling`, "Retirement allowances combined ceiling, baht.", ...ALL),
	figure(R, `${P}.rmf.ceiling`, "RMF ceiling, baht a year.", F.ClaimRmf),
	figure(R, `${P}.rmf.maxRate`, "RMF limit, share of assessable income.", F.ClaimRmf),
	figure(R, `${P}.ssf.ceiling`, "SSF ceiling, baht a year.", F.ClaimSsf),
	figure(R, `${P}.ssf.maxRate`, "SSF limit, share of assessable income.", F.ClaimSsf),
	figure(R, `${P}.pvd.ceiling`, "Provident fund ceiling, baht a year.", F.ClaimPvd),
	figure(R, `${P}.pvd.maxRate`, "Provident fund limit, share of wages.", F.ClaimPvd),
	figure(R, `${P}.gpf.ceiling`, "Government pension fund ceiling, baht a year.", F.ClaimGpf),
	figure(R, `${P}.gpf.maxRate`, "Government pension fund limit, share of wages.", F.ClaimGpf),
	figure(R, `${P}.nsf.ceiling`, "National Savings Fund ceiling, baht a year.", F.ClaimNsf),
	figure(
		R,
		`${P}.pensionLifeInsurance.ceiling`,
		"Pension life insurance ceiling, baht.",
		F.ClaimPensionLife,
	),
	figure(
		R,
		`${P}.pensionLifeInsurance.maxRate`,
		"Pension life insurance limit, share of income.",
		F.ClaimPensionLife,
	),
	figure(R, "allowances.thaiEsg.ceiling", "ThaiESG ceiling, baht a year.", F.ClaimThaiEsg),
	figure(
		R,
		"allowances.thaiEsg.maxRate",
		"ThaiESG limit, share of assessable income.",
		F.ClaimThaiEsg,
	),
]
