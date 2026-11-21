import { STAR_REPOS } from "../site"
import { type StarSnapshot, starredRepos } from "./stars"
import raw from "./stars.json"

/** The committed snapshot `bun run stars:update` writes: the count the header's repository link prints. */
export const STAR_SNAPSHOT: StarSnapshot = Object.freeze({
	asOf: raw.asOf,
	stars: Object.freeze({ ...raw.stars }),
})

/** The repositories with a star, highest first. A repository at zero is absent, and the link still prints zero. */
export const STARRED_REPOS = starredRepos(STAR_SNAPSHOT, STAR_REPOS)
