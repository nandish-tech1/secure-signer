# How Self-Signing Works in SecureSignier

## Overview
The application uses a **drag-and-drop signature field placement** system where document owners pre-define where signers should sign, then signers fill in their signatures at those marked locations.

---

## Step-by-Step Workflow

### 1️⃣ **DOCUMENT OWNER - Prepares Document** (`documents.$id.tsx`)
```
✓ Upload PDF document
✓ Add signers (one by one OR bulk via modal)
✓ Drag-and-drop to place signature fields
```

#### Key Actions:
- **Add Signers**: Click "+" button → Enter email + name
  - OR use bulk modal → Add multiple signers with roles & expiration dates
- **Select Active Signer**: Click signer in list (sets `activeSignerId`)
- **Click on PDF** to place signature field for that signer
  - Creates a colored box on the PDF (each signer has unique color)
  - Stores: `x_ratio`, `y_ratio`, `width_ratio`, `height_ratio` (position/size)
- **Drag Fields**: Grab field box to reposition it
- **Remove Fields**: Click × button on field to delete
- **Send for Signature**: Click "Send" button
  - Generates unique signing tokens for each signer
  - Sends email with signing link (e.g., `/sign/{token}`)

**Database Tables Involved:**
- `documents` - PDF metadata + owner
- `signers` - email, name, role, order, expiration date
- `signature_fields` - x/y position, page number, assigned signer

---

### 2️⃣ **SIGNER - Receives Email & Opens Link** 
```
📧 Email: "You've been asked to sign a document"
    → Click: "Sign now" → `/sign/{unique_token}`
```

#### Signer Authentication:
- Token identifies which signer + document
- No login required (public signing)
- Server verifies token validity + document/signer exists

---

### 3️⃣ **SIGNER - Reviews & Signs Document** (`sign.$token.tsx`)
```
[Left Side - PDF Viewer]          [Right Side - Signature Panel]
├─ PDF document                   ├─ "Your signature" card
├─ Pre-marked fields:             │  ├─ Draw signature
│  ├─ "Sign here" boxes           │  ├─ OR type name
│  │  (colored by signer)         │  └─ Preview
│  └─ Fields for OTHER signers    ├─ Action buttons:
│     (grayed out/read-only)      │  ├─ "Sign document"
└─ Signature overlay              │  └─ "Reject"
```

#### Signing Process:
1. **See Pre-Marked Fields**: 
   - ALL signature fields visible (from all signers)
   - Only fields assigned to current signer are interactive
   - Other signers' fields show as gray placeholders

2. **Add Signature**:
   - Click "Add signature" button
   - Modal opens → `<SignaturePad>` component
   - Options: Draw signature OR type name
   - Click complete → signature stored as image (data URL)

3. **Signature is Filled into Fields**:
   - All fields for this signer automatically show the signature
   - If signer's signature is on multiple pages → appears on all assigned fields

4. **Submit**:
   - Click "Sign document" button
   - Submits signature + timestamp + IP address
   - Signer status changes from "pending" → "signed"

5. **Reject Option**:
   - Click "Reject" → provide reason
   - Signer status → "rejected"
   - Document cannot be finalized without all signatures

---

## Visual Layout Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                   DOCUMENT OWNER VIEW                        │
│                 (documents.$id.tsx)                          │
├─────────────────────────────┬───────────────────────────────┤
│                             │                               │
│      PDF VIEWER             │    RIGHT PANEL                │
│   (with overlays)           │  ┌─────────────────┐          │
│                             │  │  SIGNERS CARD   │          │
│  ┌─────────────────┐        │  │ ┌─────────────┐ │          │
│  │ Page 1          │        │  │ │ John (Blue) │ │          │
│  │                 │        │  │ │ Mike (Red)  │ │          │
│  │ ┌──────────┐    │        │  │ │ Sarah(Grn)  │ │          │
│  │ │ Sig(Blue)│←───┼────────┤  │ └─────────────┘ │          │
│  │ └──────────┘    │        │  │                 │          │
│  │ ┌──────────┐    │        │  │ [+] Add Signer  │          │
│  │ │Sig(Red)  │    │        │  │ [≡] Bulk Add    │          │
│  │ └──────────┘    │        │  └─────────────────┘          │
│  │                 │        │                               │
│  └─────────────────┘        │  ┌─────────────────┐          │
│                             │  │  AUDIT TRAIL    │          │
│  Drag boxes to move         │  │ • Document      │          │
│  Click × to delete fields   │  │ • Signings      │          │
│                             │  └─────────────────┘          │
│                             │                               │
└─────────────────────────────┴───────────────────────────────┘

                          [Send] [Download]
                              ↓
                    Email signers with links


