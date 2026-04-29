# Patch B — Blank Commitment Fields

## Goal
Restore and harden the commitment card fields so parsed values actually display.

## Required fields
- Status
- Import status
- Order number
- Schedule / account
- Date of issue
- Effective date
- Property address
- Issuing company
- Parcel snapshot
- Role

## Likely fix areas
- parser field extraction
- persistence/update of `title_commitments`
- workspace query mapping
- UI field precedence

## Required precedence per field

### Order number
1. `commitment.orderNumber`
2. `commitment.metadata.orderNumber`
3. fallback text

### Schedule / account
1. `commitment.commitmentNumber`
2. `commitment.metadata.scheduleAccountNo`
3. fallback text

### Date of issue
1. `commitment.dateOfIssue`
2. `commitment.metadata.issueDateText`
3. fallback text

### Effective date
1. `commitment.effectiveDate`
2. `commitment.metadata.effectiveDateText`
3. fallback text

### Property address
1. `commitment.propertyAddress`
2. `commitment.metadata.propertyAddress`
3. fallback text

### Issuing company
1. `commitment.issuingCompany`
2. `commitment.metadata.issuingCompany`
3. fallback text

## Patch requirements
- ensure parsed fields are written into first-class commitment columns when available
- if first-class columns are not present yet, read from metadata consistently
- do not render empty strings when a metadata fallback exists
- add tiny formatting helpers if necessary

## Acceptance criteria
- commitment stack card shows non-blank values when extracted data exists
- metadata fallback works consistently
- no field silently renders blank when an available fallback exists
