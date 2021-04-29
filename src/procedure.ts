import { Match, MatchAction, MatchStatement, Operation } from "./operations";
import { execute } from "./executors";
import StackTracey from "stacktracey";
import { last } from "./utils";

export class Procedure<C extends Record<string, unknown>> {
  private operations: Operation[] = [];
  constructor(public readonly name: string, private context: C) {}

  /**
   * A method to ensure a value stored in the `context` is correct
   */
  validate(
    key: keyof C,
    validateFn: (value: C[typeof key]) => boolean | Promise<boolean>
  ) {
    this.operations.push({
      type: "validate",
      run: validateFn,
      argKey: key,
      context: this.context,
      stackSource: new StackTracey().slice(1),
    });
    return this;
  }

  /**
   * A method to update a value in context (usually from values already stored in the context)
   */
  update(
    key: keyof C,
    updateFn: (
      currentValue: C[typeof key],
      context: C
    ) => C[typeof key] | Promise<C[typeof key]>
  ) {
    this.operations.push({
      type: "update",
      run: updateFn,
      argKey: key,
      context: this.context,
      stackSource: new StackTracey().slice(1),
    });
    return this;
  }

  /**
   * A method intended to load data from some source and to store it in the
   * `context`.
   */
  load(loadFn: (context: C) => C | Promise<C>) {
    this.operations.push({
      type: "load",
      run: loadFn,
      context: this.context,
      stackSource: new StackTracey().slice(1),
    });
    return this;
  }

  do(doFn: (context: C) => void | Promise<void>) {
    this.operations.push({
      type: "do",
      run: doFn,
      context: this.context,
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
      type: "match",
      statements,
      otherwise,
      context: this.context,
      stackSource: new StackTracey().slice(1),
    });
    return this;
  }

  exec() {
    return execute(this.operations);
  }
}

export const procedure = <C extends Record<string, unknown>>(
  name: string,
  context: C
) => {
  return new Procedure(name, context);
};

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
