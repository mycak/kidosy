---
applyTo: '**/*.ts,**/*.tsx'
---

# Project coding standards for TypeScript and React

<!-- Apply the [general coding guidelines](./general-coding.instructions.md) to all code. -->

## TypeScript Guidelines

- Use TypeScript for all new code
- Follow functional programming principles where possible
- Use interfaces for data structures and type definitions
- Prefer immutable data (const, readonly)
- Use optional chaining (?.) and nullish coalescing (??) operators
- Avoid enums - use `as const` objects with `keyof typeof` for type-safe constants instead
- Use `| (string & {})` pattern for union types to preserve autocomplete while allowing arbitrary strings
- Use the `satisfies` operator to validate values against types without changing their inferred type
- Prefer `satisfies` over type assertions (`as`) when validating object literal structures
- Prefer explicit `| undefined` over optional properties (`?:`) for better type safety awareness
- Remove unused variables and imports

## React Guidelines

- Use functional components with hooks
- Follow the React hooks rules (no conditional hooks)
- Use React.FC type for components with children
- Keep components small and focused
- Avoid using class components
- Avoid using useEffecct when it is not needed
- Avoid using useState when it is not necessary (e.g., for values that can be derived from props or computed inline)
- Use useMemo and useCallback to optimize performance
