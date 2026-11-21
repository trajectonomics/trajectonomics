/** The committed star snapshot: one count per GitHub repository, and the date the counts were read. */
export interface StarSnapshot {
	readonly asOf: string
	readonly stars: Readonly<Record<string, number>>
}

/** A repository with the star count the committed snapshot recorded. */
export interface StarredRepo {
	readonly repo: string
	readonly name: string
	readonly url: string
	readonly stars: number
}

/** A star count the way the repository link shows it: `1`, `999`, `1K`, `2.1K`, `60.4K`. */
export function formatStarCount(count: number): string {
	const stars = Math.max(0, Math.trunc(count))
	if (stars < 1000) return String(stars)
	const thousands = Math.round((stars / 1000) * 10) / 10
	return `${Number.isInteger(thousands) ? thousands.toFixed(0) : thousands.toFixed(1)}K`
}

/** The repositories with a star, highest first. A repository at zero is left out. */
export function starredRepos(
	snapshot: StarSnapshot,
	repos: readonly { readonly repo: string; readonly name: string; readonly url: string }[],
): readonly StarredRepo[] {
	const listed = repos.flatMap((repo) => {
		const stars = snapshot.stars[repo.repo]
		return stars === undefined || stars <= 0 ? [] : [Object.freeze({ ...repo, stars })]
	})
	return Object.freeze(listed.sort((left, right) => right.stars - left.stars))
}

/** The highest count formatted, or `undefined` when every repository is at zero. */
export function topStarLabel(repos: readonly StarredRepo[]): string | undefined {
	const top = repos[0]?.stars
	return top === undefined ? undefined : formatStarCount(top)
}
