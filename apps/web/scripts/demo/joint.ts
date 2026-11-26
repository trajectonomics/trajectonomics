import type { DemoWrite } from "./separate"

/**
 * `joint`, the Demo's fourth Scenario: the same couple, salaries and claims as `separate`, filed jointly so the Tax
 * page can show what filing separately saves beside it (cli ADR-0075). It forks `separate`, so no figure is stated
 * twice, and writes one Return claiming the household's one child, the partner's two parents and both life premiums.
 */
export async function applyJointScenario(traj: DemoWrite): Promise<void> {
	await traj(["scenario", "fork", "separate", "joint"])
	await traj([
		"scenario",
		"tax",
		"joint",
		"--tax",
		"th-2026",
		"--filing-status",
		"married_joint",
		"--children",
		"1",
		"--parents",
		"2",
		"--life-insurance",
		"27000",
		"--label",
		"salary=income.section40_1",
		"--label",
		"partner-salary=income.section40_1",
	])
}
