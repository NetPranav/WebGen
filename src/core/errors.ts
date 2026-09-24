/** Human-readable message for a caught value (`catch` binds `unknown`). */
export function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}
