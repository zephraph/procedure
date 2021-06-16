import { procedure } from "../src/procedure";

it("updates a context value", async () => {
  const context = { foo: "bar" };
  await procedure("update test")
    .update("foo", () => "baz")
    .exec(context);
  expect(context.foo).toBe("baz");
});
