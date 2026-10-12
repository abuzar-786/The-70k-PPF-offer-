import { test } from "node:test";
import assert from "node:assert/strict";
import { normalizeContact, validateLead } from "../lib/validation";
const id = "11111111-1111-4111-8111-111111111111";
test("normalizes Indian mobile numbers without accepting international or malformed input", () => {
  for (const n of [
    "98765 43210",
    "+91 98765 43210",
    "0091 98765 43210",
    "09876543210",
  ])
    assert.equal(normalizeContact("whatsapp", n), "+919876543210");
  for (const n of [
    "1234567890",
    "+44 98765 43210",
    "987654321",
    "letters9876543210",
    "+91 987654321012",
  ])
    assert.equal(normalizeContact("whatsapp", n), null);
});
test("validates email and rejects unknown methods", () => {
  assert.equal(
    normalizeContact("email", " Owner@Studio.com "),
    "owner@studio.com",
  );
  for (const n of ["a@", "a@b", "a b@c.com"])
    assert.equal(normalizeContact("email", n), null);
  assert.equal(normalizeContact("sms", "9876543210"), null);
});
test("requires an explicit boolean consent and UUID; bounds attribution and prevents client campaign injection", () => {
  const valid = {
    method: "email",
    email: "owner@studio.com",
    whatsapp: "+91 98765 43210",
    marketingConsent: false,
    requestId: id,
    utm: {
      utm_source: "x".repeat(300),
      utm_campaign: "premium\nppf",
      untrusted: "ignored",
    },
    sourceCampaign: "injected",
  };
  const result = validateLead(valid)!;
  assert.equal(result.marketingConsent, false);
  assert.equal(result.contact, "owner@studio.com");
  assert.equal(result.whatsapp, "+919876543210");
  assert.equal(validateLead({ ...valid, email: "invalid" }), null);
  assert.equal(validateLead({ ...valid, whatsapp: "invalid" }), null);
  assert.equal(validateLead({ ...valid, whatsapp: undefined }), null);
  assert.equal(validateLead({ ...valid, method: "whatsapp" }), null);
  assert.equal(result.utm.utm_source.length, 200);
  assert.equal(result.utm.utm_campaign, "premiumppf");
  assert.equal(result.utm.untrusted, undefined);
  assert.equal("sourceCampaign" in result, false);
  assert.equal(validateLead({ ...valid, marketingConsent: "yes" }), null);
  assert.equal(validateLead({ ...valid, requestId: "../../other" }), null);
});
