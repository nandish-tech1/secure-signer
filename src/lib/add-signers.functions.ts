import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";

export const addSignersWithDetails = createServerFn({ method: "POST" })
  .inputValidator((d: {
    documentId: string;
    signers: Array<{ email: string; name?: string | null; orderIndex?: number; role?: string }>;
    signingMode: "ordered" | "parallel";
    expirationDays: number;
  }) =>
    z.object({
      documentId: z.string().uuid(),
      signers: z.array(
        z.object({
          email: z.string().email(),
          name: z.string().nullable().optional(),
          orderIndex: z.number().int().optional(),
          role: z.enum(["signer", "validator", "witness"]).default("signer").optional(),
        })
      ),
      signingMode: z.enum(["ordered", "parallel"]),
      expirationDays: z.number().int().min(1).max(365),
    }).parse(d)
  )
  .handler(async ({ data }) => {
    const { signers, documentId, signingMode, expirationDays } = data;

    // Update document with signing mode
    await supabase.from("documents").update({ signing_mode: signingMode }).eq("id", documentId);

    // Calculate expiration date
    const now = new Date();
    const expiresAt = new Date(now.getTime() + expirationDays * 24 * 60 * 60 * 1000).toISOString();

    // Insert signers with roles, order, and expiration
    const signerRecords = signers.map((s, idx) => ({
      document_id: documentId,
      email: s.email,
      name: s.name || null,
      role: s.role || "signer",
      ...(signingMode === "ordered" && { order_index: s.orderIndex ?? idx }),
      expires_at: expiresAt,
      token: crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "").slice(0, 8),
      status: "pending" as const,
    }));

    const { error } = await supabase.from("signers").insert(signerRecords);
    if (error) throw new Error(error.message);

    // Log audit event
    await supabase.from("audit_logs").insert({
      document_id: documentId,
      action: "signers.added_bulk",
      metadata: {
        count: signers.length,
        signing_mode: signingMode,
        expiration_days: expirationDays,
      },
    });

    return { success: true, count: signers.length };
  });
