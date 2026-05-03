/**
 * AI Scene Generator Dialog
 * Uses native DOM APIs (no jQuery) for Foundry VTT V13+ compatibility.
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

export class AISceneGeneratorDialog extends Application {
  constructor(options = {}) {
    super(options);
    this._selectedStyle = "";
    this._isGenerating = false;
    this._previewUrl = null;
    this._pendingFilename = null;
  }

  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      id: "ai-scene-generator-dialog",
      title: game.i18n.localize("AISCENEGEN.DialogTitle"),
      template: `modules/${MODULE_ID}/templates/dialog.hbs`,
      width: 640,
      height: "auto",
      resizable: true,
      classes: ["ai-scene-generator", "dialog"],
    });
  }

  getData() {
    return {
      styles: STYLES.map((s) => ({
        ...s,
        label: game.i18n.localize(s.label),
        active: s.id === this._selectedStyle,
      })),
      isGenerating: this._isGenerating,
      previewUrl: this._previewUrl,
    };
  }

  // Convenience: querySelector on this dialog's root element
  _q(selector) {
    return this.element.querySelector(selector);
  }
  _qAll(selector) {
    return this.element.querySelectorAll(selector);
  }

  activateListeners(html) {
    super.activateListeners(html);

    // Style buttons
    this._qAll(".style-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        this._selectedStyle = e.currentTarget.dataset.style;
        this._qAll(".style-btn").forEach((b) => b.classList.remove("active"));
        e.currentTarget.classList.add("active");
      });
    });

    this._q(".btn-generate").addEventListener("click", () => this._onGenerate());
    this._q(".btn-create-scene").addEventListener("click", () => this._onCreateScene());
    this._q(".btn-regenerate").addEventListener("click", () => this._onGenerate());
  }

  async _onGenerate() {
    if (this._isGenerating) return;

    const prompt = this._q(".prompt-input").value.trim();
    if (!prompt) {
      ui.notifications.warn(game.i18n.localize("AISCENEGEN.Error.EmptyPrompt"));
      return;
    }

    const stylePrompt = STYLE_PROMPTS[this._selectedStyle] ?? "";
    const fullPrompt = stylePrompt ? `${prompt}, ${stylePrompt}` : prompt;

    this._isGenerating = true;
    this._previewUrl = null;
    this._setGeneratingState(true);

    const statusEl = this._q(".generate-status");
    statusEl.textContent = game.i18n.localize("AISCENEGEN.Status.Generating");

    try {
      const result = await AIImageClient.generate(fullPrompt);
      this._previewUrl = result.dataUrl;
      this._pendingFilename = result.filename;

      statusEl.textContent = game.i18n.localize("AISCENEGEN.Status.Done");

      this._q(".preview-section").style.display = "";
      this._q(".preview-img").src = result.dataUrl;
      this._q(".btn-create-scene").disabled = false;
      this._q(".btn-regenerate").disabled = false;
      this._q(".full-prompt-display").textContent = fullPrompt;
    } catch (err) {
      console.error(`${MODULE_ID} | Generation error:`, err);
      ui.notifications.error(
        `${game.i18n.localize("AISCENEGEN.Error.GenerationFailed")}: ${err.message}`
      );
      statusEl.textContent = "";
    } finally {
      this._isGenerating = false;
      this._setGeneratingState(false);
    }
  }

  _setGeneratingState(generating) {
    const genBtn = this._q(".btn-generate");
    const spinner = this._q(".spinner");
    genBtn.disabled = generating;
    genBtn.querySelector("span").textContent = game.i18n.localize(
      generating ? "AISCENEGEN.Status.Generating" : "AISCENEGEN.Generate"
    );
    spinner.style.display = generating ? "" : "none";
    if (generating) {
      this._q(".btn-create-scene").disabled = true;
      this._q(".btn-regenerate").disabled = true;
    }
  }

  async _onCreateScene() {
    if (!this._previewUrl) return;

    const sceneName =
      this._q(".scene-name-input").value.trim() ||
      game.i18n.localize("AISCENEGEN.DefaultSceneName");

    const btn = this._q(".btn-create-scene");
    btn.disabled = true;
    btn.textContent = game.i18n.localize("AISCENEGEN.Status.CreatingScene");

    try {
      const imagePath = await this._uploadImage(this._previewUrl, this._pendingFilename);
      await this._createScene(sceneName, imagePath);
      ui.notifications.info(
        game.i18n.format("AISCENEGEN.Status.SceneCreated", { name: sceneName })
      );
      this.close();
    } catch (err) {
      console.error(`${MODULE_ID} | Scene creation error:`, err);
      ui.notifications.error(
        `${game.i18n.localize("AISCENEGEN.Error.SceneFailed")}: ${err.message}`
      );
      btn.disabled = false;
      btn.textContent = game.i18n.localize("AISCENEGEN.CreateScene");
    }
  }

  async _uploadImage(dataUrl, filename) {
    const folder = AISceneGeneratorSettings.get("uploadFolder") || "ai-generated-scenes";
    try {
      await FilePicker.createDirectory("data", folder);
    } catch (_e) {
      // Folder likely already exists
    }

    const res = await fetch(dataUrl);
    const blob = await res.blob();
    const file = new File([blob], filename, { type: "image/png" });

    const uploadResult = await FilePicker.upload("data", folder, file, {});
    if (!uploadResult?.path) throw new Error("Upload failed – no path returned.");
    return uploadResult.path;
  }

  async _createScene(name, backgroundPath) {
    const scene = await Scene.create({
      name,
      background: { src: backgroundPath },
      width: 1920,
      height: 1080,
      grid: { type: 1, size: 100 },
      padding: 0,
    });
    scene.sheet.render(true);
    return scene;
  }
}
