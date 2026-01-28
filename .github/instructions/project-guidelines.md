---
description: 'Project-specific coding guidelines for hopsa-planner'
applyTo: '**'
---

# Project-Specific Guidelines for hopsa-planner

This document outlines additional coding standards and requirements unique to this project. All contributors must follow these rules in addition to the general and stack-specific instructions.

## Project Configuration

- **Package Manager**: Always use **yarn** instead of npm for all package management operations
- For installation: `yarn add <package>`
- For removal: `yarn remove <package>`
- For scripts: `yarn <script-name>`

## Form Handling Guidelines

- Use Tanstack Form with Zod for all form validation and state management
- Define Zod schemas for form validation
- Use type inference from Zod schemas for TypeScript types
- Handle form submission with proper error handling
- Display validation errors inline with form fields

## 1. Internationalization (i18n) Discipline

- **All user-facing text must use the i18n system.**
- **Whenever adding or updating text, you must add translations for ALL supported languages.**
- **Never hardcode strings in components or logic.**
- **Always update every language file, not just the default.**
- **Missing translations must be flagged and resolved before merging.**

### Example

```tsx
// Good
import { useTranslation } from 'src/i18n';
const { t } = useTranslation();
return <span>{t('welcome_message')}</span>;

// Bad
return <span>Welcome!</span>;
```

## 2. Typography Components

- **Always use the project's typography components instead of native HTML tags for text.**
- **Do not use <h1>, <h2>, <p>, <span>, etc. directly.**
- **Use components like <Typography>, <Heading>, <Text>, etc. as provided by the project.**
- **This ensures consistent design, accessibility, and theming.**

### Example

```tsx
// Good
import { Heading, Text } from 'src/components/ui/typography';
return <H1>Title</H1>;

// Bad
return <h1>Title</h1>;
```

## 3. Form Handling

- **All forms must use Tanstack React Form for state management and validation.**
- **Define Zod schemas for validation.**
- **Do not use native form state or uncontrolled inputs.**
- **Display validation errors inline.**

### Example

```tsx
// Good
import { useForm } from '@tanstack/react-form';
import { z } from 'zod';
const schema = z.object({ email: z.string().email() });
const form = useForm({ defaultValues: { email: '' }, schema });

// Bad
<form
  onSubmit={(e) => {
    e.preventDefault(); /* ... */
  }}
>
  <input type='text' />
</form>;
```

## 4. Button Styling

- **Always use the `getButtonVariant` utility function for button styling.**
- **Import from `@/utils/buttonStyles`.**
- **Use predefined variants: 'primary', 'secondary', 'primaryCompact', etc.**
- **Pass additional classes as the second parameter if needed.**
- **This ensures consistent button styling and proper hover states across the application.**

### Example

```tsx
// Good
import { getButtonVariant } from '@/utils/buttonStyles';
<Button className={getButtonVariant('primary')}>
  Click me
</Button>

// Good with additional classes
<Button className={getButtonVariant('primary', 'w-full mt-4')}>
  Click me
</Button>

// Bad - manual styling
<Button className='bg-[var(--color-main)] hover:bg-[var(--color-main-hover)] text-white'>
  Click me
</Button>
```

---

**These rules are mandatory for all code contributions. Reviewers will enforce them.**
