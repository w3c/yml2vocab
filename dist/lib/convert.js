"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.get_data = void 0;
const common_1 = require("./common");
const yaml = require("yaml");
/************************************************ Helper functions and constants **********************************/
/**
 * Just a shorthand to make the code more readable... Checking whether a string can be considered as a URL
 *
 * @param value
 * @returns
 * @internal
 */
const isURL = (value) => {
    try {
        new URL(value);
        return true;
    }
    catch (e) {
        return false;
    }
};
/**
 * These prefixes are added no matter what; they are not vocabulary specific
 *
 * @internal
 */
const default_prefixes = [
    {
        prefix: "dc",
        url: "http://purl.org/dc/terms/",
    },
    {
        prefix: "owl",
        url: "http://www.w3.org/2002/07/owl#",
    },
    {
        prefix: "rdf",
        url: "http://www.w3.org/1999/02/22-rdf-syntax-ns#"
    },
    {
        prefix: "rdfs",
        url: "http://www.w3.org/2000/01/rdf-schema#"
    },
    {
        prefix: "xsd",
        url: "http://www.w3.org/2001/XMLSchema#"
    }
];
/**
 * These ontology properties are added no matter what; they are not vocabulary specific
 * @internal
 */
const default_ontology_properties = [
    {
        property: "dc:date",
        value: (new Date()).toISOString().split('T')[0],
        url: false
    }
];
;
/**
 * Although the YAML parsing is declared to produce a RawVocabEntry, it in fact does not
 * (e.g., some entries should be converted into arrays even if the YAML source has only a single item).
 * This function does some basic conversion for all the types, to make the processing later a bit simpler.
 *
 * @param raw entry as it comes from the YAML parser
 * @returns a "real" RawVocabEntry instance
 * @internal
 */
function finalize_raw_entry(raw) {
    // Some entries are to be put into an array, even if there is only one item
    const toArray = (val) => {
        if (val === undefined) {
            return undefined;
        }
        else if (val.length === 0) {
            return undefined;
        }
        else if (typeof val === "string") {
            return [val];
        }
        else {
            return val;
        }
    };
    // The "toSeeAlso" structure needs some special treatment and should also be turned into an array
    const toSeeAlso = (val) => {
        if (val === undefined) {
            return undefined;
        }
        else if (Array.isArray(val) && val.length === 0) {
            return undefined;
        }
        else {
            if (Array.isArray(val)) {
                return val.map((raw) => {
                    return {
                        label: raw.label,
                        url: raw.url
                    };
                });
            }
            else {
                return [{
                        label: val.label,
                        url: val.url
                    }];
            }
        }
    };
    // In some cases the YAML parser puts an extra `\n` character at the end of the comment line,
    // this is removed
    const clean_comment = (val) => {
        let final = val.endsWith('\n') ? val.slice(0, -1) : val;
        if (final.endsWith('"') && final.startsWith('"')) {
            final = final.slice(1, -1);
        }
        if (final.endsWith("'") && final.startsWith("'")) {
            final = final.slice(1, -1);
        }
        return final;
    };
    return {
        id: (raw.id) ? raw.id : "Vocabulary definition error: no ID provided.",
        property: raw.property,
        value: raw.value,
        label: (raw.label) ? raw.label : "Vocabulary definition error: no label provided.",
        upper_value: toArray(raw.upper_value),
        domain: toArray(raw.domain),
        range: toArray(raw.range),
        deprecated: (raw.deprecated === undefined) ? false : raw.deprecated,
        comment: (raw.comment) ? clean_comment(raw.comment) : "",
        see_also: toSeeAlso(raw.see_also),
    };
}
/**
 * Run the entry finalization function through all entries in the vocabulary
 * as parsed from YAML
 *
 * @param raw
 * @returns
 */
function finalize_raw_vocab(raw) {
    // Check whether the required entries (vocab and ontology) are present
    if (raw.vocab === undefined) {
        throw ("No 'vocab' section in the vocabulary specification.");
    }
    if (raw.ontology === undefined) {
        throw ("No 'ontology' section in the vocabulary specification.");
    }
    // It is perfectly fine if the vocab is not encoded as an array in YAML
    if (!Array.isArray(raw.vocab))
        raw.vocab = [raw.vocab];
    return {
        vocab: raw.vocab.map(finalize_raw_entry),
        prefix: raw.prefix?.map(finalize_raw_entry),
        ontology: raw.ontology?.map(finalize_raw_entry),
        class: raw.class?.map(finalize_raw_entry),
        property: raw.property?.map(finalize_raw_entry),
        individual: raw.individual?.map(finalize_raw_entry),
    };
}
/******************************************* External entry point **********************************/
/**
 * Parse and interpret the YAML file's raw content. This is, essentially, just translation of the
 * YAML file structure into the its internal equivalent representation with only a very few changes.
 * See the interface definition of 'RawVocabEntry' for the details.
 *
 * The result is ephemeral, in the sense that it is then immediately transformed into a proper internal
 * representation of the vocabulary using the `Vocab` interface. This is done
 * in a separate function for a better readability of the code.
 *
 * @param vocab_source YAML file content
 * @returns
 */
