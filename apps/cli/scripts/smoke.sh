#!/bin/sh
# The round trip every install channel must survive: one version, one init pair,
# one account, the schema, and one error envelope. Usage:
#
#   smoke.sh <version> <command...>
#
# The command is a binary path for the artifact smoke, or
# `npx --yes @trajectonomics/cli@<version>` for the channel smoke.
set -eu

version=$1
shift

# The scratch ledger and the two captured outputs go however the script ends.
envelope=""
log=""
cleanup() {
	[ -z "${TRAJ_HOME:-}" ] || rm -rf "$TRAJ_HOME"
	[ -z "$envelope" ] || rm -f "$envelope"
	[ -z "$log" ] || rm -f "$log"
}
trap cleanup EXIT

fail() {
	echo "smoke: $*" >&2
	exit 1
}

[ "$("$@" --version)" = "$version" ] || fail "--version did not report $version"

export TRAJ_HOME="$(mktemp -d)"
"$@" init --json | grep -q '"created":true' || fail "init did not report created"
"$@" init --json | grep -q '"created":false' || fail "init was not idempotent"
"$@" account add Cash --type asset --currency THB --json >/dev/null || fail "account add failed"
"$@" account list --json | grep -q '"name":"Cash"' || fail "account list lost the account"
"$@" schema --json | grep -q '"commands"' || fail "schema did not list the commands"

status=0
envelope="$(mktemp)"
"$@" --nope --json 2>"$envelope" >/dev/null || status=$?
[ "$status" -eq 2 ] || fail "an unknown flag exited $status, not 2"
grep -q 'unknown_flag' "$envelope" || fail "the error envelope did not name unknown_flag"

# The embedded Dashboard: only for a binary on a POSIX runner, where a background process and SIGINT
# behave the same everywhere. It proves the packed pages made it into this target's binary.
if [ -x "$1" ] && [ "$#" -eq 1 ]; then
	case "$(uname -s)" in
	MINGW* | MSYS* | CYGWIN*) ;;
	*)
		log="$(mktemp)"
		"$1" dashboard --as-of 2026-03-31 --horizon 2027-03-31 --port 0 >/dev/null 2>"$log" &
		pid=$!
		url=""
		tries=0
		while [ -z "$url" ] && [ "$tries" -lt 150 ]; do
			url="$(grep -o 'http://127\.0\.0\.1:[0-9]*/' "$log" || true)"
			tries=$((tries + 1))
			[ -n "$url" ] || sleep 0.2
		done
		[ -n "$url" ] || { kill "$pid" 2>/dev/null; fail "dashboard did not start: $(cat "$log")"; }
		curl -fsS "$url" | grep -q '<html' || { kill "$pid"; fail "dashboard served no page at $url"; }
		curl -fsS "${url}snapshot.json" | grep -q '"snapshotVersion":1' || { kill "$pid"; fail "dashboard served no Snapshot"; }
		kill -INT "$pid"
		wait "$pid" || fail "dashboard did not exit 0 on SIGINT"
		;;
	esac
fi

echo "smoke: $version ok"
