/**
 * AI Scene Generator Dialog – Foundry VTT V14 compatible
 * ApplicationV2 + HandlebarsApplicationMixin, native DOM, no jQuery.
 */

import { AIImageClient } from "./api-client.js";
import { AISceneGeneratorSettings } from "./settings.js";

const MODULE_ID = "ai-scene-generator";

const STYLES = [
  { id: "",            label: "AISCENEGEN.Style.None",       icon: "fa-ban" },
  { id: "dnd-fantasy", label: "AISCENEGEN.Style.DnDFantasy", icon: "fa-dragon" },
  { id: "comic",       label: "AISCENEGEN.Style.Comic",      icon: "fa-book-open" },
  { id: "realistic",   label: "AISCENEGEN.Style.Realistic",  icon: "fa-camera" },
  { id: "video-game",  label: "AISCENEGEN.Style.VideoGame",  icon: "fa-gamepad" },
  { id: "artistic",    label: "AISCENEGEN.Style.Artistic",   icon: "fa-palette" },
  { id: "dark-horror", label: "AISCENEGEN.Style.DarkHorror", icon: "fa-skull" },
  { id: "watercolor",  label: "AISCENEGEN.Style.Watercolor", icon: "fa-droplet" },
  { id: "sci-fi",      label: "AISCENEGEN.Style.SciFi",      icon: "fa-rocket" },
];

const STYLE_PROMPTS = {
  "dnd-fantasy": "in a detailed D&D fantasy art style, epic, dramatic lighting, high fantasy illustration",
  "comic":       "in a vibrant comic book art style, bold outlines, cel-shading, dynamic composition",
  "realistic":   "photorealistic, highly detailed, dramatic lighting, ultra HD photography",
  "video-game":  "stylized video game concept art, digital painting, vivid colors, AAA game aesthetic",
  "artistic":    "fine art painting, artistic masterpiece, rich textures, gallery quality artwork",
  "dark-horror": "dark horror atmosphere, ominous, eerie, gothic, chilling atmosphere, moody lighting",
  "watercolor":  "beautiful watercolor painting, soft washes, delicate details, traditional art style",
  "sci-fi":      "futuristic sci-fi concept art, neon accents, technology, cinematic, detailed digital art",
};

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

export class AISceneGeneratorDialog extends HandlebarsApplicationMixin(ApplicationV2) {

  static DEFAULT_OPTIONS = {
    id: "ai-scene-generator-dialog",
    window: {
      title: "AISCENEGEN.DialogTitle",
      resizable: true,
    },
    position: { width: 660, height: 600 },
    classes: ["ai-scene-generator"],
  };

  static PARTS = {
    main: {
      template: `modules/${MODULE_ID}/templates/dialog.hbs`,
      scrollable: [""],
    },
  };

  #selectedStyle   = "";
  #isGenerating    = false;
  #previewUrl      = null;
  #pendingFilename = null;

  async _prepareContext(_options) {
    return {
      styles: STYLES.map((s) => ({
        ...s,
        label: game.i18n.localize(s.label),
        active: s.id === this.#selectedStyle,
      })),
    };
  }

  #q(sel)    { return this.element.querySelector(sel); }
  #qAll(sel) { return this.element.querySelectorAll(sel); }

  _onRender(_ctx, _opts) {
    this.#qAll(".style-btn").forEach((btn) =>
      btn.addEventListener("click", (e) => {
        this.#selectedStyle = e.currentTarget.dataset.style ?? "";
        this.#qAll(".style-btn").forEach((b) => b.classList.remove("active"));
        e.currentTarget.classList.add("active");
      })
    );

    this.#q(".btn-generate").addEventListener("click",     () => this.#generate());
    this.#q(".btn-create-scene").addEventListener("click", () => this.#createScene());
    this.#q(".btn-regenerate").addEventListener("click",   () => this.#generate());

