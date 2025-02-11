/**
* Generate a (minimal) JSON-LD context file for the vocabulary
* (see the 'Vocab' interface).
*
* @packageDocumentation
*/
import { Vocab } from './common';
/**
 * Generate the minimal JSON-LD context for the vocabulary.
 *
 * @param vocab - The internal representation of the vocabulary
 * @returns - the full context in string (ready to be written to a file)
 */
export declare function toContext(vocab: Vocab): string;
