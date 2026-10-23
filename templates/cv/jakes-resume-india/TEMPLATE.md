# Template: jakes-resume-india

- **Type:** CV
- **Source extension:** .tex
- **Engine/toolchain:** pdflatex
- **Page limit:** 1 page(s)
- **Paper:** A4 (Indian standard), 11pt; drop to 10pt only when a full profile does not fit one page
- **Fonts:** Computer Modern + FontAwesome 5 icons (TeX distribution fonts; TinyTeX: `tlmgr install fontawesome5`)
- **Class/packages:** article with latexsym, fullpage, titlesec, marvosym, color, verbatim, enumitem, hyperref, fancyhdr, babel, tabularx, fontawesome5

## Compile command

    cd <output dir> && rm -f <file>.pdf && mkdir -p build && pdflatex -interaction=nonstopmode -output-directory=build <file>.tex && mv build/<file>.pdf ./

## Layout check

    python3 tools/verify_layout.py <file>.pdf --footer-band 30

The template prints no page number and runs text to about 40pt above the bottom edge, so the checker's default 90pt footer band would flag every compile. Use 30pt.

## Style rules

- One page, always. Indian campus and fresher screening reads one page; a second page is cut, not read.
- Section order for a fresher or early-career candidate: Education, Experience (internships count), Projects, Technical Skills, Achievements. Move Experience above Education only once the candidate has full-time experience.
- Education line shows CGPA (and percentage only when the posting asks for it).
- Every bullet is one line or two, starts with a past-tense verb, and carries a number where the profile has one (latency, scale, users, test count).
- Bold (`\textbf{}`) only the technologies the posting names, inside bullets, so a recruiter skimming for the posting's stack finds it. Never bold whole sentences.
- Each project heading names its stack in italics and links GitHub / live demo with real URLs from the profile.
- Contact line keeps phone and email as literal text (ATS reads the text layer).

## Known pitfalls

- Escape `%`, `&`, `#`, `_` and `$` in content (`\%`, `\&`, `\#`, `\_`, `\$`); "95%" in a bullet silently comments out the rest of the line.
- `+` in "2M+" or "160+" is safe; `~` is a non-breaking space, use `$\sim$` for "approximately".
- If the page overflows by a line or two, tighten bullets before touching margins; never shrink the font below 11pt.
