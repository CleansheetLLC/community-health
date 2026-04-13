# Community Health Tools

Free, open-source SDOH screening tools for community health centers, FQHCs, public health departments, and Community Health Workers. Everything runs in the browser -- no backend, no accounts, no PHI ever leaves the device.

**Use it now:** [cleansheet.life/#community](https://www.cleansheet.life/#community) -- no signup, no install. The hosted version and this repo are the same code.
**Or self-host:** deploy your own copy on any static host. Instructions below.

## For healthcare IT

If you're evaluating this for your organization:

- **No PHI transmitted.** Screening responses stay in the browser. Optional local-storage log for aggregate reporting; patient-identifying fields are never asked or stored.
- **No accounts, no backend to run.** Deploys as a static site on Cloudflare Pages, Azure Static Web Apps, Netlify, GitHub Pages, IIS, nginx, or any web server. No database, no auth server, no compliance overhead beyond your existing hosting layer.
- **Designed for the intake workflow.** CHWs and clinical staff can run PRAPARE or AHC-HRSN on a tablet during intake, then export de-identified results to CSV for UDS reporting, HEDIS measures, CMS quality submissions, or grant applications.
- **Z code mapping for billing.** Each positive screen suggests answer-specific ICD-10-CM Z codes (Z55-Z65, Z77, Z58) for clinical documentation and value-based care reporting.
- **Bilingual at the point of care.** English and Spanish with text-to-speech for patients with limited literacy or vision.
- **Apache 2.0, no vendor lock-in.** Fork, deploy, modify. No service-level dependency on Cleansheet.

## What's included

### Screening instruments

- **PRAPARE** (Protocol for Responding to and Assessing Patients' Assets, Risks, and Experiences) -- NACHC 2019 instrument, core and optional questions across 5 SDOH domains. LOINC Panel 93025-5. [prapare.org](https://prapare.org/)
- **AHC-HRSN** (Accountable Health Communities Health-Related Social Needs) -- CMS-developed instrument, 10 items across housing, food, transportation, utilities, and interpersonal safety. LOINC Panel 96777-8.

Both instruments include:
- Bilingual English/Spanish with text-to-speech (browser-local, no cloud)
- Domain-level risk stratification (low / medium / high)
- Answer-specific ICD-10 Z code suggestions -- "worried about housing" and "homeless" map to different codes, not lumped together
- Faithful to the published instruments -- no modifications to clinical content

### Screening Log

Local browser log for aggregate reporting:
- Accumulates de-identified screening results across sessions
- Export as CSV (opens directly in Excel / Google Sheets)
- Per-domain flag counts, overall risk, suggested Z codes
- Optional census tract tagging (opt-in per screening; device location is sent once to a public US government geocoder, FCC Block API with Census Bureau fallback, to derive tract FIPS; lat/lon is never retained)

### ICD-10 Z Code Reference

Searchable reference for SDOH codes (Z55-Z65), 70+ codes with screening-to-Z-code mapping tables.

## Privacy and compliance posture

- **All screening runs client-side.** No analytics on screening content, no tracking of responses.
- **Local-only storage.** Saved results use browser localStorage; nothing transmitted to Cleansheet or any third party.
- **No patient-identifying information collected.** The log stores date, instrument, overall risk level, per-domain flag counts, suggested Z codes, and optionally a census tract FIPS code -- never name, MRN, DOB, or any HIPAA 18-element identifier.
- **HIPAA posture:** a facility running this as-is collects no PHI with the tool, so it is outside HIPAA's scope for the tool itself. Standard HIPAA obligations still apply to any screening results the facility records in its own systems.

## What this is not

To save you time:

- **Not an EHR.** No patient records, no charting, no integration with Epic/Cerner/Athena. CSV export is the integration path.
- **Not a multi-tenant SaaS.** The hosted version at cleansheet.life is a shared public instance -- anyone can use it, but there are no per-organization accounts, dashboards, or server-side storage. If you want organizational isolation, self-host.
- **Not a managed service for your deployment.** Cleansheet won't operate a self-hosted copy on your behalf. If you self-host, you host it.
- **Not a population dashboard.** CSV output is per-screening; organization-wide analytics are out of scope here. See "Beyond the self-service tools" on the live site for the platform tier.
- **Not a diagnostic or treatment tool.** These are screening instruments for identifying social needs -- clinical interpretation and care planning stay with your team.

## Self-hosting

You don't have to self-host -- [cleansheet.life/#community](https://www.cleansheet.life/#community) is a free public instance of this same code. Self-host if you want:

- Organizational control (your own domain, your own branding)
- Offline use inside a facility network
- Custom modifications to the tool
- To fork and add your own screening instruments

```bash
git clone https://github.com/CleansheetLLC/community-health.git
cd community-health
npm install
npm run dev     # development server on http://localhost:5173
npm run build   # production build → dist/
```

`dist/` is a static site. Deploy to any static host:

| Host | Notes |
|---|---|
| Cloudflare Pages | Free tier, connect the repo, auto-deploys on push |
| Azure Static Web Apps | Good fit for health systems with existing Azure footprint |
| Netlify / Vercel | Free tier, zero config |
| GitHub Pages | Free, use the `gh-pages` branch |
| Local IIS / nginx / Apache | Copy `dist/` contents to the web root |

No environment variables required. No API keys. No backend to configure.

## Tech stack

- React 18 + TypeScript
- Vite (bundler)
- Tailwind CSS
- Leaflet (loaded only if the SVI map feature is enabled)
- Zero external runtime API calls, except the optional census geocoder when a user opts in to tract tagging

## Getting help

- **Bug reports and questions:** [GitHub Issues](https://github.com/CleansheetLLC/community-health/issues)
- **Custom screening instruments** (PHQ-9, GAD-7, ACEs, facility-specific) built on the same foundation: scoped paid engagement -- email [hello@cleansheet.dev](mailto:hello@cleansheet.dev)
- **EHR integration, population dashboards, CIP-level reporting:** the Cleansheet clinical platform at [cleansheet.life](https://www.cleansheet.life) is the paid tier

We're a small team building tools, not a managed service provider. For hands-on deployment or day-to-day operations of a self-hosted instance, you'll want a local IT partner alongside us.

## Contributing

Contributions welcome. Please:

1. **Test against the published instrument.** PRAPARE and AHC-HRSN questions and response options must match the published instruments exactly. Do not modify clinical content.
2. **Include Spanish translations** for any new questions or UI text.
3. **Attribute your contribution.** All contributors are credited in the commit history and release notes.
4. **No data collection.** These tools must remain client-side only. No analytics on screening responses, no backend, no accounts.

### Adding a new language

1. Add `labelXx` fields to each option in `src/prapare.ts` and `src/ahc-hrsn.ts` (where `xx` is the ISO 639-1 code)
2. Add `textXx` to each question
3. Add `domainLabelXx` (PRAPARE) or `labelXx` / `descriptionXx` (AHC-HRSN) to domains
4. Add the language toggle button in `src/App.tsx`
5. Submit a PR with a note about the translation source and clinical review, if any

## Attribution

- **PRAPARE instrument:** Copyright NACHC 2019. Freely available for use. [prapare.org](https://prapare.org/)
- **AHC-HRSN:** CMS-developed, public domain.
- **ICD-10-CM codes:** Public domain (CMS / NCHS).
- **LOINC codes:** Copyright Regenstrief Institute. Used under LOINC license.
- **Census tract geocoding:** FCC Block API ([geo.fcc.gov](https://geo.fcc.gov)) and US Census Bureau geocoder ([geocoding.geo.census.gov](https://geocoding.geo.census.gov)). Both are free US government services, no key required.

## License

Apache License 2.0. See [LICENSE](LICENSE).

Built by [Cleansheet LLC](https://www.cleansheet.life) as a community service.
