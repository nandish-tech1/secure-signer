# Multi-Field Type UI Guide

## Owner's Document Management Page

### Before
```
┌─────────────────────────────────────────┐
│ Signing options                         │
├─────────────────────────────────────────┤
│ Type:                                   │
│ [Simple Signature] [Digital Signature] │
│                   (disabled)            │
│                                         │
│ Signers:                                │
│ • Selected Signer [status] [copy icon] │
│                                         │
│ Required fields:                        │
│ • Signature - John Doe (Page 1) [×]    │
└─────────────────────────────────────────┘
```

### After
```
┌─────────────────────────────────────────┐
│ Field Configuration                     │
├─────────────────────────────────────────┤
│ Field type to add:                      │
│ ┌──────────────┬──────────────┐        │
│ │ ✏️ Signature │ 𝄜 Name      │        │
│ │  (selected)  │              │        │
│ └──────────────┴──────────────┘        │
│ ┌──────────────┬──────────────┐        │
│ │ ✏️ Date      │ 📋 Stamp    │        │
│ │              │              │        │
│ └──────────────┴──────────────┘        │
│ Click on the document to place         │
│ "Signature" field                       │
│                                         │
│ ─────────────────────────────────────  │
│                                         │
│ Signers:                                │
│ • Selected Signer [status] [copy icon] │
│   [Add more signers button]             │
│                                         │
│ Placed fields:                          │
│ ✓ Signature - John Doe (Page 1) [×]   │
│ ✓ Name - John Doe (Page 2) [×]        │
│ ✓ Date - Jane Smith (Page 2) [×]      │
└─────────────────────────────────────────┘
```

## PDF Viewer Overlay

### Document Owner View (Placement Mode)
```
┌──────────────────────────────┐
│ Document PDF                 │
├──────────────────────────────┤
│                              │
│  ┌─────────────────────────┐ │
│  │ OFFER LETTER            │ │
│  │                         │ │
│  │  ┌─────────────────┐    │ │
│  │  │ Signature       │    │ │
│  │  │ John Doe        │    │ │  ← Draggable field box
│  │  └─────────────────┘    │ │     (color-coded per signer)
│  │                         │ │
│  │  [Signature box for     │ │
│  │   Jane Smith]           │ │
│  │                         │ │
│  └─────────────────────────┘ │
│  Click to place field (cursor: crosshair) │
└──────────────────────────────┘
```

### Field Box States
```
Before Signer Signs:
┌────────────────┐
│ Signature      │  ← Blue border, semi-transparent background
│ John Doe       │     (indicates empty field)
└────────────────┘

After Signer Signs:
┌────────────────┐
│ [Signature]    │  ← Green border, shows preview
│ John Doe       │     (indicates completed field)
└────────────────┘
```

## Signer's Signing Page

### Before
```
DOCUMENT TO SIGN                    RIGHT PANEL
┌──────────────────────┐            ┌──────────────┐
│ Your Signature       │            │              │
│ ┌────────────────┐   │            │              │
│ │ Sign here      │   │            │ Your         │
│ │ (field box)    │   │            │ signature    │
│ └────────────────┘   │            │              │
│                      │            │ [Add button] │
│                      │            │              │
│                      │            │ ─────────────│
│                      │            │              │
│                      │            │ [Sign Doc]   │
│                      │            │ [Reject]     │
│                      │            │              │
└──────────────────────┘            └──────────────┘
```

### After (With Multiple Field Types)
```
DOCUMENT TO SIGN                    RIGHT PANEL
┌──────────────────────┐            ┌──────────────────┐
│ ┌─────────────────┐  │            │ Fields to        │
│ │ Signature       │  │            │ complete         │
│ │ John Doe        │  │            │ ─────────────    │
│ │ (page 1)        │  │            │                  │
│ └─────────────────┘  │            │ Signature        │
│                      │            │ (Page 1)         │
│ ┌─────────────────┐  │            │ [Add Signature]  │
│ │ Name            │  │            │                  │
│ │ (page 2)        │  │            │ Name (Page 2)    │
│ └─────────────────┘  │            │ [Text input]     │
│                      │            │                  │
│ ┌─────────────────┐  │            │ Date (Page 2)    │
│ │ Date            │  │            │ [Date picker]    │
│ │ (page 3)        │  │            │                  │
│ └─────────────────┘  │            │ ─────────────    │
│                      │            │ [Sign Document]  │
│                      │            │ [Reject]         │
│                      │            │                  │
└──────────────────────┘            └──────────────────┘
```

## Field Type Options

| Field Type      | Owner View | Signer View | Data Stored |
|-----------------|-----------|------------|-------------|
| **Signature**   | Drag box   | Draw/Type pad + modal | Image data (PNG) |
| **Name**        | Drag box   | Text input | Plain text |
| **Date**        | Drag box   | Date picker | ISO date string |
| **Company Stamp** | Drag box | Text input | Plain text |
| **Initials**    | (reserved) | (reserved) | Initials |
| **Checkbox**    | (reserved) | (reserved) | Boolean |
| **Text**        | (reserved) | (reserved) | Plain text |

## Color Coding

- **Blue Border** = Field ready to fill (not yet signed)
- **Green Border** = Field filled/signed
- **Accent Color** = Selected field type (in owner's interface)
- **Muted/Gray** = Disabled or placeholder text

## Field Placement Workflow

### Owner Process
1. Select field type from 4 buttons (Signature, Name, Date, Stamp)
2. View PDF with crosshair cursor
3. Click on PDF where field should appear
4. Field box appears, can be dragged to adjust position
5. Field listed in "Placed fields" section
6. Repeat for multiple fields/signers
7. Click "Mark as sent" when ready
8. Share signing links

### Signer Process
1. Visit signing link
2. See document with all required fields
3. For each field:
   - Signature: Open modal to draw/type
   - Name: Type in text input
   - Date: Select from date picker
   - Company Stamp: Type text
4. All fields turn green when filled
5. Click "Sign document" to submit
6. Get confirmation message

## Responsive Design

### Desktop (>1024px)
- PDF viewer on left (full height)
- Right panel fixed, scrollable
- Field boxes clearly visible
- Full buttons and labels

### Tablet (768-1024px)
- PDF viewer on top
- Right panel below
- Stacked layout
- Buttons remain accessible

### Mobile (<768px)
- Full-width PDF
- Collapsible field panel
- Single-column form
- Touch-friendly inputs
