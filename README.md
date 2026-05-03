# AI Scene Generator – Foundry VTT Module

A Foundry VTT module that generates AI images on demand and automatically creates new scenes with the generated image as a background.

## Features

- 🎨 **Flexible prompts** – write any description you want
- 🖌️ **9 art styles** – D&D Fantasy, Comic, Realistic, Video Game, Artistic, Dark Horror, Watercolor, Sci-Fi, or None
- 🔌 **Multiple AI providers** – OpenAI DALL-E 3, Stability AI, or Replicate (FLUX / SDXL)
- 🗺️ **One-click scene creation** – generated image is uploaded and set as scene background automatically
- 🌍 **English & German** UI

## Installation

### Via Manifest URL (recommended)

1. In Foundry VTT, go to **Add-on Modules → Install Module**
2. Paste the manifest URL into the field at the bottom:
   ```
   https://raw.githubusercontent.com/laulauthelowest/ai-scene-generator/main/module.json
   ```
3. Click **Install**

## Setup

1. **Enable** the module in your world under *Manage Modules*
2. Open **Game Settings → Configure Settings → Module Settings → AI Scene Generator**
3. Choose your **API Provider**
4. Enter your **API Key**
5. Optionally adjust image size and upload folder

### Getting an API Key

| Provider | Where to get it | Approximate cost |
|---|---|---|
| **OpenAI (DALL-E 3)** | [platform.openai.com](https://platform.openai.com/api-keys) | ~$0.04 per image |
| **Stability AI** | [platform.stability.ai](https://platform.stability.ai/account/keys) | ~$0.03 per image |
| **Replicate** | [replicate.com/account/api-tokens](https://replicate.com/account/api-tokens) | ~$0.003–0.01 per image (FLUX Schnell) |

## Usage

1. Open the **Scenes** directory in the sidebar
2. Click the **🪄 KI-Szene / AI Scene** button in the header
3. Write your prompt
4. Select an optional art style
5. Give the scene a name (optional)
6. Click **Generate Image** and wait
7. Preview the result, regenerate if you don't like it
8. Click **Create Scene** – done!

## File Structure

```
ai-scene-generator/
├── module.json
├── scripts/
│   ├── main.js         ← entry point, registers hooks
│   ├── dialog.js       ← UI dialog with style picker
│   ├── api-client.js   ← API calls (OpenAI / Stability / Replicate)
│   └── settings.js     ← module settings registration
├── styles/
│   └── ai-scene-generator.css
├── templates/
│   └── dialog.hbs
└── lang/
    ├── en.json
    └── de.json
```

## Compatibility

- Foundry VTT v12–v14
- Requires GM privileges to use

## License

MIT – free to use and modify.
