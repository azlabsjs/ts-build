export type NodeEngineConfigType = {
    node?: string;

}

export interface PackageJson {
  name: string;
  source: string;
  jest?: unknown;
  eslint?: unknown;
  dependencies?: { [packageName: string]: string };
  devDependencies?: { [packageName: string]: string };
  engines: NodeEngineConfigType;
}

export interface Template {
  dependencies: string[];
  name: string;
  packageJson: Omit<Omit<PackageJson, 'name'>, 'source'>;
}

export interface ProjectArgs {
  name: string;
  author: string;
}
