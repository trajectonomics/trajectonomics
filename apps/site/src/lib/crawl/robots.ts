import { SITEMAP_URL } from "./sitemap"

/** The Robots file's built path, relative to the Worker's assets root. */
export const ROBOTS_FILE = "robots.txt"

/**
 * The Robots file: every agent may read every path, and the Sitemap is named. It carries no
 * `Disallow:`, because it is read at the host root and would speak for `/docs` too, which another
 * repository serves.
 */
export const ROBOTS = `User-agent: *
Allow: /

Sitemap: ${SITEMAP_URL}
`
