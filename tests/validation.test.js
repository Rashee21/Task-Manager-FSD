const { taskCreateSchema } = require('../src/validations/schemas');
test('rejects an invalid priority', () => {
  const { error } = taskCreateSchema.validate({ title: 'Test task', priority: 'EXTREME' });
  expect(error).toBeTruthy();
});
test('accepts a valid task payload', () => {
  const { error, value } = taskCreateSchema.validate({ title: 'Test task', priority: 'HIGH', tags: ['backend'] });
  expect(error).toBeFalsy();
  expect(value.status).toBe('TODO');
});
