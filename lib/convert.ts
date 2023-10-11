/**
 * Convert the raw YAML description of the vocabulary into an internal representation 
 * (see the 'Vocab' interface).
 * 
 * @packageDocumentation
 */
import { RDFClass, RDFProperty, RDFIndividual, RDFPrefix, OntologyProperty, Vocab, Link, Status, Example, RDFDatatype } from './common';
import { RawVocabEntry, RawVocab, ValidationResults, global }                                                           from './common';
import { EXTRA_DATATYPES }                                                                                              from "./common";
import { validateWithSchema }                                                                                           from './schema';

/************************************************ Helper functions and constants **********************************/

/**
 * Just a shorthand to make the code more readable... Checking whether a string can be considered as a URL
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
 * These prefixes are added no matter what; they are not vocabulary specific
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
    }
];


/**
 * These ontology properties are added no matter what; they are not vocabulary specific
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
 * Although the YAML parsing is declared to produce a RawVocabEntry, it in fact does not
 * (e.g., some entries should be converted into arrays even if the YAML source has only a single item).
 * This function does some basic conversion for all the types, to make the processing later a bit simpler.
 * 
 * @param raw entry as it comes from the YAML parser
 * @returns a "real" RawVocabEntry instance
 * @internal
 */
function finalizeRawEntry(raw: RawVocabEntry): RawVocabEntry {
    // Some entries are to be put into an array, even if there is only one item
    const toArray = (val: undefined|string|string[]) : undefined|string[] => {
        if (val === undefined) {
            return undefined
        } else if (val.length === 0) {
            return undefined
        } else if ( typeof val === "string") {
            return [val]
        } else {
            return val
        }
    };

    // The "toSeeAlso" structure needs some special treatment and should also be turned into an array
    const toSeeAlso = (val: undefined|Link|Link[]) : undefined|Link[] => {
        if (val === undefined) {
            return undefined
        } else if (Array.isArray(val) && val.length === 0) {
            return undefined
        } else {
            if (Array.isArray(val)) {
                return val.map((raw): Link => {
                    return {
                        label : raw.label,
                        url   : raw.url
                    }
                })
            } else {
                return [{
                    label : val.label,
                    url   : val.url
                }]
            }
        }
    }

    // The "toExample" structure needs some special treatment and should also be turned into an array
    const toExample = (val: undefined|Example|Example[]) : undefined|Example[] => {
        if (val === undefined) {
            return undefined
        } else if (Array.isArray(val) && val.length === 0) {
            return undefined
        } else {
            if (Array.isArray(val)) {
                return val.map((raw): Example => {
                    return {
                        label : raw.label,
                        json  : raw.json
                    }
                })
            } else {
                return [{
                    label : val.label,
                    json  : val.json
                }]
            }
        }
    }

    // In some cases the YAML parser puts an extra `\n` character at the end of the comment line,
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

    // The deprecation flag, as a separate value, is kept also for reasons of backward compatibility,
    // but this makes the interpretation of the value(s) in the vocabulary a bit awkward. Later version
    // (maybe even next version) would remove the deprecated flag from existing vocabularies, ie,
    // switch to status, and all this will go away.

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

    return {
        id          : (raw.id) ? raw.id : "",
        property    : raw.property,
        value       : raw.value,
        label       : (raw.label) ? raw.label : "",
        upper_value : toArray(raw.upper_value),
        domain      : toArray(raw.domain),
        range       : toArray(raw.range),
        deprecated  : deprecated,
        defined_by  : (raw.defined_by) ? raw.defined_by : "",
        status      : status,
        comment     : (raw.comment) ? cleanComment(raw.comment) : "",
        see_also    : toSeeAlso(raw.see_also),
        example     : toExample(raw.example),
        dataset     : (raw.dataset === undefined) ? false : raw.dataset,
    }
}

