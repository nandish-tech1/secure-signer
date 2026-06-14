# Complete Multi-Signer Workflow Guide

## 📋 The Full 4-Step Process You Requested

```
STEP 1: ADD MULTIPLE SIGNERS (with email, name, role, expiry)
   ↓ [Modal dialog fills in signers]
STEP 2: PLACE SIGNATURE FIELDS (drag & drop on PDF where each signer signs)
   ↓ [Owner repositions/deletes fields as needed]
STEP 3: SEND FOR SIGNATURE (generates unique tokens & sends emails)
   ↓ [Each signer gets personalized signing link]
STEP 4: SIGNERS RECEIVE EMAIL & SIGN (draw/type signature, submit)
   ↓ [Signatures collected with timestamp & IP]
FINAL: AUTO-FINALIZE (embed signatures into PDF, add certificate page)
```

---

## 🎯 Step-by-Step Detailed Walkthrough

### **STEP 1: Owner Adds Multiple Signers** ✍️

**How to start:**
1. Go to dashboard → Upload PDF
2. Click "Several people" to configure multi-signer workflow
3. Opens document editor page (`/documents/{id}`)

**Add signers (Two options):**

**Option A: Add one-by-one** (Simple form)
```
Signers panel (right side)
├─ [+] button to expand form
├─ Email: john@example.com
├─ Name: John Doe
└─ [Add signer] button
```

**Option B: Bulk add** (What you requested - Role + Expiry) ✨
```
Signers panel (right side)
├─ [≡] Bulk Add button
└─ Modal opens:
   ├─ Recipient #1
   │  ├─ Email: john@example.com
   │  ├─ Name: John Doe
   │  ├─ Role: Signer (dropdown: Signer/Validator/Witness)
   │  └─ Ordering: [☑] Set order of receivers
   ├─ Recipient #2
   │  └─ (same fields)
   ├─ Settings:
   │  ├─ [☑] Set order of receivers (checkbox)
   │  ├─ Change expiration date: 15 days (input: 1-365)
   │  └─ [Drag ↑↓ to reorder] (if ordered)
   ├─ [Cancel] [Apply all]
```

**What happens:**
- Signers stored in database with:
  - `email`, `name`, `role` ("signer" | "validator" | "witness")
  - `order_index` (if ordered mode)
  - `expires_at` (15 days from now)
  - Unique `token` (e.g., `a1b2c3d4e5f6g7h8`)

---

### **STEP 2: Owner Places Signature Fields** 🎯

**How it works:**

1. **Select Active Signer:**
   - Click on signer in list (right panel)
   - Signer gets highlighted (blue border)
   - Current signer name shown at top of PDF viewer

2. **Click on PDF to place field:**
   ```
   Left side (PDF Viewer)
   ├─ Click anywhere on page
   └─ Colored box appears showing:
      ├─ Field size: 22% width × 7% height
      ├─ Color: John's color (blue)
      ├─ Text: "John Doe" (signer name)
      └─ × button (top-right) to delete field
   ```

3. **Reposition fields (Drag & Drop):**
   - Hover over field → cursor changes to grab hand
   - Click & drag to new position
   - Auto-saves position to database (`x_ratio`, `y_ratio`)

4. **Add fields for other signers:**
   - Click different signer in list
   - Click on PDF again in different location
   - Each gets unique color (e.g., John=Blue, Mike=Red, Sarah=Green)

5. **Multiple pages support:**
   - Same signer can have fields on multiple pages
   - Signature appears on ALL pages when signer signs

**Result in database:**
```
signature_fields table:
├─ Field 1: page=1, signer_id=John's_id, color=blue, x_ratio=0.2, y_ratio=0.4
├─ Field 2: page=1, signer_id=Mike's_id, color=red, x_ratio=0.5, y_ratio=0.4
├─ Field 3: page=2, signer_id=John's_id, color=blue, x_ratio=0.2, y_ratio=0.6
└─ ...
```

---

### **STEP 3: Owner Sends for Signature** 📧

**Trigger:**
- Click **[Send]** button at top of page
- Validation checks:
  - ✓ At least 1 signer added
  - ✓ At least 1 signature field placed
  - ✓ Document name provided

**What happens automatically:**

1. **Generate signing links:**
   ```
   For each signer:
   ├─ Create unique token (e.g., a1b2c3d4e5f6g7h8)
   ├─ URL: https://yourapp.com/sign/{token}
   └─ Store in database (signers.token)
   ```

2. **Mark document as "sent":**
   ```
   documents.status: "draft" → "sent"
   audit_logs entry: "document.sent"
   ```

