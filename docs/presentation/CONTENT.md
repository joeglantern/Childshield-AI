# ChildShield AI — Presentation Content

> Source content for the interactive brand deck. Every slide: a big headline, a one-breath brief (spoken-word length), the visual to build, and speaker notes. Numbers marked **[VERIFY]** must be checked against the cited source before presenting — never present unverified figures.

**Brand voice:** warm, calm, confident. Never alarmist in tone even when the subject is heavy. Kiswahili phrases appear as accents (the product speaks Kiswahili first).

---

## Slide 1 — Title

- **Headline:** ChildShield AI
- **Sub:** Mahali salama pa kusema. *A safe place to speak.*
- **Brief:** Anonymous, child-first online-protection reporting for Kenya — from a scared child's phone to a trained human, in minutes.
- **Visual:** Logo hero (the shield hugging the child) center stage on warm cream, pixel-dots drifting in slowly, brush-stroke underline animating beneath the title.
- **Notes:** Pause on this slide. Let the mascot land. One sentence: "This is ChildShield — and tonight I'll show you why it needs to exist, and how it works."

## Slide 2 — The problem

- **Headline:** Children face real harm online. Alone.
- **Brief:** Grooming, sextortion, cyberbullying, coercion — arriving on the same phones children use for school and play, usually with no adult watching.
- **Visual:** The 7 incident-type icons (grooming, sextortion, bullying, self-harm, coercion, exposure, other) rising one by one in a staggered grid; muted palette, no red-alarm styling.
- **Data points (each [VERIFY] against the named source):**
  - Disrupting Harm in Kenya (ECPAT / INTERPOL / UNICEF Innocenti, 2021): roughly **1 in 10 internet-using children aged 12–17** experienced online sexual exploitation or abuse **in a single year** [VERIFY exact %].
  - Most children who experienced harm **told no one** or told a friend — formal reporting was rare [VERIFY].
- **Notes:** Keep voice steady, not dramatic. "These aren't edge cases. They're happening at scale, quietly."

## Slide 3 — Why children don't report

