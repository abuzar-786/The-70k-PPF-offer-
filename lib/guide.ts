import "server-only";
import { open } from "node:fs/promises";
import path from "node:path";
export async function guidePath(): Promise<string | null> {
  // Explicitly declare the supplied asset as the matching guide; never fall back to older PDFs.
  if (process.env.GUIDE_VERSION !== "70k" || !process.env.GUIDE_PDF_PATH)
    return null;
  const file = path.resolve(process.env.GUIDE_PDF_PATH);
  try {
    const handle = await open(file, "r");
    try {
      const header = Buffer.alloc(5);
      await handle.read(header, 0, 5, 0);
      return header.toString() === "%PDF-" ? file : null;
    } finally {
      await handle.close();
    }
  } catch {
    return null;
  }
}
