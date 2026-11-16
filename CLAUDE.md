# Jerry Rivera — Sitio Oficial

## Deploy rule (owner's standing instruction)
**Always ship every change to Vercel production**, not just to git.
1. Commit and push the branch. The GitHub integration creates a Preview deployment automatically.
2. Promote that commit to production: Vercel MCP `create_deployment` with
   `{ project: "prj_vXT0VDTH5S40mH4MOwOqrXRl8yFL", deploymentId: <the preview's dpl_ id>, target: "production" }`
   on team `team_oJjp2m4ndYj0sRVbnyFFjypE`.
3. Wait for `READY`, check the build log (`[media] mirrored … covers` should report 0 unavailable), and report the live URL: https://jerry-rivera-oficial.vercel.app

## Before shipping
- `npm run build` must succeed.
- `OFFLINE=1 npm run test:e2e` must pass. It is a Playwright run on desktop, iPhone 13 and Pixel 7.
