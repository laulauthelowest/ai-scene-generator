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
// Foundry V13+ passes a plain HTMLElement; V12 and below pass a jQuery object.
Hooks.on("renderSceneDirectory", (app, html) => {
  if (!game.user.isGM) return;

  // Normalise to a plain DOM element
  const root = html instanceof HTMLElement ? html : html[0];

  const button = document.createElement("button");
  button.className = "ai-scene-gen-btn";
  button.title = game.i18n.localize("AISCENEGEN.OpenDialog");
  button.innerHTML = `<i class="fas fa-wand-magic-sparkles"></i> ${game.i18n.localize("AISCENEGEN.ButtonLabel")}`;
  button.addEventListener("click", () => new AISceneGeneratorDialog().render(true));

  const target =
    root.querySelector(".header-actions") ??
    root.querySelector(".directory-header") ??
    root;

  target.appendChild(button);
});
