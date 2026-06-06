import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";

export const getSignerByToken = createServerFn({ method: "POST" })
  .inputValidator((d: { token: string }) =>
    z.object({ token: z.string().min(8).max(128) }).parse(d),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: signer, error } = await supabaseAdmin
      .from("signers")
      .select("id, document_id, email, name, status, rejection_reason, signed_at")
      .eq("token", data.token)
      .single();
    if (error || !signer) throw new Error("Invalid or expired link");

    const { data: doc } = await supabaseAdmin
      .from("documents")
      .select("id, name, original_path, page_count")
      .eq("id", signer.document_id)
      .single();
    if (!doc) throw new Error("Document not found");

    const { data: fields } = await supabaseAdmin
      .from("signature_fields")
      .select("id, page, x_ratio, y_ratio, width_ratio, height_ratio")
      .eq("signer_id", signer.id);

    const { data: signed } = await supabaseAdmin.storage
      .from("documents")
      .createSignedUrl(doc.original_path, 60 * 30);

    // log a view event
    await supabaseAdmin.from("audit_logs").insert({
      document_id: doc.id,
      signer_id: signer.id,
      actor_email: signer.email,
      action: "signer.viewed",
      ip: getClientIp(),
      user_agent: getRequest()?.headers.get("user-agent") ?? null,
    });

    return {
      signer,
      document: { id: doc.id, name: doc.name, pageCount: doc.page_count },
      fields: fields ?? [],
      fileUrl: signed?.signedUrl ?? "",
    };
  });

export const submitSignature = createServerFn({ method: "POST" })
  .inputValidator((d: { token: string; signatureDataUrl: string; typed?: string }) =>
    z
      .object({
        token: z.string().min(8).max(128),
        signatureDataUrl: z.string().min(20).max(2_000_000),
        typed: z.string().max(200).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: signer, error } = await supabaseAdmin
      .from("signers")
      .select("id, document_id, email, status")
      .eq("token", data.token)
      .single();
    if (error || !signer) throw new Error("Invalid link");
    if (signer.status !== "pending") throw new Error("Already responded");

    const ip = getClientIp();
    const ua = getRequest()?.headers.get("user-agent") ?? null;

    await supabaseAdmin
      .from("signers")
      .update({
        status: "signed",
        signed_at: new Date().toISOString(),
        signed_ip: ip,
        signature_data: data.signatureDataUrl,
        signature_typed: data.typed ?? null,
      })
      .eq("id", signer.id);

    await supabaseAdmin.from("audit_logs").insert({
      document_id: signer.document_id,
      signer_id: signer.id,
      actor_email: signer.email,
      action: "signer.signed",
      ip,
      user_agent: ua,
    });

    // Try to finalize the document if all signers done
    const { finalizeDocumentInternal } = await import("./pdf-sign.server");
    try { await finalizeDocumentInternal(signer.document_id); } catch (e) { console.error(e); }

    return { ok: true };
  });

export const rejectSignature = createServerFn({ method: "POST" })
  .inputValidator((d: { token: string; reason: string }) =>
    z.object({ token: z.string().min(8).max(128), reason: z.string().min(1).max(500) }).parse(d),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: signer, error } = await supabaseAdmin
      .from("signers")
      .select("id, document_id, email, status")
      .eq("token", data.token)
      .single();
    if (error || !signer) throw new Error("Invalid link");
    if (signer.status !== "pending") throw new Error("Already responded");

    const ip = getClientIp();
    await supabaseAdmin
      .from("signers")
      .update({ status: "rejected", rejection_reason: data.reason, signed_ip: ip })
      .eq("id", signer.id);

    await supabaseAdmin.from("audit_logs").insert({
      document_id: signer.document_id,
      signer_id: signer.id,
      actor_email: signer.email,
      action: "signer.rejected",
      ip,
      metadata: { reason: data.reason },
    });
    return { ok: true };
  });

function getClientIp() {
  const req = getRequest();
  if (!req) return null;
  const h = req.headers;
  return (
    h.get("cf-connecting-ip") ||
    h.get("x-real-ip") ||
    (h.get("x-forwarded-for") || "").split(",")[0].trim() ||
    null
  );
}