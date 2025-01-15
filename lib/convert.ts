/**
 * Convert the raw YAML description of the vocabulary into an internal representation.
 *
 * @packageDocumentation
 */
import { RDFClass, RDFProperty, RDFIndividual, RDFPrefix, OntologyProperty, Vocab, Link, Status, Example, RDFDatatype } from './common';
import { RawVocabEntry, RawVocab, ValidationResults, global }                                                           from './common';
import { EXTRA_DATATYPES }                                                                                              from "./common";
import { validateWithSchema }                                                                                           from './schema';

/************************************************ Helper functions and constants **********************************/

/**
 * Just a shorthand to make the code more readable... Checking whether a string can be considered as a URL.
 * 
 * @param value 
 * @returns 
 * @internal
 */
const isURL = (value:string): boolean => {
    try {
        new URL(value);
        return true;
    } catch(_e) {
        return false;
    }
}

/**
 * Turn the label text into a non-camel case.
 * 
 * @param str 
 * @param separator 
 * @returns 
 */
function localeUnCamelise(str: string, separator = ' '): string {
    const isLocaleUpperCase = (char: string): boolean => {
        return char[0] === char.toLocaleUpperCase();
    };
    if (str.length === 0) {
        return str;
    } else {
        // First character is ignored; it can be upper or lower case
        const output: string[] = [str.charAt(0)];
        for (let i = 1; i < str.length; i++) {
            const char = str.charAt(i);
            if (isLocaleUpperCase(char)) {
                // Got to the camel's hump
                output.push(separator);
                output.push(char.toLocaleLowerCase());
            } else {
                output.push(char);
            }
        }
        // The first character must be capitalized:
        output[0] = output[0].toLocaleUpperCase();
        return output.join('');
    }
}

/********************************************************************************/

/**
 * These prefixes are added no matter what; they are not vocabulary specific,
 * but used in the vocabulary.
 * 
 * @internal
 */
const defaultPrefixes: RDFPrefix[] = [
    {
        prefix : "dc",
        url    : "http://purl.org/dc/terms/",
    },
    {
        prefix : "owl",
        url    : "http://www.w3.org/2002/07/owl#",
    },
    {
        prefix : "rdf",
        url    : "http://www.w3.org/1999/02/22-rdf-syntax-ns#"
    },
    {
        prefix : "rdfs",
        url    : "http://www.w3.org/2000/01/rdf-schema#"
    },
    {
        prefix : "xsd",
        url    : "http://www.w3.org/2001/XMLSchema#"
    },
    {
        prefix : "vs",
        url    : "http://www.w3.org/2003/06/sw-vocab-status/ns#"
    },
    {
        prefix : "schema",
        url    : "http://schema.org/"
    },
    {
        prefix : "jsonld",
        url    : "http://www.w3.org/ns/json-ld#"
    }
];


/**
 * These ontology properties are added no matter what; they are not vocabulary specific.
 *
 * @internal
 */
const defaultOntologyProperties: OntologyProperty[] = [
    {
        property : "dc:date",
        value    :  (new Date()).toISOString().split('T')[0],
        url      : false
    }
];


/**
 * Although the YAML parsing is declared to produce a {@link RawVocabEntry}, it in fact does not do it strictly
 * (e.g., some entries should be converted into arrays even if the YAML source has only a single item).
 * This function does some basic conversion for all the types, to make the processing later a bit simpler.
 * 
 * @param raw entry as it comes from the YAML parser; in fact a generic (javascript-like) object.
 * @returns a bona fide RawVocabEntry instance
 * @internal
 */
