/**
 * Beautifying HTML, JS/JSON, or CSS content. A thin layer on top of [js-beautify](https://www.npmjs.com/package/js-beautify),
 * geared towards Typescript usage. Its usage is twofold:
 *
 * 1. It provides a unified interface that works both for Deno and Node.js, overcoming the issues between the two on how modules are handled
 * 2. The js-beautify is combined with options coming from .editorconfig (if available).
 *
 * Note: js-beautify refers to editorconfig, as if it understood its options, but it did not work for me. Hence this layer.
 *
 * @module
 */


import * as jsBeautify    from 'js-beautify';
import * as path          from 'node:path';
import * as process       from 'node:process';
import * as editorconfig  from 'editorconfig';

/** Suffix mapping to beautify options */
export type ConfigOptions  = Record<string, number | boolean | string>;

/** The function that must be used, at the end, to beautify the string representation of data. */
type BeautyFunction = (content: string, options: ConfigOptions | undefined) => string;

/**
 * Get a beautification function depending on a file suffix.
 * It is internally tricky, because it takes into account the differences
 * in Typescript when handling Deno/ESM and Node.js/CommonJS module systems.
 * (otherwise it does not work for js-beautify...)
 *
 * Give honor to whom honor is due: this trick comes from VSCode's AI Chat, relying, I believe, on Claude.
 *
 * @param suffix
 * @returns
 */
function getBeautify(suffix: string): BeautyFunction  {
    type BeautifyModule = typeof jsBeautify & { default?: typeof jsBeautify; };
    const b = (jsBeautify as BeautifyModule).default || jsBeautify;

    switch( suffix ) {
        case "js":
        case "ts":
        case "json":
        case "jsonld":
            return b.js;
        case "html":
        case "xhtml":
            return b.html;
        case "css":
        case "scss":
            return b.css;
        default :
            throw new Error(`Unknown suffix for js-beautify: ${suffix}`);
    }
}

/**
 * Mapping from suffix to configuration options. Used to cache
 * the configuration options by suffixes
 */
const configOptions: Record<string, ConfigOptions> = {};

/**
 * Get a js-beautify option object extracted from editorconfig files.
 *
 * There is an extra trick: options objects for a specific suffix are cached
 * internally; this avoids fetching data from the disc several times.
 * (In reality, because these are tiny files, the difference is minor, so
 * it may be unnecessary, but it just hurts my feeling to do it
 * otherwise😀.)
 *
 * @param suffix
 * @returns
 */
function getEditorConfigOptions(suffix: string): ConfigOptions {
    if (configOptions[suffix] !== undefined) {
        return configOptions[suffix];
    } else {
        const filepath = path.join(process.cwd(), `dummy.${suffix}`);
        const config = editorconfig.parseSync(filepath);
        // Convert editorconfig settings to js-beautify options
        // The number of relevant options from .editorconfig is surprisingly low. I may have
        // missed some...
        const output: ConfigOptions = {
            max_preserve_newlines: 2,
            indent_with_tabs : (config.indent_style === 'tab'),
            end_with_newline : (config.insert_final_newline === true),
            indent_size      : (config.indent_size && typeof config.indent_size === 'number' ? config.indent_size : 4),
            wrap_line_length : (config.max_line_length && typeof config.max_line_length === 'number' ? config.max_line_length : 0)
        };
        configOptions[suffix] = output
        return output;
    }
}

/**
 * Beautify a text.
 *
 * @param content the text content for HTML, CSS, JS, etc.
 * @param suffix the suffix, used also as a discriminator in .editorconfig. Can be 'js', 'ts', 'json', 'jsonld', 'html', 'xhtml', 'css', or 'scss'
 * @param options see https://www.npmjs.com/package/js-beautify for possible options; these take precedence over the .editorconfig options, when applicable.
 * @returns formatted text
 */
export function beautify(content: string, suffix: string, options: ConfigOptions = {}): string {
    const beautifyFunction: BeautyFunction = getBeautify(suffix);
    const editorConfigOptions = getEditorConfigOptions(suffix);
    const final_options       = { ...editorConfigOptions, ...options };
    return beautifyFunction(content, final_options);
}
