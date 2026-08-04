import { defineConfig } from "@vite-pwa/assets-generator/config";

const iconBackground = "#040609";

export default defineConfig({
  headLinkOptions: {
    preset: "2023",
  },
  preset: {
    transparent: {
      sizes: [64, 192, 512],
      padding: 0,
      resizeOptions: {
        fit: "contain",
        background: iconBackground,
      },
      favicons: [[48, "favicon.ico"]],
    },
    maskable: {
      sizes: [512],
      padding: 0,
      resizeOptions: {
        fit: "contain",
        background: iconBackground,
      },
    },
    apple: {
      sizes: [180],
      padding: 0,
      resizeOptions: {
        fit: "contain",
        background: iconBackground,
      },
    },
    png: {
      compressionLevel: 9,
      quality: 100,
    },
  },
  images: ["public/ritodo-icon.svg"],
});
