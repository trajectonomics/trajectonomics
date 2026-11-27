/**
 * The way back to the Site Home, the page at the root of trajectonomics.com that `apps/site`
 * deploys: its name and how the link loads. Pure, so a browser test asserts the link without
 * loading the React shell.
 */

/** Accessible name of the header's glyph tile, the way back to the Site Home, as the blog names its own (ADR 0009). */
export const SITE_HOME_NAME = "Trajectonomics home"

/**
 * The Site Home's path. The Site serves the root of the host the Portal's `/docs` mount lives on,
 * so the way back is `/` (ADR 0017).
 */
export const SITE_HOME_PATH = "/"

/**
 * Attributes that make the Site Home a full document load. The Site is another Worker and not a
 * route of this Astro app, so the Client Router must not prefetch or intercept it (ADR 0017).
 */
export const SITE_HOME_LOAD = {
	"data-astro-reload": true,
	"data-astro-prefetch": "false",
} as const
