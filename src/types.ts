interface SharedOpts {
  target: "node" | "browser";
  tsconfig?: string;
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
  bundled?: boolean;
}

export interface WatchOpts extends BuildOpts {
  verbose?: boolean;
  noClean?: boolean;
  onFirstSuccess?: string;
  onSuccess?: string;
  onFailure?: string;
}

export interface NormalizedOpts extends Omit<WatchOpts, "name" | "input" | "format"> {
  bundled?: boolean;
  name: string;
  input: string[];
  format: ModuleFormat[];
}

export interface BuildOptions extends SharedOpts {
  name: string;
  input: string;
  env: "development" | "production";
  format: ModuleFormat;
  minify?: boolean;
  writeMeta?: boolean;
  transpileOnly?: boolean;
  external?: string | string[];
  inlineDynamicImports?: boolean;
  bundled: boolean; 
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
