export function requiresLeaveConfirmation(gameStatus: "ACTIVE" | "FINISHED") {
  return gameStatus === "ACTIVE";
}
