import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Dreamer",
    short_name: "Dreamer",
    description: "Help a real person with a real, verified need in Nigeria.",
    start_url: "/discover",
    display: "standalone",
    background_color: "#fbf7f0",
    theme_color: "#0e5e4e",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml" }],
  };
}
