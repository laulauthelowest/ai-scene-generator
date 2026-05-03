/**
 * AI Scene Generator – Foundry VTT Module
 * Generates AI images via API and creates new scenes with them as backgrounds.
 */

import { AISceneGeneratorDialog } from "./dialog.js";
import { AISceneGeneratorSettings } from "./settings.js";

const MODULE_ID = "ai-scene-generator";

Hooks.once("init", () => {
  console.log(`${MODULE_ID} | Initializing AI Scene Generator`);
  AISceneGeneratorSettings.register();
});

Hooks.once("ready", () => {
  console.log(`${MODULE_ID} | Ready`);
});

// Add button to Scene Directory header
Hooks.on("renderSceneDirectory", (app, html) => {
  if (!game.user.isGM) return;

  const button = $(`
    <button class="ai-scene-gen-btn" title="${game.i18n.localize("AISCENEGEN.OpenDialog")}">
      <i class="fas fa-wand-magic-sparkles"></i>
      ${game.i18n.localize("AISCENEGEN.ButtonLabel")}
    </button>
  `);

  button.on("click", () => {
    new AISceneGeneratorDialog().render(true);
  });

  // Insert button into the directory header actions
  const headerActions = html.find(".header-actions");
  if (headerActions.length) {
    headerActions.append(button);
  } else {
    // Fallback: prepend to the directory content
    html.find(".directory-header").append(button);
  }
});
