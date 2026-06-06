import { PDFDocument } from "pdf-lib";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

/**
 * Embed all collected signer signatures into the original PDF and store as signed_path.
 * Marks the document `completed` when all signers have signed.
 */
export async function finalizeDocumentInternal(documentId: string) {
  const { data: doc, error: docErr } = await supabaseAdmin
    .from("documents")
    .select("id, owner_id, name, original_path, signed_path")
    .eq("id", documentId)
    .single();
  if (docErr || !doc) throw new Error("Document not found");

  const { data: signers, error: sErr } = await supabaseAdmin
    .from("signers")
    .select("id, status, signature_data, signature_typed, name, email")
    .eq("document_id", documentId);
  if (sErr) throw new Error(sErr.message);
  if (!signers || signers.length === 0) throw new Error("No signers");

  const allSigned = signers.every((s) => s.status === "signed");
  if (!allSigned) return { completed: false };

  const { data: fields, error: fErr } = await supabaseAdmin
    .from("signature_fields")
    .select("signer_id, page, x_ratio, y_ratio, width_ratio, height_ratio");
  if (fErr) throw new Error(fErr.message);

  // Download original
  const { data: file, error: dlErr } = await supabaseAdmin.storage
    .from("documents")
    .download(doc.original_path);
  if (dlErr || !file) throw new Error("Cannot read original PDF");

  const bytes = new Uint8Array(await file.arrayBuffer());
  const pdf = await PDFDocument.load(bytes);
  const pages = pdf.getPages();

  const signerMap = new Map(signers.map((s) => [s.id, s]));
  for (const f of fields ?? []) {
    const signer = signerMap.get(f.signer_id);
    if (!signer || !signer.signature_data) continue;
    const pageIdx = Math.max(0, Math.min(pages.length - 1, (f.page ?? 1) - 1));
    const page = pages[pageIdx];
    const { width: pw, height: ph } = page.getSize();
    const w = Number(f.width_ratio) * pw;
    const h = Number(f.height_ratio) * ph;
    // y_ratio is from top in our UI; PDF origin is bottom-left
    const x = Number(f.x_ratio) * pw;
    const y = ph - Number(f.y_ratio) * ph - h;

    try {
      const b64 = signer.signature_data.split(",")[1] ?? signer.signature_data;
      const imgBytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
      const img = await pdf.embedPng(imgBytes);
      page.drawImage(img, { x, y, width: w, height: h });
    } catch (e) {
      console.error("embed failed", e);
    }
  }

  const out = await pdf.save();
  const signedPath = `${doc.owner_id}/signed/${documentId}.pdf`;
  const { error: upErr } = await supabaseAdmin.storage
    .from("documents")
    .upload(signedPath, out, { contentType: "application/pdf", upsert: true });
  if (upErr) throw new Error(upErr.message);

  await supabaseAdmin
    .from("documents")
    .update({ signed_path: signedPath, status: "completed" })
    .eq("id", documentId);

  await supabaseAdmin.from("audit_logs").insert({
    document_id: documentId,
    action: "document.finalized",
    metadata: { signers: signers.length },
  });

  return { completed: true, signedPath };
}