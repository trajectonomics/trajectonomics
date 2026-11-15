import { STAR_REPOS } from "../site"
import { type StarSnapshot, starredRepos, topStarLabel } from "./stars"
import raw from "./stars.json"

/** The committed snapshot `bun run stars:update` writes: the data the Star menu renders from. */
export const STAR_SNAPSHOT: StarSnapshot = Object.freeze({
	asOf: raw.asOf,
	stars: Object.freeze({ ...raw.stars }),
})

/** The repositories the Star menu lists, highest stars first, a repository at zero left out. */
export const STARRED_REPOS = starredRepos(STAR_SNAPSHOT, STAR_REPOS)

/** The count the trigger shows, or `undefined` when every listed repository is at zero. */
export const TOP_STAR_LABEL = topStarLabel(STARRED_REPOS)
