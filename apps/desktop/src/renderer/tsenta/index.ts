/**
 * Tsenta fork entry, imported once for its side effects by renderer/index.tsx.
 * Everything for the Conductor look lives under this folder, so rebasing onto
 * Paradev's canary only ever meets a few one-line hooks (listed in
 * scripts/fork/check-upstream-touchpoints.sh). Styles come in separately: the
 * last `@import` in globals.css pulls in styles/conductor.css. Components read
 * the switch with `isConductorSkin()` from ./skin.
 */
import { applySkin } from "./skin";

applySkin();
