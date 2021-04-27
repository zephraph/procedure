import { procedure } from '../src/procedure'

it("should update context when successfully loading", async () => {
  let context = { foo: 'bar' }
  await procedure('test', context)
    .load((c) => ({ foo: 'baz' }))
    .exec()
  expect(context.foo).toBe('baz')
})