function get_data(vocab_source) {
    const vocab_yml = yaml.parse(vocab_source);
    const vocab = finalize_raw_vocab(vocab_yml);
    // Convert all the raw structures into their respective internal representations for 
    // prefixes, ontology properties, classes, etc.
    // Get the extra prefixes and combine them with the defaults. Note that the 'vocab' category
    // should be added to the list, too, but it needs a special treatment (eg, it is
    // explicitly displayed in the HTML output), hence these values are also stored globally.
    const prefixes = [
        ...vocab.vocab.map((raw) => {
            if (raw.id === undefined) {
                throw "The vocabulary has no prefix";
            }
            if (raw.value === undefined) {
                throw "The vocabulary has no identifier";
            }
            common_1.global.vocab_prefix = raw.id;
            common_1.global.vocab_url = raw.value;
            return {
                prefix: raw.id,
                url: raw.value,
            };
        }),
        ...((vocab["prefix"] && vocab["prefix"].length > 0)
            ? vocab["prefix"].map((raw) => {
                return {
                    prefix: raw.id,
                    url: (raw.value) ? raw.value : "UNDEFINED PREFIX VALUE",
                };
            })
            : []),
        ...default_prefixes
    ];
    // Get the ontology properties. Note that there are also default ontology properties
    // that are added to what the YAML input provides
    const ontology_properties = [
        ...vocab.ontology.map((raw) => {
            return {
                property: (raw.property) ? raw.property : "UNDEFINED ONTOLOGY PROPERTY",
                value: (raw.value) ? raw.value : "UNDEFINED PROPERTY VALUE",
                url: (raw.value) ? isURL(raw.value) : false,
            };
        }),
        ...default_ontology_properties,
    ];
    // Get the classes. Note the special treatment for deprecated classes...
    const classes = (vocab.class !== undefined) ?
        vocab.class.map((raw) => {
            const types = (raw.deprecated) ? ["rdfs:Class", "owl:DeprecatedClass"] : ["rdfs:Class"];
            return {
                id: raw.id,
                type: types,
                label: raw.label,
                comment: raw.comment,
                deprecated: raw.deprecated,
                subClassOf: raw.upper_value,
                see_also: raw.see_also,
            };
        }) : [];
    // Get the classes. Note the special treatment for deprecated properties, as well as 
    // the extra owl types added depending on the range
    const properties = (vocab.property !== undefined) ?
        vocab.property.map((raw) => {
            const types = (raw.deprecated) ? ["rdf:Property", "owl:DeprecatedProperty"] : ["rdfs:Property"];
            let range = raw.range;
            if (range && range.length > 0) {
                if (range.length === 1 && (range[0].toUpperCase() === "IRI" || range[0].toUpperCase() === "URL")) {
                    types.push("owl:ObjectProperty");
                    range = [];
                }
                else {
                    let isDTProperty = true;
                    for (const rg of range) {
                        if (rg.startsWith("xsd") === false) {
                            isDTProperty = false;
                            break;
                        }
                    }
                    if (isDTProperty)
                        types.push("owl:DatatypeProperty");
                }
            }
            return {
                id: raw.id,
                type: types,
                label: raw.label,
                comment: raw.comment,
                deprecated: raw.deprecated,
                subPropertyOf: raw.upper_value,
                see_also: raw.see_also,
                range: range,
                domain: raw.domain,
            };
        }) : [];
    // Get the individuals. Note that, in this case, the 'type' value may be a full array of types provided in the YAML file
    const individuals = (vocab.individual !== undefined) ?
        vocab.individual.map((raw) => {
            return {
                id: raw.id,
                label: raw.label,
                comment: raw.comment,
                deprecated: raw.deprecated,
                type: (raw.upper_value !== undefined) ? raw.upper_value : [],
                see_also: raw.see_also,
            };
        }) : [];
    return { prefixes, ontology_properties, classes, properties, individuals };
}
exports.get_data = get_data;
