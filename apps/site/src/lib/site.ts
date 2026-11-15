/** The origin the Site is served from, so canonical and `hreflang` links can be absolute. */
export const SITE_ORIGIN = "https://trajectonomics.com"

/** The Site's name: the document title of every Language home, and the brand lockup's accessible name. */
export const SITE_NAME = "trajectonomics"

/**
 * The install command the Site shows: unpinned and without `-y`, because the visitor copies it as it
 * is. It is one value, the same text in every Language, and a fixture no edit may change silently.
 */
export const INSTALL_COMMAND = "npx skills add trajectonomics/skills --skill traj-onboarding"

/** The Docs Portal's path, which the router serves; this repository does not build it. */
export const DOCS_PATH = "/docs/"

/** The Docs Portal's CLI page, the traj CLI card's link name. */
export const DOCS_CLI_PATH = "/docs/cli/"

/** The CLI's v0.1.0 release date, the machine-readable date the hero's release line names. */
export const HERO_RELEASE_DATE = "2026-11-12"

/** The skills repository: the star menu, the Skills card's star link and the footer's licence name it. */
export const GITHUB_SKILLS_URL = "https://github.com/trajectonomics/skills"

/** The traj CLI's repository. */
export const GITHUB_CLI_URL = "https://github.com/trajectonomics/cli"

/** The Organisation, for the footer's link. */
export const GITHUB_ORG_URL = "https://github.com/trajectonomics"

/** The skills repository's MIT licence, the footer's licence link. */
export const SKILLS_LICENCE_URL = `${GITHUB_SKILLS_URL}/blob/main/LICENSE`

/** One repository the Star menu offers: the name a visitor reads, and where its star goes. */
export interface StarRepo {
	readonly name: string
	readonly url: string
}

/**
 * The repositories the Star menu lists, highest GitHub stars first. The list is frozen, because the
 * Site is static and a stale live count would be worse than none: adding a repository means
 * inserting it here in star order.
 */
export const STAR_REPOS: readonly StarRepo[] = Object.freeze([
	Object.freeze({ name: "traj CLI", url: GITHUB_CLI_URL }),
	Object.freeze({ name: "traj-onboarding", url: GITHUB_SKILLS_URL }),
])
