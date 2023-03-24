"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateWithSchema = void 0;
// import Ajv from 'ajv';
const _2019_1 = require("ajv/dist/2019");
const ajv_formats_1 = require("ajv-formats");
const yaml = require("yaml");
// const sch = require('./vocab.schema.json');
// console.log(sch);
/**
 * @internal
 */
function get_schema() {
    console.log(__filename);
    return {};
}
// const sch = get_schema();
const schema = {
    "$id": "https://github.com/w3c/yml2vocab/lib/schema",
    "$comment": "This schema depends on JSON Schema draft-2019-09 version",
    "title": "Schema for the vocabulary definition using YAML",
    "description": "See https://w3c.github.io/yml2vocab for a human readable version of the format.",
    "type": "object",
    "additionalProperties": false,
    "properties": {
        "vocab": {
            "title": "Vocabulary setting",
            "anyOf": [
                {
                    "type": "array",
                    "items": {
                        "$ref": "#/$defs/Vocab"
                    }
                },
                {
                    "$ref": "#/$defs/Vocab"
                }
            ]
        },
        "prefix": {
            "title": "Prefix settings",
            "anyOf": [
                {
                    "type": "array",
                    "items": {
                        "$ref": "#/$defs/Vocab"
                    }
                },
                {
                    "$ref": "#/$defs/Vocab"
                }
            ]
        },
        "ontology": {
            "title": "Ontology properties' settings",
            "type": "array",
            "items": {
                "$ref": "#/$defs/Ontology"
            }
        },
        "class": {
            "title": "Class definitions",
            "$comment": "The use of 'unevaluatedProperties' is the schema 2019 idiom to disallow additional properties.",
            "type": "array",
            "items": {
                "type": "object",
                "allOf": [
                    {
                        "$ref": "#/$defs/CommonTerm"
                    }
                ],
                "unevaluatedProperties": false
            }
        },
        "property": {
            "title": "Property definitions",
            "$comment": "The use of 'unevaluatedProperties' is the schema 2019 idiom to disallow additional properties.",
            "type": "array",
            "items": {
                "type": "object",
                "allOf": [
                    {
                        "$ref": "#/$defs/CommonTerm"
                    },
                    {
                        "type": "object",
                        "properties": {
                            "domain": {
                                "$ref": "#/$defs/StringOrArrayOfStrings"
                            },
                            "range": {
                                "$ref": "#/$defs/StringOrArrayOfStrings"
                            },
                            "dataset": {
                                "type": "boolean"
                            }
                        }
                    }
                ],
                "unevaluatedProperties": false
            }
        },
        "individual": {
            "title": "Definitions of individuals",
            "$comment": "The use of 'unevaluatedProperties' is the schema 2019 idiom to disallow additional properties.",
            "type": "array",
            "items": {
                "type": "object",
                "allOf": [
                    {
                        "$ref": "#/$defs/CommonTerm"
                    }
                ],
                "unevaluatedProperties": false
            }
        }
    },
    "required": [
        "vocab",
        "ontology"
    ],
    "$defs": {
        "CommonTerm": {
            "title": "Common root for classes, properties, and individuals.",
            "type": "object",
            "properties": {
                "id": {
                    "type": "string"
                },
                "label": {
                    "type": "string"
                },
                "comment": {
                    "type": "string"
                },
                "see_also": {
                    "$ref": "#/$defs/SeeAlso"
                },
                "upper_value": {
                    "$ref": "#/$defs/StringOrArrayOfStrings"
                },
                "deprecated": {
                    "type": "boolean"
                },
                "example": {
                    "$ref": "#/$defs/ExampleUnion"
                }
            },
            "required": [
                "comment",
                "id",
                "label"
            ]
        },
        "StringOrArrayOfStrings": {
            "description": "Most of the string values may be arrays or single strings, hence this utility schema",
            "oneOf": [
                {
                    "type": "string"
                },
                {
                    "type": "array",
                    "items": {
                        "type": "string"
                    }
                }
            ]
        },
        "ExampleElement": {
            "title": "A single example block, with an optional label",
            "type": "object",
            "additionalProperties": false,
            "properties": {
                "label": {
                    "type": "string"
                },
                "json": {
                    "type": "string"
                }
            },
            "required": [
                "json"
            ]
        },
        "ExampleUnion": {
            "description": "Examples may be arrays or single objects, hence this utility schema",
            "anyOf": [
                {
                    "type": "array",
                    "items": {
                        "$ref": "#/$defs/ExampleElement"
                    }
                },
                {
                    "$ref": "#/$defs/ExampleElement"
                }
            ]
        },
        "SeeAlso": {
            "description": "'seeAlso' blocks may be arrays or single objects, hence this utility schema",
            "anyOf": [
                {
                    "type": "array",
                    "items": {
                        "$ref": "#/$defs/OneSeeAlso"
                    }
                },
                {
                    "$ref": "#/$defs/OneSeeAlso"
                }
            ]
        },
        "OneSeeAlso": {
            "$comment": "The AJV implementation does not seem to understand the format='uri' constraint, although that should be used here...",
            "type": "object",
            "additionalProperties": false,
            "properties": {
                "label": {
                    "type": "string"
                },
                "url": {
                    "type": "string",
                    "format": "uri"
                }
            },
            "required": [
                "label",
                "url"
            ]
        },
        "Ontology": {
            "title": "Ontology properties",
            "type": "object",
            "additionalProperties": false,
            "properties": {
                "property": {
                    "type": "string"
                },
                "value": {
                    "type": "string"
                }
            },
            "required": [
                "property",
                "value"
            ]
        },
        "Vocab": {
            "type": "object",
            "additionalProperties": false,
            "properties": {
                "id": {
                    "type": "string"
                },
                "value": {
                    "type": "string",
                    "format": "uri"
                }
            },
            "required": [
                "id",
                "value"
            ]
        }
    }
};
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