    if (this.#previewUrl) {
      this.#q(".preview-section").style.display = "";
      this.#q(".preview-img").src               = this.#previewUrl;
      this.#q(".btn-create-scene").disabled     = false;
      this.#q(".btn-regenerate").disabled       = false;
    }
  }

  async #generate() {
    if (this.#isGenerating) return;

    const prompt = this.#q(".prompt-input").value.trim();
    if (!prompt) {
      ui.notifications.warn(game.i18n.localize("AISCENEGEN.Error.EmptyPrompt"));
      return;
    }

    const change     = this.#q(".change-input")?.value.trim() ?? "";
    const suffix     = STYLE_PROMPTS[this.#selectedStyle] ?? "";
    const parts      = [prompt, change, suffix].filter(Boolean);
    const fullPrompt = parts.join(", ");

    this.#isGenerating = true;
    this.#setGeneratingState(true);

    const status = this.#q(".generate-status");
    status.textContent = game.i18n.localize("AISCENEGEN.Status.Generating");

    try {
      const result          = await AIImageClient.generate(fullPrompt);
      this.#previewUrl      = result.dataUrl;
      this.#pendingFilename = result.filename;

      status.textContent = game.i18n.localize("AISCENEGEN.Status.Done");
      this.#q(".preview-section").style.display  = "";
      this.#q(".preview-img").src                = result.dataUrl;
      this.#q(".btn-create-scene").disabled      = false;
      this.#q(".btn-regenerate").disabled        = false;
      this.#q(".full-prompt-display").textContent = fullPrompt;
      // Clear the change field after each generation
      const changeEl = this.#q(".change-input");
      if (changeEl) changeEl.value = "";
    } catch (err) {
      console.error(`${MODULE_ID} | Generation error:`, err);
      ui.notifications.error(`${game.i18n.localize("AISCENEGEN.Error.GenerationFailed")}: ${err.message}`);
      status.textContent = "";
    } finally {
      this.#isGenerating = false;
      this.#setGeneratingState(false);
    }
  }

  #setGeneratingState(on) {
    const btn     = this.#q(".btn-generate");
    const spinner = this.#q(".spinner");
    btn.disabled  = on;
    btn.querySelector("span").textContent = game.i18n.localize(
      on ? "AISCENEGEN.Status.Generating" : "AISCENEGEN.Generate"
    );
    spinner.style.display = on ? "" : "none";
    if (on) {
      this.#q(".btn-create-scene").disabled = true;
      this.#q(".btn-regenerate").disabled   = true;
    }
  }

  async #createScene() {
    if (!this.#previewUrl) return;

    const sceneName = this.#q(".scene-name-input").value.trim()
      || game.i18n.localize("AISCENEGEN.DefaultSceneName");

    const safeName = sceneName
      .replace(/[^a-zA-Z0-9äöüÄÖÜß_\- ]/g, "")
      .trim().replace(/\s+/g, "_");
    const filename = `${safeName}_${Date.now()}.png`;

    const btn = this.#q(".btn-create-scene");
    btn.disabled    = true;
    btn.textContent = game.i18n.localize("AISCENEGEN.Status.CreatingScene");

    try {
      const imagePath = await this.#upload(this.#previewUrl, filename);
      console.log(`${MODULE_ID} | Uploaded to: ${imagePath}`);
      await this.#makeScene(sceneName, imagePath);
      ui.notifications.info(game.i18n.format("AISCENEGEN.Status.SceneCreated", { name: sceneName }));
      this.close();
    } catch (err) {
      console.error(`${MODULE_ID} | Scene creation error:`, err);
      ui.notifications.error(`${game.i18n.localize("AISCENEGEN.Error.SceneFailed")}: ${err.message}`);
      btn.disabled    = false;
      btn.textContent = game.i18n.localize("AISCENEGEN.CreateScene");
    }
  }

  async #upload(dataUrl, filename) {
    const folder = AISceneGeneratorSettings.get("uploadFolder") || "ai-generated-scenes";
    const FP     = foundry.applications?.apps?.FilePicker?.implementation ?? FilePicker;

    try { await FP.createDirectory("data", folder); } catch (_e) { /* already exists */ }

    const blob   = await (await fetch(dataUrl)).blob();
    const file   = new File([blob], filename, { type: "image/png" });
    const result = await FP.upload("data", folder, file, {});

    if (!result?.path) throw new Error("Upload returned no path.");
    return result.path;
  }

  async #makeScene(name, imagePath) {
    console.log(`${MODULE_ID} | Creating scene "${name}" with image: ${imagePath}`);

    // In Foundry V14, the background image lives inside the levels array:
    // levels[0].background.src  (not scene.background.src)
    // We set it directly on the default level during create.
    const scene = await Scene.create({
      name,
      width:   1920,
      height:  1080,
      padding: 0,
      grid: { type: 0, size: 100 },   // type 0 = no grid
      levels: [{
        _id:       "defaultLevel0000",
        name:      "Level",
        elevation: { bottom: 0, top: 20 },
        background: { src: imagePath, color: "#000000" },
      }],
    });

    console.log(`${MODULE_ID} | Scene created. levels[0].background.src =`,
      scene.toObject()?.levels?.[0]?.background?.src);

    scene.sheet.render(true);
    return scene;
  }
}
