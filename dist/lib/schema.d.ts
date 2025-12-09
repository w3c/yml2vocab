/**
 * Import the YAML file, validate against a JSON schema, and return the data as an object.
 *
 * @packageDocumentation
 */
import type { ValidationResults } from './common';
/**
 * Perform a JSON Schema validation on the YAML content. Done by converting the YAML content into
 * a Javascript object (using the YAML parser) and checking the object against a schema.
 *
 * @param yaml_raw_content The raw textual content of the YAML file (i.e, presumably after reading the file itself)
 * @returns
 */
export declare function validateWithSchema(yaml_raw_content: string): ValidationResults;
