import { PackageJson } from "../types";

export interface Template {
  dependencies: string[];
  name: string;
  packageJson: PackageJson;
}

export interface ProjectArgs {
  name: string;
  author: string;
}
