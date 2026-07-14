export interface CommandEnvelope<TPayload> {
  commandId: string;
  expectedVersion: number;
  payload: TPayload;
}

export interface EventEnvelope<TPayload> {
  version: number;
  type: string;
  payload: TPayload;
}
