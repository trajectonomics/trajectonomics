#!/usr/bin/env bash
# Re-renders docs/demo/traj-demo.gif from demo.tape with traj 0.4.0 from npm.
# Needs vhs, ttyd, ffmpeg, jq and Node (npx) on PATH. Scratch files and the
# downloaded release binary live under DEMO_GIF_CACHE (default ~/.cache/demo-gif).
# The tape makes its own ledger in a new temp directory on every take.
set -euo pipefail

here=$(cd "$(dirname "$0")" && pwd)
cache="${DEMO_GIF_CACHE:-$HOME/.cache/demo-gif}"

# vhs drives a headless Chromium it downloads itself; keep that browser under the
# cache. VHS_NO_SANDBOX is for hosts whose kernel blocks Chromium's sandbox
# (unprivileged user namespaces restricted by AppArmor); the tape is ours, so it
# is safe to render with it.
export XDG_CACHE_HOME="$cache/xdg"
export VHS_NO_SANDBOX=true

# The npm launcher caches the release binary under TRAJ_HOME/bin on first run.
# The tape sets its own TRAJ_HOME per take.
export TRAJ_HOME="$cache/home"
mkdir -p "$TRAJ_HOME" "$cache/bin"
npx -y @trajectonomics/cli@0.4.0 --version >/dev/null
ln -sfn "$TRAJ_HOME/bin/traj-0.4.0" "$cache/bin/traj"
export PATH="$cache/bin:$PATH"
export DEMO_DIR="$here"

cd "$here"
vhs demo.tape
