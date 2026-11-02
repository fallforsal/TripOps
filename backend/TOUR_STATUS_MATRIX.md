# Tour status matrix

Current backend contract (2026-10-25), superseding the earlier five-status proposal:

| UI state | Status | Visibility | IsRequest |
|---|---|---|---|
| Draft | draft | hidden | false |
| Completed, unpublished | completed | hidden | false |
| On sale | completed | public | false |
| Temporarily hidden | completed | hidden | false |
| Soft deleted | deleted | hidden | false |
| Custom tour | draft / completed | hidden | true |

EF stores status and visibility as lowercase strings. `IsRequest` maps to
`is_request` and defaults to false; new tours default to draft/hidden.
SaveChanges enforces hidden visibility for drafts, deleted tours and custom tours.
Deleted status and the existing IsDeleted/DeletedAt soft-delete fields are synchronized.
Deleting a custom tour preserves IsRequest for history and sets deleted/hidden.
The two completed/hidden UI states have the same persisted representation.

Migration `AlignTourStatusMatrix` adds is_request and converts existing rows:
Draft -> draft; Published/Hidden/Suspended -> completed; soft deleted -> deleted.
Only previously Published + Public tours stay public; all others become hidden.
Existing rows default to IsRequest=false because the previous model had no flag.
Rollback cannot recover the original Hidden/Suspended distinction.

Apply the migration through the normal database deployment process; it is not
automatically applied at API startup.
