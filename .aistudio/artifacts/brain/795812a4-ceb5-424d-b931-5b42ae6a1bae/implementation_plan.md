# Product Box Barcode Auto-Generation Removal

1-2 sentence summary: This update changes the product and box creation forms so that barcode/tracking number fields remain blank (`""`) by default instead of auto-generating random numbers. Users can now enter custom barcodes manually or scan them with camera/scanner when needed.

## User Review & Critical Decisions

> [!IMPORTANT]
> The following behavior was confirmed during Phase 1 clarification:
> - **Confirmed Behavior 1**: Default barcode fields will be empty strings (`""`) upon opening the "Add Product / Set" modal and when clicking "Add New Box".
> - **Confirmed Behavior 2**: This applies across both new product creation forms and inline package addition forms.
> - **Optional Manual Auto-Generate**: The existing "Otomatik Barkod Oluştur" button will remain available as an optional action if a user explicitly wants one-click generated barcodes.

---

## 1. Overview & Core Concept

- **What It Does**: Stops automatic assignment of random synthetic barcode numbers (`869...`) when creating new furniture sets or adding individual box components. Leaves input fields empty for custom entry or barcode scanning.
- **Target Audience / Persona**: Warehouse managers and inventory operators who use physical barcode stickers, manufacturer tracking codes, or specific inventory formats.
- **Key Value**: Prevents accidental saving of fake auto-generated barcodes and removes the need to manually delete random strings before typing real tracking numbers.

---

## 2. User Experience & Visual Design

- **Key User Flows**:
  1. Click **"Yeni Mobilya & Koli Tanımla"**: Form opens with empty barcode fields (`""`) for all default boxes (Koli 1, Koli 2, Koli 3) unless a barcode was pre-scanned.
  2. Click **"Yeni Koli Ekle"**: A new package row is appended with empty barcode (`""`).
  3. **Manual Entry & Camera Scan**: Clear placeholders (`"Barkod / Takip No (Opsiyonel)"`) inform the user that entry is optional.
  4. **Optional Batch Generation**: If the user desires generated codes, clicking "Otomatik Barkod Oluştur" populates all blank barcodes with 1 click.
- **Visual Identity & Theme**:
  - Soft neutral input fields with clear placeholder text (`text-slate-400 font-mono text-xs`).
  - Seamless dark and light mode UI compatibility adhering to system styling.

---

## 3. Key Product Decisions & Trade-Offs

- **Decision 1: Empty String (`""`) vs Auto-Generated Default**:
  - *Chosen Approach*: Initialize package `barcode` property to `""` by default instead of `8691000 + random`.
  - *Why*: Gives full control to warehouse operators to assign authentic box barcodes without pre-populating synthetic data.
- **Decision 2: Preserving Scanned Initial Barcode**:
  - *Chosen Approach*: If the user initiated the modal from a QuickScan action (`initialBarcode`), populate the first box with that scanned code while leaving subsequent boxes empty.
  - *Why*: Preserves workflow continuity when scanning an unknown barcode and adding a new product.

---

## 4. Technical Architecture & Data Strategy *(Technical Reference)*

```
┌─────────────────────────────────────────────────────────┐
│                    AddProductModal                      │
│                                                         │
│  State: packages = [                                    │
│    { koliIndex: 1, barcode: initialBarcode || '' },     │
│    { koliIndex: 2, barcode: '' },                       │
│    { koliIndex: 3, barcode: '' }                        │
│  ]                                                      │
└────────────────────────────┬────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────┐
│                    handleAddPackage                     │
│  Creates new PackageItem: { ..., barcode: '' }           │
└────────────────────────────┬────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────┐
│               Optional Utility Action                   │
│  handleGenerateAllBarcodes() -> Populates barcodes     │
└─────────────────────────────────────────────────────────┘
```

### Component & State Mapping
- `src/components/AddProductModal.tsx`:
  - Update `useEffect` when initializing default packages for new products: set `barcode` to `initialBarcode || ''`.
  - Update `handleAddPackage`: set `barcode` to `''`.
  - Update input field placeholders to reflect optional manual entry.
