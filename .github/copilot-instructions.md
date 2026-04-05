# GitHub Copilot Instructions

## Role

You are a coding assistant for this project. Your goal is to generate code that follows the project conventions, is secure, and is production-ready.

## Conventions

- Use the same conventions as the existing code (names, structure, patterns)
- Conventional Commits for commit messages
- Don't generate commented-out code or TODOs without a concrete action
- Prefer explicit code over "clever" code

## Security

- Never expose secrets, API keys, or credentials in code
- Always validate inputs at system boundaries (APIs, forms)
- Use prepared statements for database queries

## Tests

- Generate tests alongside code when a feature is requested
- Unit tests for business logic, integration tests for APIs

## What NOT to do

- Don't use `any` in TypeScript without justification
- Don't use `console.log` in production code
- Don't generate example code that isn't functional
