# Multi-Field Signing: Complete Workflow Diagram

## End-to-End User Journey

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         DOCUMENT OWNER JOURNEY                              │
├─────────────────────────────────────────────────────────────────────────────┤

STEP 1: Upload Document
┌──────────────────┐
│  Upload PDF      │ ──→ PDF stored in cloud
│  (drag & drop)   │     Status: Draft
└──────────────────┘

STEP 2: Add Signers
┌──────────────────────────────────┐
│ "Add Signers" Modal              │
│ ┌─────────────────────────────┐  │
│ │ Name: John Doe              │  │
│ │ Email: john@company.com     │  │
│ │ Role: Signer ▼              │  │
│ │ ┌──────────────────────────┐ │  │
│ │ │ + Add Recipient          │ │  │
│ │ └──────────────────────────┘ │  │
│ │ ─────────────────────────────  │
│ │ Set order ☐                    │
│ │ Expiration: 15 days            │
│ │ [Cancel] [Apply]               │  ──→ Signer stored in DB
│ └─────────────────────────────┘  │     Link auto-copied
└──────────────────────────────────┘

STEP 3: Configure Fields
┌────────────────────────────────────────────────────┐
│ Field Configuration Panel                          │
├────────────────────────────────────────────────────┤
│ Select Field Type:                                 │
│ ┌──────────┬──────────┐                           │
│ │ ✏️ Sig   │ 𝄜 Name  │                           │
│ │ active   │          │                           │
│ ├──────────┼──────────┤                           │
│ │ 📅 Date  │ 📋 Stamp│                           │
│ │          │          │                           │
│ └──────────┴──────────┘                           │
│ Click PDF to place "Signature" field              │
│                                                    │
│ Placed fields:                                     │
│ ✓ Signature - John Doe (Page 1)                   │
│ ✓ Name - John Doe (Page 2)                        │
│ ✓ Date - Jane Smith (Page 2)                      │
│ ✓ Stamp - Admin (Page 3)                          │
└────────────────────────────────────────────────────┘
                    │
                    ├──→ Field boxes appear on PDF
                    ├──→ Color-coded per signer
                    └──→ Saved to signature_fields table

STEP 4: Send for Signing
┌──────────────────────────────┐
│ Signers List                 │
├──────────────────────────────┤
│ • John Doe [pending] [copy]  │ ──→ Link copied:
│ • Jane Smith [pending] [copy]│    /sign/abc123def456
└──────────────────────────────┘
                    │
                    └──→ Share via email/message
                        Status changes to: Sent

STEP 5: Monitor Audit Trail
┌────────────────────────────────────────┐
│ Audit Trail                            │
├────────────────────────────────────────┤
│ • Document uploaded (now)              │
│ • Signer added: john@company.com (now) │
│ • Fields placed (now)                  │
│ • Document sent (in 1s)                │
│ • [waiting for signatures...]          │
└────────────────────────────────────────┘

└─────────────────────────────────────────────────────────────────────────────┘


┌─────────────────────────────────────────────────────────────────────────────┐
│                          SIGNER JOURNEY                                     │
├─────────────────────────────────────────────────────────────────────────────┤

STEP 1: Receive & Open Link
┌────────────────────────────────────┐
│ Email                              │
├────────────────────────────────────┤
│ From: document-owner@company.com   │
│ Subject: Please sign document      │
│                                    │
│ Click here to sign:                │
│ https://signtrust.app/sign/abc123  │  ──→ Unique token-based link
│                                    │     User authenticated
└────────────────────────────────────┘

STEP 2: View Document with Fields
┌──────────────────────────┐  ┌──────────────────┐
│ Document Preview         │  │ Fields to Fill   │
├──────────────────────────┤  ├──────────────────┤
│                          │  │                  │
│ OFFER LETTER             │  │ Signature (Pg 1) │
│                          │  │ [Add Sig Button] │
│ ┌──────────────────────┐ │  │                  │
│ │ Signature            │ │  │ Name (Page 1)    │
│ │ John Doe             │ │  │ [____________]   │
│ │ (blue - empty)       │ │  │                  │
│ └──────────────────────┘ │  │ Date (Page 2)    │
│                          │  │ [___/___/___]    │
│ ┌──────────────────────┐ │  │                  │
│ │ Name                 │ │  │ Stamp (Page 3)   │
│ │ (blue - empty)       │ │  │ [____________]   │
│ └──────────────────────┘ │  │                  │
│                          │  │ [Sign Document]  │
│ ┌──────────────────────┐ │  │ [Reject]         │
│ │ Date                 │ │  │                  │
│ │ (blue - empty)       │ │  │                  │
│ └──────────────────────┘ │  └──────────────────┘
│                          │
└──────────────────────────┘

