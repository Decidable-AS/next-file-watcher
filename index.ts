#!/usr/bin/env node

/**
 * Next.js File Watcher with Auto-Detection
 *
 * This tool automatically detects whether your Next.js project uses:
 * - app/ directory structure (standard Next.js 13+ app router)
 * - src/app/ directory structure (app router with src folder)
 *
 * Uses Bun APIs for efficient file system operations and detection.
 */

import chokidar from "chokidar";

/**
 * Converts a string (e.g., 'team' or '[teamId]') to PascalCase.
 * @param str - The input string to convert.
 * @returns The PascalCase string.
 */
function toPascalCase(str: string): string {
  if (str.startsWith("[") && str.endsWith("]")) {
    str = str.slice(1, -1); // Remove brackets for dynamic segments
  }
  if (str.includes("-")) {
    return str
      .split("-")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join("");
  }
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Detects the Next.js project structure and returns the app directory path.
 * Uses Bun's built-in file system capabilities.
 * @returns The path to the app directory ('app' or 'src/app').
 */
async function detectAppDirectory(): Promise<string> {
  const appPath = "app";
  const srcAppPath = "src/app";

  // Check if app/ directory exists using Bun.file with a directory indicator
  try {
    const appFile = Bun.file(`${appPath}/package.json`); // Try to access something in the directory
    const appStat = await appFile.exists();
    if (appStat) {
      return appPath;
    }
  } catch {
    // Continue to next check
  }

  // Alternative: Check for any common Next.js files in app directory
  try {
    const appLayoutFile = Bun.file(`${appPath}/layout.tsx`);
    const appPageFile = Bun.file(`${appPath}/page.tsx`);
    const appGlobalFile = Bun.file(`${appPath}/global.css`);

    if (
      (await appLayoutFile.exists()) ||
      (await appPageFile.exists()) ||
      (await appGlobalFile.exists())
    ) {
      return appPath;
    }
  } catch {
    // Continue to next check
  }

  // Check if src/app/ directory exists
  try {
    const srcAppLayoutFile = Bun.file(`${srcAppPath}/layout.tsx`);
    const srcAppPageFile = Bun.file(`${srcAppPath}/page.tsx`);
    const srcAppGlobalFile = Bun.file(`${srcAppPath}/global.css`);

    if (
      (await srcAppLayoutFile.exists()) ||
      (await srcAppPageFile.exists()) ||
      (await srcAppGlobalFile.exists())
    ) {
      return srcAppPath;
    }
  } catch {
    // Continue to default
  }

  // Fallback: Use directory existence check with a simple approach
  try {
    // Try to read the directory using Bun's glob functionality
    const appGlob = new Bun.Glob(`${appPath}/*`);
    const appFiles = await Array.fromAsync(appGlob.scan("."));
    if (appFiles.length > 0) {
      return appPath;
    }
  } catch {
    // Continue to next check
  }

  try {
    const srcAppGlob = new Bun.Glob(`${srcAppPath}/*`);
    const srcAppFiles = await Array.fromAsync(srcAppGlob.scan("."));
    if (srcAppFiles.length > 0) {
      return srcAppPath;
    }
  } catch {
    // Continue to default
  }

  // Default to app/ if neither exists (user might create it later)
  console.log(
    "No existing app directory found, defaulting to 'app'. Will watch for creation."
  );
  return appPath;
}

/**
 * Processes the file path to extract segments, dynamic keys, and path string.
 * @param filePath - The full file path.
 * @param appDir - The app directory path ('app' or 'src/app').
 * @returns An object containing segments, dynamic keys, and path string.
 */
function processPath(
  filePath: string,
  appDir: string
): {
  segments: string[];
  dynamicKeys: string[];
  path: string;
} {
  const relativePath = filePath.replace(
    new RegExp(`^${appDir.replace("/", "/")}\\/`),
    ""
  );
  const dirPath = relativePath.replace(/\/(page|layout)\.tsx|\/route\.ts$/, "");
  const segments = dirPath.split("/").filter((segment) => segment !== "");
  const dynamicKeys = segments
    .filter((segment) => segment.startsWith("[") && segment.endsWith("]"))
    .map((segment) => segment.slice(1, -1));
  const path =
    segments.length > 0
      ? segments.map((s) => s.replace(/^\[(.+)\]$/, "$1")).join("/")
      : "root";
  return { segments, dynamicKeys, path };
}

/**
 * Generates the function name for page or layout based on segments.
 * @param segments - The path segments.
 * @param fileType - The file type ('page' or 'layout').
 * @returns The generated function name.
 */
function generateFunctionName(
  segments: string[],
  fileType: "page" | "layout"
): string {
  const pascalSegments =
    segments.length > 0
      ? segments.map((segment) => toPascalCase(segment))
      : ["Root"];
  return pascalSegments.join("") + (fileType === "page" ? "Page" : "Layout");
}

/**
 * Generates code for page.tsx.
 * @param functionName - The function name.
 * @param dynamicKeys - The dynamic segment keys.
 * @returns The generated code string.
 */
function generatePageCode(functionName: string, dynamicKeys: string[]): string {
  if (dynamicKeys.length > 0) {
    const paramsType = `Promise<{ ${dynamicKeys
      .map((key) => `${key}: string`)
      .join(", ")} }>`;
    const destructureParams = `const { ${dynamicKeys.join(
      ", "
    )} } = await params;`;
    return `export default async function ${functionName}({ params, searchParams }: { params: ${paramsType}; searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
  ${destructureParams}
  return <>Hello ${functionName}</>;
}`;
  }
  return `export default async function ${functionName}({ searchParams }: { searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
  return <>Hello ${functionName}</>;
}`;
}

/**
 * Generates code for layout.tsx.
 * @param functionName - The function name.
 * @param dynamicKeys - The dynamic segment keys.
 * @returns The generated code string.
 */
function generateLayoutCode(
  functionName: string,
  dynamicKeys: string[]
): string {
  if (dynamicKeys.length > 0) {
    const paramsType = `Promise<{ ${dynamicKeys
      .map((key) => `${key}: string`)
      .join(", ")} }>`;
    const destructureParams = `const { ${dynamicKeys.join(
      ", "
    )} } = await params;`;
    return `export default async function ${functionName}({ children, params }: { children: React.ReactNode; params: ${paramsType} }) {
  ${destructureParams}
  return <>{children}</>;
}`;
  }
  return `export default async function ${functionName}({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}`;
}

/**
 * Generates code for route.ts.
 * @param dynamicKeys - The dynamic segment keys.
 * @param path - The path string for the response.
 * @returns The generated code string.
 */
function generateRouteCode(dynamicKeys: string[], path: string): string {
  const methods = ["GET", "HEAD", "POST", "PUT", "DELETE", "PATCH"];
  const functions = methods.map((method) => {
    if (dynamicKeys.length > 0) {
      const paramsType = `Promise<{ ${dynamicKeys
        .map((key) => `${key}: string`)
        .join(", ")} }>`;
      const destructureParams = `const { ${dynamicKeys.join(
        ", "
      )} } = await params;`;
      return `export async function ${method}(request: Request, { params }: { params: ${paramsType} }) {
  ${destructureParams}
  return new Response("Hello ${path}");
}`;
    }
    return `export async function ${method}(request: Request) {
  return new Response("Hello ${path}");
}`;
  });
  return functions.join("\n\n");
}

// Set up the watcher dynamically based on detected app directory
const appDir = await detectAppDirectory();
console.log(`Detected Next.js app directory: ${appDir}`);

const watcher = chokidar.watch(appDir, {
  persistent: true,
  ignoreInitial: true,
  followSymlinks: false,
  depth: 99,
});

watcher.on("add", (filePath) => {
  const fileType = filePath.endsWith("/page.tsx")
    ? "page"
    : filePath.endsWith("/layout.tsx")
    ? "layout"
    : filePath.endsWith("/route.ts")
    ? "route"
    : null;
  if (!fileType) return;

  const { segments, dynamicKeys, path } = processPath(filePath, appDir);
  let code: string;

  switch (fileType) {
    case "page": {
      const functionName = generateFunctionName(segments, fileType);
      code = generatePageCode(functionName, dynamicKeys);
      break;
    }
    case "layout": {
      const functionName = generateFunctionName(segments, fileType);
      code = generateLayoutCode(functionName, dynamicKeys);
      break;
    }
    case "route": {
      code = generateRouteCode(dynamicKeys, path);
      break;
    }
    default:
      return;
  }

  Bun.write(filePath, code);
});

console.log(
  `Watching for new page.tsx, layout.tsx, and route.ts files in ${appDir} directory...`
);
