import { describe, expect, it } from "bun:test"
import { skillFrontmatter } from "./skill-frontmatter"
import { OPERATING_SKILL_PATH, read, SKILLS_SOURCE, section } from "./skills-test-support"

/**
 * Static checks on the handoff section of the operating Skill, `traj`: the install reads the scope,
 * the pin and the row before it installs, and says in plain words why it did not. The install line
 * itself and the "is not a router either" sentence stay in `traj.test.ts`.
 */
describe("the traj handoff section", () => {
	const source = read(OPERATING_SKILL_PATH)
	const { body } = skillFrontmatter(source, OPERATING_SKILL_PATH)
	const handoff = section(body, "Hand a job to the Skill that owns it")

	it("never links the manifest at a branch, so the link names the pin the install uses", () => {
		expect(source).not.toContain("blob/main")
		expect(handoff).toContain("skills.manifest.json")
		expect(handoff).toContain("at the commit this Skill's scope pinned")
	})

	it("reads the scope from both lists before any install", () => {
		expect(handoff).toContain("`npx skills list --json` and `npx skills list -g --json`")
		expect(handoff).toContain("this session's copy")
		expect(handoff).toContain("belongs to another setup")
	})

	it("reads the pin from the lock of the resolved scope, at the path that scope writes", () => {
		expect(handoff).toContain("`./skills-lock.json`")
		expect(handoff).toContain(`\`\${XDG_STATE_HOME}/skills/.skill-lock.json\``)
		expect(handoff).toContain("`~/.agents/.skill-lock.json`")
		expect(handoff).toContain("The list reports no commit")
	})

	it("reads the row's CLI Range from the manifest at that commit", () => {
		expect(handoff).toContain("`cliRange`")
	})

	it("installs nothing when the job's Skill is already listed in the resolved scope", () => {
		expect(handoff).toContain("install nothing and follow it")
	})

	it("gates on the floor, one direction, in the same words as onboarding Step 2", () => {
		expect(handoff).toContain("at or above its CLI Range floor, the range's lower bound")
		expect(handoff).toContain("Skip a row below its floor")
		expect(handoff).not.toMatch(/\bsatisf(y|ies|ied)\b/)
	})

	it("installs a row above its upper bound all the same, and discloses the range it was checked through", () => {
		expect(handoff).toContain("installed all the same")
		expect(handoff).toContain("the range the Skill was checked through")
		expect(handoff).toContain("`traj schema` is authoritative where the two differ")
	})

	it("installs from the pin with an explicit name, adds -g in the global scope, and confirms the list", () => {
		expect(handoff).toContain(`npx skills add ${SKILLS_SOURCE}#<commit> --skill <name> -y`)
		expect(handoff).toContain("Add `-g` to it in the global scope")
		expect(handoff).toContain("Then confirm from the same scope's list")
	})

	it("states the below-floor case, naming the row, the range it wants and the reason", () => {
		expect(handoff).toContain("Below the floor.")
		expect(handoff).toContain("name the row, the range it wants and the reason")
	})

	it("states the no-pin case, covering an older CLI and the archived source, and points at setup", () => {
		expect(handoff).toContain("No pin.")
		expect(handoff).toContain("lock records no `commit`")
		expect(handoff).toContain("`source` is `trajectonomics/skills`")
		expect(handoff).toContain("re-run setup with `traj-onboarding`")
	})

	it("keeps the no-row sentence word for word", () => {
		expect(handoff).toContain(
			"When the manifest has no row for the job, say `traj` has no Recipe for it yet and do the part the schema allows, rather than improvising the rest.",
		)
	})

	it("says the no-install cases do the part the schema allows", () => {
		expect(handoff.match(/do the part the schema allows/g)?.length).toBe(3)
	})

	it("never installs from a branch", () => {
		expect(handoff).toContain("Never install from `main`")
	})

	it("states the comparison rule in its own prose, because a Skill cannot read another's file", () => {
		expect(handoff).toContain("the first `X.Y.Z` token")
		expect(handoff).toContain("keeping any `-prerelease` suffix")
		expect(handoff).toContain("compare the three numbers in turn and never the strings")
		expect(handoff).toContain("`0.10.0` is above `0.9.0`")
		expect(handoff).toContain("a pre-release as below its release")
		expect(handoff).toContain("`1.4.0-rc.1` is below `1.4.0`")
	})

	it("compares the session's pinned command-line version, from the binary or the fallback", () => {
		expect(handoff).toContain("the session's pinned command-line version")
		expect(handoff).toContain("`traj --version`")
		expect(handoff).toContain("`npx -y @trajectonomics/cli@latest --version`")
	})
})
