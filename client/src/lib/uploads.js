// Sends files to /api/uploads and returns an array of URLs
export async function uploadImages(files) {
  const form = new FormData();
  [...files].forEach((f) => form.append("images", f)); // field name must be "images"

  const res = await fetch("/api/uploads", { method: "POST", body: form });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Upload failed (${res.status})`);
  }
  const { files: uploaded } = await res.json();        // [{ url, filename, ... }]
  return uploaded.map((f) => f.url);                   // ['/uploads/abc.jpg', ...]
}
