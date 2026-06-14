# ✅ Complete Fix: Database, RLS Policies, and Modal with Roles & Expiration

## Issues Fixed

### 1. **"new row violates row-level security policy for table 'signers'"**
   - **Root Cause:** RLS policies were too restrictive for bulk inserts via server functions
   - **Fix:** Added comprehensive RLS policies in migration `20260613_add_roles_and_expiry.sql`:
     - Service role can perform ALL operations
     - Document owners can manage signers
     - Public access via token (for signing)

### 2. **"The HTTP client sent a request that this server could not understand" (HTTP 400)**
   - **Root Cause:** Type schema mismatch - `role` and `expires_at` columns didn't exist in database
   - **Fix:** Created database migration with new columns and updated TypeScript types

### 3. **Missing Expiration Date Feature**
   - **Fix:** Added `expires_at` column to signers table with expiration picker UI

## Changes Made

### Database Migrations
**File:** `supabase/migrations/20260613_add_roles_and_expiry.sql`

Added:
- `role` column (signer | validator | witness)
- `expires_at` column (timestamptz)
- Signer role enum type
- RLS policies for service role, document owners, and public token access
- Indexes for performance

### TypeScript Types
**File:** `src/integrations/supabase/types.ts`

Updated:
- `signers` table schema (Row, Insert, Update)
- Added `signer_role` enum
- Updated Constants export

### Server Function
**File:** `src/lib/add-signers.functions.ts`

Features:
- Accept signer `role` (signer, validator, witness)
- Set expiration date (1-365 days from now)
- Handle ordered/parallel signing modes
- Bulk insert multiple signers with tokens
- Calculate `expires_at` automatically

### Modal UI Component  
**File:** `src/components/AddSignersModal.tsx`

Features:
- **Recipient input:** Name, Email, Role (dropdown)
- **Add/Remove:** Plus button, trash icons
- **Drag reorder:** Up/down arrows when ordering enabled
- **Settings:**
  - ☑ Set order of receivers
  - ☑ Change expiration date (1-365 days)
- **Apply/Cancel** buttons

## Database Schema

```sql
ALTER TABLE public.signers
  ADD COLUMN role signer_role DEFAULT 'signer',
  ADD COLUMN expires_at timestamptz;

-- RLS Policies
-- Service role: full access
-- Document owner: can manage signers of their documents
-- Public: can access by token (for public signing)
```

## How to Deploy

### 1. Apply Database Migration
```bash
cd supabase
# Push migration to your Supabase project
supabase db push
```

### 2. Regenerate Types (if needed)
```bash
supabase gen types typescript > src/integrations/supabase/types.ts
```

### 3. Integration Point in `documents.$id.tsx`
```tsx
// In DocumentPage component:
const addFn = useServerFn(addSignersWithDetails);

// Open modal:
<button onClick={() => setShowAddSignersModal(true)}>
  Add Multiple Signers
</button>

// Handle apply:
async function handleAddSigners(
  signers: SignerInput[], 
  mode: "ordered" | "parallel",
  days: number
) {
  await addFn({
    data: {
      documentId: id,
      signers,
      signingMode: mode,
      expirationDays: days
    }
  });
  qc.invalidateQueries({ queryKey: ["signers", id] });
}
```

## Features Now Available

✅ **Add multiple signers at once** via modal  
✅ **Assign roles** (Signer, Validator, Witness)  
✅ **Set signing order** (Sequential vs Parallel)  
✅ **Expiration dates** (1-365 days configurable)  
✅ **Drag-to-reorder** signers when ordered mode enabled  
✅ **RLS secured** - service role can insert, owners can manage  
✅ **Public token access** - signers can access via magic link  

## Testing

1. Open documents detail page
2. Click "Add Multiple Signers" button
3. Fill in recipient details (Name, Email, Role)
4. Toggle "Set order of receivers" for sequential signing
5. Adjust "expiration date" (e.g., 30 days)
6. Click Apply
7. Signers should be created with `role`, `order_index`, and `expires_at` populated
