---
applyTo: '**/*.ts,**/*.tsx'
description: 'Zustand state management best practices and patterns'
---

# Zustand State Management Instructions

## Core Principles

- **Keep stores flat** - Avoid nested objects in your state structure
- **Split stores by domain** - Create separate stores for different concerns
- **Use auto-selectors** - Leverage `createSelectors` for optimal performance
- **Prefer atomic updates** - Each selector triggers re-renders only when its specific data changes

## Store Structure Best Practices

### ✅ GOOD: Flat Store Structure

```typescript
import { create } from 'zustand';
import { createSelectors } from 'utils';

type PostsStore = {
  idle: boolean;
  loading: boolean;
  error: ParsedError | null;
  posts: Post[];
  // Filters at root level - not nested
  orderBy: 'createdAt' | 'updatedAt' | 'title';
  orderDirection: 'asc' | 'desc';
  search: string;
  tags: string[];
};

const usePostsStore = createSelectors(
  create<PostsStore>((set) => ({
    idle: true,
    loading: false,
    error: null,
    posts: [],
    orderBy: 'createdAt',
    orderDirection: 'asc',
    search: '',
    tags: [],
  }))
);
```

### ❌ BAD: Nested Store Structure

```typescript
// Avoid nested objects - they hurt performance
type PostsStore = {
  idle: boolean;
  loading: boolean;
  error: ParsedError | null;
  posts: Post[];
  // Don't nest filters like this
  filters: {
    orderBy: 'createdAt' | 'updatedAt' | 'title';
    orderDirection: 'asc' | 'desc';
    search: string;
    tags: string[];
  };
};
```

## Multiple Store Pattern

### Split Stores by Domain

When you have different concerns, create separate stores for better performance and separation of concerns:

```typescript
// Posts data store
type PostsStore = {
  idle: boolean;
  loading: boolean;
  error: ParsedError | null;
  posts: Post[];
};

const usePostsStore = createSelectors(
  create<PostsStore>((set) => ({
    idle: true,
    loading: false,
    error: null,
    posts: [],
  }))
);

// Separate filters store
type PostsFiltersStore = {
  orderBy: 'createdAt' | 'updatedAt' | 'title';
  orderDirection: 'asc' | 'desc';
  search: string;
  tags: string[];
};

const usePostsFiltersStore = createSelectors(
  create<PostsFiltersStore>((set) => ({
    orderBy: 'createdAt',
    orderDirection: 'asc',
    search: '',
    tags: [],
  }))
);
```

### Benefits of Multiple Stores

1. **Performance**: Changes in filters won't trigger re-renders in components using posts data
2. **Separation of concerns**: Clear boundaries between different parts of your state
3. **Enhanced auto-selector generation**: Each store gets its own optimized selectors
4. **Maintainability**: Easier to reason about and modify individual stores

## Auto-Selectors Usage

### Component Implementation

```typescript
const PostsList = () => {
  // Each selector only triggers re-render when its specific data changes
  const idle = usePostsStore.use.idle();
  const orderBy = usePostsFiltersStore.use.orderBy();

  return (
    <div>
      {/* Component content */}
    </div>
  );
};
```

### Performance Benefits

- **Granular re-renders**: Each auto-generated selector triggers a re-render only if the specific part of the state it refers to changes — not the entire state
- **No unnecessary renders**: Components using `orderBy` won't re-render when `search` changes
- **Ultra-responsive UI**: Flat structure keeps your UI glitch-free and performant

## Store Actions Pattern

### Implement Actions in Store

