import { checkbox, confirm, input, select, Separator } from "@inquirer/prompts";

type InquirerPrompt<TValue, TOptions> = (options: TOptions) => Promise<TValue>;

/**
 * Abstract base class for creating interactive command-line prompts.
 * 
 * Provides utility methods for common prompt types such as confirmation, input, single selection, and multiple selection.
 * Designed to be extended by concrete prompter implementations.
 * 
 * @template TValue The type of value returned by the prompt.
 * @template TOptions The type of options accepted by the prompt.
 * 
 * @method ask
 * Prompts the user with a custom prompt function and options.
 * Optionally displays documentation before prompting.
 * 
 * @method trueFalse
 * Prompts the user with a yes/no (boolean) confirmation.
 * 
 * @method getInput
 * Prompts the user for a string input, with optional default value, validation, and documentation.
 * 
 * @method getSelection
 * Prompts the user to select a single value from a list of choices.
 * 
 * @method getMultipleSelection
 * Prompts the user to select multiple values from a list of choices.
 */
export abstract class BasePrompter {
    constructor() { }

    protected ask = <TValue, TOptions>(
        prompt: InquirerPrompt<TValue, TOptions>,
        options: TOptions,
        doc?: string
    ): Promise<TValue> => {
        console.clear();
        if (doc) console.log(doc);
        return prompt(options);
    }

    public trueFalse = (
        message: string,
        defaultValue: boolean = true
    ): Promise<boolean> =>
        this.ask(confirm, {
            message,
            default: defaultValue,
        });

    public getInput = (
        message: string,
        defaultValue?: string,
        validate?: (input: string) => boolean | string,
        documentation?: string
    ): Promise<string> =>
        this.ask(input, {
            message,
            default: defaultValue,
            validate,
        }, documentation);

    public getSelection = <T>(
        message: string,
        choices: Array<{ name: string; value: T; disabled?: boolean | string } | Separator>,
        defaultValue?: T,
        documentation?: string
    ): Promise<T> =>
        this.ask(select<T>, {
            message,
            choices,
            default: defaultValue,
        }, documentation);

    public getMultipleSelection = <T>(
        message: string,
        choices: Array<{ name: string; value: T; checked?: boolean }>,
        defaultValue?: T[],
        documentation?: string
    ): Promise<T[]> =>
        this.ask(checkbox<T>, {
            message,
            choices,
            default: defaultValue,
        }, documentation);
}