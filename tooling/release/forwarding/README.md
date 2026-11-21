# Forwarding installers (cutover, owner)

`install.sh` and `install.ps1` here are the last release of `trajectonomics/cli`. Each prints
one line saying traj moved, then runs the installer of `trajectonomics/trajectonomics`.

Run these after the first `cli-v*` release exists in `trajectonomics/trajectonomics`
(runbook step d), or the forwarders fetch a 404. From a clean checkout of `main`:

```sh
gh release create v0.3.1-moved --repo trajectonomics/cli --latest \
  --title "traj has moved to trajectonomics/trajectonomics" \
  --notes "traj moved. Install from https://github.com/trajectonomics/trajectonomics/releases/latest/download/install.sh (or install.ps1)." \
  tooling/release/forwarding/install.sh tooling/release/forwarding/install.ps1
gh repo archive trajectonomics/cli --yes
```

Only these two files are assets. Older launchers and `TRAJ_VERSION` pins keep working: each
pins its exact version's assets (`releases/download/v<version>/...`), which stay in the
archived repository. Archiving is read-only, not deletion, so nothing is lost.
