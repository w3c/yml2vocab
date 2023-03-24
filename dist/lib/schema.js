"use strict";
/**
 * Import the YAML file, validate against a JSON schema, and return the data as an object...
 *
 * @packageDocumentation
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateWithSchema = void 0;
const _2019_1 = require("ajv/dist/2019");
const ajv_formats_1 = require("ajv-formats");
const yaml = require("yaml");
const schema = require('./vocab.schema.json');
/**
 * Perform a JSON Schema validation on the YAML content. Done by converting the YAML content into
 * a Javascript object (using the YAML parser) and checking the object against a schema.
 *
 * @param yaml_raw_content The raw textual content of the YAML file (i.e, presumably after reading the file itself)
 * @returns
 */
function validateWithSchema(yaml_raw_content) {
    try {
        const yaml_content = yaml.parse(yaml_raw_content);
        const ajv = new _2019_1.default({ allErrors: true, verbose: true });
        (0, ajv_formats_1.default)(ajv);
        if (!ajv.validate(schema, yaml_content)) {
            // Simplify the error messages of Ajv, this schema is way too simple to need the
            // full complexity of those;
            const simple_errors = ajv.errors.map((e) => {
                return {
                    message: (e.message) ? e.message : undefined,
                    params: e.params,
                    data: (e.data) ? e.data : undefined,
                };
            });
            return {
                vocab: null,
                error: simple_errors
            };
        }
        else {
            return {
                vocab: yaml_content,
                error: []
            };
        }
    }
    catch (e) {
        // This is the case if the yaml parser throws some errors
        return {
            vocab: null,
            error: [{ message: `${e}` }]
        };
    }
}
exports.validateWithSchema = validateWithSchema;
