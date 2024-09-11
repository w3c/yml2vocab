"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getData = void 0;
/**
 * Convert the raw YAML description of the vocabulary into an internal representation
 * (see the 'Vocab' interface).
 *
 * @packageDocumentation
 */
const common_1 = require("./common");
const common_2 = require("./common");
const common_3 = require("./common");
const schema_1 = require("./schema");
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
    catch (_e) {
        return false;
    }
};
/**
 * Turn the label text into a non-camel case
 *
 * @param str
 * @param separator
 * @returns
 */
function localeUnCamelise(str, separator = ' ') {
    const isLocaleUpperCase = (char) => {
        return char[0] === char.toLocaleUpperCase();
    };
    if (str.length === 0) {
        return str;
    }
    else {
        // First character is ignored; it can be upper or lower case
        const retval = [str.charAt(0)];
        for (let i = 1; i < str.length; i++) {
            const char = str.charAt(i);
            if (isLocaleUpperCase(char)) {
                // Got to the camel's hump
                retval.push(separator);
                retval.push(char.toLocaleLowerCase());
            }
            else {
                retval.push(char);
            }
        }
        // The first character must be capitalized:
        retval[0] = retval[0].toLocaleUpperCase();
        return retval.join('');
    }
}
/********************************************************************************/
/**
 * These prefixes are added no matter what; they are not vocabulary specific
 *
 * @internal
 */
const defaultPrefixes = [
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
    },
    {
        prefix: "vs",
        url: "http://www.w3.org/2003/06/sw-vocab-status/ns#"
    },
    {
        prefix: "schema",
        url: "http://schema.org/"
    },
    {
        prefix: "jsonld",
        url: "http://www.w3.org/ns/json-ld#"
    }
];
/**
 * These ontology properties are added no matter what; they are not vocabulary specific
 * @internal
 */
const defaultOntologyProperties = [
    {
        property: "dc:date",
        value: (new Date()).toISOString().split('T')[0],
        url: false
    }
];
/**
 * Although the YAML parsing is declared to produce a RawVocabEntry, it in fact does not
 * (e.g., some entries should be converted into arrays even if the YAML source has only a single item).
 * This function does some basic conversion for all the types, to make the processing later a bit simpler.
 *
 * @param raw entry as it comes from the YAML parser
 * @returns a "real" RawVocabEntry instance
 * @internal
 */
function finalizeRawEntry(raw) {
    // Some entries are to be put into an array, even if there is only one item
    const toArray = (val) => {
        if (val === undefined) {
            return undefined;
        }
        else if (val.length === 0) {
            return [];
        }
        else if (typeof val === "string") {
            return [val];
        }
        else {
            return val;
        }
    };
    // Almost like to array, except that instead of undefined a real default value is returned
    const toArrayContexts = (val) => {
        if (val === undefined) {
            return ["vocab"];
        }
        else if (val.length === 0) {
            return ["vocab"];
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
    // The "toExample" structure needs some special treatment and should also be turned into an array
    const toExample = (val) => {
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
                        json: raw.json
                    };
                });
            }
            else {
                return [{
                        label: val.label,
                        json: val.json
                    }];
            }
        }
    };
    // In some cases the YAML parser puts an extra `\n` character at the end of the comment line,
    // this is removed
    const cleanComment = (val) => {
        let final = val.endsWith('\n') ? val.slice(0, -1) : val;
        if (final.endsWith('"') && final.startsWith('"')) {
            final = final.slice(1, -1);
        }
        if (final.endsWith("'") && final.startsWith("'")) {
            final = final.slice(1, -1);
        }
        return final;
    };
    // The deprecation flag, as a separate value, is kept also for reasons of backward compatibility,
    // but this makes the interpretation of the value(s) in the vocabulary a bit awkward. Later version
    // (maybe even next version) would remove the deprecated flag from existing vocabularies, ie,
    // switch to status, and all this will go away.
    const { status, deprecated } = (() => {
        if (raw.status !== undefined) {
            return {
                status: raw.status,
                deprecated: raw.status === common_1.Status.deprecated
            };
        }
        else if (raw.deprecated != undefined) {
            return {
                status: raw.deprecated ? common_1.Status.deprecated : common_1.Status.reserved,
                deprecated: raw.deprecated
            };
        }
        else {
            return {
                status: common_1.Status.stable,
                deprecated: false
            };
        }
    })();
    const label = ((str) => {
        if (str) {
            return str;
        }
        else if (raw.id && raw.id.length > 0) {
            return localeUnCamelise(raw.id);
            // return raw.id[0].toLocaleUpperCase() + raw.id.substring(1);
        }
        else {
            return "";
        }
    })(raw.label);
    return {
        id: (raw.id) ? raw.id : "",
        property: raw.property,
        value: raw.value,
        label: label,
        upper_value: toArray(raw.upper_value),
        type: toArray(raw.type),
        domain: toArray(raw.domain),
        range: toArray(raw.range),
        deprecated: deprecated,
        defined_by: toArray(raw.defined_by) ?? [],
        status: status,
        comment: (raw.comment) ? cleanComment(raw.comment) : "",
        see_also: toSeeAlso(raw.see_also),
        example: toExample(raw.example),
        dataset: (raw.dataset === undefined) ? false : raw.dataset,
        context: toArrayContexts(raw.context)
    };
}
/**
 * Run the entry finalization function through all entries in the vocabulary
 * as parsed from YAML
 *
 * @param raw
 * @returns
 */
