export function buildProfileUrl(userId: string, origin?: string) {
  const id = String(userId || "").trim();
  if (!id) return "";
  const base =
    origin ||
    (typeof window !== "undefined" ? window.location.origin : "");
  if (!base) return `/user/${encodeURIComponent(id)}`;
  return `${base.replace(/\/$/, "")}/user/${encodeURIComponent(id)}`;
}

export async function copyProfileLink(userId: string) {
  const url = buildProfileUrl(userId);
  if (!url || typeof navigator === "undefined" || !navigator.clipboard) {
    throw new Error("copy_unavailable");
  }
  await navigator.clipboard.writeText(url);
  return url;
}

export async function shareProfileLink(userId: string, title: string, text: string) {
  const url = buildProfileUrl(userId);
  if (!url) throw new Error("missing_user");
  if (typeof navigator !== "undefined" && navigator.share) {
    await navigator.share({ title, text, url });
    return url;
  }
  await copyProfileLink(userId);
  return url;
}
