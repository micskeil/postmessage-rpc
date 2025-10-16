# TypeDoc Configuration Guide

This document explains the TypeDoc configuration for auto-generating API documentation.

## 📚 Quick Start

Generate documentation:
```bash
npm run docs
```

Watch mode (regenerates on file changes):
```bash
npm run docs:watch
```

Generate and serve locally:
```bash
npm run docs:serve
```

The generated documentation will be in the `docs-api/` folder.

## ⚙️ Configuration Overview

The `typedoc.json` file contains all configuration. Here's what each section does:

### Entry Points
```json
"entryPoints": ["src/main.ts", "src/types/index.ts"]
```
- Specifies which files TypeDoc should document
- Uses `expand` strategy to include all exported items
- Add more entry points to document additional modules

### Output
```json
"out": "docs-api"
```
- Directory where generated docs will be placed
- Ignored by git (see `.gitignore`)
- Can be hosted on GitHub Pages or any static host

### Exclusions
Automatically excludes:
- Test files (`*.test.ts`, `*.spec.ts`)
- Test directories
- Private/protected members (configurable)
- External dependencies
- Internal tagged items (`@internal`)

### Navigation Links
Top navigation bar links to:
- GitHub repository
- NPM package
- Examples
- Documentation
- Issue tracker

Customize these in the `navigationLinks` and `sidebarLinks` sections.

## 🎨 Customization

### Change Project Name
```json
"name": "Your Project Name API Documentation"
```

### Include Private Members
```json
"excludePrivate": false,
"visibilityFilters": {
  "private": true
}
```

### Add Custom Categories
Use `@category` tags in your JSDoc comments:
```typescript
/**
 * @category Utilities
 */
export function myUtility() { }
```

Then configure category order:
```json
"categoryOrder": ["Core", "Utilities", "Helpers", "*"]
```

### Add Plugins
Popular TypeDoc plugins:
- `typedoc-plugin-markdown` - Generate Markdown instead of HTML
- `typedoc-plugin-mermaid` - Add Mermaid diagrams
- `typedoc-plugin-extras` - Extra features like table of contents

Install and add to config:
```bash
npm install --save-dev typedoc-plugin-markdown
```

```json
"plugin": ["typedoc-plugin-markdown"]
```

## 📝 Writing Good Documentation

### JSDoc Tags Supported
- `@param` - Parameter description
- `@returns` - Return value description
- `@throws` - Exceptions thrown
- `@example` - Usage example
- `@see` - Cross-reference
- `@since` - Version added
- `@deprecated` - Mark as deprecated
- `@category` - Group in category
- `@internal` - Exclude from docs

### Example Documentation
```typescript
/**
 * Initializes a fullscreen plugin with animations.
 * 
 * This function creates an iframe overlay that covers the entire viewport
 * and loads the plugin from the specified source URL.
 * 
 * @param config - Plugin configuration object
 * @param config.data - Initial data to pass to plugin
 * @param config.settings - Plugin settings
 * @param config.hooks - Parent callback functions
 * 
 * @param options - Fullscreen plugin options
 * @param options.id - Unique container ID
 * @param options.src - Plugin source URL
 * @param options.timeout - Initialization timeout in ms
 * 
 * @returns Promise resolving to fullscreen plugin interface
 * 
 * @throws {Error} If plugin fails to initialize within timeout
 * 
 * @example
 * ```typescript
 * const plugin = await initFullscreenPlugin(
 *   {
 *     data: { userId: 123 },
 *     settings: { theme: 'dark' },
 *     hooks: {
 *       onSave: async (data) => console.log('Saved:', data)
 *     }
 *   },
 *   {
 *     id: 'my-plugin',
 *     src: 'https://example.com/plugin.html',
 *     timeout: 5000
 *   }
 * );
 * 
 * await plugin.show();
 * ```
 * 
 * @see {@link initInlinePlugin} for inline plugins
 * @since 0.1.0
 * @category Core Functions
 */
export async function initFullscreenPlugin(...) { }
```

## 🚀 Deployment

### GitHub Pages
1. Generate docs: `npm run docs`
2. Push `docs-api/` folder to `gh-pages` branch
3. Enable GitHub Pages in repository settings

Or use GitHub Actions:
```yaml
name: Deploy Docs
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm run docs
      - uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./docs-api
```

### Netlify/Vercel
1. Set build command: `npm run docs`
2. Set publish directory: `docs-api`
3. Deploy!

## 🔧 Troubleshooting

### TypeScript Errors During Generation
- Set `"skipErrorChecking": true` in config
- Or fix TypeScript errors in your code

### Missing Documentation
- Check that items are exported from entry points
- Remove `@internal` tags from items you want documented
- Verify files aren't in `exclude` patterns

### Links Not Working
- Use `{@link ClassName}` syntax for cross-references
- Enable `"useTsLinkResolution": true`
- Check `sourceLinkTemplate` is correct for your repository

### Incomplete Type Information
- Add more entry points to `entryPoints` array
- Ensure types are exported from entry points
- Check `excludeExternals` isn't hiding needed types

## 📖 Resources

- [TypeDoc Documentation](https://typedoc.org/)
- [TypeDoc Options Reference](https://typedoc.org/options/)
- [TSDoc Specification](https://tsdoc.org/)
- [JSDoc Reference](https://jsdoc.app/)

## 🤝 Contributing to Documentation

When adding new code:
1. Add JSDoc comments to all exported items
2. Include `@param`, `@returns`, and `@example` tags
3. Use `@category` to organize items
4. Run `npm run docs` to verify documentation looks good
5. Fix any warnings or errors

---

**Last Updated:** $(date +%Y-%m-%d)
