"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createSessionCookieValue, SESSION_COOKIE_NAME, SESSION_MAX_AGE_SECONDS } from "@/lib/control-center/session";

export type LoginState = { status: "idle" | "error"; message: string };

/** Only allow redirecting back into the app's own protected surfaces, never an external URL. */
function safeNextPath(value: FormDataEntryValue | null): string {
  const path = String(value || "");
  return path.startsWith("/") && !path.startsWith("//") ? path : "/dashboard";
}

export async function loginAction(_previous: LoginState, formData: FormData): Promise<LoginState> {
  const username = String(formData.get("username") || "");
  const password = String(formData.get("password") || "");
  const next = safeNextPath(formData.get("next"));

  const expectedUsername = process.env.CONTROL_CENTER_USERNAME;
  const expectedPassword = process.env.CONTROL_CENTER_PASSWORD;
  if (!expectedUsername || !expectedPassword) {
    return { status: "error", message: "Admin login is not configured yet." };
  }
  if (username !== expectedUsername || password !== expectedPassword) {
    return { status: "error", message: "Incorrect username or password." };
  }

  const value = await createSessionCookieValue(expectedPassword);
  (await cookies()).set(SESSION_COOKIE_NAME, value, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS
  });
  redirect(next);
}

export async function logoutAction(): Promise<void> {
  (await cookies()).delete(SESSION_COOKIE_NAME);
  redirect("/login");
}
