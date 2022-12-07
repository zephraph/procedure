import { procedure } from "../src/procedure";

it("should update context when successfully loading", async () => {
  await expect(procedure("test", { foo: 'bull' })
    .load(() => ({ foo: "baz" }))
    .exec()).resolves.toStrictEqual({ foo: "baz" });
});
