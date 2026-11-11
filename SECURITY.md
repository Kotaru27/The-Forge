# Security policy

## Supported state

The Forge is an **active public preview**. No separately versioned production release or long-term security support schedule has been announced. Security fixes and testing are handled on a case-by-case basis.

## Reporting a vulnerability

Do **not** disclose reproducible exploits, tokens, credentials, private SharePoint URLs, sensitive documents or customer files in a public GitHub issue or pull request.

If GitHub private vulnerability reporting is enabled on this repository, use **Security → Report a vulnerability** on the repository page. If that option is unavailable, the repository does **not** currently advertise a verified private security intake channel. Contact the maintainer through an appropriate private channel before sending vulnerability details; do not assume a public issue is private. The maintainer should enable GitHub private vulnerability reporting before directing people to a specific intake URL.

A useful private report describes the affected revision and browser, impact, minimal non-sensitive reproduction, and possible mitigations. Do not perform intrusive testing against systems or accounts you do not control.

## Security limitations

Automated unit and browser tests are not a security audit. The project processes local documents and media and has optional external asset/SharePoint workflows whose behavior depends on browser permissions and remote services. See [docs/RELEASE_CODE_AUDIT.md](docs/RELEASE_CODE_AUDIT.md) for known security-related engineering work and remaining acceptance gaps.
