import { procedure } from "../src/procedure";

it("allows specifying default partial context on creation", async () => {
  type Context = {
    foo: string;
    works: boolean;
  };
  const defaults: Partial<Context> = {
    foo: "bar",
  };

  const doFn = jest.fn();

  await procedure<Context, typeof defaults>("test", defaults)
    .do(doFn)
    .exec({ works: true });

  expect(doFn).toBeCalledWith({
    foo: "bar",
    works: true,
  });
});

it("overrides default partial context", async () => {
  type Context = {
    foo: string;
  };
  const defaults: Partial<Context> = {
    foo: "bar",
  };

  const doFn = jest.fn();

  await procedure<Context, typeof defaults>("test", defaults)
    .do(doFn)
    .exec({ foo: "baz" });

  expect(doFn).toBeCalledWith({
    foo: "baz",
  });
});
