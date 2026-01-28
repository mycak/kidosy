---
applyTo: '**'
---

# General Coding Guidelines

## Related Guidelines

- For TypeScript and React specific guidelines, see [typescript-react.instructions.md](./typescript-react.instructions.md)

## Code Style

- Maintain consistent coding style across the entire project for readability and maintainability
- Follow established conventions and patterns within the codebase
- Use proper indentation and formatting

## Naming Conventions

- Use **camelCase** for variables, functions, and methods
- Use **UPPERCASE** for configuration variables and constants
- Use **PascalCase** for classes, components, and types
- Use descriptive names that clearly communicate purpose and functionality
- Avoid abbreviations unless they are widely understood

### Descriptive Parameters and Variables

- Do not use single-letter names (e.g., a, b, x) except for well-known counters in very small scopes (i, j in short loops). Prefer domain-specific names like attraction, item, segment, user.
- Function parameters must be descriptive; avoid shadowing and ambiguous names.
- Never use the `any` type. Prefer precise types, generics, or `unknown` with proper narrowing. For third-party data, define interfaces/types.
- For optional values, use explicit `| undefined` and optional chaining (?.) to keep intent clear.

## Functional Programming

- Leverage functional programming principles like pure functions and immutability
- Create more predictable and testable code
- Prefer immutable data structures
- Use higher-order functions when appropriate

## Error Handling and Validation

- Implement robust error handling throughout the application
- Add proper input validation to prevent unexpected behavior
- Use type-safe error handling patterns
- Provide meaningful error messages
- Prefer try catch blocks for synchronous code and promise rejections for asynchronous code

## Performance and Optimization

- Be mindful of performance bottlenecks
- Optimize code for efficiency without sacrificing readability
- Use appropriate data structures and algorithms
- Profile and measure performance improvements

## Security Best Practices

- Follow security guidelines to protect against common vulnerabilities
- Sanitize user inputs
- Use secure authentication and authorization patterns
- Keep dependencies up to date

#### DRY (Don't Repeat Yourself)

- Extract common functionality into reusable functions, components, or hooks
- Use shared components for UI elements that appear in multiple places
- Create utility functions for repeated logic
- Leverage existing helpers and formatters instead of reimplementing

#### KISS (Keep It Simple, Stupid)

- Write clear, straightforward code that's easy to understand
- Avoid over-engineering solutions
- Choose simple solutions over complex ones when both achieve the same result
- Keep functions focused on a single responsibility

#### SOLID Principles

1. **Single Responsibility**: Each component/function should have one reason to change
2. **Open/Closed**: Components should be open for extension but closed for modification
3. **Liskov Substitution**: Derived components should be substitutable for their base components
4. **Interface Segregation**: Don't force components to depend on interfaces they don't use
5. **Dependency Inversion**: Depend on abstractions (interfaces/types) not concrete implementations

#### YAGNI (You Aren't Gonna Need It)

- Don't add functionality until it's actually needed
- Avoid premature optimization
- Don't create abstractions for single use cases
- Build what's required now, not what might be needed later

### Code Comments

- Use comments to explain complex logic or non-obvious code
- Avoid obvious comments that state the code's purpose
- Use JSDoc or similar tools for documenting functions, parameters, and return types
- Keep comments up to date with code changes

### OTHER

- Replace all repeated numeric or string literals with named constants using UPPER_SNAKE_CASE. For example:

const LIMIT = 4;
const GENERAL_ORDER = 'date_updated';

- Avoid hardcoded “magic values” scattered throughout the codebase. Group related constants in dedicated files like constants.ts or keep them scoped within modules if only used locally.

- Always handle empty or missing data when building UI components:
- When rendering lists or tables, check if the data is empty and display a user-friendly message or empty state component (e.g. <EmptyState />, "No results found").
- Ensure data exists before accessing nested properties. Use optional chaining (?.) and default values where appropriate.

### TypeScript Strictness

- Enable and keep TypeScript strict mode. Avoid `as any` casts. If a cast is necessary, prefer type guards or utility helpers to narrow types safely.
- Export and reuse shared domain types (e.g., TAttraction) instead of duplicating ad-hoc interfaces.

## UI/UX Guidelines

- **Button Cursor**: All buttons have `cursor: pointer` applied globally in CSS. Avoid adding redundant `cursor-pointer` classes to button elements.
- **Disabled Button Cursor**: Disabled buttons automatically get `cursor: not-allowed` styling.
