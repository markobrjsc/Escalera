export type SingleFlightGate = { current: boolean };

// React state is intentionally not the lock: two pointer/click events can be
// delivered before the disabled state has rendered. This synchronous gate
// guarantees exactly one request and always reopens after success or failure.
export async function runSingleFlight<T>(gate: SingleFlightGate, operation: () => Promise<T>): Promise<T | undefined> {
  if (gate.current) return undefined;
  gate.current = true;
  try { return await operation(); }
  finally { gate.current = false; }
}
