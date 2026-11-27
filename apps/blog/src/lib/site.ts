/** The Site's origin: since 2026-11-27 every static site is served under it. */
export const SITE_ORIGIN = "https://trajectonomics.com"

/** The path the Site serves the blog under; `assets.base_path` in wrangler.jsonc must match it. */
export const BLOG_BASE = "/blog"

/** The blog's front page, relative to its base; `treePath` turns it into a public address. */
export const BLOG_PATH = "/"

/** The Site Home: the landing page at the root of the apex. */
export const SITE_HOME_PATH = "/"

/** The Site Home as an absolute URL, for the places that must state one, such as `llms.txt`. */
export const SITE_HOME_URL = `${SITE_ORIGIN}${SITE_HOME_PATH}`

/** The Docs Portal's path on the Site, where a link to it goes. */
export const DOCS_PATH = "/docs/"

/** The Docs Portal as an absolute URL, for the places that must state one, such as `llms.txt`. */
export const DOCS_URL = `${SITE_ORIGIN}${DOCS_PATH}`

/** The organisation's name, as the header's glyph and the footer name it. */
export const SITE_NAME = "Trajectonomics"

/** The monorepo that holds the blog's source. */
export const SOURCE_URL = "https://github.com/trajectonomics/trajectonomics"

/** Where a reader reports a wrong fact on a page. */
export const ISSUES_URL = `${SOURCE_URL}/issues`

/** The blog's licence. */
export const LICENCE_URL = `${SOURCE_URL}/blob/main/apps/blog/LICENSE`

/** The organisation on GitHub. */
export const GITHUB_ORG_URL = "https://github.com/trajectonomics"