function finalizeRawEntry(raw: RawVocabEntry): RawVocabEntry {
    /* *************************** Bunch of helper functions to be used in the code below */

    // Some entries are to be put into an array, even if there is only one item; this ensures a uniform handling.
    const toArray = (val: undefined | string | string[]) : undefined | string[] => {
        if (val === undefined) {
            return undefined
        } else if (val.length === 0) {
            return []
        } else if ( typeof val === "string") {
            return [val]
        } else {
            return val
        }
    };

    // Almost like toArray, except that instead of undefined a real default value is returned.
    // "vocab" is the shorthand, in the YAML definition, to the context file defined as part of the
    // vocabulary heading.
    const toArrayContexts = (val: undefined | string | string[]): string[] => {
        if (val === undefined) {
            return ["vocab"];
        } else if (val.length === 0) {
            return ["vocab"];
        } else if (typeof val === "string") {
            return [val];
        } else {
            return val;
        }
    };

    // The "toSeeAlso" structure needs some special treatment and should also be turned into an array
    const toSeeAlso = (val: undefined | Link | Link[]) : undefined | Link[] => {
        if (val === undefined) {
            return undefined
        } else if (Array.isArray(val) && val.length === 0) {
            return undefined
        } else {
            if (Array.isArray(val)) {
                return val as Link[];
            } else {
                return [{
                    label : val.label,
                    url   : val.url
                }]
            }
        }
    }

    // The "toExample" structure needs some special treatment and should also be turned into an array
    const toExample = (val: undefined | Example | Example[]) : undefined | Example[] => {
        if (val === undefined) {
            return undefined
        } else if (Array.isArray(val) && val.length === 0) {
            return undefined
        } else {
            if (Array.isArray(val)) {
                return val as Example[];
            } else {
                return [{
                    label : val.label,
                    json  : val.json
                }]
            }
        }
    }

    // In some cases the YAML parser puts an extra `\n` character at the end of the comment line;
    // this is removed
    const cleanComment = (val: string): string => {
        let final = val.endsWith('\n') ? val.slice(0,-1):val;
        if (final.endsWith('"') && final.startsWith('"')) {
            final = final.slice(1,-1);
        }
        if (final.endsWith("'") && final.startsWith("'")) {
            final = final.slice(1,-1)
        }
        return final;
    }

    // The deprecation flag, as a separate value, is kept for reasons of backward compatibility,
    // but this makes the interpretation of the value(s) in the vocabulary a bit awkward. Later version
    // may remove the deprecated flag from existing vocabularies, i.e., switch to status altogether,
    // and all this will go away.
    const {status, deprecated} = ((): {status: Status, deprecated: boolean} => {
        if (raw.status !== undefined) {
            return { 
                status     : raw.status, 
                deprecated : raw.status === Status.deprecated
            }
        } else if (raw.deprecated != undefined) {
            return { 
                status     : raw.deprecated ? Status.deprecated : Status.reserved, 
                deprecated : raw.deprecated 
            }
        } else {
            return { 
                status     : Status.stable, 
                deprecated : false 
            }
        }
    })();

    // The official label should all ba lower case.
    const label = ((str: string|undefined): string => {
        if (str) {
            return str;
        } else if (raw.id && raw.id.length > 0) {
            return localeUnCamelise(raw.id);
            // return raw.id[0].toLocaleUpperCase() + raw.id.substring(1);
        } else {
            return "";
        }
    })(raw.label);

    return {
        id          : (raw.id) ? raw.id : "",
        property    : raw.property,
        value       : raw.value,
        label       : label,
        upper_value : toArray(raw.upper_value) as undefined | string[],
        type        : toArray(raw.type) as undefined | string[],
        domain      : toArray(raw.domain) as undefined | string[],
        range       : toArray(raw.range) as undefined | string[],
        deprecated  : deprecated,
        defined_by  : toArray(raw.defined_by) ?? [],
        status      : status,
        external    : raw.external,
        comment     : (raw.comment) ? cleanComment(raw.comment) : "",
        see_also    : toSeeAlso(raw.see_also),
        example     : toExample(raw.example),
        dataset     : (raw.dataset === undefined) ? false : raw.dataset,
        context     : toArrayContexts(raw.context)
    }
}

/**
 * Run the entry finalization function through all entries in the vocabulary
 * as parsed from YAML.
 * 
 * @param raw 
 * @returns 
 */
