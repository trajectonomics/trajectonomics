#!/usr/bin/env bun
import { runHourlyCommand } from "./commands/hourly"
import { runQuotaCommand } from "./commands/quota"
import { runSendCommand } from "./commands/send"
import { runUsageCommand } from "./commands/usage"

const USAGE = `Usage:
  bun src/cli.ts [usage] [--since <ISO>] [--machine <name>] [--mistral-csv <path>] [--skip-opencode-before <ISO>]
  bun src/cli.ts quota
  bun src/cli.ts send [--url <url>] [--key-file <path>] [files...]
  bun src/cli.ts hourly [--config <path>]`

async function main(argv: readonly string[]): Promise<void> {
	const [command, ...rest] = argv
	if (command === undefined || command.startsWith("-")) {
		runUsageCommand(argv)
		return
	}
	if (command === "usage") {
		runUsageCommand(rest)
		return
	}
	if (command === "quota") {
		await runQuotaCommand(rest)
		return
	}
	if (command === "send") {
		await runSendCommand(rest)
		return
	}
	if (command === "hourly") {
		await runHourlyCommand(rest)
		return
	}
	console.error(`Unknown command: ${command}\n${USAGE}`)
	process.exitCode = 1
}

if (import.meta.main) await main(process.argv.slice(2))
