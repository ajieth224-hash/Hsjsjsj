import { ConfigSchema, Configuration } from "@/schemas/ConfigSchema.js";

import { DataManager } from "./DataManager.js";

/**
 * Manages application configuration data, providing methods to load, retrieve, update, and delete configuration entries.
 * 
 * The `ConfigManager` class interacts with a `DataManager` to persist configuration data and uses a schema (`ConfigSchema`)
 * to validate configuration objects. All configuration entries are stored in-memory and changes are automatically saved.
 *
 * @example
 * const manager = new ConfigManager();
 * manager.set('user123', { enabled: true });
 * const config = manager.get('user123');
 * manager.delete('user123');
 *
 * @remarks
 * - All configuration values are validated against `ConfigSchema` before being stored.
 * - Changes are persisted immediately after set or delete operations.
 *
 * @public
 */
export class ConfigManager {
    private dataManager = new DataManager();
    private configs: Record<string, Configuration> = {};

    constructor() {
        this.loadAll();
    }

    private loadAll = () => {
        const data = this.dataManager.read();
        for (const key in data) {
            const result = ConfigSchema.safeParse(data[key]);
            if (result.success) {
                this.configs[key] = result.data;
            }
        }
    }

    public getAllKeys = (): string[] => {
        return Object.keys(this.configs);
    }

    public get = (key: string): Configuration | undefined => {
        return this.configs[key];
    }

    public set = (key: string, value: Configuration): void => {
        const result = ConfigSchema.safeParse(value);
        if (!result.success) {
            throw new Error(`Invalid configuration for key "${key}": ${result.error.message}`);
        }
        this.configs[key] = result.data;
        this.saveAll();
    }

    public delete = (key: string): boolean => {
        if (this.configs[key]) {
            delete this.configs[key];
            this.saveAll();
            return true;
        }
        return false;
    }

    private saveAll = (): void => {
        this.dataManager.write(this.configs);
    }
}