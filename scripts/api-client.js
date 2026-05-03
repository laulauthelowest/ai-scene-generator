/**
 * AI Image Generation API Client
 * Supports: OpenAI DALL-E 3, Stability AI, Replicate
 */

import { AISceneGeneratorSettings } from "./settings.js";

export class AIImageClient {
  /**
   * Generate an image and return a blob URL or base64 data URL.
   * @param {string} prompt  – Full prompt string (user prompt + style suffix)
   * @returns {Promise<{dataUrl: string, filename: string}>}
   */
  static async generate(prompt) {
    const provider = AISceneGeneratorSettings.get("apiProvider");
    const apiKey = AISceneGeneratorSettings.get("apiKey");

    if (!apiKey) {
      throw new Error(game.i18n.localize("AISCENEGEN.Error.NoApiKey"));
    }

    switch (provider) {
      case "openai":
        return this._generateOpenAI(prompt, apiKey);
      case "stability":
        return this._generateStability(prompt, apiKey);
      case "replicate":
        return this._generateReplicate(prompt, apiKey);
      default:
        throw new Error(`Unknown provider: ${provider}`);
    }
  }

  // ─── OpenAI DALL-E 3 ─────────────────────────────────────────────────────

  static async _generateOpenAI(prompt, apiKey) {
    const size = AISceneGeneratorSettings.get("imageSize");
    // DALL-E 3 only supports specific sizes
    const dalleSizes = ["1024x1024", "1792x1024", "1024x1792"];
    const resolvedSize = dalleSizes.includes(size) ? size : "1792x1024";

    const response = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "dall-e-3",
        prompt,
        n: 1,
        size: resolvedSize,
        response_format: "b64_json",
      }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err?.error?.message ?? `OpenAI API error ${response.status}`);
    }

    const data = await response.json();
    const b64 = data.data[0].b64_json;
    return {
      dataUrl: `data:image/png;base64,${b64}`,
      filename: `scene_${Date.now()}.png`,
    };
  }

  // ─── Stability AI ─────────────────────────────────────────────────────────

  static async _generateStability(prompt, apiKey) {
    const response = await fetch(
      "https://api.stability.ai/v2beta/stable-image/generate/core",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          Accept: "image/*",
        },
        body: (() => {
          const fd = new FormData();
          fd.append("prompt", prompt);
          fd.append("output_format", "png");
          fd.append("aspect_ratio", "16:9");
          return fd;
        })(),
      }
    );

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err?.message ?? `Stability AI error ${response.status}`);
    }

    const blob = await response.blob();
    return {
      dataUrl: await this._blobToDataUrl(blob),
      filename: `scene_${Date.now()}.png`,
    };
  }

  // ─── Replicate ────────────────────────────────────────────────────────────

  static async _generateReplicate(prompt, apiKey) {
    const model = AISceneGeneratorSettings.get("replicateModel");

    // Start prediction
    const startResponse = await fetch("https://api.replicate.com/v1/models/" + model + "/predictions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        input: {
          prompt,
          aspect_ratio: "16:9",
          output_format: "png",
          num_outputs: 1,
        },
      }),
    });

    if (!startResponse.ok) {
      const err = await startResponse.json().catch(() => ({}));
      throw new Error(err?.detail ?? `Replicate API error ${startResponse.status}`);
    }

    const prediction = await startResponse.json();

    // Poll for completion
    const imageUrl = await this._pollReplicate(prediction.urls.get, apiKey);

    // Fetch image as blob so we can upload it to Foundry
    const imgResponse = await fetch(imageUrl);
    if (!imgResponse.ok) throw new Error("Failed to download generated image.");
    const blob = await imgResponse.blob();

    return {
      dataUrl: await this._blobToDataUrl(blob),
      filename: `scene_${Date.now()}.png`,
    };
  }

  static async _pollReplicate(statusUrl, apiKey, maxAttempts = 60) {
    for (let i = 0; i < maxAttempts; i++) {
      await new Promise((r) => setTimeout(r, 2000)); // wait 2s between polls

      const res = await fetch(statusUrl, {
        headers: { Authorization: `Bearer ${apiKey}` },
      });

      if (!res.ok) throw new Error(`Replicate poll error ${res.status}`);
      const data = await res.json();

      if (data.status === "succeeded") {
        return data.output[0];
      } else if (data.status === "failed" || data.status === "canceled") {
        throw new Error(`Replicate prediction ${data.status}: ${data.error ?? ""}`);
      }
      // still processing – loop
    }
    throw new Error("Replicate prediction timed out after 2 minutes.");
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────

  static _blobToDataUrl(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }
}
