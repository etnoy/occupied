# Compatibility test environments

The CI matrix retains 18 consecutive monthly Home Assistant releases. Each month
runs the Python suite. The complete browser suite runs on the oldest release,
every six months after it, and the newest release.

Historical Python environments retain the official Home Assistant constraints,
with explicit security overrides recorded in the matrix policy. The compiler
removes only the affected constraints and generates hashed replacement pins.
Dependency checking permits only the declared Home Assistant requirement
mismatches; unrelated conflicts still fail. Official ranged constraints, such as
the older urllib3 `<2` restriction, receive the same recorded security repairs.

TLS repairs also require a compatible cloud/ACME/josepy dependency chain. The
older cloud package pins an ACME release whose josepy dependency references
OpenSSL APIs removed by patched pyOpenSSL releases. The matrix advances that
cloud dependency where necessary rather than permitting broken dependency ranges.

## Retained upstream Home Assistant advisory

[GHSA-mq77-rv97-285m](https://github.com/advisories/GHSA-mq77-rv97-285m) is a stored
XSS issue in Home Assistant's Energy dashboard, fixed in Home Assistant 2025.10.2.
The May–September 2025 packages remain in disposable CI environments to verify
compatibility with those actual releases. Upgrading them would remove that
coverage, so dependency review has an exception for this advisory ID. These Home
Assistant packages are test dependencies and are not included in Occupied's
release ZIP or wheel. Users should keep Home Assistant updated for upstream
security fixes; compatibility support does not backport fixes to Home Assistant.
