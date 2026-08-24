import path from "node:path";
import fs from "node:fs";
import { spawn } from "node:child_process";
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
        description: "Which single account key to run. If omitted and the file has more than one account, ALL of them are launched as isolated child processes.",
    },
};

// Pipes a child process stream line-by-line into the parent's output, prefixed with
// the account key, so a multi-account log stream stays readable (e.g. on Render).
const pipeWithPrefix = (stream: NodeJS.ReadableStream, prefix: string, out: NodeJS.WritableStream) => {
    let buffer = "";
    stream.on("data", (chunk: Buffer) => {
        buffer += chunk.toString();
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) out.write(`[${prefix}] ${line}\n`);
    });
    stream.on("end", () => {
        if (buffer) out.write(`[${prefix}] ${buffer}\n`);
    });
};

// Launches one account in its own isolated Node process (re-invoking this same
// entrypoint with --account <key>). Isolation matters because some critical-event
// paths in the bot call process.exit() directly (e.g. on a ban, or running out of
// money) - if every account shared one process, one account hitting that would kill
// every other account too. A separate process per account contains the blast radius
// to that one account, and PORT is stripped so only the parent binds Render's health-
// check port.
const spawnAccount = (scriptPath: string, filename: string, key: string) => {
    const useTsx = scriptPath.endsWith(".ts");
    const command = useTsx ? "npx" : process.execPath;
    const args = useTsx
        ? ["tsx", scriptPath, "import", filename, "--account", key]
        : [scriptPath, "import", filename, "--account", key];

    const childEnv = { ...process.env };
    delete childEnv.PORT;

    const child = spawn(command, args, { env: childEnv, cwd: process.cwd() });
    pipeWithPrefix(child.stdout!, key, process.stdout);
    pipeWithPrefix(child.stderr!, key, process.stderr);

    child.on("exit", (code, signal) => {
        logger.warn(`[${key}] process exited (code=${code}, signal=${signal}). It will stay stopped until this service restarts.`);
    });

    return child;
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
        // keyed format. No path here ever prompts, so this stays safe to run
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
                // Multiple accounts and no --account given: launch every account as its
                // own child process instead of picking one. This process becomes a
                // supervisor - it does not log in anywhere itself.
                logger.info(`Found ${validEntries.length} accounts in ${filePath}: ${validEntries.map(e => e.key).join(", ")}`);
                logger.info("Starting one isolated process per account...");

                for (const entry of validEntries) {
                    spawnAccount(process.argv[1], argv.filename, entry.key);
                }

                logger.info(`All ${validEntries.length} account processes started. This supervisor process will keep running to host them.`);
                return;
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
