# The README demo: a fictional ledger answers "when can I stop working?".
# Re-render with docs/demo/render.sh, which pins traj 0.4.0 from npm.
# Requires vhs, ttyd, ffmpeg and jq on PATH. Every figure is fictional, in THB.

Output traj-demo.gif

Set Shell "bash"
Set FontSize 16
Set Width 1240
Set Height 640
Set Padding 14
Set Framerate 15
Set TypingSpeed 18ms

# A fresh ledger in a new temp directory, so the take starts at init and the
# recording never shows a home directory.
Hide
Type "export PS1='$ '"
Enter
Type 'cd "$(mktemp -d)" && export TRAJ_HOME="$PWD/traj"'
Enter
Type "clear"
Enter
Show

Type "traj init"
Enter
Sleep 1500ms

Type "traj account add Opening --type equity --currency THB > /dev/null"
Enter
Sleep 200ms
Type "traj account add Savings --type asset --currency THB > /dev/null"
Enter
Sleep 200ms
Type "traj account add 'Index fund' --type asset --currency THB > /dev/null"
Enter
Sleep 200ms
Type "traj account add 'Car loan' --type liability --currency THB > /dev/null"
Enter
Sleep 500ms

Type "traj tx add --opening --from Opening --to Savings --amount 420000.00 --date 2026-01-01 > /dev/null"
Enter
Sleep 200ms
Type "traj tx add --opening --from Opening --to 'Index fund' --amount 1100000.00 --date 2026-01-01 > /dev/null"
Enter
Sleep 200ms
Type "traj tx add --opening --from Opening --to 'Car loan' --amount -180000.00 --date 2026-01-01 > /dev/null"
Enter
Sleep 500ms

Type "traj report networth --as-of 2026-11-22 --json | jq -c '.totals'"
Enter
Sleep 1500ms

# The Scenario names the ledger's own account ids, which exist only now. Writing
# it and clearing the screen happen out of sight, so the question starts a clean frame.
Hide
Type 'bash "$DEMO_DIR/make-scenario.sh" > base.json; clear'
Enter
Sleep 300ms
Show

Type "# when can I stop working? 90,000 THB a month in, 40,000 THB out, the rest saved"
Enter
Sleep 400ms
Type "traj scenario apply base --file base.json > /dev/null"
Enter
Sleep 800ms

Type "traj fi --scenario base --as-of 2026-11-22 --horizon 2066-11-21 --json | jq -c '.fi | {reachable, fiDate}'"
Enter
Sleep 4s