```typescript
type PostsStore = {
  idle: boolean;
  loading: boolean;
  error: ParsedError | null;
  posts: Post[];
  // Actions
  fetchPosts: () => Promise<void>;
  addPost: (post: Post) => void;
  updatePost: (id: string, updates: Partial<Post>) => void;
  deletePost: (id: string) => void;
  reset: () => void;
};

const usePostsStore = createSelectors(
  create<PostsStore>((set, get) => ({
    idle: true,
    loading: false,
    error: null,
    posts: [],

    fetchPosts: async () => {
      set({ loading: true, error: null });
      try {
        const posts = await api.fetchPosts();
        set({ posts, loading: false, idle: false });
      } catch (error) {
        set({ error: parseError(error), loading: false });
      }
    },

    addPost: (post) => set((state) => ({ posts: [...state.posts, post] })),

    updatePost: (id, updates) =>
      set((state) => ({
        posts: state.posts.map((post) =>
          post.id === id ? { ...post, ...updates } : post
        ),
      })),

    deletePost: (id) =>
      set((state) => ({
        posts: state.posts.filter((post) => post.id !== id),
      })),

    reset: () =>
      set({
        idle: true,
        loading: false,
        error: null,
        posts: [],
      }),
  }))
);
```

## createSelectors Utility

Ensure you have the `createSelectors` utility for auto-selector generation:

```typescript
// utils/createSelectors.ts
import { StoreApi, UseBoundStore } from 'zustand';

type WithSelectors<S> = S extends { getState: () => infer T }
  ? S & { use: { [K in keyof T]: () => T[K] } }
  : never;

export const createSelectors = <S extends UseBoundStore<StoreApi<object>>>(
  store: S
) => {
  let storeIn = store as WithSelectors<typeof store>;
  storeIn.use = {};
  for (let k of Object.keys(storeIn.getState())) {
    (storeIn.use as any)[k] = () => storeIn((s) => s[k as keyof typeof s]);
  }
  return storeIn;
};
```

## Decision Framework

### When to Split Stores

Ask yourself:

1. **Are these concerns related?** → Same store
2. **Do they change independently?** → Separate stores
3. **Would changes in one trigger unnecessary re-renders in components using the other?** → Separate stores
4. **Is the state getting complex/nested?** → Consider splitting

### When to Keep One Store

- Related data that changes together
- Simple state without complex nesting
- Data that's always used together in components

## Common Patterns

### Loading States

```typescript
type AsyncStore = {
  idle: boolean;
  loading: boolean;
  error: ParsedError | null;
  data: DataType[];
};
```

### Filter/Search States

```typescript
type FiltersStore = {
  search: string;
  sortBy: string;
  sortDirection: 'asc' | 'desc';
  filters: Record<string, any>; // Avoid this - keep filters flat
  // Better approach:
  category: string;
  status: string;
  dateRange: { start: Date; end: Date } | null;
};
```

### Form States

```typescript
type FormStore = {
  // Form data at root level
  title: string;
  description: string;
  tags: string[];
  // Form meta state
  isDirty: boolean;
  isSubmitting: boolean;
  errors: Record<string, string>;
};
```

## Performance Tips

1. **Use auto-selectors**: Always use `createSelectors` for optimal re-render behavior
2. **Keep state flat**: Avoid nested objects that cause unnecessary re-renders
3. **Split by domain**: Create separate stores for unrelated concerns
4. **Atomic updates**: Update only the specific parts of state that changed
5. **Avoid deep nesting**: If you need nested data, consider normalizing it or creating separate stores

## Anti-Patterns to Avoid

❌ **Don't nest everything in objects**

```typescript
// Bad
type Store = {
  ui: { loading: boolean; error: string };
  data: { posts: Post[]; users: User[] };
  filters: { search: string; sort: string };
};
```

❌ **Don't create overly complex single stores**

```typescript
// Bad - too many concerns in one store
type AppStore = {
  posts: Post[];
  users: User[];
  notifications: Notification[];
  theme: Theme;
  auth: AuthState;
  router: RouterState;
};
```

❌ **Don't forget to use selectors**

```typescript
// Bad - causes re-renders on any state change
const allState = useStore();

// Good - only re-renders when posts change
const posts = useStore.use.posts();
```

## Summary

- **Keep stores flat** for optimal performance
- **Split stores by domain** to prevent unnecessary re-renders
- **Use auto-selectors** with `createSelectors` utility
- **Avoid nested state structures** that hurt performance
- **Each selector triggers re-renders only when its specific data changes**
- **Consider creating separate stores instead of managing nested objects**

Following these patterns will give you great performance in your React apps out of the box with Zustand.
