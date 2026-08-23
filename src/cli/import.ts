import path from "node:path";
import fs from "node:fs";
import { ConfigSchema, Configuration } from "@/schemas/ConfigSchema.js";
import { BaseAgent } from "@/structure/BaseAgent.js";
import { logger } from "@/utils/logger.js";
import { ExtendedClient } from "@/structure/core/ExtendedClient.js";

export const command = "import <filename>";
export const desc = "Import a config file for instant setup";
export const builder = {
    filename: {
        type: "string",
        demandOption: true,
        description: "The name of the config file to import",
    },
    account: {
        type: "string",
        alias: "a",
        description: "Which account key to use, if the file has more than one (e.g. b2ki-ados/data.json)",
    },
};

export const handler = async (argv: { filename: string; account?: string }) => {
    const filePath = path.resolve(process.cwd(), argv.filename);

    if (!fs.existsSync(filePath)) {
        logger.error(`File ${filePath} does not exist.`);
        return;
    }

    if (path.extname(filePath) !== ".json") {
        logger.error(`File ${filePath} is not a JSON file!`);
        return;
    }

    let config: Configuration;
    try {
        const configData = fs.readFileSync(filePath, "utf-8");
        const parsed = JSON.parse(configData);

        // The file can either be a flat config object (a standalone export), or the
        // app's own multi-account b2ki-ados/data.json format (an object keyed by
        // account, each value a full config). Try flat first, then fall back to the
        // keyed format. Neither path ever prompts, so this stays safe to run
        // non-interactively (e.g. on a host like Render with no terminal to answer one).
        const flatResult = ConfigSchema.safeParse(parsed);
        if (flatResult.success) {
            config = flatResult.data;
        } else {
            const validEntries: { key: string; data: Configuration }[] = [];
            for (const key of Object.keys(parsed)) {
                const result = ConfigSchema.safeParse(parsed[key]);
                if (result.success) validEntries.push({ key, data: result.data });
            }

            if (argv.account) {
                const match = validEntries.find(entry => entry.key === argv.account);
                if (!match) {
                    throw new Error(`No valid account "${argv.account}" found in ${filePath}. Available: ${validEntries.map(e => e.key).join(", ") || "none"}`);
                }
                config = match.data;
                logger.info(`Using account "${match.key}" from ${filePath}`);
            } else if (validEntries.length === 1) {
                config = validEntries[0].data;
                logger.info(`Using account "${validEntries[0].key}" from ${filePath}`);
            } else if (validEntries.length > 1) {
                throw new Error(`File ${filePath} has ${validEntries.length} accounts (${validEntries.map(e => e.key).join(", ")}). Re-run with --account <key> to pick one.`);
            } else {
                throw new Error(`Invalid configuration: ${flatResult.error.message}`);
            }
        }

        logger.info("Configuration imported successfully");

        const client = new ExtendedClient();
        try {
            await client.checkAccount(config.token);
            await BaseAgent.initialize(client, config);
        } catch (error) {
            logger.error("Failed to start bot with imported configuration:");
            logger.error(error as Error);
        }
    } catch (error) {
        logger.error("Error importing configuration:");
        logger.error(error as Error);
        process.exit(1);
    }
};
