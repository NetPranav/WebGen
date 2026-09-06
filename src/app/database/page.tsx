/**
 * ============================================================================
 * DATABASE STUDIO MAIN PAGE
 * ============================================================================
 * Route: /database
 * Role: Dedicated page for visual database schema modeling, relational hierarchy,
 *       and data record management.
 * ============================================================================
 */

import { DatabaseStudio } from "@/editor/panels/database/DatabaseStudio";

export const metadata = {
  title: "Database Studio | Visual Web Application Engine",
  description: "Visual relational database schema modeler, ER designer, and mock data grid.",
};

export default function DatabasePage() {
  return <DatabaseStudio />;
}
