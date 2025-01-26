/**
 * Convert the internal representation of the vocabulary into turtle
 * (see the 'Vocab' interface).
 *
 * @packageDocumentation
 */
import { Vocab } from './common';
/**
 * Generate the Turtle representation of the vocabulary.
 * Nothing complex, just a straightforward conversion of the information into the turtle syntax.
 *
 * @param vocab - The internal representation of the vocabulary
 * @returns
 * @async
 */
export declare function toTurtle(vocab: Vocab): string;