3. **Send emails** (For ordered signing):
   ```
   If Ordered mode (receiver 1 → receiver 2 → receiver 3):
   └─ Email ONLY to receiver #1:
      Subject: "You've been asked to sign: {Document Name}"
      Body: "Please sign here: https://yourapp.com/sign/{token}"
      
   If Parallel mode (all sign at same time):
   ├─ Email to John: "https://yourapp.com/sign/{john_token}"
   ├─ Email to Mike: "https://yourapp.com/sign/{mike_token}"
   └─ Email to Sarah: "https://yourapp.com/sign/{sarah_token}"
   ```

**UI Feedback:**
```
Toast message: "Document sent — share signing links with each signer"
Document status badge: "Sent"
Copy Link button: Allows owner to manually share link if needed
```

---

### **STEP 4: Signer Receives Email & Signs** ✍️

**Signer's experience:**

1. **Receives email:**
   ```
   From: noreply@yoursigningapp.com
   Subject: You've been asked to sign: Contract.pdf
   
   Body:
   "John, please sign the attached document.
    
    [Sign Now] → https://yourapp.com/sign/{unique_token}"
   ```

2. **Opens signing page** (`/sign/{token}`):
   ```
   Header: "Contract.pdf"
   Subtext: "Signing as john@example.com"
   
   Left Side (PDF Viewer - READ ONLY):
   ├─ Original PDF displayed
   ├─ ALL signature fields visible:
   │  ├─ Field 1 (Blue): "John Doe" + "Sign here" text
   │  ├─ Field 2 (Red): "Mike Jones" + grayed out
   │  └─ Field 3 (Green): "Sarah Lee" + grayed out
   └─ Color coding:
      ├─ BRIGHT BLUE = John's field (active - HE must sign here)
      ├─ Gray = Other signers' fields (read-only placeholders)
      └─ Empty boxes initially, will fill with signature image
   
   Right Side (Signature Panel):
   ├─ Card: "Your signature"
   │  ├─ [Add signature] button
   │  └─ (or [Change] if already signed)
   │
   ├─ Modal (when [Add signature] clicked):
   │  ├─ Canvas area to draw signature OR
   │  ├─ Text input field to type name (John Doe)
   │  ├─ Clear button (to restart)
   │  └─ [Complete] button
   │
   ├─ Action buttons:
   │  ├─ [Sign document] (enabled only after signature added)
   │  ├─ [Reject] (optional - allow signer to refuse)
   │  └─ Legal text: "By signing, you agree this is legally binding..."
   └─ Audit trail: "Secure signing session" badge
   ```

3. **Signer adds signature:**
   - Click **[Add signature]** → modal opens
   - **Option 1:** Draw signature with mouse/touch
     ```
     Canvas appears
     ├─ Draw your signature
     ├─ [Clear] to restart
     └─ [Done] to confirm
     ```
   - **Option 2:** Type name instead
     ```
     ├─ Input field for name
     ├─ Auto-generated signature font
     └─ [Done] to confirm
     ```

4. **Signature auto-fills all fields:**
   ```
   After [Done]:
   ├─ Signature image stored in memory
   ├─ Modal closes
   ├─ PDF viewer updates:
   │  ├─ Field 1 (Blue) now shows: [Signature image]
   │  ├─ Field 2 (Red) still shows: "Mike Jones" (waiting)
   │  └─ Field 3 (Green) still shows: "Sarah Lee" (waiting)
   └─ [Sign document] button becomes enabled
   ```

5. **Signer submits:**
   - Click **[Sign document]** button
   - Server receives:
     ```
     {
       token: "a1b2c3d4e5f6g7h8",
       signatureDataUrl: "data:image/png;base64,...",
       typed: false (or true if typed name)
     }
     ```
   - Database updated:
     ```
     signers row for this token:
     ├─ status: "pending" → "signed"
     ├─ signed_at: "2026-06-13T14:32:45Z"
     ├─ signed_ip: "192.168.1.100"
     ├─ signature_data: "data:image/png;base64,..." (image stored)
     └─ audit_logs entry: "signer.signed"
     ```
   - Success message:
     ```
     Toast: "Signed successfully"
     Page updates: "You've signed this document on [timestamp]"
     UI locked (read-only view)
     ```

6. **If signer rejects:**
   - Click **[Reject]** button
   - Modal appears: "Reason for rejecting"
   - Enter reason (e.g., "Need to discuss terms first")
   - Submit
   - Database updated:
     ```
     signers row:
     ├─ status: "pending" → "rejected"
     ├─ rejection_reason: "Need to discuss terms first"
     └─ audit_logs entry: "signer.rejected"
     ```

