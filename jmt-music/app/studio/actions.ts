"use server";

import { revalidatePath } from "next/cache";
import { PORTAL_STAGE_NAMES } from "@/lib/client-portal/repository";
import { getControlCenterRole } from "@/lib/control-center/access";
import { getSiteConfig } from "@/lib/control-center/data";
import { createProjectSetup } from "@/lib/project-setup/repository";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export type StudioActionState = {
  status: "idle" | "success" | "error";
  message: string;
  portalUrl?: string;
  projectId?: string;
};

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export async function createStudioProject(
  _previous: StudioActionState,
  formData: FormData
): Promise<StudioActionState> {
  const artistName = String(formData.get("artistName") || "").trim();
  const projectName = String(formData.get("projectName") || "").trim();
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const portalSlug = String(formData.get("portalSlug") || "").trim().toLowerCase();

  if (artistName.length < 2 || artistName.length > 120) return { status: "error", message: "Artist/client name must be 2–120 characters." };
  if (projectName.length < 2 || projectName.length > 160) return { status: "error", message: "Project/song name must be 2–160 characters." };
  if (email && (!emailPattern.test(email) || email.length > 254)) return { status: "error", message: "Enter a valid email address or leave it blank." };
  if (portalSlug.length < 3 || portalSlug.length > 60 || !slugPattern.test(portalSlug)) {
    return { status: "error", message: "Portal slug must be 3–60 lowercase letters, numbers, or single hyphens." };
  }

  const userId = process.env.CONTROL_CENTER_SUPABASE_USER_ID;
  if (!userId) return { status: "error", message: "Owner profile mapping is not configured." };
  if ((await getControlCenterRole()) !== "owner") return { status: "error", message: "Owner access is required." };

  const site = getSiteConfig("jmt-music");
  const supabase = createSupabaseAdminClient();
  let createdClientId: string | null = null;
  let projectId: string | null = null;
  let creationStep = "initializing project creation";

  try {
    const { data: property, error: propertyError } = await supabase.from("properties").select("id").eq("slug", site.id).maybeSingle();
    if (propertyError || !property) return { status: "error", message: "JMT Music could not be found in Supabase." };

    const clientLookup = email
      ? supabase.from("clients").select("id").eq("property_id", property.id).ilike("email", email).limit(1).maybeSingle()
      : supabase.from("clients").select("id").eq("property_id", property.id).ilike("artist_name", artistName).limit(1).maybeSingle();
    const { data: existingClient, error: clientLookupError } = await clientLookup;
    if (clientLookupError) return { status: "error", message: "The client lookup failed." };

    let clientId = existingClient?.id || null;
    if (!clientId) {
      const { data: client, error: clientError } = await supabase
        .from("clients")
        .insert({ property_id: property.id, artist_name: artistName, email: email || null, stage: "project", source: "manual", created_by: userId })
        .select("id")
        .single();
      if (clientError || !client) return { status: "error", message: "The client could not be created." };
      clientId = client.id;
      createdClientId = client.id;
    }

    creationStep = "creating the project";
    const { data: project, error: projectError } = await supabase
      .from("projects")
      .insert({ property_id: property.id, type: "client_work", title: projectName, phase: "not_started", client_id: clientId, created_by: userId })
      .select("id")
      .single();
    if (projectError || !project) {
      console.error("[studio:create-project] Project insert failed", { code: projectError?.code, message: projectError?.message, details: projectError?.details, hint: projectError?.hint });
      throw new Error("project_insert_failed");
    }
    projectId = project.id;

    creationStep = "creating portal stages";
    const { error: stagesError } = await supabase.from("project_portal_stages").insert(
      PORTAL_STAGE_NAMES.map((stage) => ({ project_id: project.id, property_id: property.id, stage, status: "not_started" }))
    );
    if (stagesError) {
      console.error("[studio:create-project] Portal stage insert failed", { code: stagesError.code, message: stagesError.message, details: stagesError.details, hint: stagesError.hint });
      throw new Error("portal_stage_insert_failed");
    }

    creationStep = "creating portal access";
    const setup = await createProjectSetup(site, { projectId: project.id, createdBy: userId });
    if (setup.status !== "created") {
      console.error("[studio:create-project] Portal access creation failed", { status: setup.status, message: setup.status === "error" ? setup.message : "A setup already exists for the newly created project." });
      throw new Error("portal_access_insert_failed");
    }

    const portalUrl = `https://www.${site.domain}/portal/${portalSlug}?access=${encodeURIComponent(setup.rawToken)}`;
    revalidatePath("/dashboard");
    revalidatePath("/control-center/projects");
    return { status: "success", message: "Client project created.", portalUrl, projectId: project.id };
  } catch (error) {
    console.error("[studio:create-project] Creation rolled back", {
      step: creationStep,
      error: error instanceof Error ? error.message : "unknown_error",
      projectId
    });
    if (projectId) await supabase.from("projects").delete().eq("id", projectId);
    if (createdClientId) await supabase.from("clients").delete().eq("id", createdClientId);
    return { status: "error", message: `The project could not be created while ${creationStep}. No partial project was kept.` };
  }
}
