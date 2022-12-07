import { MatchAction, MatchStatement, Operation } from "./operations";
import { execute } from "./executors";
import StackTracey from "stacktracey";
import { last } from "./utils";


type MaybePromise<T> = T | Promise<T>;

export interface Procedure<Context extends Record<string, unknown> = {}> {
  readonly name: string;
  load<LoadedData extends Record<string, unknown>>(loadFn: (context: Context) => MaybePromise<Partial<Context> & LoadedData>): Procedure<Context & LoadedData>;
  validate<Key extends keyof Context>(key: Key, validateFn: (value: Context[Key]) => MaybePromise<boolean>): Procedure<Context>;
  update<Key extends keyof Context>(key: Key, updateFn: (currentValue: Context[Key], context: Context) => MaybePromise<Context[Key]>): Procedure<Context>
  do(doFn: Procedure<any> | ((context: Context) => MaybePromise<void>)): Procedure<Context>;
  or(orFn: (err: Error, context: Context) => MaybePromise<void | Partial<Context>>): Procedure<Context>;
  match(statements: MatchStatement<Context>[], otherwise?: MatchAction<Context>): Procedure<Context>;
  exec(context?: Partial<Context>): Promise<Context>;
}

export const procedure = <Context extends Record<string, unknown> = {}>(name: string, initialContext?: Context): Procedure<Context> => {
  const operations: Operation[] = [];

  return {
    name,
    load(loadFn) {
      operations.push({
        procedure: name,
        type: "load",
        run: loadFn,
        stackSource: new StackTracey().slice(1),
      });
      return this as any;
    },

    update(key, updateFn) {
      operations.push({
        procedure: name,
        type: "update",
        run: updateFn,
        argKey: key,
        stackSource: new StackTracey().slice(1),
      });
      return this as any
    },

    validate(key, validateFn) {
      operations.push({
        procedure: name,
        type: "validate",
        run: validateFn,
        argKey: key,
        stackSource: new StackTracey().slice(1),
      });
      return this;
    },

    do(doFn) {
      operations.push({
        procedure: name,
        type: "do",
        run: doFn,
        stackSource: new StackTracey().slice(1),
      });
      return this;
    },

    match(statements, otherwise = undefined) {
      operations.push({
        procedure: name,
        type: "match",
        statements,
        otherwise,
        stackSource: new StackTracey().slice(1),
      });
      return this;
    },

    or(orFn) {
      last(operations).onError = orFn;
      return this;
    },

    // @ts-ignore
    exec(context = {}) {
      return execute(operations, { ...initialContext, ...context });
    }
  }
}

// export class Procedure<
//   C extends Record<string, unknown>,
//   P extends Partial<C> = {}
// > {
//   protected operations: Operation[] = [];
//   constructor(public readonly name: string, protected partialContext: P) { }

//   /**
//    * A method that will execute multiple condition statements and run
//    * an associated action for the first condition that returns true.
//    */
//   match(statements: MatchStatement<C>[], otherwise?: MatchAction<C>) {
//     this.operations.push({
//       procedure: this.name,
//       type: "match",
//       statements,
//       otherwise,
//       stackSource: new StackTracey().slice(1),
//     });
//     return this;
//   }

// export function procedure<
//   C extends Record<string, unknown>,
//   P extends Partial<C> = {}
// >(name: string, contextDefaults: P = {} as P) {
//   return new Procedure<C, P>(name, contextDefaults);
// }

/**
 * procedure('install', context)
 *  .validate('plugin', isValidPlugin)
 *    .orError(invalidPluginError)
 *  .validate('vault', isValidVault)
 *    .or(promptForVault)
 *  .match([
 *    [pluginFoundInRegistry, downloadFromRegistry],
 *    [pluginFoundOnGitHub, downloadFromGithub],
 *    pluginNotFoundError
 *  ])
 */

// procedure('dev', context)
//  .load(esbuildConfig)
//  .load(pluginManifest)
//  .load(vaults)
//  .validate('vaults', notEmpty)
//  .match([
//    [manyVaults, promptsEnabled, promptForVault],
//    [manyVaults, selectLastOpenedVaultOrError]
//    [singleVault, selectFirstVault],
//  ])
//  .update('pluginPath', buildPluginPath)
//  .do(copyManifest)
//   match([
//     [hotReloadNotInstalled, promptsEnabled, userSelectsHotReload, installHotReload]
//   ], doNothing)
//  .do(watchAndCopyManifestChanges)
//  .match([
//    [hasStylesheet, buildWithStylesheet],
//  ], buildWithoutStylesheet)
