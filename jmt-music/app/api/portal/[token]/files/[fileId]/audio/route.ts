import { NextRequest, NextResponse } from "next/server";
import { getClientPortalByToken } from "@/lib/client-portal/repository";

export const dynamic = "force-dynamic";

function googleDriveDownloadUrl(url: string) {
  try {
    const parsed = new URL(url);
    const id = parsed.pathname.match(/\/file\/d\/([^/]+)/)?.[1] || parsed.searchParams.get("id");
    return id ? `https://drive.usercontent.google.com/download?id=${encodeURIComponent(id)}&export=download&confirm=t` : url;
  } catch { return url; }
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ token: string; fileId: string }> }) {
  const { token, fileId } = await params;
  const result = await getClientPortalByToken(token);
  if (result.status !== "found") return new NextResponse("Not found", { status: 404 });
  const file = result.view.files.find((item) => item.id === fileId && item.fileType === "audio");
  if (!file) return new NextResponse("Not found", { status: 404 });

  const upstream = await fetch(googleDriveDownloadUrl(file.driveUrl), {
    headers: request.headers.get("range") ? { Range: request.headers.get("range")! } : undefined,
    redirect: "follow",
    cache: "no-store"
  });
  if (!upstream.ok && upstream.status !== 206) return new NextResponse("Audio is unavailable", { status: 502 });

  const headers = new Headers();
  for (const name of ["content-type", "content-length", "content-range", "accept-ranges"]) {
    const value = upstream.headers.get(name);
    if (value) headers.set(name, value);
  }
  headers.set("Cache-Control", "private, no-store");
  headers.set("Content-Disposition", "inline");
  return new NextResponse(upstream.body, { status: upstream.status, headers });
}
