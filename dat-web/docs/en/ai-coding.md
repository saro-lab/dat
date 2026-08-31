# AI vibe coding

Tell an AI about your current project and the behavior you want to make DAT easier to integrate. In the examples below, change only the URL and environment variable names to match your project.

## Simple implementation

Use this prompt when you want to create the basic structure quickly.

```text
I'm using Kotlin and Spring Boot.
Add DAT authentication to Spring Security.

First, read https://dat.saro.me/llms.txt and review
the DAT specification and the official library documentation.

Verify the Bearer token from the Authorization header,
and put the user information in SecurityContext when authentication succeeds.

This server does not issue DATs; it only verifies them.
It must receive verify-only certificates from DAT CMS.

First look for the CMS server URL and token settings in the project.
If you cannot find them, ask me. Do not invent values.

Use the official Java/Kotlin DAT library,
and follow the existing project structure and coding style.
```

## Detailed implementation

Use this prompt when you want to specify the authentication flow and error handling precisely.

```text
This project uses Kotlin, Spring Boot, and Spring Security.
Review the current security configuration, then add DAT authentication.

First, read https://dat.saro.me/llms.txt and review
the DAT specification, certificate synchronization, and the official library API.

Implement the following requirements.

- Read the DAT from the Authorization: Bearer header.
- If no DAT is present, continue as an anonymous request.
- If the DAT is invalid or expired, respond with 401.
- On successful verification, put the user ID and permissions in SecurityContext.
- Read only values safe to expose from plain.
- Read the user ID and permissions from the verified secure data.
- This server is verify-only, so use verify-only certificates from DAT CMS.
- Read the CMS URL and token from environment variables.
- If certificate synchronization fails at startup, fail application startup too.
- Refresh certificates automatically while running, and close the manager at shutdown.
- Distinguish failure causes using DAT error codes, not error messages.
- Do not log the original DAT, CMS token, or personal data.

First inspect the project's Spring Security configuration and user/permission model.
If the CMS URL, token environment variable, or secure data format is unclear, ask before implementing.
Use only the public API of the official Java/Kotlin DAT library.

Before editing code, briefly explain the authentication flow and the files you will change.
```

## Which example should I choose?

- Use **Simple implementation** if you want to get working code first.
- Use **Detailed implementation** if you need an authentication flow for a production environment.

If the AI asks questions, start by providing the CMS URL, the environment variable that holds the token, and the user information stored in `secure`.