function finalizeRawVocab(raw: RawVocab) : RawVocab {
    // Check whether the required entries (vocab and ontology) are present
    if (raw.vocab === undefined) {
        throw(new Error("No 'vocab' section in the vocabulary specification."));
    }
    if (raw.ontology === undefined) {
        throw(new Error("No 'ontology' section in the vocabulary specification."));
    }

    // It is perfectly fine if the vocab is not encoded as an array in YAML
    if (!Array.isArray(raw.vocab)) raw.vocab = [raw.vocab];

    // The extra filter is used to keep the valid entries only. For example, an external
    // term without a clear definition must be ignored.
    const classes = raw.class?.map(finalizeRawEntry).filter((entry) => entry !== null)
    const property = raw.property?.map(finalizeRawEntry).filter((entry) => entry !== null);
    const individual = raw.individual?.map(finalizeRawEntry).filter((entry) => entry !== null)
    const datatypes = raw.datatype?.map(finalizeRawEntry).filter((entry) => entry !== null)

    return {
        vocab      : raw.vocab.map(finalizeRawEntry),
        prefix     : raw.prefix?.map(finalizeRawEntry),
        ontology   : raw.ontology?.map(finalizeRawEntry),
        class      : classes,
        property   : property,
        individual : individual,
        datatype   : datatypes,
    }
}

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
export function getData(vocab_source: string): Vocab {

    // Run the incoming YAML through a schema validation, and return the
    // generated object if everything is fine.
    const validation_results: ValidationResults = validateWithSchema(vocab_source);
    if (validation_results.vocab === null) {
        const error = JSON.stringify(validation_results.error, null, 4);
        throw(new TypeError(`JSON Schema validation error`, {cause: '\n' + error}));
    }
    // Clean up the raw vocab representation.
    const vocab: RawVocab = finalizeRawVocab(validation_results.vocab);

    /************************************** local utility methods *****************************************************/

    //
    // Reminder: there is a, initially empty, global structure, initialized in common.ts
    // These functions will also update that global structure when applicable

    // Establish the final context reference(s), if any, for a term.
    // As a side effect, the 'inverse' info, ie, the list of terms per context, is
    // created in the global data structure.
    // "curie" is the CURIE encoded id of the term, ie, namespace:name format.
    const final_contexts = (raw: RawVocabEntry, curie: string ): string[] => {
        if (raw.context === undefined) return [];

        // replace the value of "vocab" by the global context, then
        // get the possible "none" out of the way.
        const contexts = raw.context.map((val: string): string => {
            if (val === "vocab") {
                // The global context may not have been set per TypeScript... although this
                // function is invoked once that has been set already. Price to pay for
                // Typescript checking...
                return global.vocab_context !== undefined ? global.vocab_context : "none";
            } else {
                return val;
            }
        }).filter((val:string): boolean => val !== "none");
        
        // Make sure that all entries are unique before returning it
        const ctx_s = [...new Set(contexts)];

        // 'Inverse' info: add the term reference to the global data
        for (const ctx of ctx_s) {
            if (!(ctx in global.context_mentions)) {
                global.context_mentions[ctx] = [];
            }
            global.context_mentions[ctx].push(curie);
        }
        return ctx_s;
    }

    // Calculates cross-references from properties to classes or datatypes; used
    // to make the cross-references for the property ranges and domains
    // @param raw: raw entry for the class or datatype
    // @param refs: the range or domain array of the property
    // @return: whether the class/datatype is indeed in the range of the property
    const crossref = (raw: RawVocabEntry, property: RDFProperty, refs: undefined | string[], single_ref: string[], multi_ref: string[]): boolean => {
        if (refs) {
            // Remove the (possible) namespace reference from the CURIE
            const pure_refs = refs.map((range: string): string => {
                const terms = range.split(':');
                return terms.length === 1 ? range : terms[1];
            });
            if (pure_refs.length !== 0 && pure_refs.indexOf(raw.id) !== -1) {
                (pure_refs.length === 1 ? single_ref : multi_ref).push(property.id);
                return true;
            }
        }
        return false;
    }

    // Handling external terms, that are characterized by the fact that they are identified as a CURIE in
    // the YAML file. The prefix and the term must be separated.
    // To make the handling of all this uniform, the core term also get the (default) prefix stored in their
    // structure.
    const check_id = (raw: RawVocabEntry): { prefix: string,  id: string, external: boolean } => {
        // see if the id is a CURIE; it is then treated differently.

        // An error condition is also checked on the fly: if a term is not external, either
        // defined_by or comment should also be set
        const [prefix, value] = raw.id.split(":");

        const output = ((): { prefix: string, id: string, external: boolean } => {
            if (value === undefined) {
                // Not a curie. Check the 'external' flag: it should not be true
                if (raw.external) {
                    throw (new Error(`${raw.id} is set to be external, but the id is not a CURIE`));
                }
                return {
                    id       : raw.id,
                    prefix   : global.vocab_prefix,
                    external : false,
                }
            } else {
                // A real curie, which may or may not be external. By default, it is.
                const external = raw.external ?? true;
                return {prefix: prefix, id: value, external}
            }
        })();

        // Extra check for the possible error
        if (!output.external) {
            if ((raw.comment === undefined || raw.comment === "") &&
                (raw.defined_by === undefined || raw.defined_by.length === 0)
            ) {
                throw (new Error(`${raw.id} is incomplete: either "defined_by" or "comment" should be provided.`));
            }
        }
        return output;
    }

    /************************************** local utility methods *****************************************************/

    // Convert all the raw structures into their respective internal representations for
    // prefixes, ontology properties, classes, etc.

    // Get the extra prefixes and combine them with the defaults. Note that the 'vocab' category
    // should be added to the list, too, but it needs a special treatment (eg, it is
    // explicitly displayed in the HTML output), hence these values are also stored globally.
    // Note also the default prefix array added to the mix...
    //
    // The YAML file does not necessarily store the "vocab" as an array, but may; so the
    // vocab entry is always stored as an array. This makes the first entry of this
    // concatenation a bit strange...
    const prefixes: RDFPrefix[] = [
        ...vocab.vocab.map((raw: RawVocabEntry): RDFPrefix => {
            if (raw.id === undefined) {
                throw(new Error("The vocabulary has no prefix"));
            }
            if (raw.value === undefined) {
                throw(new Error("The vocabulary has no identifier"));
            }
            global.vocab_prefix  = raw.id;
            global.vocab_url     = raw.value;
            global.vocab_context = raw.context === undefined ? undefined : raw.context[0];
            if (global.vocab_context) {
                global.context_mentions[global.vocab_context] = [];
            }
            return {
                prefix : raw.id,
                url    : raw.value,
            }
        }),
        ...((vocab.prefix &&  vocab.prefix.length > 0)
            ? vocab.prefix.map((raw: RawVocabEntry): RDFPrefix => {
                return {
                    prefix : raw.id,
                    url    : (raw.value) ? raw.value : "UNDEFINED PREFIX VALUE",
                }
            })
            : []
        ),
        ...defaultPrefixes
    ];

    // Get the ontology properties. Note that there are also default ontology properties
    // that are added to what the YAML input provides
    const ontology_properties: OntologyProperty[] = [
        ...vocab.ontology.map((raw: RawVocabEntry): OntologyProperty => {
            return {
                property : (raw.property) ? raw.property : "UNDEFINED ONTOLOGY PROPERTY",
                value    : (raw.value) ? raw.value : "UNDEFINED PROPERTY VALUE",
                url      : (raw.value) ? isURL(raw.value) : false,
            }
        }),
        ...defaultOntologyProperties,
    ];

    // Get the properties. Note the special treatment for deprecated properties, as well as 
    // the extra owl types added depending on the range
    const properties: RDFProperty[] = (vocab.property !== undefined) ?
        vocab.property.map((raw: RawVocabEntry): RDFProperty => {
            const {prefix, id, external} = check_id(raw);
            const user_type: string[] = (raw.type === undefined) ? [] : raw.type      
            const types: string[] = [
                ...(raw.status === Status.deprecated) ? ["rdf:Property", "owl:DeprecatedProperty"] : ["rdf:Property"],                      
                ...user_type
            ];

            // Calculate the number of entries in various categories
            // The conditional assignment is actually unnecessary per the earlier processing,
            // but the deno typescript checker complains...
            global.status_counter.add(raw.status ? raw.status : Status.stable);
            let range = raw.range;
            if (range && range.length > 0) {
                if (range.length === 1 && (range[0].toUpperCase() === "IRI" || range[0].toUpperCase() === "URL")) {
                    types.push("owl:ObjectProperty");
                    range = undefined;
                } else {
                    let isDTProperty = true;
                    for (const rg of range) {
                        if (!(rg.startsWith("xsd") === true || EXTRA_DATATYPES.find((entry) => entry === rg) !== undefined)) {
                            isDTProperty = false;
                            break;
                        }
                    }
                    if (isDTProperty) types.push("owl:DatatypeProperty");
                }
            }
            return {
                id            : id,
                type          : types,
                user_type     : user_type,
                label         : raw.label,
                comment       : raw.comment,
                deprecated    : raw.deprecated,
                defined_by    : raw.defined_by,
                status        : raw.status,
                external      : external,
                prefix        : prefix,
                subPropertyOf : raw.upper_value,
                see_also      : raw.see_also,
                range         : range,
                domain        : raw.domain,
                example       : raw.example,
                dataset       : raw.dataset,
                context       : final_contexts(raw, `${prefix}:${id}`),
            }
        }) : [];

    // Get the classes. Note the special treatment for deprecated classes and the location of relevant domains and ranges
    const classes: RDFClass[] = (vocab.class !== undefined) ? 
        vocab.class.map((raw: RawVocabEntry): RDFClass => {
            const {prefix, id, external} = check_id(raw);
            const user_type: string[] = (raw.type === undefined) ? [] : raw.type;
            const types: string[] = [
                ...(raw.status === Status.deprecated) ? ["rdfs:Class", "owl:DeprecatedClass"] : ["rdfs:Class"],
                ...user_type
            ];
            const range_of: string[] = [];
            const domain_of: string[] = [];
            const included_in_domain_of: string[] = [];
            const includes_range_of: string[] = [];

            // Calculate the number of entries in various categories
            // The conditional assignment is actually unnecessary per the earlier processing,
            // but the deno typescript checker complains...
            global.status_counter.add(raw.status ? raw.status : Status.stable);

            // Get all domain/range cross-references
            for (const property of properties) {
                crossref(raw, property, property.range, range_of, includes_range_of);
                crossref(raw, property, property.domain, domain_of, included_in_domain_of);
            }

            return {
                id         : id,
                type       : types,
                user_type  : user_type,
                label      : raw.label,
                comment    : raw.comment,
                deprecated : raw.deprecated,
                defined_by : raw.defined_by,
                status     : raw.status,
                external   : external,
                prefix     : prefix,
                subClassOf : raw.upper_value,
                see_also   : raw.see_also,
                example    : raw.example,
                context       : final_contexts(raw, `${prefix}:${id}`),
                range_of, domain_of, included_in_domain_of, includes_range_of
            }
        }) : [];

    // Get the individuals. Note that, in this case, the 'type' value may be a full array of types provided in the YAML file
    const individuals: RDFIndividual[] = (vocab.individual !== undefined) ?
        vocab.individual.map((raw:RawVocabEntry): RDFIndividual => {
            const {prefix, id, external} = check_id(raw);
            // In the former version the user's type was done via the upper_value property, which was not clean
            // the current version has a separate type attribute, but the upper_value should also be used for backward compatibility
            // To be sure, an extra action below is necessary to make sure there are no repeated entries.
            const type = [
                ...(raw.type !== undefined) ? raw.type : [],
                ...(raw.upper_value !== undefined) ? raw.upper_value : []
            ];
            return {
                id            : id,
                label         : raw.label,
                comment       : raw.comment,
                deprecated    : raw.deprecated,
                defined_by    : raw.defined_by,
                status        : raw.status,
                external      : external,
                prefix        : prefix,
                type          : [...new Set(type)],
                see_also      : raw.see_also,
                example       : raw.example,
                context       : final_contexts(raw, `${prefix}:${id}`),
            }
        }) : [];

    // Get the datatypes. 
    const datatypes: RDFDatatype[] = (vocab.datatype !== undefined) ?
        vocab.datatype.map((raw: RawVocabEntry): RDFDatatype => {
            const {prefix, id, external} = check_id(raw);
            // In the former version the user's type was done via the upper_value property, which was not clean
            // the current version has a separate type attribute, but the upper_value should also be used for backward compatibility
            // To be sure, an extra action below is necessary to make sure there are no repeated entries.
            const type = [
                ...(raw.type !== undefined) ? raw.type : [],
                ...(raw.upper_value !== undefined) ? raw.upper_value : []
            ];

            const range_of: string[] = [];
            const includes_range_of: string[] = [];

            // Get the range cross-references
            for (const property of properties) {
                const is_dt_property = crossref(raw, property, property.range, range_of, includes_range_of);
                if (is_dt_property) {
                    // a bit convoluted, but trying to avoid repeating the extra entry
                    property.type = [...((new Set(property.type)).add('owl:DatatypeProperty'))]
                }
            }

            return {
                id         : id,
                subClassOf : (raw.upper_value !== undefined) ? raw.upper_value : [],
                label      : raw.label,
                comment    : raw.comment,
                deprecated : raw.deprecated,
                defined_by : raw.defined_by,
                status     : raw.status,
                external   : external,
                prefix     : prefix,
                type       : [...new Set(type)],
                see_also   : raw.see_also,
                example    : raw.example,
                context       : final_contexts(raw, `${prefix}:${id}`),
                range_of, includes_range_of
            };
        }) : [];
    
    return {prefixes, ontology_properties, classes, properties, individuals, datatypes}
}
