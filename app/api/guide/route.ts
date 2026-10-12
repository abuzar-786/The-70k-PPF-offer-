import { readFile } from "node:fs/promises";
import { guidePath } from "@/lib/guide";
export const runtime = "nodejs";
export async function GET() {
  const file = await guidePath();
  if (!file)
    return Response.json(
      { error: "The updated ₹70K+ guide is not available yet." },
      { status: 404 },
    );
  return new Response(new Uint8Array(await readFile(file)), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition":
        'attachment; filename="the-70k-ppf-offer-secret.pdf"',
      "Cache-Control": "no-store",
    },
  });
}
