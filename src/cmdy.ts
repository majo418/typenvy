import { EnvData, parseValue } from "./index";

export type Awaitable<T> = Promise<T> | PromiseLike<T> | T

export interface InputValidator {
    name: string;
    validate: (value: any) => Awaitable<any | undefined>;
}
export declare type FlagValueTypes = "string" | "number" | "boolean" | InputValidator;

export function isTypeOf(value: any, types: string[]) {
    for (const type of types) {
        if (typeof value == type) {
            return true
        }
    }
    return false
}

export interface Flag {
    name: string;
    description: string;
    displayName?: string;
    required?: boolean;
    default?: string | number | boolean;
    types?: FlagValueTypes[];
    shorthand?: string;
    alias?: string[];
    control?: (value: string) => Awaitable<string>;
    exe?: (cmd: any, value: string) => Awaitable<void>;
    exePriority?: number;
    multiValues?: boolean;
}
export interface BoolFlag extends Flag {
    types?: undefined
    control?: undefined
    default?: undefined
    required?: undefined
    multiValues?: undefined
}
export interface ValueFlag extends Flag {
    types: FlagValueTypes[]
}

export function cmdyFlag<F extends ValueFlag | BoolFlag>(
    flag: F,
    envKey: string,
    envData: EnvData<any>,
    ignoreErrors: boolean = false,
): F {
    let des: string = flag.description
    if (envData.defaultEnv[envKey] != undefined) {
        des += " (default: '" + envData.defaultEnv[envKey] + "', "
    } else {
        des += " ("
    }
    des += "ENV: '" + envKey + "')"

    return {
        ...flag,
        description: des,
        async exe(cmd, value: any) {
            value = parseValue(
                value,
                envData.types[envKey]
            )
            if (value == undefined) {
                if (Array.isArray(flag.types)) {
                    value = envData.defaultEnv[envKey]
                    value = parseValue(
                        value,
                        envData.types[envKey]
                    )
                    if (!isTypeOf(value, flag.types as string[])) {
                        value = flag.default
                        value = parseValue(
                            value,
                            envData.types[envKey]
                        )
                        if (!isTypeOf(value, flag.types as string[])) {
                            value = undefined
                        }
                    }
                } else {
                    value = envData.defaultEnv[envKey]
                    value = parseValue(
                        value,
                        envData.types[envKey]
                    )
                    if (typeof value != "boolean") {
                        value = flag.default
                        value = parseValue(
                            value,
                            envData.types[envKey]
                        )
                        if (typeof value != "boolean") {
                            value = undefined
                        } else {
                            value = !value
                        }
                    } else {
                        value = !value
                    }
                }
            }
            if (value == undefined) {
                if (!ignoreErrors) {
                    throw new Error(
                        "The flag '" +
                        flag.name +
                        "' is not type of '" +
                        envData.types[envKey].map(
                            (c) => c.type
                        ).join("', '") +
                        "'\nValue:\n" + JSON.stringify(value, null, 2)
                    )
                }
            }
            if (Array.isArray(envData.env[envKey])) {
                if (Array.isArray(value)) {
                    envData.env[envKey] = [
                        ...envData.env[envKey],
                        ...value,
                    ]
                } else {
                    envData.env[envKey].push(value)
                }
            } else if (flag.multiValues) {
                throw new Error(
                    "The flag '" +
                    flag.name +
                    "' is a multiValues but env value is not an array!"
                )
            } else {
                envData.env[envKey] = value
            }
            if (flag.exe) {
                await flag.exe(cmd, value)
            }
        }
    }
}
