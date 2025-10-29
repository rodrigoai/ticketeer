# Bulk Actions Implementation Summary

## Overview
Added bulk edit and bulk delete functionality to the ticket management feature, allowing users to select multiple tickets and perform actions on them simultaneously.

## Changes Made

### 1. Backend Services (`services/ticketService.js`)

#### New Methods:
- **`bulkUpdateTickets(ticketIds, updateData, userId)`**: Updates multiple tickets with the same data
  - Verifies ownership of all tickets
  - Only updates fields provided in the `updateData` object
  - Uses Prisma transaction for atomic operations
  - Supported fields: location, table, order, buyer, buyerDocument, buyerEmail, checkedIn, checkedInAt

- **`bulkDeleteTickets(ticketIds, userId)`**: Deletes multiple tickets in a single transaction
  - Verifies ownership of all tickets within transaction
  - Uses Prisma transaction for atomic deletion
  - Returns count of deleted tickets

### 2. Backend API Endpoints (`server.js`)

#### New Endpoints:
- **`POST /api/tickets/bulk-edit`**: Bulk update tickets
  - Request body: `{ ticketIds: number[], updates: object }`
  - Returns updated tickets array
  - Requires authentication

- **`POST /api/tickets/bulk-delete`**: Bulk delete tickets
  - Request body: `{ ticketIds: number[] }`
  - Returns deletion count
  - Requires authentication

### 3. Frontend Composable (`src/composables/useTicket.js`)

#### New Methods:
- **`bulkUpdateTickets(ticketIds, updates)`**: Calls bulk edit API endpoint
- **`bulkDeleteTickets(ticketIds)`**: Calls bulk delete API endpoint

### 4. Frontend UI (`src/views/EventDetail.vue`)

#### New Features:

##### Selection State:
- Added `selectedTicketIds` ref array to track selected tickets
- Added checkbox column to DataTable (first column)
- Checkboxes toggle ticket selection

##### Bulk Actions Toolbar:
- Appears when at least one ticket is selected
- Shows count of selected tickets
- Contains three buttons:
  - **Edit**: Opens bulk edit modal
  - **Delete**: Confirms and deletes selected tickets
  - **Clear**: Clears selection

##### Bulk Edit Modal:
- Modal form with fields:
  - Location
  - Table
  - Order
  - Buyer
  - Buyer Document
  - Buyer Email
  - Checked In (checkbox)
  - Checked In At (datetime)
- Each field (except Checked In) has a "Clear this field" checkbox
- Info message: "Fill in fields to update them, or check 'Clear' to set them as empty"
- Three update modes per field:
  1. Leave empty and unchecked = skip field (no update)
  2. Fill in value = update field with new value
  3. Check "Clear" = set field to null/empty
- Only modified fields are sent to the server
- Updates all selected tickets with the same values

##### Bulk Delete:
- Confirmation dialog showing ticket count
- Performs deletion via API
- Refreshes ticket list and stats after completion

#### New Functions:
- `toggleTicketSelection(ticketId)`: Toggle individual ticket selection
- `clearSelection()`: Clear all selections
- `showBulkEditModal()`: Display bulk edit modal
- `saveBulkEdit()`: Submit bulk edit changes (handles clear checkboxes)
- `confirmBulkDelete()`: Show delete confirmation
- `performBulkDelete()`: Execute bulk deletion
- `resetBulkEditForm()`: Reset bulk edit form fields and clear checkboxes

## UX/UI Details

### Bulk Actions Toolbar Styling:
- Bootstrap alert-info background
- Flexbox layout with space-between
- Positioned above the search filter
- Only visible when tickets are selected

### DataTable Changes:
- New checkbox column (50px width, non-sortable)
- Checkboxes are bound to selection state
- Maintains existing functionality (sorting, searching, etc.)

### Form Behavior:
- Bulk edit form starts empty with all "Clear" checkboxes unchecked
- Placeholder text: "Leave empty to skip"
- Each field has three states:
  - Empty/unchecked: field is skipped (not updated)
  - Value entered: field is updated with new value
  - "Clear" checked: field is set to null/empty
- Input fields are disabled when "Clear" checkbox is checked
- Only filled fields or cleared fields are sent to the server
- Check-in datetime auto-populated if checkbox enabled

## Backend Transaction Safety

### Bulk Update:
- Verifies ownership of all tickets before updating
- Updates performed in Prisma transaction
- If any ticket fails verification, entire operation fails

### Bulk Delete:
- Verification and deletion in single transaction
- Ensures atomicity - either all tickets deleted or none
- Prevents partial deletions on permission errors

## Error Handling

- Form validation on empty updates
- API error messages displayed to user
- Console logging for debugging
- Failed operations don't clear selection
- Successful operations clear selection and refresh data

## Performance Considerations

- Bulk operations performed in single request
- Database operations use transactions
- Frontend refreshes list only after successful completion
- Stats recalculated after bulk changes

## Testing Recommendations

1. Test bulk edit with various field combinations
2. Verify only filled fields are updated
3. Test bulk delete confirmation flow
4. Verify selection state management
5. Test with different numbers of selected tickets
6. Verify ownership checks work correctly
7. Test transaction rollback on errors
8. Check stats refresh after bulk operations

## Future Enhancements

Possible improvements:
- Select all checkbox in header
- Bulk operations via drag-and-drop
- Undo functionality
- Export selected tickets
- Bulk assign to order
- Bulk email resend to selected tickets
