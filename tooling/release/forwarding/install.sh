#!/bin/sh
# Forwarding installer: the last thing trajectonomics/cli serves. traj moved to
# trajectonomics/trajectonomics, so this says so and runs that repository's installer.
# TRAJ_VERSION and TRAJ_INSTALL_DIR pass through unchanged. Published only as an asset of
# release v0.3.1-moved in trajectonomics/cli; see README.md in this folder.
set -eu

NEW_BASE="https://github.com/trajectonomics/trajectonomics/releases/latest/download"

printf 'traj moved to github.com/trajectonomics/trajectonomics; installing from there.\n' >&2

tmp=$(mktemp -d)
trap 'rm -rf "$tmp"' EXIT INT TERM

if ! curl -fsSL -o "$tmp/install.sh" "$NEW_BASE/install.sh"; then
	printf 'traj: could not fetch %s/install.sh; check your network and retry.\n' "$NEW_BASE" >&2
	exit 1
fi

TRAJ_VERSION="${TRAJ_VERSION:-}" TRAJ_INSTALL_DIR="${TRAJ_INSTALL_DIR:-}" sh "$tmp/install.sh"
