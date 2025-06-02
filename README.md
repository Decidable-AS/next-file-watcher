# next-file-watcher

A smart file watcher for Next.js projects that automatically detects your project structure and generates boilerplate code for new page.tsx, layout.tsx, and route.ts files.

## Features

- **Auto-Detection**: Automatically detects whether your Next.js project uses:
  - `app/` directory structure (standard Next.js 13+ app router)
  - `src/app/` directory structure (app router with src folder)
- **Smart Code Generation**: Generates appropriate boilerplate code based on file type and path
- **Dynamic Route Support**: Handles dynamic segments in routes (e.g., `[id]`, `[...slug]`)
- **Built with Bun**: Uses Bun APIs for efficient file system operations

## Installation

To install dependencies:

```bash
bun install
```

## Usage

To run:

```bash
bun run index.ts
```

The watcher will automatically detect your Next.js project structure and start monitoring the appropriate directory. When you create new files, it will automatically populate them with the correct boilerplate code.

## Examples

### Standard App Router Structure
```
your-project/
├── app/
│   ├── page.tsx
│   ├── layout.tsx
│   └── users/
│       └── [id]/
│           └── page.tsx
```

### Src Folder Structure
```
your-project/
├── src/
│   └── app/
│       ├── page.tsx
│       ├── layout.tsx
│       └── users/
│           └── [id]/
│               └── page.tsx
```

Both structures are automatically detected and supported!

This project was created using `bun init` in bun v1.2.15. [Bun](https://bun.sh) is a fast all-in-one JavaScript runtime.
