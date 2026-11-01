// A receipt, not an award: only the server can add owned stickers.
export function stickerChanges(previous, current) {
 const owned = new Set(current || []);
 return { owned, fresh: previous === null ? [] : [...owned].filter(id => !previous.has(id)) };
}
// A stop means a question visited. A wrong answer still moves the boat along.
export function stopLabel(state) {
 return state.phase === 'final' ? `${state.final?.asked || 0} ${state.final?.asked === 1 ? "discovery" : "discoveries"}` : `Discovery ${Math.max(0, state.qi) + 1}`;
}
export function secondsLeft(state, now, offset) {
 return Math.max(0, Math.ceil((state.deadline - (now + offset)) / 1000));
}
