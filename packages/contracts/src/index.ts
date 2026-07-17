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

export type GameDrawSource = "draw" | "discard";

/**
 * Public choreography hints for a game action. This deliberately contains no
 * card or meld identifiers: every player may receive recent actions, while
 * private card identities remain confined to that player's game view.
 */
export interface RecentGameActionMetadata {
  source?: GameDrawSource;
  includesDraw?: boolean;
  includesDiscard?: boolean;
}

export interface RecentGameAction {
  commandId: string;
  userId: string;
  type: GameActionType;
  version: number;
  createdAt: string;
  metadata?: RecentGameActionMetadata;
}
