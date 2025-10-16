# Add Missing Type Annotations to Function Parameters

## Priority: TYPE SAFETY
**Status:** 🟡 Incomplete Type Safety

## Locations
Multiple files with `any` implicit types on function parameters:

1. `src/initPlugin.ts:19-21` - `createInitPlugin` parameters
2. `src/initPlugin.ts:51-53` - `initPlugin` parameters
3. `src/initFullscreenPlugin.ts:4` - Function parameters
4. `src/initInlinePlugin.ts:3` - Function parameters

## Problem
Functions using destructuring in parameters don't have explicit type annotations, falling back to `any` type, which defeats the purpose of TypeScript.

### Example Issues

```typescript
// ❌ Parameters have implicit 'any' type
export function createInitPlugin(
  { data, settings, hooks },
  { container, src, beforeInit, timeout },
) { ... }

// ❌ No type safety on function parameters
export default async function initFullscreenPlugin(
  { data, settings, hooks },
  { id, src, parentElem, beforeInit, timeout }
) { ... }
```

## Impact
- **Type Safety Loss**: No compile-time checking of parameter types
- **IntelliSense Disabled**: No autocomplete in IDEs
- **Runtime Errors**: Type mismatches won't be caught at compile time
- **Documentation Missing**: Developers can't see what types are expected
- **TypeScript Benefit Lost**: Defeats purpose of TypeScript migration

## Solution

Define proper TypeScript interfaces and use them for function parameters.

### Step 1: Define interfaces in `src/types/index.ts`

```typescript
/**
 * Plugin initialization data
 */
export interface PluginInitData {
  data: unknown;
  settings: unknown;
  hooks: Record<string, (...args: any[]) => void | Promise<void>>;
}

/**
 * Plugin initialization options
 */
export interface PluginInitOptions {
  currentWindow: Window;
  targetWindow: Window;
  timeout?: number | null;
  container?: HTMLElement;
}

/**
 * Options for creating a plugin with iframe
 */
export interface CreatePluginOptions {
  container: HTMLElement;
  src: string;
  beforeInit?: ((ctx: { container: HTMLElement; iframe: HTMLIFrameElement }) => void) | null;
  timeout?: number;
}

/**
 * Fullscreen plugin specific options
 */
export interface FullscreenPluginOptions extends Omit<CreatePluginOptions, 'container'> {
  id: string;
  parentElem?: HTMLElement;
}

/**
 * Inline plugin specific options
 */
export interface InlinePluginOptions extends CreatePluginOptions {}

/**
 * Plugin methods returned to the parent
 */
export interface PluginMethods {
  [methodName: string]: (payload: unknown) => Promise<unknown>;
}

/**
 * Base plugin interface
 */
export interface PluginInterface {
  methods: PluginMethods;
  terminate: () => void;
}

/**
 * Fullscreen plugin interface with show/hide controls
 */
export interface FullscreenPluginInterface extends PluginInterface {
  _container: HTMLElement | null;
  _src: string;
  showSplashScreen: () => Promise<void> | undefined;
  hideSplashScreen: () => void;
  show: (opts?: {
    x?: string;
    y?: string;
    opacity?: number;
    scale?: number;
    time?: number;
  }) => void | Promise<void>;
  hide: () => void | Promise<void>;
  destroy: () => Promise<void>;
}

/**
 * Inline plugin interface
 */
export interface InlinePluginInterface extends PluginInterface {
  _container: HTMLElement;
  destroy: () => void;
}
```

### Step 2: Update function signatures

#### `src/initPlugin.ts`
```typescript
import type { PluginInitData, PluginInitOptions, CreatePluginOptions, PluginMethods } from "./types/index";

export function createInitPlugin(
  pluginData: PluginInitData,
  options: CreatePluginOptions,
): Promise<{ methods: PluginMethods; terminate: () => void }> {
  // ...
}

export default function initPlugin(
  pluginData: PluginInitData,
  options: PluginInitOptions,
): Promise<{ methods: PluginMethods; terminate: () => void }> {
  // ...
}
```

#### `src/initFullscreenPlugin.ts`
```typescript
import type { PluginInitData, FullscreenPluginOptions, FullscreenPluginInterface } from "./types/index";

export default async function initFullscreenPlugin(
  pluginData: PluginInitData,
  options: FullscreenPluginOptions,
): Promise<FullscreenPluginInterface> {
  // ...
}
```

#### `src/initInlinePlugin.ts`
```typescript
import type { PluginInitData, InlinePluginOptions, InlinePluginInterface } from "./types/index";

export default async function initInlinePlugin(
  pluginData: PluginInitData,
  options: InlinePluginOptions,
): Promise<InlinePluginInterface> {
  // ...
}
```

## Files to Modify
1. `src/types/index.ts` - Add all new interfaces
2. `src/initPlugin.ts` - Add type annotations
3. `src/initFullscreenPlugin.ts` - Add type annotations
4. `src/initInlinePlugin.ts` - Add type annotations

## Testing
After fixing:
1. Run `npm run build` - Should compile with strict type checking
2. Verify IntelliSense works in IDE for all parameters
3. Test with intentionally wrong types to verify errors are caught
4. Run `npm test`
5. Update tests to use proper types

## Benefits
- ✅ Full type safety across entire API
- ✅ Better IDE autocomplete and IntelliSense
- ✅ Self-documenting code
- ✅ Catch type errors at compile time
- ✅ Better API for library consumers

## Related Issues
- Related to #08 (import extensions consistency)
- Helps with #10 (test migration - tests need these types)
