# @zephraph/procedure

> **NOTE**: This is experimental, incomplete, and maybe even a bad idea. Feel free to poke around and give feedback but use at your own peril. 

Writing scripts or cli tools that need to take a lot of procedural actions can often be quite verbose. It can be hard to glance at that code and try to fit what it's doing in your head. That's usually an indicator that it needs to be broken down, but finding a way to break it down and retrain a central narrative isn't the easiest thing to accomplish on the first pass. 

`procedure` seeks to help by providing a simple, deferred scaffolding for building complex procedural flows. The whole intent is to make your code as terse and readable as possible. 

## Anatomy of a procedure

Any procedure starts with calling the `procedure` function with a name and a `context`. Context is an object that should represent _all_ of the state of your procedure. While you can mutate it during the procedure, I recommend storing placeholders for every property you expect to be added at a later time.

```
import { procedure } from "@zephraph/procedure"

const context = {
  somePredefinedValue: true,
  aValueNotYetSet: null
}

procedure('my test procedure', context)
```

Once you have a procedure defined, there are a few methods you can chain onto it do perform generic actions or update the context.

- `load` -- Takes a function that's given `context`, can be sync or async, and returns a partial to be written to `context`
- `validate` -- Takes a function that's given a key of `context` and the corresponding value and returns `true`/`false` depending on if the value is valid
- `update` -- Takes a function that's given a value to update and the context and expected to return a new value. 
- `match` -- A robust mechanism for performing conditional operations. It takes an array of what I'm terming `MatchStatements`. Each statement is made up of one or more case statements that take the `context` and return `true`/`false` if the case is met. The last item in the array is an action statement that's called if all the previous case statements are `true`. A match operation may also be provided with a secondary argument that's a generic action that can be ran if no match statement resolves. 
- `do` -- Represents a generic operation. It takes a function which receives `context` and... does something.

All of the above methods are _lazy_. When you chain them onto `procedure` all they do is collect in the `procedure`'s internal operation list. Once `exec` is called, all the operations are executed sequentially (unless an error occurs).

## A real example

The below example is what I envision [this code](https://github.com/zephraph/obsidian-tools/blob/78b2ecb5fab613221d2702c724c3af82a4777ca4/packages/obsidian-plugin-cli/src/commands/dev.ts#L64-L223) to be replaced with.

```js
procedure('dev', context)
 .load(esbuildConfig)
 .load(pluginManifest)
 .load(vaults)
 .validate('vaults', notEmpty)
 .match([
   [manyVaults, promptsEnabled, promptForVault],
   [manyVaults, selectLastOpenedVaultOrError]
   [singleVault, selectFirstVault],
 ])
 .update('pluginPath', buildPluginPath)
 .do(copyManifest)
  match([
    [hotReloadNotInstalled, promptsEnabled, userSelectsHotReload, installHotReload]
  ], doNothing)
 .do(watchAndCopyManifestChanges)
 .match([
   [hasStylesheet, buildWithStylesheet],
 ], buildWithoutStylesheet)
 .exec()
```
