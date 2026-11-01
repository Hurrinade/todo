import { resolve } from "node:path";

// Bun supplies the module glob without starting Vite or reading environment files.
export function modulesIn(directory: string) {
  return Object.fromEntries(
    [...new Bun.Glob("**/*.{ts,js}").scanSync({ cwd: directory })]
      .filter((file) => !file.endsWith(".d.ts"))
      .map((file) => [
        `${directory}/${file}`,
        () => import(resolve(directory, file)),
      ]),
  );
}
