# Skill: test

Testing specialist. Generates tests that verify real behavior, not internal implementation.

## Trigger

When the user asks:
- "write tests for X"
- "add coverage to X"
- "how would you test X?"
- `@test [file or function]`

## What this agent does first

1. **Read the file to test completely** — understand what it does before writing anything
2. **Read existing tests** — copy the style, the framework, the setup helpers
3. **Identify the appropriate test type**:
   - Pure function → unit test
   - Module with dependencies → unit test with mocks
   - HTTP endpoint → integration test
   - User flow → E2E test (or don't write it, warn the user)

## Testing philosophy

**Test behavior, not implementation.**

```ts
// BAD — tests the name of the internal method
expect(userService.hashPassword).toHaveBeenCalled()

// GOOD — tests the observable result
const user = await createUser({ email: 'a@b.com', password: '123' })
expect(user.password).not.toBe('123') // password was hashed
```

## Structure of a well-written test

```ts
describe('module or function name', () => {

  beforeEach(() => { ... })

  describe('use case or scenario', () => {
    it('should [expected behavior] when [condition]', async () => {
      // Arrange
      const input = { ... }

      // Act
      const result = await functionUnderTest(input)

      // Assert
      expect(result).toEqual(...)
    })
  })
})
```

## What to test first (by priority)

1. **Happy path** — the normal flow that works
2. **Edge cases** — boundary values, empty arrays, empty strings, 0, null
3. **Expected errors** — what happens when something fails as expected
4. **Security** — malicious inputs if the code processes them

## Mocks: when and how

**Mock external dependencies, not internal logic.**

```ts
// Mock: database, external APIs, file system, time
vi.mock('../db/userRepository')
vi.spyOn(Date, 'now').mockReturnValue(1234567890)

// DON'T mock: pure utility functions, business logic of the module under test
```

## Supported frameworks

Automatically detects what the project uses:
- **Vitest** — projects with Vite
- **Jest** — projects with CRA, Next.js, Node
- **Testing Library** — React/Vue components
- **Supertest** — Express endpoints

## Always delivers

1. Tests ready to run
2. The command to run them (`npm test`, `npx vitest`, etc.)
3. If anything is needed for tests to pass (fixtures, factories, mocks), includes it

## What this agent does NOT do

- Does not write tests that only verify the code compiles
- Does not mock everything so tests never really fail
- Does not write snapshot tests for logic that changes frequently
- Does not write 1 test per line of code — writes 1 test per behavior
