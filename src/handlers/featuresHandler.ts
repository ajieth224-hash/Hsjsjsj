import path from "node:path";
import fs from "node:fs";

import { Schematic } from "@/structure/Schematic.js";
import { logger } from "@/utils/logger.js";
import { importDefault } from "@/utils/import.js";
import { FeatureProps } from "@/typings/index.js";
import { Collection } from "discord.js-selfbot-v13";

export default Schematic.registerHandler({
	run: async ({ agent }) => {
		const featuresFolder = path.join(agent.rootDir, "features");
		const statDir = fs.statSync(featuresFolder);
		if (!statDir.isDirectory()) {
			logger.warn(`Features folder not found, creating...`);
			fs.mkdirSync(featuresFolder, { recursive: true });
		}

		for (const file of fs.readdirSync(featuresFolder)) {
			if (!file.endsWith(".js") && !file.endsWith(".ts")) {
				logger.warn(`Skipping non-JS/TS file: ${file}`);
				continue;
			}

			const filePath = path.join(featuresFolder, file);
			try {
				const feature = await importDefault<FeatureProps>(filePath);
				if (
					!feature
					|| typeof feature !== "object"
					|| !feature.name
					|| !feature.condition
					|| !feature.run
				) {
					logger.warn(`Invalid feature in ${filePath}, skipping...`);
					continue;
				}

				agent.features.set(feature.name, feature);
			} catch (error) {
				logger.error(`Error loading feature from ${filePath}:`);
				logger.error(error as Error);
			}
		}
	},
});
