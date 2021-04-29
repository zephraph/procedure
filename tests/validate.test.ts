import { procedure } from "../src/procedure";

it("resolves when a validation is successful", async () => {
  await expect(
    procedure("test", { test: true })
      .validate("test", (t) => t === true)
      .exec()
  ).resolves.toBeUndefined();
});

it("rejects when a validation is unsuccessful", async () => {
  await expect(
    procedure("test", { test: true })
      .validate("test", (t) => t === false)
      .exec()
  ).rejects.toMatchInlineSnapshot(`
          "  12 |   await expect(
            13 |     procedure(\\"test\\", { test: true })
          > 14 |       .validate(\\"test\\", (t) => t === false)
               |        ^ test is invalid 
            15 |       .exec()
            16 |   ).rejects.toMatchInlineSnapshot(\`
            17 |           \\"test is invalid "
        `);
});
