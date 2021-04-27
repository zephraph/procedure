import { procedure } from "../src/procedure";

it("updates a context value", async () => {
  const context = { foo: 'bar' }
  await procedure('update test', context)
    .update('foo', () => 'baz')
    .exec();
  expect(context.foo).toBe('baz')
});