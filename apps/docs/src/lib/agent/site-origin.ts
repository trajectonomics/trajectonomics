import { PageRefusalError } from "./refusal"

/** The ways the build cannot name the origin its twins' absolute links need; one value per rule. */
export type SiteOriginErrorCode = "SITE_MISSING"

/** A build whose `astro.config.ts` declares no site, so a twin's links cannot be made absolute. */
export class SiteOriginError extends PageRefusalError<SiteOriginErrorCode> {
	constructor(code: SiteOriginErrorCode, message: string, field: string) {
		super(code, message, field)
		this.name = "SiteOriginError"
		Object.freeze(this)
	}
}

/**
 * The Site's origin, from the site the build is configured with. Every absolute Portal URL starts
 * with it and a path that carries `/docs`; the Site is the Portal's host (ADR 0017).
 */
export function siteOrigin(site: URL | undefined): string {
	if (site === undefined) {
		throw new SiteOriginError(
			"SITE_MISSING",
			"astro.config.ts has no site, so the Markdown twins have no absolute origin",
			"site",
		)
	}
	return site.origin
}
