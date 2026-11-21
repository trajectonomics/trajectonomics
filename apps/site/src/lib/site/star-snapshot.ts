import { STAR_REPOS } from "../site"
import { type StarSnapshot, starredRepos } from "./stars"
import raw from "./stars.json"

/** The committed snapshot `bun run stars:update` writes: the data the Star menu renders from. */
export const STAR_SNAPSHOT: StarSnapshot = Object.freeze({
	asOf: raw.asOf,
	stars: Object.freeze({ ...raw.stars }),
})

/** The repositories the Star menu lists, highest stars first, a repository at zero left out. */
export const STARRED_REPOS = starredRepos(STAR_SNAPSHOT, STAR_REPOS)

/** The repository the trigger names: the highest count, or `undefined` when nothing is listed. */
export const TOP_REPO_NAME = STARRED_REPOS[0]?.name
