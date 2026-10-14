// One queue for definitions, inventory, attacks and configuration saves on an Actor.
export const actorResourceWrites = new WeakMap();
export function withActorResourceWrite(actor, operation) {
  const next = (actorResourceWrites.get(actor) ?? Promise.resolve()).catch(() => {}).then(operation);
  actorResourceWrites.set(actor, next);
  return next;
}
