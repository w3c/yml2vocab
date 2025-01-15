/**
 * Import the YAML file, validate against a JSON schema, and return the data as an object.
 * 
 * @packageDocumentation
 */

import Ajv2019, { ErrorObject}                          from 'ajv/dist/2019';
import addFormats                                       from 'ajv-formats';
import * as yaml                                        from 'yaml';
import { RawVocab, ValidationError, ValidationResults } from './common';

// Yeah, it is ugly to use require, but importing a json file is still an issue for TS
// At some point we can simply import a json file
const schema = require('./vocab.schema.json');

/**
 * Perform a JSON Schema validation on the YAML content. Done by converting the YAML content into 
 * a Javascript object (using the YAML parser) and checking the object against a schema.
 * 
 * @param yaml_raw_content The raw textual content of the YAML file (i.e, presumably after reading the file itself)
 * @returns 
 */
export function validateWithSchema(yaml_raw_content: string): ValidationResults {
    try {
        const yaml_content :any = yaml.parse(yaml_raw_content);
        const ajv = new Ajv2019({allErrors: true, verbose: true});
        addFormats(ajv);

        if (!ajv.validate(schema, yaml_content)) {
            // Simplify the error messages of Ajv, this schema is way too simple to need the
            // full complexity of those;
            const simple_errors = ajv.errors.map((e: ErrorObject): ValidationError => {
                return {
                    message: (e.message) ? e.message : undefined,
                    params: e.params,
                    data: (e.data) ? e.data : undefined,
                }
            });
            return {
                vocab: null,
                error: simple_errors,
            }
        } else {
            return {
                vocab: yaml_content as RawVocab,
                error: []
            }
        }
    } catch(e) {
        // This is the case if the yaml parser throws some errors
        return {
            vocab: null,
            error: [{message: `${e}`}]
        }
    }
}
