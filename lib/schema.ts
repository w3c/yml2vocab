/**
 * Import the YAML file, validate against a JSON schema, and return the data as an object.
 *
 * @packageDocumentation
 */

import { parser, type ValidationError as VError }            from '@exodus/schemasafe';
import * as yaml                                             from 'yaml';
import type { RawVocab, ValidationError, ValidationResults } from './common';

/**
 * Perform a JSON Schema validation on the YAML content. Done by converting the YAML content into
 * a Javascript object (using the YAML parser) and checking the object against a schema.
 *
 * @param yaml_raw_content The raw textual content of the YAML file (i.e, presumably after reading the file itself)
 * @returns
 */
export function validateWithSchema(yaml_raw_content: string): ValidationResults {
    try {
        // Get the JSON schema; see below
        const schema = JSON.parse(vocabSchema);

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
                error: errors ?? [],
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

/**
 * The schema itself...
 */
const vocabSchema = `{
    "$id": "https://github.com/w3c/yml2vocab/lib/schema",
    "$schema": "https://json-schema.org/draft/2019-09/schema",
    "$comment": "This schema depends on JSON Schema draft-2019-09 version",
    "title": "Schema for the vocabulary definition using YAML",
    "description": "See https://w3c.github.io/yml2vocab for a human readable version of the format.",
    "type": "object",
    "additionalProperties": false,
    "properties": {
        "json_ld" : {
            "title": "JSON-LD specific settings",
            "type" : "object",
            "properties" : {
                "alias" : {
                    "type": "object",
                    "additionalProperties" : {
                        "type": "string",
                        "enum" : ["@direction", "@graph", "@id", "@included", "@index", "@json", "@language", "@list", "@nest", "@none", "@reverse", "@set", "@type", "@value"]
                    }
                },
                "import" : {
                    "$ref" : "#/$defs/URIOrArrayOfURIs"
                },
                "unevaluatedProperties": false
            }
        },

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
                            },
                            "container": {
                                "type" : "string",
                                "enum" : ["set", "list", "graph"]
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
        },

        "datatype" : {
            "title": "Definition of datatypes",
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
                "defined_by": {
                    "$ref": "#/$defs/URIOrArrayOfURIs"
                },
                "see_also": {
                    "$ref": "#/$defs/SeeAlso"
                },
                "upper_value": {
                    "$ref": "#/$defs/StringOrArrayOfStrings"
                },
                "type": {
                    "$ref": "#/$defs/StringOrArrayOfStrings"
                },
                "deprecated": {
                    "type": "boolean"
                },
                "status" : {
                    "type": "string",
                    "enum": ["stable", "reserved", "deprecated"]
                },
                "known_as": {
                    "type": "string"
                },
                "external": {
                    "type": "boolean"
                },
                "example": {
                    "$ref": "#/$defs/ExampleUnion"
                },
                "context": {
                    "$ref": "#/$defs/Context"
                }
            },
            "required": [
                "id"
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

        "URIOrArrayOfURIs": {
            "description": "Some of the URI values may be arrays or single URIs, hence this utility schema",
            "oneOf": [
                {
                    "type": "string",
                    "format": "uri"
                },
                {
                    "type": "array",
                    "items": {
                        "type": "string",
                        "format": "uri"
                    }
                }
            ]
        },

        "ExampleElement": {
            "title" : "A single example block, with an optional label",
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
            "title" : "Ontology properties",
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
                },
                "context": {
                    "type": "string",
                    "format": "uri"
                }
            },
            "required": [
                "id",
                "value"
            ]
        },

        "OneContext": {
            "description": "A single context setting",
            "oneOf": [
                {
                    "type": "string",
                    "format": "uri"
                },
                {
                    "type": "string",
                    "enum": ["vocab", "none"]
                }
            ]
        },

        "Context": {
            "description": "Contexts can be one or several, hence this utility schema",
            "oneOf": [
                {
                    "$ref": "#/$defs/OneContext"
                },
                {
                    "type": "array",
                    "items": {
                        "$ref": "#/$defs/OneContext"
                    }
                }
            ]
        }
    }
}`;