┌─────────────────────────────────────────────────────────────┐
│                     SIGNER VIEW                              │
│                  (sign.$token.tsx)                           │
├─────────────────────────────┬───────────────────────────────┤
│                             │                               │
│      PDF VIEWER             │  RIGHT PANEL                  │
│   (READ-ONLY)               │  ┌─────────────────────┐      │
│                             │  │ YOUR SIGNATURE      │      │
│  ┌─────────────────┐        │  │ ┌─────────────────┐ │      │
│  │ Page 1          │        │  │ │  [Add Sign...]  │ │      │
│  │                 │        │  │ └─────────────────┘ │      │
│  │ ┌──────────┐    │        │  │ (After signing:)    │      │
│  │ │Sign HERE │◄───┼────────┤  │ [Signature image]   │      │
│  │ │(colored) │    │        │  │ [Change] button     │      │
│  │ └──────────┘    │        │  │                     │      │
│  │ ┌──────────┐    │        │  ├─────────────────────┤      │
│  │ │Other sig │    │        │  │ [Sign Document]     │      │
│  │ │(gray)    │    │        │  │ [Reject]            │      │
│  │ └──────────┘    │        │  │ By signing you      │      │
│  │                 │        │  │ agree...            │      │
│  └─────────────────┘        │  └─────────────────────┘      │
│                             │                               │
│  Only YOUR fields are       │  SignaturePad Modal:          │
│  active + show signature    │  ┌─────────────────────┐      │
│                             │  │ Draw OR Type Name   │      │
│                             │  │                     │      │
│                             │  │ [Complete]          │      │
│                             │  └─────────────────────┘      │
└─────────────────────────────┴───────────────────────────────┘
```

---

## Key Code Components

### 1. **Signature Field Placement** (Owner)
```typescript
// In documents.$id.tsx - handlePageClick()

async function handlePageClick(page: number, dim: { width: number; height: number }, e: React.MouseEvent<HTMLDivElement>) {
  if (!activeSignerId) return toast.error("Add a signer first");
  
  // Calculate click position as percentage (0-1)
  const x = (e.clientX - rect.left) / rect.width;
  const y = (e.clientY - rect.top) / rect.height;
  
  // Create signature field box
  await supabase.from("signature_fields").insert({
    signer_id: activeSignerId,
    page,
    x_ratio: x,        // Where on page (0-1)
    y_ratio: y,        // Where on page (0-1)
    width_ratio: 0.22, // 22% of page width
    height_ratio: 0.07 // 7% of page height
  });
}
```

### 2. **Field Rendering for Owner** (Drag-to-reposition)
```typescript
// Shows ALL fields in different colors per signer
// Draggable (pointer events enabled)
// X button to delete

<div
  style={{
    left: `${f.x_ratio * 100}%`,
    top: `${f.y_ratio * 100}%`,
    width: `${f.width_ratio * 100}%`,
    height: `${f.height_ratio * 100}%`,
    borderColor: color,      // ← Different color per signer
    background: `${color}20` // ← Semi-transparent
  }}
  onPointerDown={onFieldPointerDown}  // ← Drag enabled
  onClick={removeField}               // ← Delete on X click
>
  {signer?.name || signer?.email}
</div>
```

### 3. **Field Rendering for Signer** (Signature display)
```typescript
// In sign.$token.tsx - renderOverlay()

{state.fields.map((f) => (
  <div
    className="absolute rounded border-2 border-accent bg-accent/15"
    style={{
      left: `${f.x_ratio * 100}%`,
      top: `${f.y_ratio * 100}%`,
      width: `${f.width_ratio * 100}%`,
      height: `${f.height_ratio * 100}%`
    }}
  >
    {signatureUrl ? (
      <img src={signatureUrl} />  // ← Signer's drawn/typed signature
    ) : (
      <span>Sign here</span>
    )}
  </div>
))}
```

### 4. **Signature Capture**
```typescript
// SignaturePad component - allows:
// ✓ Draw on canvas with mouse/touch
// ✓ Type name as alternative
// Returns: { dataUrl: "data:image/png;base64...", typed: bool }

// Submitted with:
await submitFn({
  token,
  signatureDataUrl: signatureUrl,  // ← Image data
  typed                            // ← Whether typed or drawn
});
```

---

## Data Flow Summary

```
1. OWNER PREPARES:
   documents → signers → signature_fields (with x,y,width,height for each signer)

2. EMAIL SENT:
   For each signer: Generate unique token → Send email with `/sign/{token}` link

3. SIGNER SIGNS:
   GET /sign/{token} → Load PDF + fetch all fields for that document
   → Show fields (owner sees ALL, signer sees only filtered/highlighted)
   → Signer draws/types signature
   → Submit with signature image → Update signer.status = "signed"
   → Signature image auto-fills all fields for that signer

4. OWNER VIEWS RESULTS:
   Once all signers complete → Document status = "signed"
   → Can download final PDF with all signatures embedded
```

---

## Configuration Options (From Modal)

When adding signers via the bulk modal, you can set:
- **Role**: "signer" | "validator" | "witness"
- **Order**: Sequential (signer 1 must sign before signer 2) OR Parallel (all at once)
- **Expiration**: 1-365 days (fields become inactive after expiry)

These are stored in the `signers` table and checked at signing time.

---

## Security Features

✅ **Unique Tokens**: Each signer gets random UUID token (unguessable)
✅ **No Login Required**: Public signing (but token-protected)
✅ **Timestamp Recording**: `signed_at` timestamp recorded
✅ **IP Logging**: `signed_ip` recorded for audit trail
✅ **RLS Policies**: 
   - Signers can only view/sign own documents (via email in JWT)
   - Document owner has full management access
   - Service role handles bulk operations
✅ **Signature Verification**: Image stored + associated with email + timestamp
✅ **Rejection Option**: Signers can explicitly reject + provide reason
