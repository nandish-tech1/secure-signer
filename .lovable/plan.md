
# iLovePDF-style Sign flow

Bring the current sign experience up to parity with ilovepdf.com/sign-pdf across both "Only me" and "Several people" modes, plus a signed certificate appended to every completed document.

## What you'll get

**Editor (shared by Only me + Several people)**
- Left rail: page thumbnails (click to jump, current page highlighted)
- Top bar: zoom in / zoom out / fit width, page X of Y
- Right rail: signer switcher (in multi mode) with color chip, then field palette (Signature, Initials, Name, Date, Text, Checkbox)
- Drop fields anywhere on any page; each field gets its assigned signer's color
- Drag to move, drag corner handle to resize, × to delete
- Click a field to edit its value inline (text / date format)
- Signature dialog with three tabs: Draw, Type (4 cursive fonts + 4 colors), Upload (PNG/JPG)
- "Save signature" checkbox stores it on the user profile for reuse next time

**Only me flow**
- After upload → choose "Only me" → land directly in editor with a single implicit signer (you)
- One click "Sign & Download" finalizes, appends certificate, opens signed PDF

**Several people flow**
- After upload → choose "Several people" → add signers (name, email, color auto-assigned)
- Toggle "Set signing order" → drag to reorder; otherwise parallel
- In editor, switch active signer in the right rail to place their fields
- Send → emails go out (first signer if ordered, all if parallel) with magic-link token
- Public sign page (`/sign/$token`) uses the same editor in read-only field-layout mode: signer fills their own fields, signs, submits
- When all signers complete → auto-finalize + certificate

**Certificate page (appended to every signed PDF)**
- Document name, document ID, completion timestamp
- Table of signers: name, email, signed-at timestamp, IP, signature thumbnail
- "Signed with [App]" footer

## Technical plan

```text
src/
  components/
    sign-editor/
      SignEditor.tsx         (shared editor: thumbnails + canvas + palette)
      FieldBox.tsx           (draggable+resizable field with handles)
      SignerSwitcher.tsx     (multi mode only)
      ZoomBar.tsx
    SignatureDetailsDialog.tsx (extend: add Upload tab, Save checkbox)
  routes/_authenticated/
    documents.$id_.self-sign.tsx   (replace body with <SignEditor mode="self"/>)
    documents.$id.tsx              (multi-signer setup: signers + order + open editor)
    documents.$id_.prepare.tsx     (NEW: multi-signer field placement editor)
  routes/
    sign.$token.tsx          (rewrite: use <SignEditor mode="public"/>)
  lib/
    pdf-sign.server.ts       (extend: append certificate page, per-signer color metadata)
    documents.functions.ts   (add: send invites, reorder signers)
```

**DB migrations**
- `signers`: add `color text`, `order_index int`, `notified_at timestamptz`
- `documents`: add `signing_mode text` ('self' | 'ordered' | 'parallel'), `current_signer_id uuid`
- `signature_fields`: add `required boolean default true`
- `profiles` (new if missing): `id uuid pk → auth.users`, `saved_signature_data text`, `saved_initials_data text`, `full_name text`
- Grants + RLS on all new columns/tables

**Server functions (createServerFn)**
- `sendSignerInvites({documentId})` — emails next signer(s)
- `advanceSigningOrder({documentId})` — after a signer submits, notify next
- `appendCertificate(pdfBytes, signers, doc)` — pdf-lib helper used inside `finalizeDocumentInternal`

**Resize logic** — pointerdown on SE corner handle scales `width_ratio`/`height_ratio` against the overlay rect, clamped to [min, 1-x].

**Per-signer color** — assigned from a fixed palette on signer create; field overlay uses `border-color` + 10% bg from that color via inline style.

**Email** — uses existing Lovable Cloud auth email infra; subject "Please sign {doc name}", link to `/sign/{token}`.

## Out of scope (tell me if you want these too)
- SMS / WhatsApp notifications
- Bulk send (CSV → many documents)
- Templates / saved field layouts
- Advanced field types (dropdown, radio, attachment)
- Real digital certificate / PKI signing — we embed image signatures + audit page, not cryptographic PAdES

## Order of work
1. DB migrations (signers color/order, documents signing_mode, profiles)
2. Shared `SignEditor` component (thumbnails, zoom, resize, signer-aware fields)
3. Replace self-sign page with `SignEditor mode="self"`
4. Multi-signer setup page + `prepare` editor + invite server fn
5. Public `/sign/$token` rewrite using `SignEditor mode="public"`
6. Certificate page in `pdf-sign.server.ts`
7. Save-signature profile reuse
8. Verify each flow end-to-end in preview

This is ~6-8 files of new/changed code plus one migration. I'll do it in that order so each step is independently reviewable.
