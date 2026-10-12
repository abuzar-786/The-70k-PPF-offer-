import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import { CAMPAIGN, NOTICE_VERSION, validateLead } from "@/lib/validation";
import { guidePath } from "@/lib/guide";
export const runtime = "nodejs";
const reply = (body: object, status = 200) =>
  Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
export async function POST(request: Request) {
  // Browser cross-origin submissions are rejected. Add edge rate limiting before public deployment.
  const origin = request.headers.get("origin");
  const requestUrl = new URL(request.url);
  const host = request.headers.get("host");
  const expectedOrigin =
    process.env.APP_ORIGIN ||
    (host ? `${requestUrl.protocol}//${host}` : requestUrl.origin);
  if (origin && origin !== expectedOrigin)
    return reply({ error: "This request is not allowed." }, 403);
  if (!request.headers.get("content-type")?.startsWith("application/json"))
    return reply({ error: "Expected a JSON request." }, 415);
  let input;
  try {
    const reader = request.body?.getReader();
    if (!reader) return reply({ error: "A request body is required." }, 400);
    const chunks: Uint8Array[] = [];
    let size = 0;
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 8192) {
        await reader.cancel();
        return reply({ error: "Request is too large." }, 413);
      }
      chunks.push(value);
    }
    const text = Buffer.concat(chunks).toString("utf8");
    input = validateLead(JSON.parse(text));
  } catch {
    return reply({ error: "Please check your contact details." }, 400);
  }
  if (!input)
    return reply(
      { error: "Enter a valid email address and Indian WhatsApp number." },
      400,
    );
  const submittedAt = new Date().toISOString();
  const record = {
    ...input,
    submittedAt,
    captureMethod: "email_and_whatsapp",
    deliveryChannel: "email",
    sourceCampaign: CAMPAIGN,
    consent: {
      guideRequested: true,
      marketing: input.marketingConsent,
      noticeVersion: NOTICE_VERSION,
      recordedAt: submittedAt,
      channel: "email",
      whatsappGuideRequested: false,
      marketingChannels: input.marketingConsent ? ["email", "whatsapp"] : [],
    },
  };
  const downloadUrl = (await guidePath()) ? "/api/guide" : null;
  if (process.env.LEAD_WEBHOOK_URL) {
    if (
      process.env.NODE_ENV === "production" &&
      !process.env.NEXT_PUBLIC_PRIVACY_POLICY_URL
    )
      return reply(
        {
          error:
            "Guide requests are not available yet. Please try again later.",
        },
        503,
      );
    try {
      const endpoint = new URL(process.env.LEAD_WEBHOOK_URL);
      if (endpoint.protocol !== "https:") throw new Error("HTTPS required");
      const upstream = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": input.requestId,
          ...(process.env.LEAD_WEBHOOK_TOKEN
            ? { Authorization: `Bearer ${process.env.LEAD_WEBHOOK_TOKEN}` }
            : {}),
        },
        body: JSON.stringify(record),
        signal: AbortSignal.timeout(10000),
        redirect: "error",
      });
      if (!upstream.ok) throw new Error("Integration unavailable");
      const result = await upstream.json();
      if (
        result.stored !== true ||
        !["sent", "queued", "unavailable"].includes(result.delivery)
      )
        throw new Error("Invalid integration receipt");
      const message =
        result.delivery === "sent"
          ? `Your guide has been sent by ${input.method === "email" ? "email" : "WhatsApp"}.`
          : result.delivery === "queued"
            ? `Your request is saved. Guide delivery by ${input.method === "email" ? "email" : "WhatsApp"} is queued.`
            : "Your request is saved, but guide delivery is not available yet.";
      return reply({
        status: "captured",
        delivery: result.delivery,
        message,
        downloadUrl,
      });
    } catch {
      return reply(
        {
          error:
            "We could not confirm your request. Please retry; the same request ID prevents duplicate processing.",
        },
        502,
      );
    }
  }
  if (
    process.env.NODE_ENV === "production" &&
    process.env.LEAD_CAPTURE_MODE !== "development"
  )
    return reply(
      {
        error: "Guide requests are not available yet. Please try again later.",
      },
      503,
    );
  try {
    const dir = path.resolve(
      /* turbopackIgnore: true */ process.env.LEAD_STORAGE_DIR || ".data/leads",
    );
    await mkdir(dir, { recursive: true, mode: 0o700 });
    const file = path.join(dir, `${input.requestId}.json`);
    const fingerprint = createHash("sha256")
      .update(JSON.stringify(input))
      .digest("hex");
    try {
      await writeFile(
        file,
        JSON.stringify({ ...record, fingerprint }, null, 2),
        { flag: "wx", mode: 0o600 },
      );
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
      const existing = JSON.parse(await readFile(file, "utf8"));
      if (existing.fingerprint !== fingerprint)
        return reply(
          {
            error:
              "This request ID has already been used. Please reload and try again.",
          },
          409,
        );
    }
    return reply({
      status: "development",
      delivery: "unavailable",
      message:
        "Development mode: your test request was saved locally. No email or WhatsApp message was sent.",
      downloadUrl,
    });
  } catch {
    return reply(
      { error: "Your request could not be saved. Please try again." },
      500,
    );
  }
}
