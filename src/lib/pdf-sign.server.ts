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
  // Append audit certificate page
  const certBytes = await buildCertificatePage(pdf, doc, signers);
  const finalBytes = certBytes ?? out;

  const signedPath = `${doc.owner_id}/signed/${documentId}.pdf`;
  const { error: upErr } = await supabaseAdmin.storage
    .from("documents")
    .upload(signedPath, finalBytes, { contentType: "application/pdf", upsert: true });
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

async function buildCertificatePage(
  pdf: PDFDocument,
  doc: { id: string; name: string; owner_id: string },
  signers: Array<{
    id: string;
    name: string | null;
    email: string;
    status: string;
    signed_at?: string | null;
    signature_data: string | null;
  }>,
): Promise<Uint8Array | null> {
  try {
    const helv = await pdf.embedFont(StandardFonts.Helvetica);
    const helvBold = await pdf.embedFont(StandardFonts.HelveticaBold);
    const page = pdf.addPage([595.28, 841.89]); // A4
    const { width, height } = page.getSize();
    const margin = 48;
    let y = height - margin;

    page.drawText("Signature Certificate", {
      x: margin, y, size: 22, font: helvBold, color: rgb(0.06, 0.11, 0.24),
    });
    y -= 28;
    page.drawText(`Document: ${doc.name}`, { x: margin, y, size: 11, font: helv });
    y -= 14;
    page.drawText(`Document ID: ${doc.id}`, { x: margin, y, size: 9, font: helv, color: rgb(0.4, 0.4, 0.4) });
    y -= 14;
    page.drawText(`Completed: ${new Date().toUTCString()}`, { x: margin, y, size: 9, font: helv, color: rgb(0.4, 0.4, 0.4) });

    y -= 30;
    page.drawText("Signers", { x: margin, y, size: 14, font: helvBold });
    y -= 8;
    page.drawLine({ start: { x: margin, y }, end: { x: width - margin, y }, thickness: 0.5, color: rgb(0.7, 0.7, 0.7) });
    y -= 18;

    for (const s of signers) {
      if (y < 120) break;
      const name = s.name || s.email;
      page.drawText(name, { x: margin, y, size: 12, font: helvBold });
      y -= 13;
      page.drawText(s.email, { x: margin, y, size: 10, font: helv, color: rgb(0.35, 0.35, 0.35) });
      y -= 12;
      const ts = s.signed_at ? new Date(s.signed_at).toUTCString() : "Not signed";
      page.drawText(`Signed at: ${ts}`, { x: margin, y, size: 9, font: helv, color: rgb(0.45, 0.45, 0.45) });
      y -= 12;
      page.drawText(`Status: ${s.status}`, { x: margin, y, size: 9, font: helv, color: rgb(0.45, 0.45, 0.45) });
      y -= 8;

      if (s.signature_data && s.signature_data.startsWith("data:image/")) {
        try {
          const b64 = s.signature_data.split(",")[1] ?? "";
          const imgBytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
          const img = s.signature_data.includes("image/jpeg")
            ? await pdf.embedJpg(imgBytes)
            : await pdf.embedPng(imgBytes);
          const sigW = 140;
          const sigH = (img.height / img.width) * sigW;
          if (y - sigH < 100) { y -= 4; }
          else {
            page.drawImage(img, { x: margin, y: y - sigH, width: sigW, height: sigH });
            y -= sigH + 6;
          }
        } catch {}
      }

      y -= 12;
      page.drawLine({ start: { x: margin, y }, end: { x: width - margin, y }, thickness: 0.3, color: rgb(0.85, 0.85, 0.85) });
      y -= 14;
    }

    page.drawText("This certificate is auto-generated as a record of the e-signature workflow.", {
      x: margin, y: 48, size: 8, font: helv, color: rgb(0.5, 0.5, 0.5),
    });

    return await pdf.save();
  } catch (e) {
    console.error("certificate build failed", e);
    return null;
  }
}