import { join } from "node:path"
import { STAR_REPOS } from "../src/lib/site"

/** The organisation whose repositories the snapshot covers. */
const ORG = "trajectonomics"

/** The committed snapshot the build reads, relative to this script. */
const SNAPSHOT = join(import.meta.dir, "..", "src", "lib", "site", "stars.json")

/** One repository as `gh api --jq` writes it: the repository's name and its star count. */
interface ApiRepo {
	readonly name: string
	readonly stars: number
}

/** Every repository of the organisation, read through the `gh` CLI's own credential. */
async function readOrgRepos(): Promise<readonly ApiRepo[]> {
	const gh = Bun.spawn(
		[
			"gh",
			"api",
			`orgs/${ORG}/repos?per_page=100`,
			"--paginate",
			"--jq",
			".[] | {name, stars: .stargazers_count}",
		],
		{ stderr: "inherit" },
	)
	const text = await new Response(gh.stdout).text()
	if ((await gh.exited) !== 0) throw new Error(`gh api could not list ${ORG}'s repositories.`)
	return text
		.split("\n")
		.filter((line) => line.trim() !== "")
		.map((line) => JSON.parse(line) as ApiRepo)
}

/** The snapshot text: the count of every repository the Star menu may list, and the date read. */
function snapshotText(repos: readonly ApiRepo[], asOf: string): string {
	const counts = new Map(repos.map((repo) => [repo.name, repo.stars]))
	const stars: Record<string, number> = {}
	for (const repo of STAR_REPOS) stars[repo.repo] = counts.get(repo.repo) ?? 0
	return `${JSON.stringify({ asOf, stars }, null, "\t")}\n`
}

const repos = await readOrgRepos()
const asOf = new Date().toISOString().slice(0, 10)
await Bun.write(SNAPSHOT, snapshotText(repos, asOf))
console.log(`wrote ${SNAPSHOT}: ${repos.length} repositories as of ${asOf}`)
