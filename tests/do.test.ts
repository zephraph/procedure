import { procedure } from "../src/procedure";

it("should run something on do", async () => {
  let context = { foo: "bar" };
  let doFn = jest.fn();
  await procedure("test").do(doFn).exec(context);
  expect(doFn).toBeCalledWith(context);
});

it("should run a nested procedure", async () => {
  const context = {};
  let action = jest.fn();
  const childProc = procedure("child").do(action);
  await procedure("parent").do(childProc).exec(context);
  expect(action).toBeCalledWith(context);
});
