/**
 * Creates a proxy around a configuration object to watch for property changes.
 *
 * @template T - The type of the configuration object.
 * @template U - The return type of the callback function.
 * @param config - The configuration object to be watched.
 * @param callback - A function that is called whenever a property on the config object is set to a new value.
 * The callback receives the property key, the old value, and the new value as arguments.
 * @returns A proxied version of the configuration object that triggers the callback on property changes.
 */
export const watchConfig = <T extends object, U>(config: T, callback: (key: keyof T, oldValue: T[keyof T], value: T[keyof T]) => U) => {
    return new Proxy(config, {
        set(target, property, value) {
            if (typeof property === "string" && property in target) {
                const key = property as keyof T;
                if (target[key] !== value) callback(key, target[key], value);
                (target as any)[key] = value;
                return true;
            }
            return false;
        },
        get(target, property) {
            if (typeof property === "string" && property in target) {
                const key = property as keyof T;
                return target[key];
            }
            return undefined;
        }
    })
}