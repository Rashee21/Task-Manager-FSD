const { canTransition } = require('../src/utils/statusMachine');
test('allows TODO -> IN_PROGRESS', () => { expect(canTransition('TODO', 'IN_PROGRESS')).toBe(true); });
test('rejects TODO -> DONE (must go through REVIEW)', () => { expect(canTransition('TODO', 'DONE')).toBe(false); });
test('allows REVIEW -> DONE and DONE -> IN_PROGRESS (reopen)', () => {
  expect(canTransition('REVIEW', 'DONE')).toBe(true);
  expect(canTransition('DONE', 'IN_PROGRESS')).toBe(true);
});
test('same status is a no-op, not an error', () => { expect(canTransition('TODO', 'TODO')).toBe(true); });
