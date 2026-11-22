/**
 * What a Thai tax computation did, in the terms an unconfirmed figure depends on.
 *
 * Purpose: The closed vocabulary that ties one computation to the statutory figures it used, so the
 * calculator and the Levy emitter can both name the same assumptions without sharing code.
 * Math: No arithmetic; a discriminator only.
 * Units: Dimensionless.
 * Throws: Nothing.
 * @statute Thailand Revenue Code Sections 40(5)–(6), 40(4), 47, 48(4)–(5).
 */
export const ThAssumptionFact = {
	/** Section 40(5) building rental income took the standard expense rate. */
	Rate40_5Building: "rate.section40_5.building",
	/** Section 40(5) agricultural land rental income took the standard expense rate. */
	Rate40_5AgriculturalLand: "rate.section40_5.agriculturalLand",
	/** Section 40(5) non-agricultural land rental income took the standard expense rate. */
	Rate40_5NonAgriculturalLand: "rate.section40_5.nonAgriculturalLand",
	/** Section 40(5) vehicle rental income took the standard expense rate. */
	Rate40_5Vehicles: "rate.section40_5.vehicles",
	/** Section 40(5) other rental income took the standard expense rate. */
	Rate40_5Other: "rate.section40_5.other",
	/** Section 40(6) medical income took the standard expense rate. */
	Rate40_6Medical: "rate.section40_6.medical",
	/** Section 40(6) income of any other liberal profession took the standard expense rate. */
	Rate40_6Other: "rate.section40_6.other",
	/** Digital asset income was taxed as final withholding. */
	DigitalAssetFinal: "rate.digitalAsset.final",
	/** A Retirement Mutual Fund contribution was claimed. */
	ClaimRmf: "claim.rmf",
	/** A Super Savings Fund contribution was claimed. */
	ClaimSsf: "claim.ssf",
	/** A provident fund contribution was claimed. */
	ClaimPvd: "claim.pvd",
	/** A government pension fund contribution was claimed. */
	ClaimGpf: "claim.gpf",
	/** A National Savings Fund contribution was claimed. */
	ClaimNsf: "claim.nsf",
	/** A pension life insurance premium was claimed. */
	ClaimPensionLife: "claim.pension_life",
	/** A ThaiESG contribution was claimed. */
	ClaimThaiEsg: "claim.thai_esg",
	/** A social security contribution was claimed. */
	ClaimSocialSecurity: "claim.social_security",
	/** A life insurance premium was claimed. */
	ClaimLifeInsurance: "claim.life_insurance",
	/** A health insurance premium was claimed. */
	ClaimHealthInsurance: "claim.health_insurance",
	/** A parent health insurance premium was claimed. */
	ClaimParentHealthInsurance: "claim.parent_health_insurance",
	/** Home-loan interest was claimed. */
	ClaimMortgageInterest: "claim.mortgage_interest",
	/** A donation to an institution that earns the doubled allowance was claimed. */
	ClaimDonation2x: "claim.donation_2x",
	/** A Section 48(5) separate sheet was filed. */
	SeparateSheet: "regime.separate_sheet",
	/** A severance payment took the Section 48(5) exemption. */
	SeveranceExemption: "regime.severance_exemption",
	/** A real estate transfer took the holding-period expense table. */
	RealEstateHoldingTable: "regime.real_estate_holding_table",
} as const

/**
 * Union of {@link ThAssumptionFact} values.
 *
 * Purpose: Narrow type for one thing a computation did.
 * Math: No arithmetic.
 * Units: Dimensionless.
 * Throws: Nothing.
 * @statute Thailand Revenue Code Sections 40(5)–(6), 40(4), 47, 48(4)–(5).
 */
export type ThAssumptionFact = (typeof ThAssumptionFact)[keyof typeof ThAssumptionFact]
