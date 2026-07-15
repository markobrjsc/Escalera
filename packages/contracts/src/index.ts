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

export type GameActionType = "draw" | "phase" | "meld" | "add-to-meld" | "discard" | "buy" | "timeout" | "disconnect-skip";

export interface RecentGameAction {
  commandId: string;
  userId: string;
  type: GameActionType;
  version: number;
  createdAt: string;
}
