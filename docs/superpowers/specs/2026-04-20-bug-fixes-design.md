# Bug Fixes Design — waoowaoo (2026-04-20)

## Overview

Fix 12 bugs reported in `Copy of bug.docx` across the waoowaoo AI Studio platform. Bugs span the credits/profile system, asset management UI, and storyboard/AI generation pipeline. Implementation uses a parallel-by-domain strategy (Group A / B / C) for fastest completion.

## Scope

Tech stack: Next.js 14, TypeScript, Prisma, BullMQ, React Query.

---

## Group A — Credits & Profile (Bug 1, 2, 3)

### Bug 1: Credits Insufficient — No Modal & Balance Does Not Refresh

**Symptom:** When an operation fails due to insufficient credits, no popup appears. The credit balance displayed to the user also does not refresh after each operation.

**Root Cause:**
- `handleInsufficientCredits(error)` exists in `src/lib/insufficient-credits-modal.tsx` but is not wired into any mutation error handler.
- The `InsufficientCreditsModal` component and `InsufficientCreditsProvider` are already built and functional.
- Credit balance (shown in profile sidebar) depends on data fetched at page load and is not invalidated after mutations.

**Fix:**
1. In every operation hook that calls a backend mutation (character/location/prop generation, batch generation, TTS, storyboard generation), add to the `catch` block:
   ```ts
   if (handleInsufficientCredits(error)) return
   ```
2. After each successful generation operation, call `queryClient.invalidateQueries(['subscription'])` to refresh the credit balance display.

**Files:**
- `src/app/[locale]/workspace/[projectId]/modes/novel-promotion/components/assets/hooks/useCharacterActions.ts`
- `src/app/[locale]/workspace/[projectId]/modes/novel-promotion/components/assets/hooks/useBatchGeneration.ts`
- `src/app/[locale]/workspace/[projectId]/modes/novel-promotion/components/assets/hooks/useTTSGeneration.ts`
- `src/app/[locale]/workspace/[projectId]/modes/novel-promotion/components/storyboard/hooks/useStoryboardGroupActions.ts`
- `src/app/[locale]/workspace/[projectId]/modes/novel-promotion/components/storyboard/hooks/useImageGeneration.ts`

---

### Bug 2: Profile (Settings Center) — Remove Unnecessary Sections

**Symptom:** The profile page shows excessive content including trend charts, type distribution charts, task records tab, and subscription details. User only needs: credits remaining, days remaining, and usage records.

**Root Cause:** `src/app/[locale]/profile/page.tsx` has multiple sections that were built speculatively but are not required.

**Fix:** Restructure `profile/page.tsx` to retain only:
- Left sidebar: user name, available credits (large number), plan remaining days
- Right content: consumptionRecords table (usage records list)

Remove:
- "积分消耗趋势" chart section (recharts placeholder)
- "消耗类型分布" pie chart section
- "任务记录" tab and taskRecords table
- "积分详情" breakdown card (subscriptionCredits / permanentCredits / frozenCredits)
- "订阅详情" card

**Files:**
- `src/app/[locale]/profile/page.tsx`

---

### Bug 3: Logout Button Error

**Symptom:** Clicking the logout button causes an error.

**Root Cause:** `signOut({ callbackUrl: \`/${locale}\` })` — if `locale` is undefined the URL becomes `//` which is invalid. The `locale` variable is read from `useParams()` which can return an array or undefined.

**Fix:** Use a safe fallback:
```ts
const localeStr = Array.isArray(locale) ? locale[0] : (locale ?? 'zh')
signOut({ callbackUrl: `/${localeStr}` })
```

**Files:**
- `src/app/[locale]/profile/page.tsx`

---

## Group B — Assets & UI (Bug 4, 5, 6)

### Bug 4: Image Generation Stage — Multiple Issues

#### 4a: Default Layout Misaligned
**Root Cause:** Layout container in the image generation/character card UI has incorrect initial flex state or CSS class condition.
**Fix:** Inspect `CharacterCard.tsx` and `ImageSection.tsx` layout containers. Fix the conditional class applied before first render.

#### 4b: Cannot Upload Audio
**Root Cause:** Audio upload input is either missing `accept="audio/*"` or the event handler is not firing correctly.
**Fix:** Locate the audio upload `<input>` in the voice/TTS UI and verify `accept`, `onChange`, and that the handler triggers `fetch` correctly.

