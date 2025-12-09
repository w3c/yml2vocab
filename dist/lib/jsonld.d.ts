/**
 * Convert the internal representation of the vocabulary into JSON-LD
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
 * There is one neat trick in the generated code: the JSON-LD code, usually,
 * becomes very complicated if the structure is not a tree. This problem is handled here
 * by the repeated usage of reverse properties that put, in the JSON sense,
 * the vocabulary itself on the top, linked to the individual terms via a
 * (reversed) rdfs:isDefinedBy. (See the definition of the 'rdfs_classes',
 * 'rdfs_properties', and 'rdfs_instances'). Thanks to Gregg Kellogg for that trick...
 *
 * @param vocab - The internal representation of the vocabulary
 * @returns
 */
export declare function toJSONLD(vocab: Vocab): string;
