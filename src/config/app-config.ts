import packageJson from "../../package.json";

const currentYear = new Date().getFullYear();

export const APP_CONFIG = {
  name: "Minto",
  version: packageJson.version,
  copyright: `© ${currentYear}, Minto.`,
  meta: {
    title: "Minto",
    description:
      "Minto turns rough instructions into clear, reusable prompts with local rules or optional online enhancement.",
  },
};