- **Headline:** The reporting gap
- **Brief:** Fear of blame. Fear of the phone being taken. Forms that demand names. Adults who overreact. Reporting channels built for adults, not children.
- **Visual:** Four barrier cards flipping in: "Nitaambiwa ni kosa langu" (I'll be blamed) · "Watachukua simu yangu" (they'll take my phone) · "Fomu inataka jina" (the form wants my name) · "Sijui pa kuanzia" (I don't know where to start).
- **Notes:** "Every barrier on this screen is a design decision we made in reverse."

## Slide 4 — What ChildShield is

- **Headline:** Report in minutes. No name. A human answers.
- **Brief:** A child-first intake and triage platform: anonymous reporting, human-led triage with advisory AI, and referral into Kenya's existing protection system — Childline 116 and the Department of Children's Services.
- **Visual:** Three-beat animation: mascot (child side) → officer queue card → Childline 116 badge, connected by an animated teal path.
- **Notes:** Emphasize: "We didn't build a new authority. We built the missing on-ramp to the ones that exist."

## Slide 5 — The child's journey

- **Headline:** Five gentle steps
- **Brief:** Consent in plain language → what happened → who you are (no name, just an age band) → your words, if you want → send. A case code comes back — the child's only key.
- **Visual:** Phone mockup carousel of the real app screens (consent, category picker, free-text, success with case code `K7RD-M2XA` and the celebrating mascot). Progress bars fill as slides advance.
- **Notes:** Point at the copy: written for a 10-year-old reading level, in Kiswahili, English, and Sheng. "Hakuna jibu baya — there is no wrong answer."

## Slide 6 — Safety is a feature, not a policy

- **Headline:** Built for a child in a dangerous room
- **Brief:** One tap — *Toka haraka* — and the app becomes a boring notes screen. No name asked, ever. Screenshots blocked. The app switcher shows only a logo. Optional fingerprint lock.
- **Visual:** Live-style demo animation: the report screen → quick-exit tap → instant decoy "Notes" screen. Then four safety chips: Zero PII · Quick exit · FLAG_SECURE · App lock.
- **Notes:** This slide usually lands hardest. "We assume the abuser can be in the same room. The design holds up anyway."

## Slide 7 — The officer's side

- **Headline:** A calm, live command center
- **Brief:** Every report lands in a live queue in under a second — severity-sorted, SLA clocks ticking. Officers open a case, see the timeline, act. Every action is recorded.
- **Visual:** The officer queue mockup (cards with CRITICAL/HIGH/MEDIUM/LOW chips, "Dakika 1" SLA timers) with a new case card dropping in live-animated; then the desktop dashboard table.
- **Notes:** "The mascot retires here. Officers get density and calm — severity color exists only on this side, never the child's."

## Slide 8 — AI that advises, never decides

- **Headline:** PENDEKEZO LA AI, SI UAMUZI
- **Sub:** An AI suggestion, not a decision.
- **Brief:** The classifier reads the report and suggests labels and severity — in a clearly-marked advisory box. No model can transition a case, refer a child, or send a message. A human always decides. That's enforced in code, not policy.
- **Visual:** The AI box from the real case screen (dashed teal border) beside a firm rule card: "ML output → CaseEvent only. Nothing else. Enforced by architecture + CI tests."
- **Notes:** If asked "what if the AI is wrong?" — "Then nothing happens. That's the point. Wrong advice to a trained officer is noise; wrong automation is harm."

## Slide 9 — Reach every child (roadmap: channels)

- **Headline:** The app is one door. There are four.
- **Brief:** Smartphone app today; WhatsApp, USSD (*116#-style on any feature phone, no internet), and SMS next — because the most at-risk child often has the least phone.
- **Visual:** Four device frames: app (live), WhatsApp chat mockup, USSD menu on a feature-phone screen, SMS thread — the last three labeled "B2 — next milestone".
- **Notes:** The USSD flow is fully designed for the 90-second session window. Media on WhatsApp is refused with a safe scripted reply — zero-content everywhere.

## Slide 10 — The tech, honestly

- **Headline:** Boring, proven, fast
- **Brief:** A modular monolith — Fastify + PostgreSQL + Redis — with a realtime WebSocket layer, an isolated Python ML service, and native mobile apps. One server can carry the pilot.
- **Visual:** Animated architecture diagram: Child app / Dashboard → API → Postgres + Redis → Worker → ML (dashed, "advisory"); WS lightning-lines from API to both clients. Tech chips: TypeScript strict · Prisma · Expo · BullMQ.
- **Notes:** "No microservices theater. Every request validated against a schema. 44 automated tests, and the safeguarding rules are tests that fail the build."

## Slide 11 — Security & the audit chain

- **Headline:** Every action leaves an unbreakable trace
- **Brief:** Each mutation writes a hash-chained audit record — tamper with one row and the whole chain screams. Staff log in with passwords plus TOTP. Report content never enters logs, analytics, or AI prompts beyond its purpose.
- **Visual:** Animated blockchain-style chain of audit blocks linking (prevHash → entryHash); one block gets "edited" and the chain flashes broken. Chips: Argon2 · TOTP MFA · JWT rotation · Redacted logs · TLS.
- **Notes:** "This is how we protect children from us, too — no silent edits, no quiet deletions, ever. Verified by tests that literally attack the chain."

## Slide 12 — Zero-content by design

- **Headline:** We never touch the images
- **Brief:** ChildShield cannot receive, store, or forward abuse imagery — there is no upload anywhere, by architecture. Evidence is referenced by cryptographic hash only. CI fails if anyone ever adds an upload path.
- **Visual:** A crossed-out image icon morphing into a hash string (`a91f…c04e ✓`); a lock motif.
- **Notes:** This is both a child-dignity position and a legal-risk position: the platform can never become a distribution point.

## Slide 13 — Compliance: do we comply?

- **Headline:** Compliant by design. Certified before pilot.
- **Brief:** The architecture maps directly onto Kenya's child-protection and data-protection law — and the formal steps are scheduled, not skipped.
- **Visual:** Two-column animated checklist:
  - **Designed-in today:** data minimization & purpose limitation (zero-PII intake) → *Data Protection Act 2019 principles*; best-interests-of-the-child flow & referral into Childline 116/DCS → *Children Act 2022*; supports reporting of online offences → *Computer Misuse & Cybercrimes Act 2018*; child-appropriate consent language (EN/SW/Sheng), audit accountability, security safeguards; aligned with UN CRC & ACRWC which Kenya has ratified.
  - **Scheduled before live pilot (be transparent):** ODPC data-controller registration · DPIA (children's data = high-risk processing) · data-residency review · retention schedule · Safeguarding Ops Committee sign-off · sociolinguist review of consent text.
- **Notes:** If asked directly: "Yes on design, and we refuse to launch on vibes — the DPIA and ODPC registration gate the pilot. That discipline is itself compliance."

## Slide 14 — What's built right now

- **Headline:** Not a deck. A working system.
- **Brief:** Backend live with 44 passing tests. The native app — child and officer sides — running on real phones. The desktop triage dashboard. The AI pipeline. All talking over live sockets.
- **Visual:** Status board animating in: ✅ Anonymous intake · ✅ Live triage queue · ✅ Case timeline + notes · ✅ Advisory AI · ✅ Audit chain · ✅ Native app (iOS/Android) · ✅ Dashboard · 🔜 WhatsApp/USSD/SMS · 🔜 Referral automation.
- **Notes:** Offer the live demo here if the room allows: file a report from the phone, watch it appear on the dashboard queue in real time.

## Slide 15 — The ask / closing

- **Headline:** Watoto kwanza. *Children first.*
- **Brief:** [TAILOR TO AUDIENCE: pilot partnership with Childline/DCS · funding for the pilot counties · channel credentials (WhatsApp Business, USSD shortcode) · safeguarding advisory board members.]
- **Visual:** Mascot + logo reprise; the case code motif (`K7RD-M2XA`) as a metaphor — "every code is a child who found a door." Contact line.
- **Notes:** End on the child, not the tech.

---

## Appendix slides (build, keep off the main path — jump via keyboard)

- **A1 — State machine:** RECEIVED → TRIAGED → UNDER_REVIEW → REFERRED → IN_PROGRESS → CLOSED (→ REOPENED), animated as a metro-line diagram. Only `transitionCase()` may move a case.
- **A2 — Data model:** Case (no PII columns) · CaseEvent · AuditLog (hash chain) · MediaHash (hash-only) · ConsentVersion.
- **A3 — API surface:** the 11 endpoints + 5 WS events, one screen.
- **A4 — Team/roadmap timeline:** B0–B1 ✅ → B3 pipeline ✅ → B2 channels → B4 override/referrals → B5 hardening → pilot (Nairobi + Kisumu).
