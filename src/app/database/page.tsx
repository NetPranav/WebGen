/**
 * ============================================================================
 * DATABASE ROUTE ACCESS BLOCKED
 * ============================================================================
 * Role: Database is strictly disabled in the Animation Studio.
 *       Any direct navigation or link to /database redirects immediately to /editor.
 * ============================================================================
 */

import { redirect } from "next/navigation";

export default function DatabasePage() {
  redirect("/editor");
}
