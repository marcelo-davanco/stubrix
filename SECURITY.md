# Security Policy

## Supported Versions

This is a personal open-source project maintained by a single developer. Security fixes are applied to the latest version on the `main` branch on a best-effort basis.

| Version         | Supported          |
| --------------- | ------------------ |
| latest (`main`) | :white_check_mark: |
| older releases  | :x:                |

## Reporting a Vulnerability

**Do not open a public GitHub issue for security vulnerabilities.**

Please use [GitHub's private vulnerability reporting](../../security/advisories/new) to disclose security issues responsibly. This ensures the report is only visible to the maintainer until a fix is released.

### What to include in your report

- Description of the vulnerability and its potential impact.
- Steps to reproduce (environment, endpoint, payload, etc.).
- Any relevant logs, screenshots, or proof-of-concept.
- Your suggested fix or mitigation, if any.

### What to expect

This project is maintained in my free time, so response times may vary. I'll do my best to:

- Acknowledge the report within **7 days**.
- Provide an initial assessment within **14 days**.
- Release a fix as soon as reasonably possible, depending on severity.

## Scope & Intended Use

Stubrix is a **local development and testing tool** — it is designed to run mock servers on developer machines or CI environments. It is **not intended to be exposed to the public internet** or used in production to serve real traffic.

With that in mind, certain attack vectors (e.g., DoS on a public endpoint) are out of scope for this project.

## Security Considerations

- **Secret management:** No hardcoded secrets — sensitive configuration is managed via environment variables (`.env`). The `.env` file is gitignored; `.env.example` is provided as a reference.
- **Input validation:** The NestJS API uses `class-validator` with `whitelist: true` to strip unknown properties from incoming requests.
- **Docker isolation:** Mock engines (WireMock, Mockoon) run inside Docker containers with limited port exposure.
- **No authentication:** The control panel API and UI have **no built-in authentication**. This is by design for a local development tool. If you need to expose the control panel on a network, use a reverse proxy with authentication.
- **File system access:** The API reads and writes mock files (`mocks/` directory). Ensure the container and host volumes have appropriate permissions.

## Responsible Disclosure

I ask that you:

- Give me reasonable time to investigate and fix the issue before any public disclosure.
- Avoid accessing, modifying, or deleting data that does not belong to you during testing.
- Act in good faith and within the scope of this repository.