function finalizeRawVocab(raw) {
    // Check whether the required entries (vocab and ontology) are present
    if (raw.vocab === undefined) {
        throw (new Error("No 'vocab' section in the vocabulary specification."));
    }
    if (raw.ontology === undefined) {
        throw (new Error("No 'ontology' section in the vocabulary specification."));
    }
    // It is perfectly fine if the vocab is not encoded as an array in YAML
    if (!Array.isArray(raw.vocab))
        raw.vocab = [raw.vocab];
    return {
        vocab: raw.vocab.map(finalizeRawEntry),
        prefix: raw.prefix?.map(finalizeRawEntry),
        ontology: raw.ontology?.map(finalizeRawEntry),
        class: raw.class?.map(finalizeRawEntry),
        property: raw.property?.map(finalizeRawEntry),
        individual: raw.individual?.map(finalizeRawEntry),
        datatype: raw.datatype?.map(finalizeRawEntry),
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
 *
 * @throws {ValidationError} Error in the schema validation or when parsing the YAML content
 */
function getData(vocab_source) {
    const validation_results = (0, schema_1.validateWithSchema)(vocab_source);
    if (validation_results.vocab === null) {
        const error = JSON.stringify(validation_results, null, 4);
        throw (new TypeError(`JSON Schema validation error`, { cause: error }));
    }
    const vocab = finalizeRawVocab(validation_results.vocab);
    // Establish the final context reference(s), if any, for a term.
    // As a side effect, the 'inverse' info, ie, the list of terms per context, is
    // created in the global data structure
    const final_contexts = (raw) => {
        if (raw.context === undefined)
            return [];
        // replace the value of "vocab" by the global context, then
        // get the possible "none" out of the way.
        const contexts = raw.context.map((val) => {
            if (val === "vocab") {
                // The global context may not have been set...
                return common_2.global.vocab_context !== undefined ? common_2.global.vocab_context : "none";
            }
            else {
                return val;
            }
        }).filter((val) => val !== "none");
        // Make sure that all entries are unique before returning it
        const ctx_s = [...new Set(contexts)];
        // 'Inverse' info: add the term reference to the global data
        for (const ctx of ctx_s) {
            if (ctx in common_2.global.context_mentions === false) {
                common_2.global.context_mentions[ctx] = [];
            }
            common_2.global.context_mentions[ctx].push(raw.id);
        }
        return ctx_s;
    };
    // Calculates cross references from properties to classes or datatypes; used
    // to make the cross references for the property ranges and domains
    // @param raw: raw entry for the class or datatype
    // @param refs: the range or domain array of the property
    // @return: whether the class/datatype is indeed in the range of the property
    const crossref = (raw, property, refs, single_ref, multi_ref) => {
        if (refs) {
            // Remove the (possible) namespace reference from the CURIE
            const pure_refs = refs.map((range) => {
                const terms = range.split(':');
                return terms.length === 1 ? range : terms[1];
            });
            if (pure_refs.length !== 0 && pure_refs.indexOf(raw.id) !== -1) {
                (pure_refs.length === 1 ? single_ref : multi_ref).push(property.id);
                return true;
            }
        }
        return false;
    };
    // Convert all the raw structures into their respective internal representations for 
    // prefixes, ontology properties, classes, etc.
    // Get the extra prefixes and combine them with the defaults. Note that the 'vocab' category
    // should be added to the list, too, but it needs a special treatment (eg, it is
    // explicitly displayed in the HTML output), hence these values are also stored globally.
    const prefixes = [
        ...vocab.vocab.map((raw) => {
            if (raw.id === undefined) {
                throw (new Error("The vocabulary has no prefix"));
            }
            if (raw.value === undefined) {
                throw (new Error("The vocabulary has no identifier"));
            }
            common_2.global.vocab_prefix = raw.id;
            common_2.global.vocab_url = raw.value;
            common_2.global.vocab_context = raw.context === undefined ? undefined : raw.context[0];
            if (common_2.global.vocab_context) {
                common_2.global.context_mentions[common_2.global.vocab_context] = [];
            }
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
        ...defaultPrefixes
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
        ...defaultOntologyProperties,
    ];
    // Get the properties. Note the special treatment for deprecated properties, as well as 
    // the extra owl types added depending on the range
    const properties = (vocab.property !== undefined) ?
        vocab.property.map((raw) => {
            const user_type = (raw.type === undefined) ? [] : raw.type;
            const types = [
                ...(raw.status === common_1.Status.deprecated) ? ["rdf:Property", "owl:DeprecatedProperty"] : ["rdf:Property"],
                ...user_type
            ];
            // Calculate the number of entries in various categories
            // The conditional assignment is actually unnecessary per the earlier processing,
            // but the deno typescript checker complains...
            common_2.global.status_counter.add(raw.status ? raw.status : common_1.Status.stable);
            let range = raw.range;
            if (range && range.length > 0) {
                if (range.length === 1 && (range[0].toUpperCase() === "IRI" || range[0].toUpperCase() === "URL")) {
                    types.push("owl:ObjectProperty");
                    range = undefined;
                }
                else {
                    let isDTProperty = true;
                    for (const rg of range) {
                        if (!(rg.startsWith("xsd") === true || common_3.EXTRA_DATATYPES.find((entry) => entry === rg) !== undefined)) {
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
                user_type: user_type,
                label: raw.label,
                comment: raw.comment,
                deprecated: raw.deprecated,
                defined_by: raw.defined_by,
                status: raw.status,
                subPropertyOf: raw.upper_value,
                see_also: raw.see_also,
                range: range,
                domain: raw.domain,
                example: raw.example,
                dataset: raw.dataset,
                context: final_contexts(raw),
            };
        }) : [];
    // Get the classes. Note the special treatment for deprecated classes and the location of relevant domains and ranges
    const classes = (vocab.class !== undefined) ?
        vocab.class.map((raw) => {
            const user_type = (raw.type === undefined) ? [] : raw.type;
            const types = [
                ...(raw.status === common_1.Status.deprecated) ? ["rdfs:Class", "owl:DeprecatedClass"] : ["rdfs:Class"],
                ...user_type
            ];
            const range_of = [];
            const domain_of = [];
            const included_in_domain_of = [];
            const includes_range_of = [];
            // Calculate the number of entries in various categories
            // The conditional assignment is actually unnecessary per the earlier processing,
            // but the deno typescript checker complains...
            common_2.global.status_counter.add(raw.status ? raw.status : common_1.Status.stable);
            // Get all domain/range cross references
            for (const property of properties) {
                crossref(raw, property, property.range, range_of, includes_range_of);
                crossref(raw, property, property.domain, domain_of, included_in_domain_of);
            }
            return {
                id: raw.id,
                type: types,
                user_type: user_type,
                label: raw.label,
                comment: raw.comment,
                deprecated: raw.deprecated,
                defined_by: raw.defined_by,
                status: raw.status,
                subClassOf: raw.upper_value,
                see_also: raw.see_also,
                example: raw.example,
                context: final_contexts(raw),
                range_of, domain_of, included_in_domain_of, includes_range_of
            };
        }) : [];
    // Get the individuals. Note that, in this case, the 'type' value may be a full array of types provided in the YAML file
    const individuals = (vocab.individual !== undefined) ?
        vocab.individual.map((raw) => {
            // In the former version the user's type was done via the upper_value property, which was not clean
            // the current version has a separate type attribute, but the upper_value should also be used for backward compatibility
            // To be sure, an extra action below is necessary to make sure there are no repeated entries.
            const type = [
                ...(raw.type !== undefined) ? raw.type : [],
                ...(raw.upper_value !== undefined) ? raw.upper_value : []
            ];
            return {
                id: raw.id,
                label: raw.label,
                comment: raw.comment,
                deprecated: raw.deprecated,
                defined_by: raw.defined_by,
                status: raw.status,
                type: [...new Set(type)],
                see_also: raw.see_also,
                example: raw.example,
                context: final_contexts(raw),
            };
        }) : [];
    // Get the datatypes. 
    const datatypes = (vocab.datatype !== undefined) ?
        vocab.datatype.map((raw) => {
            // In the former version the user's type was done via the upper_value property, which was not clean
            // the current version has a separate type attribute, but the upper_value should also be used for backward compatibility
            // To be sure, an extra action below is necessary to make sure there are no repeated entries.
            const type = [
                ...(raw.type !== undefined) ? raw.type : [],
                ...(raw.upper_value !== undefined) ? raw.upper_value : []
            ];
            const range_of = [];
            const includes_range_of = [];
            // Get the range cross-references
            for (const property of properties) {
                const is_dt_property = crossref(raw, property, property.range, range_of, includes_range_of);
                if (is_dt_property) {
                    // a bit convoluted, but trying to avoid repeating the extra entry
                    property.type = [...((new Set(property.type)).add('owl:DatatypeProperty'))];
                }
            }
            return {
                id: raw.id,
                subClassOf: (raw.upper_value !== undefined) ? raw.upper_value : [],
                label: raw.label,
                comment: raw.comment,
                deprecated: raw.deprecated,
                defined_by: raw.defined_by,
                status: raw.status,
                type: [...new Set(type)],
                see_also: raw.see_also,
                example: raw.example,
                context: final_contexts(raw),
                range_of, includes_range_of
            };
        }) : [];
    return { prefixes, ontology_properties, classes, properties, individuals, datatypes };
}
exports.getData = getData;
