# MentoraX visual assets

This folder is reserved for approved MentoraX media used by the site. The UI intentionally points to real, local asset paths rather than stock or AI-generated portraits.

Add the supplied files using these names (or update the matching paths in `src/data.ts`):

- `mentors/raj.jpg`
- `mentors/dipti.jpg`
- `mentors/mentor-03.jpg`
- `mentors/mentor-04.jpg`
- `team/team-member-03.jpg`
- `team/team-member-04.jpg`
- `books/mentorax-book-01-cover.webp` (+ `-sm.webp` for small screens)
- `books/mentorax-book-02-cover.webp` (+ `-sm.webp` for small screens)

Book covers are cropped from the supplied print-ready wraparound PDFs (front panel only) and exported as WebP at 760 px and 400 px wide. Keep both sizes in step if a cover is replaced — the pages reference them through `srcset` in `src/App.tsx` and `src/data.ts`.

Use crisp, web-optimised source images. Preferred formats are AVIF or WebP for photography and JPEG/PNG only when the original artwork requires them. Keep the final filenames and update the extension in `src/data.ts` together.

The shared Google Drive resource hub is recorded in `src/data.ts`. Individual study-material and purchase links are deliberately empty until the MentoraX team provides the final URLs.
