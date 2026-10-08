# IMPACT DRIOD setup

1. Connect this repository to Vercel.
2. Set environment variables from .env.example directly in Vercel. Never commit secrets.
3. Deploy and set Discord Interactions Endpoint URL to https://YOUR_DOMAIN/api/interactions.
4. Register guild commands with node scripts/register-commands.mjs from a trusted environment.

V1 uses CREATOR_CODES (Discord user ID to code mapping) in Vercel configuration. Creator add/remove, automated role assignment, durable submission history and reminders need persistent storage and are not active in the initial release.
