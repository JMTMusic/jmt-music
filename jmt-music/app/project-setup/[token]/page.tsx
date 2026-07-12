import { SetupFlow } from "./setup-flow";
import { UnavailableSetup } from "./unavailable-setup";
import { getProjectSetupByRawToken } from "@/lib/project-setup/repository";

type ProjectSetupPageProps = { params: Promise<{ token: string }> };

/**
 * Private, artist-facing Project Setup entry point. The raw token in the URL is the
 * entire authorization — there is no session, no login, no Basic Auth on this route (see
 * middleware.ts's matcher, which only covers /control-center). Every branch below reveals
 * the same generic "no longer available" message for a missing, malformed, or revoked
 * token, and for any unexpected/server error — an invalid link must never be distinguishable
 * from a revoked or nonexistent one, and a database problem must never surface as a raw
 * error to a page an artist might have bookmarked for weeks.
 */
export default async function ProjectSetupPage({ params }: ProjectSetupPageProps) {
  const { token } = await params;

  const result = await getProjectSetupByRawToken(token);

  if (result.status === "found") {
    return <SetupFlow rawToken={token} initialView={result.view} />;
  }

  if (result.status === "error") {
    // Server-safe diagnostic only — never reaches the artist, and never includes the token.
    console.error("[project-setup] token lookup failed:", result.message);
  }

  return <UnavailableSetup />;
}
