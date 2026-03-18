# External APIs module

Modular layer to receive data from external APIs. Easy to add new adapters.

## Usage

1. **Admin** → **External APIs** (or `/admin/external-apis`): monitor sources, run manually, copy cron URLs.
2. **Admin** → **API sources** (Payload collection): add/edit sources (name, adapter, config JSON, enabled).
3. **Cron**: use [cron-job.org](https://console.cron-job.org/jobs). Create a job that:
   - **URL**: `https://your-domain.com/api/cron/sync-external?sourceId=<id>` (or omit `sourceId` to run all enabled).
   - **Method**: POST.
   - **Headers**: `Authorization: Bearer YOUR_CRON_SECRET` or `X-Cron-Secret: YOUR_CRON_SECRET`.
   - Set `CRON_SECRET` in your env (e.g. Vercel).

## Adding a new adapter

1. Create `lib/external-apis/adapters/your-adapter.ts` implementing `IExternalApiAdapter` (see `generic.ts`).
2. In `lib/external-apis/registry.ts`, import and register it: `registerAdapter(yourAdapter)`.
3. Use adapter key `your-adapter` in API source config. Document the expected `config` shape in the adapter file.

## Files

- `types.ts` – adapter interface and result types.
- `registry.ts` – register/get adapters by key.
- `run.ts` – run a source by ID (Payload + adapter).
- `adapters/generic.ts` – example: HTTP GET/POST with URL, headers, optional body.
