interface SharedOpts {
  // JS target
  target: "node" | "browser";
  // Path to tsconfig file
  tsconfig?: string;
  // Is error extraction running?
  extractErrors?: boolean;
}

export type ModuleFormat = "cjs" | "umd" | "esm" | "system";

export interface BuildOpts extends SharedOpts {
  name?: string;
  entry?: string | string[];
  format: "cjs,esm";
  target: "browser";
  external?: string | string[];
  inlineDynamicImports?: boolean;
}

export interface WatchOpts extends BuildOpts {
  verbose?: boolean;
  noClean?: boolean;
  // callback hooks
  onFirstSuccess?: string;
  onSuccess?: string;
  onFailure?: string;
}

export interface NormalizedOpts
  extends Omit<WatchOpts, "name" | "input" | "format"> {
  name: string;
  input: string[];
  format: ModuleFormat[];
}

export interface BuildOptions extends SharedOpts {
  // Name of package
  name: string;
  // path to file
  input: string;
  // Environment
  env: "development" | "production";
  // Module format
  format: ModuleFormat;
  // Is minifying?
  minify?: boolean;
  // Is this the very first rollup config (and thus should one-off metadata be extracted)?
  writeMeta?: boolean;
  // Only transpile, do not type check (makes compilation faster)
  transpileOnly?: boolean;
  external?: string | string[];
  inlineDynamicImports?: boolean;
}

export interface PackageJson {
  name: string;
  source: string;
  jest?: unknown;
  eslint?: unknown;
  version: string;
  peerDependencies?: { [k: string]: string };
  dependencies?: { [k: string]: string };
  devDependencies?: { [k: string]: string };
  engines?: {
    node?: string;
  };
}

export type ErrorType = Error & {
  error?: ErrorType;
  plugin?: string;
  loc?: { line: number; file: string; column: number | string };
  frame: unknown[];
  stack: string;
};