#### 4c: Save AI Audio Sometimes Errors
**Root Cause:** The `handleVoiceDesignSave` in `useTTSGeneration.ts` may have unhandled Promise rejections or race conditions.
**Fix:** Wrap the save call in a full try/catch with toast error display. Ensure `await` is used throughout.

#### 4d: Select/Keep Image Sometimes Has No Effect
**Root Cause:** The `handleSelectCharacterImage` / `handleConfirmSelection` flow has stale closure or React Query cache not invalidated after selection, causing the UI not to reflect the change until the next fetch.
**Fix:** After selection confirmation, explicitly call `queryClient.invalidateQueries` on the assets query key to force a re-fetch.

**Files:**
- `src/app/[locale]/workspace/[projectId]/modes/novel-promotion/components/assets/CharacterCard.tsx`
- `src/app/[locale]/workspace/[projectId]/modes/novel-promotion/components/assets/hooks/useTTSGeneration.ts`
- `src/app/[locale]/workspace/[projectId]/modes/novel-promotion/components/assets/hooks/useCharacterActions.ts`

---

### Bug 5: Character Description Title — Move Above "AI Design"

**Symptom:** The "角色描述" (character description) title appears below the "AI设计" section, making the AI design purpose unclear.

**Root Cause:** JSX ordering issue in the character asset rendering component.

**Fix:** In `CharacterCard.tsx` or `AIDataModalFormPane.tsx`, move the "角色描述" section's JSX block to appear before the "AI设计" block.

**Files:**
- `src/app/[locale]/workspace/[projectId]/modes/novel-promotion/components/assets/CharacterCard.tsx`
- OR `src/app/[locale]/workspace/[projectId]/modes/novel-promotion/components/storyboard/AIDataModalFormPane.tsx`

---

### Bug 6: Characters/Props Duplicately Saved to Asset Hub

**Symptom:** Clicking "保存到资产中心" creates duplicate entries for the same character or prop.

**Root Cause:** The `useSaveAssetToGlobal` mutation calls the backend API without a uniqueness check. The backend route does not check for existing assets with the same name/kind before inserting.

**Fix:** In the `/api/asset-hub` save route, before creating a new global asset:
1. Query existing assets by `(kind, name, userId)` — or however global assets are scoped.
2. If a match exists, return the existing asset (HTTP 200) rather than creating a new record.

**Files:**
- `src/app/api/asset-hub/` (the save/upsert route)

---

## Group C — Storyboard & AI (Bug 7, 8, 9, 10, 11, 12)

### Bug 7: Cannot Generate Storyboard Image / Cannot Add Shots

**Symptom:** Clicking "添加镜头" does nothing visible; storyboard image generation fails silently.

**Root Cause (hypothesis):**
- `addPanel` in `usePanelCrudActions.ts` calls `createPanelMutation.mutateAsync` but errors are caught and shown via `alert()` — if the API returns an error, it may be swallowed or the alert is not shown due to browser popup blocking.
- The `insert-panel` API route may have a permission or parameter validation issue.

**Fix:**
1. Replace `alert()` in `addPanel` with a proper toast notification.
2. Add logging around the API call to confirm request/response.
3. Check the `/api/novel-promotion/[projectId]/insert-panel/route.ts` for validation issues.

**Files:**
- `src/app/[locale]/workspace/.../storyboard/hooks/usePanelCrudActions.ts`
- `src/app/api/novel-promotion/[projectId]/insert-panel/route.ts`

---

### Bug 8: AI Storyboard Content Not Generated — Using Outline Directly

**Symptom:** The storyboard stage shows the input outline text instead of AI-generated shot breakdowns. The shot divisions and content are not displayed.

**Root Cause:** The Phase 1 storyboard generation prompt (`NP_AGENT_STORYBOARD_PLAN`) may not be producing the expected structured JSON output, or the frontend `StoryboardCanvas` / `StoryboardGroup` components are not rendering the shot breakdown content correctly.

**Fix:**
1. Update the `NP_AGENT_STORYBOARD_PLAN` prompt (see Bug 10).
2. Verify `StoryboardGroup.tsx` renders `clip.content` vs `panel.description` — ensure the panel-level content is rendered, not the clip-level outline text.

**Files:**
- Database: `NP_AGENT_STORYBOARD_PLAN` prompt template
- `src/app/[locale]/workspace/.../storyboard/StoryboardGroup.tsx`
- `src/app/[locale]/workspace/.../storyboard/ScreenplayDisplay.tsx`

