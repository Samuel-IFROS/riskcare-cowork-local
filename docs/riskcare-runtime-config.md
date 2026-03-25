# RISKCARE Runtime Config

RISKCARE can now read account and AI defaults without depending on Eigent URLs.

For packaged builds, the app seeds missing values into `~/.eigent/.env` on first start. It never overwrites keys that already exist there.

Supported runtime keys:

- `RISKCARE_DEFAULT_CLOUD_API_KEY`: default cloud AI key used when `OPENAI_API_KEY` is still empty.
- `RISKCARE_DEFAULT_CLOUD_BASE_URL`: optional custom base URL for the default cloud provider.
- `RISKCARE_SUPABASE_URL`: future Supabase project URL for RISKCARE accounts.
- `RISKCARE_SUPABASE_PUBLISHABLE_KEY`: future Supabase publishable key for the renderer auth flow.
- `RISKCARE_PROFILE_URL`: future profile page opened from `Gestionar`. It can be an external URL like `https://riskcare.app/profile` or an internal route like `#/profile`.

Recommended packaging options:

- Bundle these keys in `backend/.env` before building the `.exe`.
- Or inject them as environment variables during the build pipeline.

Renderer behavior:

- If runtime config exists, login/signup and the `Gestionar` action use RISKCARE values first.
- If runtime config is missing, the app falls back to its local account flow and local profile panel.
