import { DEFAULT_EXTENSIONS as DEFAULT_BABEL_EXTENSIONS } from "@babel/core";
import commonjs from "@rollup/plugin-commonjs";
import json from "@rollup/plugin-json";
import resolve, { DEFAULTS } from "@rollup/plugin-node-resolve";
import peerDepsExternal from "rollup-plugin-peer-deps-external";
import replace from "@rollup/plugin-replace";
import { RollupOptions } from "rollup";
import typescript from "rollup-plugin-typescript2";
import terser from "@rollup/plugin-terser";
import ts from "typescript";
import { appDist, tsconfigJson } from "./constants";
import { babelPlugin } from "./rollup-plugin-config-helpers";
import { BuildOptions } from "./types";
import { MinifyOptions } from "terser";
import copy from "rollup-plugin-copy";

const shebang: { [index: string]: any } = {};

export async function createRollupConfig(
  opts: BuildOptions,
  index: number,
  copyTypeDeclarations: boolean
) {
  const shouldMinify =
    opts.minify !== undefined ? opts.minify : opts.env === "production";
  // Defines the output file extension based on the specified output format
  const extension = opts.format === "esm" ? "mjs" : "cjs";
  const outputName = [
    `${appDist}/${opts.format}/index`,
    shouldMinify ? "min" : "",
    extension,
  ]
    .filter(Boolean)
    .join(".");

  const mainFields = ["module", "main"];
  if (opts.target !== "node") {
    mainFields.push("browser");
  }

  const tsconfigPath = tsconfigJson;
  // borrowed from https://github.com/facebook/create-react-app/pull/7248
  const tsconfigJSON = ts.readConfigFile(tsconfigPath, ts.sys.readFile).config;
  // borrowed from https://github.com/ezolenko/rollup-plugin-typescript2/blob/42173460541b0c444326bf14f2c8c27269c4cb11/src/parse-tsconfig.ts#L48
  const tsCompilerOptions = ts.parseJsonConfigFileContent(
    tsconfigJSON,
    ts.sys,
    "./"
  ).options;

  return {
    // Tell Rollup the entry point to the package
    input: opts.input,
    // Rollup has treeshaking by default, but we can optimize it further...
    treeshake: {
      propertyReadSideEffects: false,
    },
    // Establish Rollup output
    output: {
      // Set filenames of the consumer's package
      file: outputName,
      // Pass through the file format
      format: opts.format,
      // Do not let Rollup call Object.freeze() on namespace import objects
      // (i.e. import * as namespaceImportObject from...) that are accessed dynamically.
      freeze: false,
      // Respect tsconfig esModuleInterop when setting __esModule.
      esModule: Boolean(tsCompilerOptions?.esModuleInterop),
      name: opts.name,
      sourcemap: true,
      globals: { react: "React", "react-native": "ReactNative" },
      exports: "named",
      inlineDynamicImports: opts.inlineDynamicImports ? true : false,
    },
    // Added babel/runtime as an external dependency in order to tell rollup to exclude any babel runtime dependencies
    // As babel plugin configuration is using `runtime` as value
    external: ["@babel/runtime", ...(opts.external ?? [])],
    plugins: [
      peerDepsExternal(),
      resolve({
        mainFields,
        extensions: [...DEFAULTS.extensions],
      }),
      // all bundled external modules need to be converted from CJS to ESM
      commonjs({
        // use a regex to make sure to include eventual hoisted packages
        include: /\/node_modules\//
      }),
      json(),
      {
        name: "rm-shebang",
        // Custom plugin that removes shebang from code because newer
        // versions of bublé bundle their own private version of `acorn`
        // and I don't know a way to patch in the option `allowHashBang`
        // to acorn. Taken from microbundle.
        // See: https://github.com/Rich-Harris/buble/pull/165
        transform(code: string) {
          const reg = /^#!(.*)/;
          const match = code.match(reg);

          shebang[opts.name] = match ? "#!" + match[1] : "";

          code = code.replace(reg, "");

          return {
            code,
            map: null,
          };
        },
      },
      typescript({
        typescript: ts,
        tsconfig: tsconfigPath,
        tsconfigDefaults: {
          exclude: [
            // all TS test files, regardless whether co-located or in test/ etc
            "**/*.spec.ts",
            "**/*.test.ts",
            "**/*.spec.tsx",
            "**/*.test.tsx",
            // TS defaults below
            "node_modules",
            "bower_components",
            "jspm_packages",
            appDist,
          ],
          compilerOptions: {
            sourceMap: true,
            declaration: true,
            jsx: "react",
          },
        },
        tsconfigOverride: {
          compilerOptions: {
            target: "esnext",
          },
          ...(index > 0 ? { declaration: false, declarationMap: false } : {}),
        },
        check: !opts.transpileOnly && index === 0,
        useTsconfigDeclarationDir: Boolean(tsCompilerOptions?.declarationDir),
      }),
      babelPlugin({
        targets: opts.target === "node" ? { node: "16" } : undefined,
        extractErrors: opts.extractErrors,
        format: opts.format,
      })({
        exclude: "node_modules/**",
        extensions: [...DEFAULT_BABEL_EXTENSIONS, "ts"],
        babelHelpers: "runtime",
      }),
      opts.env !== undefined
        ? replace({
            "process.env.NODE_ENV": JSON.stringify(opts.env),
            preventAssignment: true,
          })
        : undefined,
      shouldMinify
        ? terser({
            sourceMap: true,
            output: {
              comments: (
                _: unknown,
                comment: { value: string; type: string }
              ) => {
                const text = comment.value;
                const type = comment.type;
                return type == "comment2"
                  ? /@preserve|@license|@cc_on/i.test(text)
                  : false;
              },
            },
            compress: {
              keep_infinity: true,
              pure_getters: true,
              passes: 10,
            },
            ecma: 2015,
            toplevel: opts.format === "cjs",
          } as MinifyOptions)
        : undefined,
      // Copy typescript types declaration files to .d.mts for module files
      copyTypeDeclarations
        ? copy({
            targets: [
              // TypeScript requires 2 distinct files for ESM and CJS types. See:
              // https://devblogs.microsoft.com/typescript/announcing-typescript-4-7/
              // https://github.com/gxmari007/vite-plugin-eslint/pull/60
              // Copy for ESM types is made in CJS bundle to ensure the declaration file generated in
              // the previous bundle exists.
              {
                src: "dist/types/index.d.ts",
                dest: "dist/types/",
                rename: "index.d.mts",
              },
            ],
            verbose: true,
            copyOnce: true,
            copySync: true,
            hook: 'writeBundle'
          })
        : undefined,
    ].filter((plugin) => typeof plugin !== "undefined" && plugin !== null),
  } as RollupOptions;
}
