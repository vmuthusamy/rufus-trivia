// A fresh catalogue must accompany fresh screen code after a deployment.
// Bypass the browser cache too: an older release allowed five minutes of cached data.
export async function loadGameMeta(request = fetch) {
  const response = await request("/api/meta", { cache: "no-store" });
  if (!response.ok) throw new Error("Could not load the game catalogue. Please reload.");
  const meta = await response.json();
  if (!Array.isArray(meta?.cards?.cards) || !Array.isArray(meta?.cards?.packs)) {
    throw new Error("The game catalogue is out of date. Please reload.");
  }
  return meta;
}
