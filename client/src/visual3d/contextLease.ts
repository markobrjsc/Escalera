export type ContextLeaseState<T> = {
  current: T | null;
  owners: number;
};

type Defer = (callback: () => void) => void;

export function leaseContext<T>(state: ContextLeaseState<T>, create: () => T | null) {
  const context = state.current ?? create();
  if (!context) return null;
  state.current = context;
  state.owners += 1;
  return context;
}

export function releaseContextLease<T>(
  state: ContextLeaseState<T>,
  context: T,
  dispose: (context: T) => void,
  defer: Defer = queueMicrotask
) {
  state.owners = Math.max(0, state.owners - 1);
  defer(() => {
    if (state.current !== context || state.owners > 0) return;
    state.current = null;
    dispose(context);
  });
}

export function detachContextLease<T>(state: ContextLeaseState<T>, context: T) {
  state.owners = Math.max(0, state.owners - 1);
  if (state.current === context) state.current = null;
}

export function forceReleaseContextLease<T>(
  state: ContextLeaseState<T>,
  context: T,
  dispose: (context: T) => void
) {
  if (state.current !== context) return;
  state.current = null;
  state.owners = 0;
  dispose(context);
}

type ClassOwnerRoot = {
  classList: { remove: (name: string) => void };
  querySelector: (selector: string) => unknown;
};

export function releaseClassWhenUnused(
  root: ClassOwnerRoot | null | undefined,
  className: string,
  ownerSelector: string,
  defer: Defer = queueMicrotask
) {
  defer(() => {
    if (!root?.querySelector(ownerSelector)) root?.classList.remove(className);
  });
}
