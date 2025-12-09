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
/** Suffix mapping to beautify options */
export type ConfigOptions = Record<string, number | boolean | string>;
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
export declare function getEditorConfigOptions(suffix: string): ConfigOptions;
/**
 * Beautify a text.
 *
 * @param content the text content for HTML, CSS, JS, etc.
 * @param suffix the suffix, used also as a discriminator in .editorconfig. Can be 'js', 'ts', 'json', 'jsonld', 'html', 'xhtml', 'css', or 'scss'
 * @param options see https://www.npmjs.com/package/js-beautify for possible options; these take precedence over the .editorconfig options, when applicable.
 * @returns formatted text
 */
export declare function beautify(content: string, suffix: string, options?: ConfigOptions): string;
