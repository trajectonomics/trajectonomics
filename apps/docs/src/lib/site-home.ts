/**
 * The way back to the Site Home, the page at the root of trajectonomics.com that `apps/site`
 * deploys: its words and how the link loads. Pure, so a browser test asserts the link without
 * loading the React shell.
 */

import { APEX_ORIGIN } from "./site"

/** Visible text of the link to the Site Home. */
export const SITE_HOME_LABEL = "trajectonomics.com"

/**
 * Absolute URL of the Site Home. The Docs Portal is its own host, so `/` is the Landing Page
 * and the way back has to name trajectonomics.com (ADR 0013).
 */
export const SITE_HOME_PATH = `${APEX_ORIGIN}/`

/**
 * Attributes that make the Site Home a full document load. It is another host, so the Client
 * Router must not prefetch it on hover (ADR 0013).
 */
export const SITE_HOME_LOAD = {
	"data-astro-reload": true,
	"data-astro-prefetch": "false",
} as const
