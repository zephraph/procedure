import { procedure } from "../src/procedure";

it("updates a context value", async () => {
  await expect(procedure("update test", { foo: 'bar' })
    .update("foo", () => "baz")
    .exec()).resolves.toEqual({ foo: "baz" });
});
