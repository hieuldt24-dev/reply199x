# Google Sheets serverless credentials support

Added server-only createSheetsAuth shared by request append and paid-order upsert. GOOGLE_SERVICE_ACCOUNT_JSON, when present, must parse as an object of type service_account with nonempty client_email and private_key strings. Malformed explicit configuration throws only a fixed error and never falls back to ADC. Only the selected credential fields are passed to GoogleAuth, excluding arbitrary endpoint configuration. Absent inline configuration preserves local ADC/GOOGLE_APPLICATION_CREDENTIALS path behavior and Sheets-only scopes. No credential contents were read, no network authentication or sheet write performed.

Metadata-only check found local secrets/reply-199x-836a2897a743.json; secrets directory is ignored. A local environment must reference that full file path, not merely the secrets directory. Vercel must receive the complete JSON in server-only GOOGLE_SERVICE_ACCOUNT_JSON and redeploy; local credential files are not uploaded by environment variables.

Verification: 20/20 focused loader/Sheets/paid-order/outbox tests pass; scoped ESLint passes. next typegen completed. Direct node node_modules/typescript/bin/tsc --noEmit exits 0; npm typecheck wrapper emitted environment-specific PowerShell/CIM diagnostics and had not completed at time of direct check. No production authentication or persistence verified.

README and env example explain raw JSON without shell quotes, unset inline env for local ADC, spreadsheet Editor permission/Sheets API enablement, default Registrations!A:N, and authenticated POST /api/internal/sheets-sync with private bearer secret. Existing eligible outbox jobs can be retried after deployment; no new payment/event is required. Payment signature/status logic unchanged.
