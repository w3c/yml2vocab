/**
 * Convert the raw YAML description of the vocabulary into an internal representation.
 *
 * @packageDocumentation
 */
import type { RDFClass, RDFProperty, RDFIndividual, RDFPrefix, RDFDatatype, RDFTerm } from './common';
import { Status, global }                                                             from './common';
import type { RawVocabEntry, RawVocab, ValidationResults  }                           from './common';
import type { OntologyProperty, Vocab, Link, Example }                                from './common';
import { EXTRA_DATATYPES, Container }                                                 from "./common";
import { validateWithSchema }                                                         from './schema';
import { RDFTermFactory, factory }                                                    from './factory';

/******************************************** Helper functions and constants **********************************/

/**
 * Just a shorthand to make the code more readable... Checking whether a string can be considered as a URL.
 *
 * @param value
 * @returns
 * @internal
 */
function isURL(value:string): boolean {
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


/**
 * These prefixes are added no matter what; they are not vocabulary specific,
 * but likely to be used in the vocabulary.
 *
 * @internal
 */
const defaultPrefixes: RDFPrefix[] = [
    {
        prefix : "dc",
        url    : "http://purl.org/dc/terms/",
    },
    {
        prefix : "dcterms",
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
 * Although the YAML parsing is declared to produce a {@link RawVocabEntry}, in fact does not do it strictly
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
        let final = val.endsWith('\n') ? val.slice(0,-1) : val;
        if (final.endsWith('"') && final.startsWith('"')) {
            final = final.slice(1,-1);
        }
        if (final.endsWith("'") && final.startsWith("'")) {
            final = final.slice(1,-1)
        }
        return final;
    }

    /* ********************** Bunch of constant calculations to be used in the code below **********/

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

    /* ***************************** Do the real cleanup *****************************/

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
        known_as    : raw.known_as,
        dataset     : raw.dataset ?? false,
        container   : raw.container,
        context     : toArrayContexts(raw.context),
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
    const classes     = raw.class?.map(finalizeRawEntry).filter((entry) => entry !== null);
    const properties  = raw.property?.map(finalizeRawEntry).filter((entry) => entry !== null);
    const individuals = raw.individual?.map(finalizeRawEntry).filter((entry) => entry !== null);
    const datatypes   = raw.datatype?.map(finalizeRawEntry).filter((entry) => entry !== null);

    return {
        vocab      : raw.vocab.map(finalizeRawEntry),
        prefix     : raw.prefix?.map(finalizeRawEntry),
        ontology   : raw.ontology?.map(finalizeRawEntry),
        class      : classes,
        property   : properties,
        individual : individuals,
        datatype   : datatypes,
        json_ld    : raw.json_ld,
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
    // Reminder: there is an initially empty global structure, initialized in common.ts
    // These functions will also update that global structure when applicable


    // Establish the final context reference(s), if any, for a term.
    // As a side effect, the 'inverse' info, ie, the list of terms per context, is
    // created in the global data structure.
    // "curie" is the CURIE encoded id of the term, ie, namespace:name format.
    const final_contexts = (raw: RawVocabEntry, term: RDFTerm ): string[] => {
        if (raw.context === undefined) return [];

        // replace the value of "vocab" by the global context, then
        // get the possible "none" out of the way.
        const contexts: string[] = raw.context.map((val: string): string => {
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
            global.context_mentions[ctx].push(term);
        }
        return ctx_s;
    }

    //
    // Convert the ranges of a property into the internal representation. The range can be a class, a datatype, or
    // an unknown term fully defined outside of this vocabulary.
    //
    // The function also sets the possible values of a (pure) datatype or object property as extra types
    // to be added to the enclosing property
    const get_ranges = (factory: RDFTermFactory, raw: RawVocabEntry, id: string): { extra_types: string[], range: RDFTerm[], strongURL: boolean } => {
        let extra_types: string[] = [];
        const range: RDFTerm[]    = [];
        let strongURL: boolean    = false;

        if (raw.range && raw.range.length > 0) {
            if (raw.range.length === 1 && (raw.range[0].toUpperCase() === "IRI" || raw.range[0].toUpperCase() === "URL")) {
                extra_types.push("owl:ObjectProperty");
                strongURL = true;
            } else {
                for (const rg of raw.range) {
                    if (rg.startsWith("xsd") === true || EXTRA_DATATYPES.find((entry) => entry === rg) !== undefined) {
                        // The datatype is a simple one, not a class; a term nevertheless, to make it uniform
                        extra_types.push("owl:DatatypeProperty");
                        range.push(factory.term(rg));
                    } else {
                        if (factory.has(rg)) {
                            const term: RDFTerm | undefined = factory.get(rg);
                            if (term !== undefined) {
                                if (RDFTermFactory.isClass(term)) {
                                    extra_types.push("owl:ObjectProperty");
                                    range.push(term);
                                } else if (RDFTermFactory.isDatatype(term)) {
                                    extra_types.push("owl:DatatypeProperty");
                                    range.push(term);
                                } else {
                                    throw(new Error(`The range ${rg} of the property ${id} is neither a class nor a datatype, although defined in this vocabulary`));
                                }
                            } else {
                                throw(new Error(`The range ${rg} of the property ${id} is not defined in this vocabulary`));
                            }
                        } else {
                            // By now, local classes and datatypes have been accounted for; the only remaining
                            // possibility is that this is an unknown (outside) term
                            range.push(factory.term(rg));
                        }
                    }
                }
            }
        }

        extra_types = [ ...new Set(extra_types) ];  // remove duplicates
        // In fact, the length of the types must be 0 or 1, otherwise, it is a general property that can have any range
        if (extra_types.length > 1) {
            extra_types = [];
        };
        return { extra_types, range, strongURL }
    }

    // Check whether the external term is defined somewhere, ie, a defined by or at least a comment.
    // This function raises an error if this is not the case
    const set_and_check_external = (raw: RawVocabEntry, output: RDFTerm): void => {
        if (output.prefix !== global.vocab_prefix) {
            // We have a term that is not part of the vocabulary but, nevertheless
            // defined in the YAML file. This is an external term.
            output.external = true;
        }
        // Extra check for the possible error
        else {
            if ((raw.comment === undefined || raw.comment === "") &&
                (raw.defined_by === undefined || raw.defined_by.length === 0))
            {
                throw (new Error(`${raw.id} is incomplete: either "defined_by" or "comment" should be provided.`));
            }
        }
    }

    /*****************************************************************************************************************/
    /************************************** Main processing part *****************************************************/
    /*****************************************************************************************************************/

    // Convert all the raw structures into their respective internal representations for
    // prefixes, ontology properties, classes, etc. This is done as a series of map operations on the
    // raw classes, properties, etc, with the mapping function converting the raw structure into the
    // internal representation.

    // Each mapping function has a similar structure: generate a new RDFTerm (with the necessary category) via a
    // term factory (which will also initialize the common keys for the term), then add the specific keys.

    // Note that, at the end of all that, a second "pass" is done to set the references from classes and datatypes
    // to the properties that have them as domain resp. range. This is added to the internal representation to aid
    // cross references mainly in the HTML representation.

    /********************************************************************************************/
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

    /********************************************************************************************/
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

    /********************************************************************************************/
    // We have to set up a term factory for the RDF Terms. That factory will be used to create
    // the terms, classes, properties, etc, but avoid duplicates.
    // Using the factory will ensure to have a smooth creation of subproperties, range or domain arrays
    // as needed, with cross references.
    factory.initialize(prefixes);

    /********************************************************************************************/
    // Get the datatypes.
    const datatypes: RDFDatatype[] = (vocab.datatype !== undefined) ?
        vocab.datatype.map((raw: RawVocabEntry): RDFDatatype => {
            const output: RDFDatatype = factory.datatype(raw.id);

            // Extra check for possible error for external terms
            set_and_check_external(raw, output);

            // In the former version of the package the user's type was done via the upper_value property, which was not clean
            // the current version has a separate type attribute, but the upper_value should also be used for backward compatibility
            // To be sure, an extra action below is necessary to make sure there are no repeated entries.
            const type = [
                ...(raw.type !== undefined) ? raw.type : [],
                ...(raw.upper_value !== undefined) ? raw.upper_value : []
            ];

            // Calculate the number of entries in various categories
            // The conditional assignment is actually unnecessary per the earlier processing,
            // but the deno typescript checker complains...
            global.status_counter.add(raw.status ? raw.status : Status.stable);

            Object. assign(output, {
                label             : raw.label,
                comment           : raw.comment,
                deprecated        : raw.deprecated,
                defined_by        : raw.defined_by,
                status            : raw.status,
                type              : [...new Set(type)].map(t => factory.term(t)),
                subClassOf        : raw.upper_value?.map((val: string): RDFClass => factory.class(val)),
                see_also          : raw.see_also,
                known_as          : raw.known_as,
                example           : raw.example,
                context           : final_contexts(raw, output),
                range_of          : [],            // these are set later, when all classes and properties are defined
                includes_range_of : [],   // these are set later, when all classes and properties are defined
            });
            return output;
        }
    ) : [];

    /********************************************************************************************/
    // Get the classes. Note the special treatment for deprecated classes and the location of relevant domains and ranges
    const classes: RDFClass[] = (vocab.class !== undefined) ?
        vocab.class.map((raw: RawVocabEntry): RDFClass => {
            const output: RDFClass = factory.class(raw.id);

            // Extra check for possible error for external terms
            set_and_check_external(raw, output);

            const user_type: string[] = (raw.type === undefined) ? [] : raw.type;
            const types: string[] = [
                ...(raw.status === Status.deprecated) ? ["rdfs:Class", "owl:DeprecatedClass"] : ["rdfs:Class"],
                ...user_type
            ];

            // Calculate the number of entries in various categories
            // The conditional assignment is actually unnecessary per the earlier processing,
            // but the deno typescript checker complains...
            global.status_counter.add(raw.status ? raw.status : Status.stable);

            Object.assign(output, {
                type                  : types.map(t => factory.term(t)),
                user_type             : user_type.map(t => factory.term(t)),
                label                 : raw.label,
                comment               : raw.comment,
                deprecated            : raw.deprecated,
                defined_by            : raw.defined_by,
                status                : raw.status,
                subClassOf            : raw.upper_value?.map((val: string): RDFClass => factory.class(val)),
                see_also              : raw.see_also,
                known_as              : raw.known_as,
                example               : raw.example,
                context               : final_contexts(raw, output),
                range_of              : [],      // these are set later, when all classes and properties are defined
                domain_of             : [],      // these are set later, when all classes and properties are defined
                included_in_domain_of : [],      // these are set later, when all classes and properties are defined
                includes_range_of     : [],      // these are set later, when all classes and properties are defined
            });

            return output;
        }
    ) : [];

    /********************************************************************************************/
    // Get the properties. Note the special treatment for deprecated properties, as well as
    // the extra owl types added depending on the range.
    //
    // Note that the function sets the object property or datatype property types in the obvious cases.
    // These extra types are also added when handling a class or a datatype, looking up the references.
    const properties: RDFProperty[] = (vocab.property !== undefined) ?
        vocab.property.map((raw: RawVocabEntry): RDFProperty => {
            const output: RDFProperty = factory.property(raw.id);

            // Extra check for possible error for external terms
            set_and_check_external(raw, output);

            // Calculate the number of entries in various categories
            // The conditional assignment is actually unnecessary per the earlier processing,
            // but the deno typescript checker complains...
            global.status_counter.add(raw.status ? raw.status : Status.stable);

            // Calculate the ranges, which can be a mixture of classes, datatypes, and unknown terms
            const { extra_types, range, strongURL } = get_ranges(factory, raw, output.id);

            // A little hack to ensure backward compatibility: if the range includes rdf:List,
            // it should be removed and the information put aside because that should now
            // go to the separate "container" information.
            const finalRange   = range.filter ((r: RDFTerm): boolean => r.curie !== "rdf:List");
            const containerSet = (finalRange.length !== range.length);

            const user_type: string[] = (raw.type === undefined) ? [] : raw.type
            const types: string[] = [
                ...(raw.status === Status.deprecated) ? ["rdf:Property", "owl:DeprecatedProperty"] : ["rdf:Property"],
                ...extra_types,
                ...user_type
            ];

            const dataset = ((): boolean => {
                if (raw.dataset) {
                    return true;
                } else if (raw.container !== undefined && raw.container === Container.graph) {
                    return true;
                } else {
                    return false;
                }
            })();

            const container = ((): Container | undefined => {
                if (raw.container !== undefined) {
                    if (raw.container !== Container.graph) {
                        return raw.container
                    } else {
                        return undefined;
                    }
                } else if (containerSet) {
                    return Container.list
                } else {
                    return undefined;
                }
            })();

            // Checking one combination: it is disallowed in JSON-LD to define a container to be a list and a graph
            if (container === Container.list && dataset) {
                throw (new Error(`${output.curie} is invalid: it combines a list container with a dataset, which is not allowed.`));
            }

            Object.assign(output, {
                type          : types.map(t => factory.term(t)),
                user_type     : user_type.map(t => factory.term(t)),
                label         : raw.label,
                comment       : raw.comment,
                deprecated    : raw.deprecated,
                defined_by    : raw.defined_by,
                status        : raw.status,
                subPropertyOf : raw.upper_value?.map((val: string): RDFProperty => factory.property(val)),
                see_also      : raw.see_also,
                range         : finalRange,
                domain        : raw.domain?.map(val => factory.class(val)),
                example       : raw.example,
                known_as      : raw.known_as,
                dataset       : dataset,
                container     : container,
                strongURL     : strongURL,
                context       : final_contexts(raw, output),
            });
            return output;
        }
    ) : [];

    /********************************************************************************************/
    // Get the individuals. Note that, in this case, the 'type' value may be a full array of types provided in the YAML file
    const individuals: RDFIndividual[] = (vocab.individual !== undefined) ?
        vocab.individual.map((raw:RawVocabEntry): RDFIndividual => {
            const output = factory.individual(raw.id);

            // Extra check for possible error for external terms
            set_and_check_external(raw, output);

            // In the former version the user's type was done via the upper_value property, which was not clean
            // the current version has a separate type attribute, but the upper_value should also be used for backward compatibility
            // To be sure, an extra action below is necessary to make sure there are no repeated entries.
            const type = [
                ...(raw.type !== undefined) ? raw.type : [],
                ...(raw.upper_value !== undefined) ? raw.upper_value : []
            ];
            Object.assign(output, {
                label      : raw.label,
                comment    : raw.comment,
                deprecated : raw.deprecated,
                defined_by : raw.defined_by,
                status     : raw.status,
                type       : [...new Set(type)].map(t => factory.term(t)),
                see_also   : raw.see_also,
                example    : raw.example,
                known_as   : raw.known_as,
                context    : final_contexts(raw, output),
            });
            return output;
        }
    ) : [];

    /********************************************************************************************/
    // Set the domain and range of the back references for ranges/domains for classes and datatypes.
    for (const current_class of classes) {
        for (const prop of properties) {
            if (prop.range?.length > 0) {
                if (prop.range.find((val: RDFTerm) => RDFTermFactory.equals(val, current_class))) {
                    ((prop.range.length > 1) ? current_class.includes_range_of : current_class.range_of).push(prop);
                }
            }
            if (prop.domain?.length > 0) {
                if (prop.domain.find((val: RDFTerm) => RDFTermFactory.equals(val, current_class))) {
                    ((prop.domain.length > 1) ? current_class.included_in_domain_of : current_class.domain_of).push(prop);
                }
            }
        }
    }

    for (const current_datatype of datatypes) {
        for (const prop of properties) {
            if (prop.range?.length > 0) {
                if (prop.range.find((val: RDFTerm) => RDFTermFactory.equals(val, current_datatype))) {
                    ((prop.range.length > 1) ? current_datatype.includes_range_of : current_datatype.range_of).push(prop);
                }
            }
        }
    }

    /********************************************************************************************/
    // The alias settings are not relevant for the individual terms, are to be set in the global space
    if (vocab.json_ld?.alias) {
        global.aliases = { ...global.aliases, ...vocab.json_ld.alias };
    }

    /********************************************************************************************/
    // We're all set: return the internal representation of the vocabulary
    return {prefixes, ontology_properties, classes, properties, individuals, datatypes}
}
