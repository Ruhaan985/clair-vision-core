# Aster Night-Sky Reskin

## Goal
Replace Lumen’s current Emerald Noir/neon presentation with the restrained **Aster** night-sky system while preserving every route, control, workflow, and data behavior.

## Implementation

### 1. Establish the Aster design system
- Replace the global palette with the supplied near-black background, panel, border, text, and starlight accent roles, mapped through the existing semantic Tailwind tokens.
- Load **Fraunces** and **Inter** from the document head; use Inter throughout UI and Fraunces italic only for prominent editorial headings such as the empty-state greeting.
- Normalize radii, borders, focus rings, scrollbars, Markdown surfaces, dialogs, popovers, auth/legal pages, and shared controls to the quiet flat Aster look.
- Remove decorative auroras, neon glows, ornamental gradients, and broad entrance animations while retaining functional status animations such as thinking, recording, image generation, and progress feedback.
- Keep the existing Code Mode visually distinct, but restyle it to harmonize with Aster rather than the current saturated gradient treatment.

### 2. Reskin the real chat shell
- Restyle the fixed-width desktop sidebar and existing mobile drawer with the Aster panel background, fine border, minimal conversation rows, bordered new-chat action, compact rank/progress treatment, and quieter utility links.
- Restyle the chat topbar, status indicator, icon controls, messages, attachments, mode pills, composer, helper text, and error/loading states using Aster tokens.
- Preserve all existing click handlers, auth gates, tools, voice input, theme control, rank logic, conversation history, file generation, and responsive behavior.
- Add consistent keyboard-visible focus states and ensure text/control contrast remains usable.

### 3. Create the Aster hero and atmosphere
- Replace the empty-state logo block with a lightweight inline SVG trajectory mark: an arrow rising above a shallow horizon arc.
- Animate the arrow stroke first and the horizon second on initial load only, then leave the interface still.
- Add a sparse CSS star field behind the main chat area, with only a few stars using a slow staggered opacity twinkle; keep stars visible but unobtrusive in active conversations too.
- Update the greeting to “How can I help you tonight?” in italic Fraunces, retain concise supporting copy, and restyle the existing four functional suggestion actions into a responsive 2×2 minimal bordered grid.
- Disable trajectory drawing, twinkling, and nonessential motion under `prefers-reduced-motion`.

### 4. Align supporting routes and opening screen
- Restyle the existing opening screen as a restrained Aster launch moment rather than the current neon splash, preserving its one-session navigation behavior.
- Apply the same semantic Aster surfaces and typography to authentication, password reset, terms, admin/rank overlays, calculator, weather, and leaderboard through shared tokens and focused component adjustments where global tokens are insufficient.
- Keep route content and functionality unchanged.

### 5. Verification
- Check desktop and mobile layouts in the live app, including the collapsed sidebar/drawer, empty chat, active conversation, composer focus, and supporting routes.
- Verify no controls or existing features disappear, no text overlaps, and no horizontal overflow is introduced.
- Confirm reduced-motion behavior and inspect browser console/runtime errors after the reskin.

## Technical notes
- Primary files: `src/styles.css`, `src/components/lumen/chat-window.tsx`, `src/components/lumen/sidebar.tsx`, `src/routes/index.tsx`, and `src/routes/__root.tsx` for font links.
- Supporting components will only receive presentation-level class changes where semantic-token replacement alone cannot achieve the design.
- No backend, API, database, routing, or feature-state changes are planned.
