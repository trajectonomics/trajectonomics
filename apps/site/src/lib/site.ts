/** The origin the Site is served from, so canonical and `hreflang` links can be absolute. */
export const SITE_ORIGIN = "https://trajectonomics.com"

/** The Site's name: the document title of every Language home, and the wordmark's accessible name. */
export const SITE_NAME = "trajectonomics"

/**
 * The install command the Site shows: unpinned and without `-y`, because the visitor copies it as it
 * is. It is one value, the same text in every Language, and a fixture no edit may change silently.
 */
export const INSTALL_COMMAND = "npx skills add trajectonomics/internal-skills --skill traj"

/** The Docs Portal's path, which the router serves; this repository does not build it. */
export const DOCS_PATH = "/docs/"

/** The cli repository: its source, its licence and its stars all live there. */
export const GITHUB_CLI_URL = "https://github.com/trajectonomics/cli"

/** The Organisation, for the footer's link. */
export const GITHUB_ORG_URL = "https://github.com/trajectonomics"

/** The cli repository's MIT licence, the footer's licence link. */
export const CLI_LICENCE_URL = `${GITHUB_CLI_URL}/blob/main/LICENSE`
