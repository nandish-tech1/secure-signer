# Step-by-Step User Guide: Multi-Field Signing

## For Document Owners

### Step 1: Upload Your Document
1. Go to your dashboard
2. Click "Upload Document" or drag a PDF file
3. Your document appears in draft status

### Step 2: Add Signers
1. Click on the document to open it
2. In the right panel under "Field Configuration", click **"Add Signers"** button
3. In the modal that appears:
   - **Add Recipients**: Enter signer's name and email
   - **Set order** (optional): Check to require sequential signing
   - **Change expiration** (optional): Set days until link expires (1-365)
4. Click **"Apply"** 
   - Signers are added
   - First signer is automatically selected (highlighted in blue)
   - Their signing link is copied to your clipboard

### Step 3: Select and Place Field Types

#### Select Field Type
1. In the right panel, look for 4 field type buttons:
   - **Signature** (✏️ pen icon)
   - **Name** (𝄜 type icon)
   - **Date** (✏️ calendar icon)
   - **Stamp** (📋 file icon)

2. Click the field type you want to add
   - Button turns blue/highlighted
   - Message shows: "Click on the document to place 'FieldType' field"

#### Place Field on PDF
1. In the PDF viewer, click where you want the field to appear
   - A colored box appears showing the field location
   - Box color corresponds to the selected signer
   - Box displays field type + signer name inside

2. **Adjust Position** (if needed)
   - Click and drag the field box to move it
   - Box turns darker while dragging
   - Release to confirm position

#### Add More Fields
1. **For same signer**: Select different field type → click on PDF again
2. **For different signer**: 
   - Click on different signer in "Signers" list
   - Their color highlights in signer list
   - Select field type → place on PDF

### Step 4: Review Placed Fields
In "Placed fields" section, you'll see:
```
✓ Signature - John Doe (Page 1)
✓ Name - John Doe (Page 2)
✓ Date - Jane Smith (Page 2)
✓ Company Stamp - Admin Account (Page 3)
```

**To remove a field**: Click the ✕ button at the end of each row

### Step 5: Send for Signatures
1. When all signers and fields are set, click **"Mark as sent"**
2. For each signer:
   - Click the **copy icon** next to their name
   - Signing link is copied to clipboard
   - Share via email or paste into message

### Step 6: Track Signatures
1. Document status shows:
   - 🟡 **Draft** = Not sent yet
   - 🔵 **Pending** = Waiting for signers
   - 🟢 **Completed** = All signed

2. **Audit Trail** shows each action:
   - Who viewed it
   - When they signed
   - Their IP address (for security)

---

## For Signers

### Step 1: Receive Signing Link
1. You receive an email with a secure signing link
2. Click the link to open the signing page

### Step 2: Review Document
1. Document appears with all fields marked in blue boxes
2. Each field shows:
   - **Type** (Signature, Name, Date, etc.)
   - **Signer name** (person who needs to fill this field)
3. Fields are on specific pages (shown as "Page 1", "Page 2", etc.)

### Step 3: Fill Out Each Field

#### If it's a SIGNATURE field:
1. In the right panel, click **"Add Signature"** button
2. Modal opens with options:
   - **Draw** tab: Draw your signature with mouse/pen
     - Click "Clear" to erase and redraw
   - **Type** tab: Type your name (shows in signature font)
     - Shows preview as you type
3. Choose your preferred style, then click **"Apply"**
4. Signature appears in all signature fields
5. All signature fields turn green ✓

#### If it's a NAME field:
1. Find the input labeled "Name (Page X)"
2. Type your full name
3. Field turns green ✓

#### If it's a DATE field:
1. Find the input labeled "Date (Page X)"
2. Click to open date picker
3. Select the date
4. Field turns green ✓

#### If it's a COMPANY STAMP field:
1. Find the input labeled "Company Stamp (Page X)"
2. Type company name or stamp ID
3. Field turns green ✓

### Step 4: Submit Signature
1. After filling all required fields, they turn green
2. Click **"Sign document"** button
3. A confirmation appears: "Signed successfully"

### Step 5: Confirmation
- You see: "You've signed this document"
- Timestamp shows when you signed
- Document owner receives notification
- Your signature cannot be changed

### Step 6: (Optional) Reject Document
If you cannot sign:
1. Click **"Reject"** button
2. Modal appears asking for rejection reason
3. Type reason (e.g., "Missing pages" or "Incorrect terms")
4. Click **"Reject"** to confirm
5. Document owner is notified

---

## Common Questions

### Q: Can I sign part of the document and come back later?
**A:** No, you must complete all fields in one session. But you can:
1. Keep the link open in browser
2. Work on one field at a time
3. Final submit happens when you click "Sign document"

### Q: What if I make a mistake while drawing my signature?
**A:** Click "Clear" button to erase and redraw. You can change your signature anytime before clicking "Sign document".

### Q: Can I see which fields I still need to fill?
**A:** Yes! In the right panel:
- Fields turn **GREEN** ✓ when filled
- Fields stay **BLUE** when empty
- Page indicator shows "Page 1", "Page 2", etc.

### Q: What happens after I sign?
**A:** 
1. Your signature is recorded with timestamp and IP address
2. Document is marked as completed
3. Owner gets the signed PDF
4. Audit log shows exactly when you signed

### Q: Is this secure?
**A:** Yes!
- Each signing link is unique (token-based)
- Signatures recorded with timestamp + IP
- All data is encrypted in transit
- Action audit trail proves who signed when
- Cannot forge or modify after signing

### Q: Can multiple people sign the same document?
**A:** Yes! Owner can add multiple signers in different order:
- **Parallel** (default): All signers sign at same time
- **Ordered** (optional): Each signer signs one after another

### Q: What file formats are supported?
**A:** Currently PDF only. Other formats coming soon.

---

## Troubleshooting

### Problem: Field boxes not appearing on PDF
**Solution:** 
1. Make sure you've selected a signer in the "Signers" list
2. Click on a field type button (should turn blue)
3. Click on the PDF to place the field

### Problem: Can't move field box
**Solution:**
1. Make sure document is not marked as "Completed"
2. Field must not be in "signed" state
3. Click and drag from within the field box

### Problem: Signing link expired
**Solution:**
1. Document owner needs to resend the link
2. Expiration date was set at time of sending (default 15 days)

### Problem: Signature not appearing on PDF
**Solution:**
1. Make sure you clicked "Apply" in the signature modal
2. Go back and add signature again
3. Signature should appear in all signature fields

### Problem: Can't submit - "Sign document" is disabled
**Solution:**
1. Make sure all fields are filled (turn green)
2. At minimum, all signature fields must have a signature
3. Other fields (name, date, stamp) must have values

---

## Tips & Best Practices

### For Document Owners:
1. **Place fields clearly**: Avoid placing over text that's hard to see through
2. **Label fields**: Use document comments to explain what each field is for
3. **Send early**: Don't wait until last minute - signers may need time
4. **Check audit trail**: Review who signed and when for compliance

### For Signers:
1. **Read carefully**: Review document before signing
2. **Use real signature**: Draw your actual signature, not a typed name
3. **Complete in one go**: Don't rely on saving progress
4. **Keep confirmation**: Screenshot shows when you signed
5. **Verify timestamp**: Check that signing time is correct

---

## Contact & Support

For issues or questions:
- **Owner issues**: Contact admin through dashboard
- **Signing issues**: Check this guide or contact document owner
- **Technical problems**: Report bug through help menu
