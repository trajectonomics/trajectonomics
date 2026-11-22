import { CONSENT_COOKIE, VISITOR_COOKIE } from "../analytics/consent"
import { ROBOTS_FILE } from "../crawl/robots"
import { SITEMAP_FILE } from "../crawl/sitemap"
import { LANGUAGE_CHOICE_COOKIE } from "../language/stored-choice"
import type { Probe } from "./probe"
import {
	answered,
	choice,
	consent,
	home,
	moved,
	PAGE_MEDIA,
	personalised,
	ROBOTS_MEDIA,
	SITEMAP_MEDIA,
} from "./probe-requests"

/** A visitor id a probe sends as the one the Worker must write into the page. */
const VISITOR_ID = "3f2b8c1e-9a4d-4e7b-8c2a-1d5e6f7a8b9c"

export type { Probe, ProbeFailure, ProbeFailureCode, ProbeResponse } from "./probe"

/**
 * Every probe the local Worker must answer: the address in each Language the four inputs choose,
 * the choice link, every old prefix, both kinds of miss, both Crawler files, and the consent answers
 * the banner's links and the home they personalise.
 */
export const PROBES: readonly Probe[] = Object.freeze([
	home("en"),
	home("th", { acceptLanguage: "th" }),
	home("th", { country: "TH" }),
	home("th", { cookie: `${LANGUAGE_CHOICE_COOKIE}=th` }),
	home("en", { acceptLanguage: "en", country: "TH" }),
	home("en", { cookie: `${LANGUAGE_CHOICE_COOKIE}=../../etc/passwd` }),
	home("en", { cookie: `${LANGUAGE_CHOICE_COOKIE}=zz` }),
	choice("th"),
	choice("en"),
	choice(null),
	moved("/en"),
	moved("/en/"),
	moved("/en/anything"),
	moved("/th"),
	moved("/th/"),
	moved("/th/anything"),
	answered("/no-such-page", 404, "en", PAGE_MEDIA),
	answered("/__mf-preload.js", 404, null, PAGE_MEDIA),
	answered(`/${SITEMAP_FILE}`, 200, null, SITEMAP_MEDIA),
	answered(`/${ROBOTS_FILE}`, 200, null, ROBOTS_MEDIA),
	consent("granted"),
	consent("denied"),
	consent("reset"),
	personalised(
		"en",
		{ cookie: `${CONSENT_COOKIE}=granted; ${VISITOR_COOKIE}=${VISITOR_ID}` },
		{ contains: [`data-consent="granted"`, `data-visitor="${VISITOR_ID}"`] },
	),
	personalised(
		"en",
		{ cookie: `${CONSENT_COOKIE}=granted` },
		{ contains: [`data-consent="granted"`, `data-visitor="`], setsConsent: "visitor" },
	),
	personalised(
		"en",
		{ cookie: `${CONSENT_COOKIE}=denied` },
		{ contains: [`data-consent="denied"`], lacks: ["data-visitor"] },
	),
	personalised(
		"en",
		{ secGpc: "1" },
		{ contains: [`data-consent="denied"`], lacks: ["data-visitor"] },
	),
	{ ...home("en"), lacks: ['data-consent="'] },
])
