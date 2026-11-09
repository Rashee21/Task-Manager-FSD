// Task status state machine (P8 pro tip: validate transitions server-side).
// TODO -> IN_PROGRESS -> REVIEW -> DONE, with one step back, and DONE -> IN_PROGRESS to reopen.
const ALLOWED_TRANSITIONS = {
  TODO: ['IN_PROGRESS'],
  IN_PROGRESS: ['TODO', 'REVIEW'],
  REVIEW: ['IN_PROGRESS', 'DONE'],
  DONE: ['IN_PROGRESS'],
};
function canTransition(from, to) {
  if (from === to) return true;
  return (ALLOWED_TRANSITIONS[from] || []).includes(to);
}
module.exports = { ALLOWED_TRANSITIONS, canTransition };
