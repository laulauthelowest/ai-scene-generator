/**
 * Module Settings
 */

const MODULE_ID = "ai-scene-generator";

export class AISceneGeneratorSettings {
  static register() {
    // API Provider
    game.settings.register(MODULE_ID, "apiProvider", {
      name: game.i18n.localize("AISCENEGEN.Settings.ApiProvider"),
      hint: game.i18n.localize("AISCENEGEN.Settings.ApiProviderHint"),
      scope: "world",
      config: true,
      type: String,
      choices: {
        openai: "OpenAI (DALL-E 3)",
        stability: "Stability AI",
        replicate: "Replicate (FLUX / SDXL)",
      },
      default: "openai",
      onChange: () => {},
    });

    // API Key
    game.settings.register(MODULE_ID, "apiKey", {
      name: game.i18n.localize("AISCENEGEN.Settings.ApiKey"),
      hint: game.i18n.localize("AISCENEGEN.Settings.ApiKeyHint"),
      scope: "world",
      config: true,
      type: String,
      default: "",
    });

    // Replicate Model (only used when provider = replicate)
    game.settings.register(MODULE_ID, "replicateModel", {
      name: game.i18n.localize("AISCENEGEN.Settings.ReplicateModel"),
      hint: game.i18n.localize("AISCENEGEN.Settings.ReplicateModelHint"),
      scope: "world",
      config: true,
      type: String,
      default: "black-forest-labs/flux-schnell",
    });

    // Image Size
    game.settings.register(MODULE_ID, "imageSize", {
      name: game.i18n.localize("AISCENEGEN.Settings.ImageSize"),
      hint: game.i18n.localize("AISCENEGEN.Settings.ImageSizeHint"),
      scope: "world",
      config: true,
      type: String,
      choices: {
        "1024x1024": "1024×1024 (Square)",
        "1792x1024": "1792×1024 (Landscape)",
        "1024x1792": "1024×1792 (Portrait)",
      },
      default: "1792x1024",
    });

    // Upload Folder
    game.settings.register(MODULE_ID, "uploadFolder", {
      name: game.i18n.localize("AISCENEGEN.Settings.UploadFolder"),
      hint: game.i18n.localize("AISCENEGEN.Settings.UploadFolderHint"),
      scope: "world",
      config: true,
      type: String,
      default: "ai-generated-scenes",
      filePicker: false,
    });
  }

  static get(key) {
    return game.settings.get(MODULE_ID, key);
  }
}
