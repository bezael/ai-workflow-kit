# AGENTS.md — AI Workflow Kit

Cross-tool rules for AI coding agents. These conventions apply regardless of the tool being used.

## Code quality

- Read existing code before suggesting changes
- Follow patterns already established in the project
- Prefer editing existing files over creating new ones
- Don't add dependencies without mentioning it
- No `any` in TypeScript without justification
- Small functions with single responsibility
- Descriptive names: `getUserById` not `getUser`, `isEmailValid` not `checkEmail`
- Explicit error handling, no silent swallowing

## Commits

- Use Conventional Commits: `feat:` / `fix:` / `chore:` / `refactor:` / `docs:` / `test:`
- Commit messages in English
- Maximum 72 characters on the first line

## Tests

- Write tests when new logic is added
- One test per behavior, not per function
- Descriptive test names: `should return 404 when user not found`

## Security

- No hardcoded secrets, API keys, or credentials in code
- Validate inputs at system boundaries (APIs, forms)
- Sanitize before displaying user data in the DOM
- Use prepared statements for database queries

## What NOT to do

- Don't generate commented-out code or TODOs without a concrete action
- Don't use `console.log` in production code
- Don't generate example code that isn't functional
- Don't propose fixes before understanding the cause
