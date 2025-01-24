/**
 * Import the YAML file, validate against a JSON schema, and return the data as an object.
 *
 * @packageDocumentation
 */
const SCHEMA_STRING = "vocab.schema.json";

import { parser, ValidationError as VError }            from '@exodus/schemasafe';
import * as yaml                                        from 'yaml';
import { RawVocab, ValidationError, ValidationResults } from './common';
import * as fs                                          from "node:fs";
import * as path                                        from "node:path";
import * as url                                         from "node:url";

// Unfortunately, I could not do this (so far) so that both deno and node
// would accept this code. Sigh...
function getSchemaFileName() {
    const dirname = (() => {
        // If this is Deno FROM HERE
        // const __filename = url.fileURLToPath(import.meta.url);
        // return path.dirname(__filename);
        // UNTIL HERE

        // if this is Node.js FROM HERE
        return path.dirname(module.filename);
        // UNTIL HERE
    })();
    return path.join(dirname, SCHEMA_STRING);
}

/**
 * Perform a JSON Schema validation on the YAML content. Done by converting the YAML content into 
 * a Javascript object (using the YAML parser) and checking the object against a schema.
 * 
 * @param yaml_raw_content The raw textual content of the YAML file (i.e, presumably after reading the file itself)
 * @returns 
 */
export function validateWithSchema(yaml_raw_content: string): ValidationResults {
    try {
        // Get the JSON schema from the separate file
        const schema = JSON.parse(fs.readFileSync(getSchemaFileName(), "utf8"));

        // deno-lint-ignore no-explicit-any
        const yaml_content :any = yaml.parse(yaml_raw_content);

        const parse = parser(schema, {
            mode: "default",
            includeErrors: true,
            allErrors: true,
            requireStringValidation: false
        });
        const result = parse(JSON.stringify(yaml_content));

        if (result.valid !== true) {
            const errors = result.errors?.map((e: VError): ValidationError => {
                return {
                    message: `Error at ${e.instanceLocation}: ${e.keywordLocation}`,
                }
            })
            return {
                vocab: null,
                error: errors ?? [], //errors ? errors : [],
            };
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
