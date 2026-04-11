# Community Health Tools

Free, open-source SDOH screening tools and ICD-10 Z code reference for community health centers, public health departments, and anyone working to address social determinants of health.

**Live:** [cleansheet.life/#community](https://www.cleansheet.life/#community)

## Tools

### PRAPARE Screening
Interactive implementation of the [PRAPARE](https://prapare.org/) (Protocol for Responding to and Assessing Patients' Assets, Risks, and Experiences) screening instrument.

- 17 core + 4 optional questions across 5 SDOH domains
- Domain-level risk identification with severity indicators
- Auto-suggested ICD-10 Z codes for positive screens
- Bilingual: English and Spanish
- LOINC Panel 93025-5

### ICD-10 Z Code Reference
Searchable reference for Social Determinants of Health codes (Z55-Z65).

- 70+ codes across education, employment, housing, economic circumstances, social environment, and psychosocial factors
- PRAPARE-to-Z-code mapping table
- Search by code or description

## Privacy

These tools run entirely in your browser. **No data is collected, transmitted, or stored.** When you close the page, your screening responses are gone. There are no cookies, no analytics on screening content, and no accounts.

## Self-Hosting

```bash
git clone https://github.com/CleansheetLLC/community-health.git
cd community-health
npm install
npm run dev     # development server
npm run build   # production build (output in dist/)
```

The `dist/` folder is a static site. Deploy to any hosting provider: Cloudflare Pages, Netlify, Vercel, GitHub Pages, or serve from a local web server.

## Tech Stack

- React 18 + TypeScript
- Vite (bundler)
- Tailwind CSS
- Zero external API dependencies
- ~180KB JS + ~14KB CSS (gzipped: ~56KB + ~3KB)

## Attribution

- **PRAPARE instrument**: Copyright NACHC 2019. Freely available for use. [prapare.org](https://prapare.org/)
- **ICD-10-CM codes**: Public domain (CMS/NCHS)
- **LOINC codes**: Copyright Regenstrief Institute. Used under LOINC license.

## Contributing

Contributions welcome. Please:

1. **Test against the published instrument.** PRAPARE questions and response options must match the NACHC-published instrument exactly. Do not modify clinical content.
2. **Include Spanish translations** for any new questions or UI text.
3. **Attribute your contribution.** All contributors are credited in the commit history and release notes.
4. **No data collection.** These tools must remain client-side only. No analytics on screening responses, no backend, no accounts.

### Adding a new language

1. Add `labelXx` fields to each option in `src/prapare.ts` (where `xx` is the ISO 639-1 code)
2. Add `textXx` to each question
3. Add `domainLabelXx` to domains
4. Add the language toggle button in `src/App.tsx`
5. Submit a PR with a note about the translation source

## License

Apache License 2.0. See [LICENSE](LICENSE).

Built by [Cleansheet LLC](https://www.cleansheet.life) as a community service.
