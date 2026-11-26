# Cabinet Studio

Premium responsive kitchen design and instant quotation demo built with Next.js, React, TypeScript, Three.js, Mongoose, and Zustand.

## Implemented
- Premium responsive homepage
- Editorial collections, door-style and tactile material showcases with local optimized kitchen imagery
- Seven-step `/design` configurator
- Shared persisted Zustand kitchen configuration
- Straight, L, U, and galley layout recommendations
- Measurement validation
- Parametric R3F 3D scene and synchronized SVG 2D plan
- Door, finish, colour, handle, countertop, and backsplash controls
- Centralized demo pricing engine
- Cabinet add/remove/resize controls
- MongoDB-backed customer accounts, saved designs, quotations and product catalog
- HTTP-only JWT sessions with customer and administrator roles
- Owner-protected design CRUD and server-recalculated INR quotes with GST
- Downloadable itemized quotation PDFs with saved 3D / AI previews
- Protected customer dashboard and administrator quote, design and catalog views
- Exact-model studio image-edit pipeline and kitchen recommendation API with deterministic fallback
- Homepage and uploaded-photo image-to-3D matching with visual material estimates and deterministic preset fallbacks

## Run locally
```bash
npm install
copy .env.example .env.local
npm run dev
```

Open `http://localhost:3000`.

## Environment and database
Set the following in the untracked `.env.local` file and restart Next.js:

- `MONGODB_URI`: MongoDB Atlas URI for the `cabinet-studio` database.
- `JWT_SECRET`: private random value with at least 32 characters.
- `SEED_SECRET`: a separate private random value required for `POST /api/seed`.
- `ADMIN_EMAIL` and `ADMIN_SEED_PASSWORD`: administrator identity created by the seed endpoint. The app intentionally does not ship a default administrator password.
- `GROQ_API_KEY`: optional. Enables visual prompt enrichment, AI kitchen recommendations, and reference-photo style analysis for `/api/image-to-3d`; all have deterministic fallbacks. Reference images are local `/cabinet-studio/` assets or browser uploads (up to 4 MB); arbitrary remote URLs are not fetched by the server.
- `CLOUDFLARE_ACCOUNT_ID` and `CLOUDFLARE_API_TOKEN`: enable FLUX.2 Klein image-to-image renders through Cloudflare Workers AI. The captured 3D model is resized to supported reference-image dimensions and sent with its spatial prompt. Create a token with Workers AI run permission. When either value is missing or the provider is unavailable, the studio returns a curated local kitchen preview instead.

Run the app, then seed the administrator and illustrative INR product catalog using the `SEED_SECRET` bearer value:

```powershell
Invoke-RestMethod -Method Post http://localhost:3000/api/seed -Headers @{ Authorization = "Bearer $env:SEED_SECRET" }
```

New users register at `/register`. Customers use `/dashboard`; administrators sign in at `/login` and open `/admin`. Never expose provider keys through `NEXT_PUBLIC_*` variables.

## Homepage design
The homepage uses locally cached kitchen photography in `public/cabinet-studio/`, an animated glass navigation bar, responsive menu, INR collection pricing, and deep links that preselect a style, finish, or quote step in the configurator. All homepage prices are illustrative.

## Tests and build
```bash
npm install -D vitest
npm test
npm run lint
npm run build
npm start
```

## Deployment
### Recommended: Railway

Railway is the simplest option for this full-stack Next.js app. Create a Railway project, add a service from the `CabinetMaster` GitHub repository, and deploy the repository root. Use:

- Build command: `npm ci && npm run build`
- Start command: `npm start`

In the service's Variables settings, add the production values from `.env.example`. Use strong, unique values for `JWT_SECRET`, `SEED_SECRET`, and `ADMIN_SEED_PASSWORD`. Keep provider keys server-side; never use `NEXT_PUBLIC_` for secrets.

Use MongoDB Atlas for `MONGODB_URI`. In Atlas Network Access, allow the deployment service's outbound IP addresses; avoid opening database access to every IP. After deployment, seed the administrator and illustrative catalog once using the production `SEED_SECRET` as described above. Then remove `SEED_SECRET` from the service if you do not need to seed again.

### Alternative: Render

Render also works as a Node web service. Create a **Web Service** from the same GitHub repository, select the repository root and Node runtime, and use the same build command, start command, and environment variables as above. Allow the service's outbound IP addresses in MongoDB Atlas. Run the seed request once after the first successful deploy.

## Limitations
- Catalogue prices and the 18% GST estimate are illustrative; final pricing requires design review.
- The parametric visualizer and AI-generated image are visualization aids, not construction or installation plans.
- Cloudflare Workers AI rendering requires a server-side account ID and API token. If unavailable, the studio uses a curated local kitchen preview. When configured, the kitchen prompt (and, when enabled, the captured 3D snapshot for Groq prompt enrichment) is sent to the corresponding provider.
- Image-to-3D matching estimates visible layout and finishes from a single photo. It cannot determine hidden walls or exact room dimensions; confirm measurements in the configurator.