/**
 * Run the entry finalization function through all entries in the vocabulary
 * as parsed from YAML
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

    return {
        vocab      : raw.vocab.map(finalizeRawEntry),
        prefix     : raw.prefix?.map(finalizeRawEntry),
        ontology   : raw.ontology?.map(finalizeRawEntry),
        class      : raw.class?.map(finalizeRawEntry),
        property   : raw.property?.map(finalizeRawEntry),
        individual : raw.individual?.map(finalizeRawEntry),
        datatype   : raw.datatype?.map(finalizeRawEntry),
    }
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
export function getData(vocab_source: string): Vocab {
    const validation_results: ValidationResults = validateWithSchema(vocab_source);
    if (validation_results.vocab === null) {
        const error = JSON.stringify(validation_results,null,4);
        throw(new TypeError(`JSON Schema validation error`, {cause: error}));
    }
    const vocab: RawVocab = finalizeRawVocab(validation_results.vocab);


    // Calculates cross references from properties to classes or datatypes; used
    // to make the cross references for the property ranges and domains
    // @param raw: raw entry for the class or datatype
    // @param refs: the range or domain array of the property
    // @return: whether the class/datatype is indeed in the range of the property
    const crossref = (raw: RawVocabEntry, property: RDFProperty, refs: undefined|string[], single_ref: string[], multi_ref: string[]): boolean => {
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

    // Convert all the raw structures into their respective internal representations for 
    // prefixes, ontology properties, classes, etc.

    // Get the extra prefixes and combine them with the defaults. Note that the 'vocab' category
    // should be added to the list, too, but it needs a special treatment (eg, it is
    // explicitly displayed in the HTML output), hence these values are also stored globally.
    const prefixes: RDFPrefix[] = [
        ...vocab.vocab.map((raw: RawVocabEntry): RDFPrefix => {
            if (raw.id === undefined) {
                throw(new Error("The vocabulary has no prefix"));
            }
            if (raw.value === undefined) {
                throw(new Error("The vocabulary has no identifier"));
            }
            global.vocab_prefix = raw.id;
            global.vocab_url = raw.value;
            return {
                prefix : raw.id,
                url    : raw.value,
            }
        }),
        ...((vocab["prefix"] &&  vocab["prefix"].length > 0) 
            ? vocab["prefix"].map((raw: RawVocabEntry): RDFPrefix => {
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
            const types: string[] = (raw.status === Status.deprecated) ? ["rdf:Property", "owl:DeprecatedProperty"] : ["rdf:Property"];
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
                id            : raw.id,
                type          : types,
                label         : raw.label,
                comment       : raw.comment,
                deprecated    : raw.deprecated,
                defined_by    : raw.defined_by,
                status        : raw.status,
                subPropertyOf : raw.upper_value,
                see_also      : raw.see_also,
                range         : range,
                domain        : raw.domain,
                example       : raw.example,
                dataset       : raw.dataset,
            }
        }) : [];

    // Get the classes. Note the special treatment for deprecated classes and the location of relevant domains and ranges
    const classes: RDFClass[] = (vocab.class !== undefined) ? 
        vocab.class.map((raw: RawVocabEntry): RDFClass => {
            const types: string[] = (raw.status === Status.deprecated) ? ["rdfs:Class", "owl:DeprecatedClass"] : ["rdfs:Class"];
            const range_of: string[] = [];
            const domain_of: string[] = [];
            const included_in_domain_of: string[] = [];
            const includes_range_of: string[] = [];

            // Calculate the number of entries in various categories
            // The conditional assignment is actually unnecessary per the earlier processing,
            // but the deno typescript checker complains...
            global.status_counter.add(raw.status ? raw.status : Status.stable);

            // Get all domain/range cross references
            for (const property of properties) {
                crossref(raw, property, property.range, range_of, includes_range_of);
                crossref(raw, property, property.domain, domain_of, included_in_domain_of);
            }

            return {
                id         : raw.id,
                type       : types,
                label      : raw.label,
                comment    : raw.comment,
                deprecated : raw.deprecated,
                defined_by : raw.defined_by,
                status     : raw.status,
                subClassOf : raw.upper_value,
                see_also   : raw.see_also,
                example    : raw.example,
                range_of, domain_of, included_in_domain_of, includes_range_of
            }
        }) : [];

    // Get the individuals. Note that, in this case, the 'type' value may be a full array of types provided in the YAML file
    const individuals: RDFIndividual[] = (vocab.individual !== undefined) ?
        vocab.individual.map((raw:RawVocabEntry): RDFIndividual => {
            return {
                id            : raw.id,
                label         : raw.label,
                comment       : raw.comment,
                deprecated    : raw.deprecated,
                defined_by    : raw.defined_by,
                status        : raw.status,
                type          : (raw.upper_value !== undefined) ? raw.upper_value : [],
                see_also      : raw.see_also,
                example       : raw.example,
            }
        }) : [];

    // Get the datatypes. 
    const datatypes: RDFDatatype[] = (vocab.datatype !== undefined) ?
        vocab.datatype.map((raw: RawVocabEntry): RDFDatatype => {
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
                id: raw.id,
                subClassOf: (raw.upper_value !== undefined) ? raw.upper_value : [],
                label      : raw.label,
                comment    : raw.comment,
                deprecated : raw.deprecated,
                defined_by : raw.defined_by,
                status     : raw.status,
                type       : (raw.upper_value !== undefined) ? raw.upper_value : [],
                see_also   : raw.see_also,
                example    : raw.example,
                range_of, includes_range_of
            };
        }) : [];

    return {prefixes, ontology_properties, classes, properties, individuals, datatypes}
}