---

### **STEP 5 (Auto): Document Finalizes** 📄

**When all signers have signed:**
- System automatically detects: all signers.status = "signed"
- Triggers finalization process:

1. **Embed signatures into PDF:**
   ```
   For each signature_field:
   ├─ Get signer's signature image
   ├─ Place at (x_ratio, y_ratio) on page
   ├─ Embed on all assigned pages
   └─ Result: signed PDF with visible signatures
   ```

2. **Add certificate page (last page):**
   ```
   New page appended to PDF:
   ┌─────────────────────────────────────┐
   │ Signature Certificate               │
   ├─────────────────────────────────────┤
   │ Document: Contract.pdf              │
   │ Document ID: 550e8400-e29b-41d4... │
   │ Completed: Jun 13, 2026, 2:32 PM    │
   │                                     │
   │ SIGNERS:                            │
   │ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━   │
   │ Name: John Doe                      │
   │ Email: john@example.com             │
   │ Signed at: Jun 13, 2026, 1:15 PM    │
   │ Status: Signed                      │
   │ IP: 192.168.1.100                   │
   │ [Signature Thumbnail Image]         │
   │                                     │
   │ Name: Mike Jones                    │
   │ Email: mike@example.com             │
   │ Signed at: Jun 13, 2026, 1:45 PM    │
   │ Status: Signed                      │
   │ IP: 203.0.113.42                    │
   │ [Signature Thumbnail Image]         │
   │                                     │
   │ Name: Sarah Lee                     │
   │ Email: sarah@example.com            │
   │ Signed at: Jun 13, 2026, 2:30 PM    │
   │ Status: Signed                      │
   │ IP: 198.51.100.15                   │
   │ [Signature Thumbnail Image]         │
   │                                     │
   │ Signed with SecureSignier ©         │
   └─────────────────────────────────────┘
   ```

3. **Database updates:**
   ```
   documents row:
   ├─ status: "sent" → "completed"
   ├─ signed_path: "documents/550e8400.pdf" (new signed file)
   └─ audit_logs entry: "document.finalized"
   ```

4. **Owner can download:**
   - Signed PDF appears in document page
   - **[Signed PDF]** download button enabled
   - PDF includes:
     - Original document
     - All signatures placed in correct positions
     - Certificate page with audit trail

---

## 🔄 Complete Data Flow

