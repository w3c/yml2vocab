/**
 * Convert the internal representation of the vocabulary into JSONType-LD
 * (see the 'Vocab' interface).
 *
 * @packageDocumentation
 */
import { type Vocab } from './common';
/**
 * Generate the JSON-LD representation of the vocabulary.
 *
 * The function does not generate JSON-LD directly; instead, a standard JS object
 * is generated and the built-in JSON serializer takes care of the idiosyncrasies of
 * the JSON syntax.
 *
 * @param vocab - The internal representation of the vocabulary
 * @returns
 */
export declare function toJSONLD(vocab: Vocab): string;
