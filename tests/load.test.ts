import { procedure } from "../src/procedure";

it("should update context when successfully loading", async () => {
  let context = { foo: "bar" };
  await procedure("test")
    .load((c) => ({ foo: "baz" }))
    .exec(context);
  expect(context.foo).toBe("baz");
});
