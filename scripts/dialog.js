/**
 * AI Scene Generator Dialog
 */

import { AIImageClient } from "./api-client.js";
import { AISceneGeneratorSettings } from "./settings.js";

const MODULE_ID = "ai-scene-generator";

const STYLES = [
  { id: "",              label: "AISCENEGEN.Style.None",        icon: "fa-ban" },
  { id: "dnd-fantasy",   label: "AISCENEGEN.Style.DnDFantasy",  icon: "fa-dragon" },
  { id: "comic",         label: "AISCENEGEN.Style.Comic",       icon: "fa-book-open" },
  { id: "realistic",     label: "AISCENEGEN.Style.Realistic",   icon: "fa-camera" },
  { id: "video-game",    label: "AISCENEGEN.Style.VideoGame",   icon: "fa-gamepad" },
  { id: "artistic",      label: "AISCENEGEN.Style.Artistic",    icon: "fa-palette" },
  { id: "dark-horror",   label: "AISCENEGEN.Style.DarkHorror",  icon: "fa-skull" },
  { id: "watercolor",    label: "AISCENEGEN.Style.Watercolor",  icon: "fa-droplet" },
  { id: "sci-fi",        label: "AISCENEGEN.Style.SciFi",       icon: "fa-rocket" },
];

// Style → prompt suffix mapping
const STYLE_PROMPTS = {
  "dnd-fantasy":  "in a detailed D&D fantasy art style, epic, dramatic lighting, high fantasy illustration",
  "comic":        "in a vibrant comic book art style, bold outlines, cel-shading, dynamic composition",
  "realistic":    "photorealistic, highly detailed, dramatic lighting, ultra HD photography",
  "video-game":   "stylized video game concept art, digital painting, vivid colors, AAA game aesthetic",
  "artistic":     "fine art painting, artistic masterpiece, rich textures, gallery quality artwork",
  "dark-horror":  "dark horror atmosphere, ominous, eerie, gothic, chilling atmosphere, moody lighting",
  "watercolor":   "beautiful watercolor painting, soft washes, delicate details, traditional art style",
  "sci-fi":       "futuristic sci-fi concept art, neon accents, technology, cinematic, detailed digital art",
};

export class AISceneGeneratorDialog extends Application {
  constructor(options = {}) {
    super(options);
    this._selectedStyle = "";
    this._isGenerating = false;
    this._previewUrl = null;
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

  activateListeners(html) {
    super.activateListeners(html);

    // Style buttons
    html.find(".style-btn").on("click", (e) => {
      const styleId = e.currentTarget.dataset.style;
      this._selectedStyle = styleId;
      html.find(".style-btn").removeClass("active");
      $(e.currentTarget).addClass("active");
    });

    // Generate button
    html.find(".btn-generate").on("click", () => this._onGenerate(html));

    // Create Scene button
    html.find(".btn-create-scene").on("click", () => this._onCreateScene(html));

    // Regenerate button
    html.find(".btn-regenerate").on("click", () => this._onGenerate(html));
  }

  async _onGenerate(html) {
    if (this._isGenerating) return;

    const prompt = html.find(".prompt-input").val().trim();
    if (!prompt) {
      ui.notifications.warn(game.i18n.localize("AISCENEGEN.Error.EmptyPrompt"));
      return;
    }

    // Build full prompt
    const stylePrompt = STYLE_PROMPTS[this._selectedStyle] ?? "";
    const fullPrompt = stylePrompt
      ? `${prompt}, ${stylePrompt}`
      : prompt;

    this._isGenerating = true;
    this._previewUrl = null;
    this._updateUI(html);

    const statusEl = html.find(".generate-status");
    statusEl.text(game.i18n.localize("AISCENEGEN.Status.Generating"));

    try {
      const result = await AIImageClient.generate(fullPrompt);
      this._previewUrl = result.dataUrl;
      this._pendingFilename = result.filename;
      this._pendingPrompt = fullPrompt;

      statusEl.text(game.i18n.localize("AISCENEGEN.Status.Done"));
      html.find(".preview-section").show();
      html.find(".preview-img").attr("src", result.dataUrl);
      html.find(".btn-create-scene").prop("disabled", false);
      html.find(".btn-regenerate").prop("disabled", false);
      html.find(".full-prompt-display").text(fullPrompt);
    } catch (err) {
      console.error(`${MODULE_ID} | Generation error:`, err);
      ui.notifications.error(`${game.i18n.localize("AISCENEGEN.Error.GenerationFailed")}: ${err.message}`);
      statusEl.text("");
    } finally {
      this._isGenerating = false;
      html.find(".btn-generate").prop("disabled", false).find("span").text(
        game.i18n.localize("AISCENEGEN.Generate")
      );
      html.find(".spinner").hide();
    }
  }

  _updateUI(html) {
    if (this._isGenerating) {
      html.find(".btn-generate").prop("disabled", true).find("span").text(
        game.i18n.localize("AISCENEGEN.Status.Generating")
      );
      html.find(".spinner").show();
      html.find(".btn-create-scene").prop("disabled", true);
      html.find(".btn-regenerate").prop("disabled", true);
    }
  }

  async _onCreateScene(html) {
    if (!this._previewUrl) return;

    const sceneName =
      html.find(".scene-name-input").val().trim() ||
      game.i18n.localize("AISCENEGEN.DefaultSceneName");

    const btn = html.find(".btn-create-scene");
    btn.prop("disabled", true).text(game.i18n.localize("AISCENEGEN.Status.CreatingScene"));

    try {
      const imagePath = await this._uploadImage(this._previewUrl, this._pendingFilename);
      await this._createScene(sceneName, imagePath);
      ui.notifications.info(
        game.i18n.format("AISCENEGEN.Status.SceneCreated", { name: sceneName })
      );
      this.close();
    } catch (err) {
      console.error(`${MODULE_ID} | Scene creation error:`, err);
      ui.notifications.error(`${game.i18n.localize("AISCENEGEN.Error.SceneFailed")}: ${err.message}`);
      btn.prop("disabled", false).text(game.i18n.localize("AISCENEGEN.CreateScene"));
    }
  }

  async _uploadImage(dataUrl, filename) {
    const folder = AISceneGeneratorSettings.get("uploadFolder") || "ai-generated-scenes";

    // Ensure folder exists in user data
    try {
      await FilePicker.createDirectory("data", folder);
    } catch (e) {
      // Folder might already exist – that's fine
    }

    // Convert data URL to Blob / File
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

    // Switch to that scene in the sidebar
    scene.sheet.render(true);
    return scene;
  }
}
