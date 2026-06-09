import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
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
    .select("signer_id, page, x_ratio, y_ratio, width_ratio, height_ratio, field_type, value");
  if (fErr) throw new Error(fErr.message);

  // Download original
  const { data: file, error: dlErr } = await supabaseAdmin.storage
    .from("documents")
    .download(doc.original_path);
  if (dlErr || !file) throw new Error("Cannot read original PDF");

  const bytes = new Uint8Array(await file.arrayBuffer());
  const pdf = await PDFDocument.load(bytes);
  const pages = pdf.getPages();
  const helv = await pdf.embedFont(StandardFonts.Helvetica);

  const signerMap = new Map(signers.map((s) => [s.id, s]));
  for (const f of fields ?? []) {
    const signer = signerMap.get(f.signer_id);
    if (!signer) continue;
    const pageIdx = Math.max(0, Math.min(pages.length - 1, (f.page ?? 1) - 1));
    const page = pages[pageIdx];
    const { width: pw, height: ph } = page.getSize();
    const w = Number(f.width_ratio) * pw;
    const h = Number(f.height_ratio) * ph;
    const x = Number(f.x_ratio) * pw;
    const y = ph - Number(f.y_ratio) * ph - h;
    const ftype = (f as any).field_type ?? "signature";

    try {
      if (ftype === "signature" || ftype === "initials") {
        // Prefer per-field image (e.g. typed initials image) when present
        const fieldVal = (f as any).value as string | null;
        const src =
          ftype === "initials" && fieldVal && typeof fieldVal === "string" && fieldVal.startsWith("data:")
            ? fieldVal
            : signer.signature_data;
        if (!src) continue;
        const b64 = src.split(",")[1] ?? src;
        const imgBytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
        const img = await pdf.embedPng(imgBytes);
        page.drawImage(img, { x, y, width: w, height: h });
      } else {
        const text =
          ftype === "name" ? (f.value || signer.name || signer.email || "") :
          ftype === "date" ? (f.value || new Date().toLocaleDateString()) :
          (f.value || "");
        if (!text) continue;
        const fontSize = Math.max(8, Math.min(h * 0.7, 18));
        page.drawText(text, {
          x: x + 2,
          y: y + (h - fontSize) / 2,
          size: fontSize,
          font: helv,
          color: rgb(0.06, 0.11, 0.24),
        });
      }
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