STEP 3A: Add Signature
┌────────────────────────────────┐
│ Add Signature Modal             │
├────────────────────────────────┤
│ ┌─────────────────────────────┐ │
│ │ [Draw] [Type] [Upload]      │ │
│ ├─────────────────────────────┤ │
│ │                             │ │
│ │  ┌─────────────────────┐   │ │
│ │  │ [Draw area]         │   │ │
│ │  │ [Canvas with pen]   │   │ │
│ │  │                     │   │ │
│ │  │ [Your signature]    │   │ │
│ │  └─────────────────────┘   │ │
│ │  [Clear] [Apply]           │ │
│ │                             │ │
│ └─────────────────────────────┘ │
└────────────────────────────────┘
                │
                └─→ Signature image captured
                    Added to form state

STEP 3B: Fill Name Field
│ Input: "John Doe"
│ Field value stored

STEP 3C: Select Date
│ Input: "06/13/2026"  
│ Field value stored

STEP 3D: Enter Stamp
│ Input: "Acme Corp Inc."
│ Field value stored

STEP 4: Submit All Data
┌──────────────────────────────────┐
│ Click "Sign Document"            │
├──────────────────────────────────┤
│ [Processing signature submission] │
│ All fields turn GREEN ✓          │
│ Submission status: Complete      │
│ Timestamp recorded: 2026-06-13   │
│ IP recorded: 192.168.1.100       │
│ Audit entry created              │
└──────────────────────────────────┘
                │
                └─→ Success message appears
                    "Signed successfully"

STEP 5: Confirmation
┌─────────────────────────────┐
│ ✓ You've signed             │
│   Signed on: 2026-06-13     │
│           14:23:45 UTC      │
├─────────────────────────────┤
│ This document cannot be     │
│ modified or unsigned.       │
│                             │
│ [Return to home]            │
└─────────────────────────────┘

└─────────────────────────────────────────────────────────────────────────────┘


┌─────────────────────────────────────────────────────────────────────────────┐
│                       BACKEND DATA FLOW                                     │
├─────────────────────────────────────────────────────────────────────────────┤

1. Field Type Selection (Client)
   ┌─────────────────┐
   │ selectedFieldType│  (React state)
   │ = "signature"    │
   └─────────────────┘
           │
           └─→ When user clicks PDF:
               handlePageClick(page, dim, event)

2. Field Creation (Database)
   INSERT INTO signature_fields (
     id: uuid,
     signer_id: uuid,
     page: number,
     field_type: enum,  ← NEW
     x_ratio: float,
     y_ratio: float,
     width_ratio: float,
     height_ratio: float
   )

3. Field Retrieval (for Signer)
   SELECT * FROM signature_fields
   WHERE signer_id IN (...)
   
   Results with field_type:
   [
     { id: "f1", signer_id: "s1", field_type: "signature", ... },
     { id: "f2", signer_id: "s1", field_type: "name", ... },
     { id: "f3", signer_id: "s2", field_type: "date", ... }
   ]

4. Form Rendering (for Signer)
   For each field in results:
     if field_type == "signature":
       render SignaturePad modal
     else if field_type == "name":
       render TextInput
     else if field_type == "date":
       render DateInput
     else if field_type == "company_stamp":
       render TextInput

5. Data Submission
   fieldValues = {
     "f1": { dataUrl: "data:image/png;...", typed: undefined },
     "f2": "John Doe",
     "f3": "2026-06-13"
   }
   
   INSERT INTO audit_logs (
     document_id, signer_id, action, timestamp, ip, ...
   ) VALUES (...)

└─────────────────────────────────────────────────────────────────────────────┘


