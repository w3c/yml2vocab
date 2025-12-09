/**
 * Convert the internal representation of the vocabulary into HTML
 * (see the 'Vocab' interface).
 *
 * @packageDocumentation
 */
import type { Vocab } from './common';
/**
 * Generate the HTML representation of the vocabulary, based on an HTML template file. The
 * template file is parsed to create a DOM, which is manipulated using the standard
 * DOM calls before stored.
 *
 * The template files have element with a predefined `@id` value at all points where some
 * content must be added. Ie, the usual model in the code below is:
 *
 * ```javascript
 * const some_element = document.getElementById('properties');
 * manipulate the subtree at 'some_element' to add content
 * ```
 *
 * @param vocab - The internal representation of the vocabulary
 * @param template_text - The textual content of the template file
 * @returns
 */
export declare function toHTML(vocab: Vocab, template_text: string, basename: string): string;