---

### Bug 9: Cannot Upload Image as Reference or Replacement

**Symptom:** In the storyboard edit panel, uploading an image as a reference or to replace the current image does not work.

**Root Cause:** `ImageEditModal.tsx` has file upload and paste functionality that reads files into base64. However, the `onSubmit(editPrompt, editImages, selectedAssets)` call passes `editImages` as base64 strings — the downstream API or handler may not accept base64 for image generation.

**Fix:** Trace the data flow from `handleSubmit` → `onSubmit` prop → `handleEditSubmit` in `useStoryboardPanelAssetActions` → the actual API call. Verify the image data format expected by the backend and fix the mismatch.

**Files:**
- `src/app/[locale]/workspace/.../storyboard/ImageEditModal.tsx`
- `src/app/[locale]/workspace/.../storyboard/hooks/useStoryboardPanelAssetActions.ts`
- `src/app/api/novel-promotion/[projectId]/modify-storyboard-image/route.ts`

---

### Bug 10: Update Storyboard Prompt (NP_AGENT_STORYBOARD_PLAN)

**Symptom:** The AI-generated storyboard quality is poor; shot divisions do not meet user requirements.

**New Prompt Requirements (from bug doc):**
- Split novel content into professional storyboard script for AI video generation
- Large shots: 100–180 seconds each, AI decides timing
- Small shots within each large shot: each < 14 seconds, with exact duration labeled
- Strictly follow original novel order; allow cuts/modifications/optimizations to enrich story
- Auto-determine: dialogue-led or narration-led per shot
- Each small shot must include: shot number | duration | scene | characters & actions/expressions | camera movement | special effects | dialogue/narration | sound effects
- Seamless transitions via action/scene/emotion continuity
- No subtitles, no background music — only dialogue and sound effects
- Style: 爽文, 3D anime, strong visual imagery, fast-paced, directly usable for AI video generation

**Fix:** Update the `NP_AGENT_STORYBOARD_PLAN` prompt template in the database (via admin prompt management UI or direct DB update in migration).

---

### Bug 11: AI Video Parsing Capability Insufficient

**Symptom:** AI-generated video output quality is poor; the AI does not produce video-ready shot descriptions.

**Root Cause:** The `NP_AGENT_STORYBOARD_DETAIL` (Phase 3) prompt for `video_prompt` generation is not detailed enough to produce high-quality video prompts.

**Fix:** Supplement the Phase 3 prompt to explicitly require each shot's `video_prompt` to include: subject, environment, camera angle, lighting, character expressions/actions, color palette, motion direction — formatted as a dense English description suitable for AI video generation models.

**Files:**
- Database: `NP_AGENT_STORYBOARD_DETAIL` prompt template

---

### Bug 12: Storyboard Video Error

**Symptom:** Storyboard video generation fails with an error.

**Root Cause:** Unknown — requires runtime log investigation.

**Fix:**
1. Check server logs for the `generate-video` endpoint errors.
2. Inspect `src/app/api/novel-promotion/[projectId]/generate-video/route.ts`.
3. Verify the task type, credit deduction, and model API call chain.
4. Fix the identified failure point.

**Files:**
- `src/app/api/novel-promotion/[projectId]/generate-video/route.ts`
- `src/lib/workers/` (video generation worker if applicable)

---

## Implementation Strategy

**Method: Parallel by Domain (Method 2)**

Execute Groups A, B, C as independent tracks:

| Group | Bugs | Domain | Key Files |
|-------|------|--------|-----------|
| A | 1, 2, 3 | Credits & Profile | profile/page.tsx, operation hooks |
| B | 4, 5, 6 | Assets & UI | CharacterCard, asset hooks, asset-hub API |
| C | 7–12 | Storyboard & AI | storyboard hooks, AI prompts, video API |

Each group:
1. Diagnose → fix → test → commit
2. Groups A and B can run in parallel; Group C can start immediately but bug 12 may require log access

## Verification Plan

- **Group A**: Sign out works without error; insufficient credits triggers modal; profile shows only credits + days + usage list
- **Group B**: Saving to asset hub is idempotent (second save returns existing); character description appears above AI design; image selection updates immediately
- **Group C**: Add panel creates a new shot; storyboard shows AI-generated content not raw outline; image upload reference works; prompts updated in DB
