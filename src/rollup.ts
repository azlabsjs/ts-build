import commonjs from "@rollup/plugin-commonjs";
import json from "@rollup/plugin-json";
import resolve, { DEFAULTS } from "@rollup/plugin-node-resolve";
import replace from "@rollup/plugin-replace";
import { RollupOptions } from "rollup";
import typescript from "@rollup/plugin-typescript";
import terser from "@rollup/plugin-terser";
import ts from "typescript";
import { appDist, tsconfigJson } from "./constants";
import { BuildOptions } from "./types";
import { MinifyOptions } from "terser";
import type { Plugin } from 'rollup';
import { basename as basePathName } from "path";

const shebang: { [index: string]: unknown } = {};

export async function createRollupConfig(opts: BuildOptions, index: number): Promise<RollupOptions> {
  const shouldMinify = opts.minify !== undefined ? opts.minify : opts.env === "production";
  const extension = opts.format === "esm" ? "mjs" : "cjs";
  const outputName = [`${appDist}/${opts.format}/index`, shouldMinify ? "min" : "", extension].filter(Boolean).join(".");
  const basename = basePathName(appDist);
  const tsCompilerDeclarationDir = `./${basename}/${opts.format}`;

  const mainFields = ["module", "main"];
  if (opts.target !== "node") {
    mainFields.push("browser");
  }

  const tsconfigPath = tsconfigJson;
  const tsconfigJSON = ts.readConfigFile(tsconfigPath, ts.sys.readFile).config;
  const tsCompilerOptions = ts.parseJsonConfigFileContent(tsconfigJSON, ts.sys, "./").options;

  const lodashRewritePlugin = opts.format !== "cjs" ? {
    name: "lodash-es-rewrite",
    transform(code: string) {
      if (opts.format !== "cjs") {
        const transformed = code.replace(/from ['"]lodash(?!-es|\/fp)['"]/g, "from 'lodash-es'");
        if (transformed !== code) {
          return { code: transformed, map: null };
        }
      }
      return null;
    },
  } : undefined;

  const errorExtractionPlugin: Plugin | undefined = opts.extractErrors ? { name: 'extract-errors-transform', transform: () => null } : undefined;

  return {
    input: opts.input,
    treeshake: { propertyReadSideEffects: false },
    output: {
      file: outputName,
      format: opts.format,
      freeze: false,
      esModule: Boolean(tsCompilerOptions?.esModuleInterop),
      name: opts.name,
      sourcemap: true,
      globals: { react: "React", "react-native": "ReactNative" },
      exports: "named",
      inlineDynamicImports: Boolean(opts.inlineDynamicImports),
    },
    external: opts.external ?? [],
    plugins: [
      // peerDepsExternal(),
      resolve({ mainFields, extensions: [...DEFAULTS.extensions] }),
      commonjs({ include: /\/node_modules\// }),
      json(),
      {
        name: "rm-shebang",
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
        tsconfig: tsconfigPath,
        compilerOptions: {
          sourceMap: true,
          jsx: "react",
          target: "esnext",
          module: "esnext",
          declaration: index === 0,
          declarationMap: index === 0,
          ...(index > 0 ? { declaration: false, declarationMap: false } : {}),
          checkJs: !opts.transpileOnly && index === 0,
          declarationDir: tsCompilerDeclarationDir, // specify declaration output dir here or in tsconfig.json
        },
        exclude: [
          "**/*.spec.ts",
          "**/*.test.ts",
          "**/*.spec.tsx",
          "**/*.test.tsx",
          "node_modules",
          "bower_components",
          "jspm_packages",
          appDist,
        ],
      }),
      lodashRewritePlugin,
      errorExtractionPlugin,
      opts.env !== undefined ? replace({ "process.env.NODE_ENV": JSON.stringify(opts.env), preventAssignment: true }) : undefined,
      shouldMinify ? terser({
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
      } as MinifyOptions) : undefined,
      // copyTypeDeclarations
      //   ? copy({
      //     targets: [
      //       {
      //         src: "dist/types/index.d.ts",
      //         dest: "dist/types/",
      //         rename: "index.d.mts",
      //       },
      //     ],
      //     verbose: true,
      //     copyOnce: true,
      //     copySync: true,
      //     hook: "writeBundle",
      //   })
      //   : undefined,
    ].filter((plugin) => typeof plugin !== "undefined" && plugin !== null),
  } as RollupOptions;
}