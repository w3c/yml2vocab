/**
 * Convert the raw YAML description of the vocabulary into an internal representation.
 *
 * @packageDocumentation
 */
import { Vocab } from './common';
/******************************************* External entry point **********************************/
/**
 * Parse and interpret the YAML file's raw content. This is, essentially, a translation of the
 * YAML file structure into its internal equivalent representation with only a very few changes.
 * See the interface definition of {@link RawVocabEntry} for the details.
 *
 * The result is ephemeral, in the sense that it is then immediately transformed into a proper internal
 * representation of the vocabulary using the {@link Vocab} interface. This is done
 * in a separate function for a better readability of the code.
 *
 * @param vocab_source YAML file content (reading in the file must be done beforehand)
 * @returns
 *
 * @throws {ValidationError} Error in the schema validation or when parsing the YAML content
 */
export declare function getData(vocab_source: string): Vocab;