```
┌──────────────────────────────────────────────────────────┐
│ OWNER SIDE (Authenticated)                               │
├──────────────────────────────────────────────────────────┤
│                                                          │
│ 1. Upload PDF                                           │
│    ↓                                                    │
│    documents table: create (owner_id, name, pdf_path) │
│                                                          │
│ 2. Add signers (bulk modal)                             │
│    ↓                                                    │
│    signers table: insert (email, name, role, expires) │
│    + generate unique token for each                    │
│                                                          │
│ 3. Place signature fields (drag-drop)                  │
│    ↓                                                    │
│    signature_fields: insert (signer_id, page, x/y)   │
│    + position/drag updates                            │
│                                                          │
│ 4. Click [Send]                                        │
│    ↓                                                    │
│    documents.status → "sent"                          │
│    + sendForSignature() called                        │
│    + emails generated with /sign/{token} links        │
│                                                          │
└──────────────────────────────────────────────────────────┘
           ↓
    [Email sent to each signer]
           ↓
┌──────────────────────────────────────────────────────────┐
│ SIGNER SIDE (Public - Token Protected)                   │
├──────────────────────────────────────────────────────────┤
│                                                          │
│ 1. Click email link: /sign/{unique_token}              │
│    ↓                                                    │
│    getSignerByToken() validates token                 │
│    + loads signer + document + fields                 │
│                                                          │
│ 2. Review PDF with pre-placed fields                  │
│    ↓                                                    │
│    Shows all fields (theirs = bright, others = gray)  │
│                                                          │
│ 3. Add signature (draw or type)                        │
│    ↓                                                    │
│    SignaturePad component captures image              │
│                                                          │
│ 4. Click [Sign document]                              │
│    ↓                                                    │
│    submitSignature() called with signature image      │
│    signers.status → "signed"                          │
│    signers.signed_at = now()                          │
│    signers.signed_ip = client_ip                      │
│    audit_logs entry recorded                          │
│                                                          │
└──────────────────────────────────────────────────────────┘
           ↓
    [Server checks: all signers signed?]
           ↓
┌──────────────────────────────────────────────────────────┐
│ AUTO-FINALIZATION (Server-Side)                         │
├──────────────────────────────────────────────────────────┤
│                                                          │
│ finalizeDocumentInternal() runs:                       │
│                                                          │
│ 1. Load original PDF                                  │
│ 2. For each signature_field:                          │
│    ├─ Get signer's signature_data                     │
│    ├─ Embed at (x_ratio, y_ratio)                     │
│    └─ Repeat for all pages                            │
│ 3. Generate certificate page                         │
│    ├─ Document name + ID                             │
│    ├─ Completion timestamp                           │
│    ├─ Table of signers (name, email, signed_at, IP)  │
│    └─ Signature thumbnails                           │
│ 4. Save as new PDF                                   │
│    └─ storage/documents/{id}_signed.pdf              │
│ 5. Update database:                                  │
│    documents.status → "completed"                    │
│    documents.signed_path → new file path             │
│                                                          │
└──────────────────────────────────────────────────────────┘
           ↓
    [Download link available]
           ↓
┌──────────────────────────────────────────────────────────┐
│ OWNER DOWNLOADS FINAL PDF                               │
├──────────────────────────────────────────────────────────┤
│                                                          │
│ PDF Contents:                                          │
│ ├─ Page 1-N: Original document with embedded sigs    │
│ ├─ Last Page: Certificate with audit trail           │
│ └─ All signatures timestamped + IP logged             │
│                                                          │
│ Document page shows:                                   │
│ ├─ Status badge: "Completed"                         │
│ ├─ [Signed PDF] download button                      │
│ └─ Signer list with all sign timestamps              │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

---

## 🎨 UI Components Involved

```
documents.$id.tsx (Owner Dashboard)
├─ AddSignersModal ← Click bulk add button
│  ├─ Add recipient (email + name)
│  ├─ Select role (dropdown)
│  ├─ Toggle ordering mode
│  ├─ Set expiration days (1-365)
│  └─ [Apply all]
├─ PdfViewer (left side)
│  ├─ Overlay with signature fields (draggable)
│  ├─ Click to add new field
│  └─ Color-coded by signer
├─ Signers Card (right side)
│  ├─ List all signers (click to select active)
│  ├─ Color dot + name/email
│  ├─ Status badge (pending/signed/rejected)
│  ├─ [Copy link] button
│  ├─ [Delete signer] button
│  └─ Audit trail of actions
└─ Action buttons (top)
   ├─ [Send] ← Once fields placed
   ├─ [Download PDF] (after signed)
   └─ [Delete] (can delete before sent)

sign.$token.tsx (Signer Signing Page)
├─ PdfViewer (left, read-only)
│  └─ Fields shown (active=bright, others=gray)
├─ Signature Panel (right)
│  ├─ [Add signature] button
│  ├─ SignaturePad Modal
│  │  ├─ Canvas for drawing
│  │  ├─ Text input for typing
│  │  └─ [Complete]
│  ├─ [Sign document] button
│  ├─ [Reject] button
│  └─ Legal disclaimer text
└─ Status messages
   ├─ During signing: "Secure signing session"
   ├─ After sign: "You've signed this document"
   └─ If rejected: "You rejected this document"
```

---

## ✅ Current Status of Implementation

**Fully Implemented:**
- ✅ Add multiple signers (single + bulk modal with roles/expiry)
- ✅ Place signature fields (drag-drop, reposition, delete)
- ✅ Generate unique signing tokens
- ✅ Send for signature workflow
- ✅ Signer receives email with personalized link
- ✅ Signing page (draw or type signature)
- ✅ Submit signature with timestamp + IP
- ✅ Auto-finalization with certificate page
- ✅ Download signed PDF

**Ready to Test:**
1. Upload PDF → Dashboard
2. Click "Several people"
3. Use bulk add modal → Add 2-3 signers
4. Select roles + 15-day expiry
5. Place fields for each signer (different colors)
6. Click [Send]
7. Copy link for first signer
8. Open in new tab (incognito) → `/sign/{token}`
9. Draw/type signature → Submit
10. View certificate page in final PDF

---

## 🔐 Security Built-In

✅ **Unique token per signer** - Can't guess another's link
✅ **Timestamp recording** - Audit trail of when signed
✅ **IP logging** - Track geographic location
✅ **Signature image preservation** - Proof of signature
✅ **RLS policies** - Owner-only document access
✅ **Certificate page** - Legal audit trail
✅ **No login required** - Public signing (but token-protected)
✅ **Token validation** - Expires after 30 days (configurable)

