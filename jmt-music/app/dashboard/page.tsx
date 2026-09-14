import { redirect } from "next/navigation";

/** A memorable, protected shortcut to the owner Control Center. */
export default function DashboardShortcutPage() {
  redirect("/control-center");
}

