# BlockSeat deployment

## Split hosting

- Deploy `frontend` to Vercel.
- Deploy `backend` to Render.

## Vercel

Create a Vercel project with:

- Root Directory: `frontend`
- Framework Preset: `Vite`
- Build Command: `npm run build`
- Output Directory: `dist`

Set these environment variables in Vercel:

- `VITE_API_BASE_URL=https://<your-render-service>.onrender.com`
- `VITE_TURNSTILE_SITE_KEY=<your-cloudflare-turnstile-site-key>`

The included [`frontend/vercel.json`](C:\Users\Lenovo\OneDrive\Desktop\Lets Code\BlockSeat\frontend\vercel.json) ensures React Router routes resolve to `index.html`.

## Render

Create a Render Web Service from this repo using:

- Root Directory: `backend`
- Runtime: `Node`
- Build Command: `npm install`
- Start Command: `npm start`

You can also use the included [`render.yaml`](C:\Users\Lenovo\OneDrive\Desktop\Lets Code\BlockSeat\render.yaml) blueprint.

Required Render environment variables come from [`backend/.env.example`](C:\Users\Lenovo\OneDrive\Desktop\Lets Code\BlockSeat\backend\.env.example). At minimum, set:

- `MONGO_URI`
- `JWT_SECRET`
- `MASTER_ENCRYPTION_KEY`
- `POLYGON_RPC_URL`
- `CONTRACT_ADDRESS`
- `ADMIN_PRIVATE_KEY`
- `RAZORPAY_KEY_ID`
- `RAZORPAY_KEY_SECRET`
- `CORS_ORIGINS=https://<your-vercel-app>.vercel.app`

Recommended production variables:

- `NODE_ENV=production`
- `QUEUE_PASS_SECRET=<long-random-secret>`
- `REDIS_URL=<managed-redis-url>`
- `ADMIN_USER`
- `ADMIN_PASSWORD`
- `ADMIN_JWT_SECRET`
- `CAPTCHA_ENABLED=true`
- `TURNSTILE_SECRET_KEY=<your-turnstile-secret>`

## Deploy order

1. Deploy the backend on Render first.
2. Copy the live Render URL.
3. Set `VITE_API_BASE_URL` in Vercel to that Render URL.
4. Deploy the frontend on Vercel.
5. Update `CORS_ORIGINS` in Render with the final Vercel domain and redeploy the backend if needed.

## Quick checks

- Render health check: `https://<your-render-service>.onrender.com/health`
- Vercel app loads without blank page on nested routes
- Login and event fetch calls point to the Render URL instead of `localhost`
