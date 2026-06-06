import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const createSignedUploadUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { path: string }) => z.object({ path: z.string().min(1).max(512) }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: signed, error } = await context.supabase.storage
      .from("documents")
      .createSignedUploadUrl(data.path);
    if (error) throw new Error(error.message);
    return signed;
  });

export const getDocumentSignedUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { documentId: string; useSigned?: boolean }) =>
    z.object({ documentId: z.string().uuid(), useSigned: z.boolean().optional() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: doc, error } = await context.supabase
      .from("documents")
      .select("id, original_path, signed_path, status, name, page_count")
      .eq("id", data.documentId)
      .single();
    if (error || !doc) throw new Error("Document not found");
    const path = data.useSigned && doc.signed_path ? doc.signed_path : doc.original_path;
    const { data: signed, error: e2 } = await context.supabase.storage
      .from("documents")
      .createSignedUrl(path, 60 * 30);
    if (e2) throw new Error(e2.message);
    return { url: signed.signedUrl, doc };
  });

export const sendForSignature = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { documentId: string }) =>
    z.object({ documentId: z.string().uuid() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("documents")
      .update({ status: "sent" })
      .eq("id", data.documentId);
    if (error) throw new Error(error.message);
    await context.supabase.from("audit_logs").insert({
      document_id: data.documentId,
      actor_email: context.claims.email ?? null,
      action: "document.sent",
    });
    return { ok: true };
  });

export const finalizeIfComplete = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { documentId: string }) =>
    z.object({ documentId: z.string().uuid() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    // Verify ownership
    const { data: doc } = await context.supabase
      .from("documents")
      .select("id, owner_id")
      .eq("id", data.documentId)
      .single();
    if (!doc) throw new Error("Not found");

    const { finalizeDocumentInternal } = await import("./pdf-sign.server");
    return await finalizeDocumentInternal(data.documentId);
  });