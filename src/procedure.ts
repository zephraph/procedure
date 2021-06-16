import { MatchAction, MatchStatement, Operation } from "./operations";
import { execute } from "./executors";
import StackTracey from "stacktracey";
import { last } from "./utils";

export class Procedure<
  C extends Record<string, unknown>,
  P extends Partial<C> = {}
> {
  protected operations: Operation[] = [];
  constructor(public readonly name: string, protected partialContext: P) {}

  /**
   * A method to ensure a value stored in the `context` is correct
   */
  validate<K extends keyof C>(
    key: K,
    validateFn: (value: C[K]) => boolean | Promise<boolean>
  ) {
    this.operations.push({
      procedure: this.name,
      type: "validate",
      run: validateFn,
      argKey: key,
      stackSource: new StackTracey().slice(1),
    });
    return this;
  }

  /**
   * A method to update a value in context (usually from values already stored in the context)
   */
  update<K extends keyof C>(
    key: K,
    updateFn: (currentValue: C[K], context: C) => C[K] | Promise<C[K]>
  ) {
    this.operations.push({
      procedure: this.name,
      type: "update",
      run: updateFn,
      argKey: key,
      stackSource: new StackTracey().slice(1),
    });
    return this;
  }

  /**
   * A method intended to load data from some source and to store it in the
   * `context`.
   */
  load(loadFn: (context: C) => Partial<C> | Promise<Partial<C>>) {
    this.operations.push({
      procedure: this.name,
      type: "load",
      run: loadFn,
      stackSource: new StackTracey().slice(1),
    });
    return this;
  }

  do(doFn: Procedure<Partial<C>> | ((context: C) => void | Promise<void>)) {
    this.operations.push({
      procedure: this.name,
      type: "do",
      run: doFn,
      stackSource: new StackTracey().slice(1),
    });
    return this;
  }

  /**
   * A method to add extra error handling to the previous function
   */
  or(
    orFn: (
      err: Error,
      context: C
    ) => void | Partial<C> | Promise<void | Partial<C>>
  ) {
    last(this.operations).onError = orFn;
    return this;
  }

  /**
   * A method that will execute multiple condition statements and run
   * an associated action for the first condition that returns true.
   */
  match(statements: MatchStatement<C>[], otherwise?: MatchAction<C>) {
    this.operations.push({
      procedure: this.name,
      type: "match",
      statements,
      otherwise,
      stackSource: new StackTracey().slice(1),
    });
    return this;
  }

  exec(context: Omit<C, keyof P> & Partial<P>) {
    Object.assign(context, { ...this.partialContext, ...context });
    return execute(this.operations, context);
  }
}

export function procedure<
  C extends Record<string, unknown>,
  P extends Partial<C> = {}
>(name: string, contextDefaults: P = {} as P) {
  return new Procedure<C, P>(name, contextDefaults);
}

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