┌─────────────────────────────────────────────────────────────────────────────┐
│                     FIELD TYPE DECISION TREE                                │
├─────────────────────────────────────────────────────────────────────────────┤

What field does the signer need to fill?
│
├─→ Sign their name/initials?
│   └─→ Use SIGNATURE field
│       (Shows signature pad modal)
│       Stores: PNG image data
│
├─→ Enter their name?
│   └─→ Use NAME field
│       (Shows text input)
│       Stores: Plain text
│
├─→ Enter a date?
│   └─→ Use DATE field
│       (Shows date picker)
│       Stores: ISO date string (YYYY-MM-DD)
│
├─→ Enter company/organization name?
│   └─→ Use COMPANY_STAMP field
│       (Shows text input)
│       Stores: Plain text
│
└─→ Want to use custom field?
    └─→ Use TEXT field (future)
        (Shows text input with optional validation)
        Stores: Plain text with optional regex validation

└─────────────────────────────────────────────────────────────────────────────┘


┌─────────────────────────────────────────────────────────────────────────────┐
│                    STATE MACHINE: Field Status                              │
├─────────────────────────────────────────────────────────────────────────────┤

Owner Side:
  CREATED → PLACED → SENT
    │        │        │
    │        │        └─→ Signature field: waiting
    │        │
    │        └─→ All fields have positions,
    │            colors, signer assignments
    │
    └─→ Field exists in database
        with field_type, coordinates

Signer Side:
  EMPTY → IN_PROGRESS → FILLED → SUBMITTED
    │        │           │         │
    │        │           │         └─→ Audit log created
    │        │           │             Timestamp recorded
    │        │           │
    │        │           └─→ Field shows green
    │        │               Data stored in state
    │        │
    │        └─→ Signer typing/drawing
    │
    └─→ Field appears as blue box
        Placeholder text shown

└─────────────────────────────────────────────────────────────────────────────┘
```

## Color Legend

```
🔵 Blue       = Empty/Pending state, requires action
🟢 Green      = Completed/Filled state, done
🟡 Yellow     = In progress/Draft state
🔴 Red        = Error/Rejected state
⚪ Gray/Muted = Disabled/Inactive
```

## Key Interactions

```
Owner Side:
  Mouse over field box     → Cursor changes to grab
  Click and drag field box → Box moves with mouse
  Release                 → Position saved to DB

Signer Side:
  Click "Add Signature"    → Modal opens
  Draw/Type signature      → Preview shows
  Click "Apply"            → Image stored, modal closes
  Type in name field       → Text stored in state
  Select date              → Date stored in state
  Type company stamp       → Text stored in state
  Click "Sign Document"    → All data submitted, signature done
```

## Error Scenarios

```
Owner:
  ❌ Click PDF with no signer selected
     → Error toast: "Add a signer first"
  
  ❌ Click "Mark as sent" with no fields
     → Error toast: "Place at least one signature field"
  
  ❌ Network error during field save
     → Toast error, field not removed from UI

Signer:
  ❌ Try to submit without signature
     → Button disabled, tooltip: "Add signature first"
  
  ❌ Form field validation fails
     → Error message under field
  
  ❌ Signature link expired
     → Landing page: "Link invalid - contact owner"
     
  ❌ Already signed (status = 'signed')
     → Landing page: "You've already signed"
```

## Success Paths

```
Optimal Happy Path:

Owner:
  1. Upload PDF (1 query)
  2. Add 1 signer (1 insert)
  3. Select Signature → Place (1 insert to signature_fields)
  4. Select Name → Place (1 insert)
  5. Select Date → Place (1 insert)
  6. Click "Mark as sent" (1 update)
  Total: ~7 DB operations

Signer:
  1. Open signing link (fetch user, document, fields)
  2. Add signature (modal interaction, image captured)
  3. Fill name field (text input)
  4. Fill date field (date picker)
  5. Click "Sign Document" (submit all data)
  6. See confirmation
  Total: ~2 DB operations (fetch + insert audit log)

Result:
  ✅ Document marked as signed
  ✅ Audit trail recorded
  ✅ Timestamp & IP captured
  ✅ PDF ready for download
```
