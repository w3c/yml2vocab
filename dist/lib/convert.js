"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getData = getData;
const common_1 = require("./common");
const common_2 = require("./common");
const schema_1 = require("./schema");
const factory_1 = require("./factory");
/******************************************** Helper functions and constants **********************************/
/**
 * Just a shorthand to make the code more readable... Checking whether a string can be considered as a URL.
 *
 * @param value
 * @returns
 * @internal
 */
function isURL(value) {
    try {
        new URL(value);
        return true;
    }
    catch (_e) {
        return false;
    }
}
/**
 * Turn the id text into a non-camel case for a label.
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
        console.log(str);
        return str;
    }
    else {
        // First character is ignored; it can be upper or lower case
        const output = [str.charAt(0)];
        for (let i = 1; i < str.length; i++) {
            const char = str.charAt(i);
            if (char === ':') {
                // This is prefix separator, should be left without change
                // This is CURIE, it should be used without change
                return str;
            }
            else if (isLocaleUpperCase(char)) {
                // Got to the camel's hump
                output.push(separator);
                output.push(char.toLocaleLowerCase());
            }
            else {
                output.push(char);
            }
        }
        // The first character must be capitalized:
        output[0] = output[0].toLocaleUpperCase();
        return output.join('');
    }
}
/**
 * These ontology properties are added no matter what; they are not vocabulary specific.
 *
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
 * Although the YAML parsing is declared to produce a {@link RawVocabEntry}, in fact does not do it strictly
 * (e.g., some entries should be converted into arrays even if the YAML source has only a single item).
 * This function does some basic conversion for all the types, to make the processing later a bit simpler.
 *
 * @param raw entry as it comes from the YAML parser; in fact a generic (javascript-like) object.
 * @returns a bona fide RawVocabEntry instance
 * @internal
 */
function finalizeRawEntry(raw) {
    /* *************************** Bunch of helper functions to be used in the code below */
    // Some entries are to be put into an array, even if there is only one item; this ensures a uniform handling.
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
    // Almost like toArray, except that instead of undefined a real default value is returned.
    // "vocab" is the shorthand, in the YAML definition, to the context file defined as part of the
    // vocabulary heading.
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
                return val;
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
                return val;
            }
            else {
                return [{
                        label: val.label,
                        json: val.json
                    }];
            }
        }
    };
    // In some cases the YAML parser puts an extra `\n` character at the end of the comment line;
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
    /* ********************** Bunch of constant calculations to be used in the code below **********/
    // The deprecation flag, as a separate value, is kept for reasons of backward compatibility,
    // but this makes the interpretation of the value(s) in the vocabulary a bit awkward. Later version
    // may remove the deprecated flag from existing vocabularies, i.e., switch to status altogether,
    // and all this will go away.
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
    // The official label should all be lower case.
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
    /* ***************************** Do the real cleanup *****************************/
    return {
        id: (raw.id) ? raw.id : "",
        property: raw.property,
        value: raw.value,
        label: label,
        upper_value: toArray(raw.upper_value),
        upper_union: raw.upper_union ?? false,
        type: toArray(raw.type),
        domain: toArray(raw.domain),
        range: toArray(raw.range),
        range_union: raw.range_union ?? false,
        deprecated: deprecated,
        defined_by: toArray(raw.defined_by) ?? [],
        status: status,
        external: raw.external,
        comment: (raw.comment) ? cleanComment(raw.comment) : "",
        see_also: toSeeAlso(raw.see_also),
        example: toExample(raw.example),
        known_as: raw.known_as,
        dataset: raw.dataset ?? false,
        container: raw.container,
        context: toArrayContexts(raw.context),
        pattern: raw.pattern,
        one_of: toArray(raw.one_of),
    };
}
/**
 * Run the entry finalization function through all entries in the vocabulary
 * as parsed from YAML.
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
    // The extra filter is used to keep the valid entries only. For example, an external
    // term without a clear definition must be ignored.
    const classes = raw.class?.map(finalizeRawEntry).filter((entry) => entry !== null);
    const properties = raw.property?.map(finalizeRawEntry).filter((entry) => entry !== null);
    const individuals = raw.individual?.map(finalizeRawEntry).filter((entry) => entry !== null);
    const datatypes = raw.datatype?.map(finalizeRawEntry).filter((entry) => entry !== null);
    return {
        vocab: raw.vocab.map(finalizeRawEntry),
        prefix: raw.prefix?.map(finalizeRawEntry),
        ontology: raw.ontology?.map(finalizeRawEntry),
        class: classes,
        property: properties,
        individual: individuals,
        datatype: datatypes,
        json_ld: raw.json_ld,
    };
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
function getData(vocab_source) {
    // Run the incoming YAML through a schema validation, and return the
    // generated object if everything is fine.
    const validation_results = (0, schema_1.validateWithSchema)(vocab_source);
    if (validation_results.vocab === null) {
        const error = JSON.stringify(validation_results.error, null, 4);
        throw (new TypeError(`JSON Schema validation error`, { cause: '\n' + error }));
    }
    // Clean up the raw vocab representation.
    const vocab = finalizeRawVocab(validation_results.vocab);
    /************************************** local utility methods *****************************************************/
    //
    // Reminder: there is an initially empty global structure, initialized in common.ts
    // These functions will also update that global structure when applicable
    // Establish the final context reference(s), if any, for a term.
    // As a side effect, the 'inverse' info, ie, the list of terms per context, is
    // created in the global data structure.
    // "curie" is the CURIE encoded id of the term, ie, namespace:name format.
    const final_contexts = (raw, term) => {
        if (raw.context === undefined)
            return [];
        // replace the value of "vocab" by the global context, then
        // get the possible "none" out of the way.
        const contexts = raw.context.map((val) => {
            if (val === "vocab") {
                // The global context may not have been set per TypeScript... although this
                // function is invoked once that has been set already. Price to pay for
                // Typescript checking...
                return common_1.global.vocab_context !== undefined ? common_1.global.vocab_context : "none";
            }
            else {
                return val;
            }
        }).filter((val) => val !== "none");
        // Make sure that all entries are unique before returning it
        const ctx_s = [...new Set(contexts)];
        // 'Inverse' info: add the term reference to the global data
        for (const ctx of ctx_s) {
            if (!(ctx in common_1.global.context_mentions)) {
                common_1.global.context_mentions[ctx] = [];
            }
            common_1.global.context_mentions[ctx].push(term);
        }
        return ctx_s;
    };
    //
    // Convert the ranges of a property into the internal representation. The range can be a class, a datatype, or
    // an unknown term fully defined outside of this vocabulary.
    //
    // The function also sets the possible values of a (pure) datatype or object property as extra types
    // to be added to the enclosing property
    const get_ranges = (factory, raw, id) => {
        let extra_types = [];
        const range = [];
        let strongURL = false;
        if (raw.range && raw.range.length > 0) {
            if (raw.range.length === 1 && (raw.range[0].toUpperCase() === "IRI" || raw.range[0].toUpperCase() === "URL")) {
                extra_types.push("owl:ObjectProperty");
                strongURL = true;
            }
            else {
                for (const rg of raw.range) {
                    if (rg.startsWith("xsd") === true || common_2.EXTRA_DATATYPES.find((entry) => entry === rg) !== undefined) {
                        // The datatype is a simple one, not a class; a term nevertheless, to make it uniform
                        extra_types.push("owl:DatatypeProperty");
                        range.push(factory.term(rg));
                    }
                    else {
                        if (factory.has(rg)) {
                            const term = factory.get(rg);
                            if (term !== undefined) {
                                if (factory_1.RDFTermFactory.isClass(term)) {
                                    extra_types.push("owl:ObjectProperty");
                                    range.push(term);
                                }
                                else if (factory_1.RDFTermFactory.isDatatype(term)) {
                                    extra_types.push("owl:DatatypeProperty");
                                    range.push(term);
                                }
                                else {
                                    throw (new Error(`The range ${rg} of the property ${id} is neither a class nor a datatype, although defined in this vocabulary`));
                                }
                            }
                            else {
                                throw (new Error(`The range ${rg} of the property ${id} is not defined in this vocabulary`));
                            }
                        }
                        else {
                            // By now, local classes and datatypes have been accounted for; the only remaining
                            // possibility is that this is an unknown (outside) term
                            range.push(factory.term(rg));
                        }
                    }
                }
            }
        }
        extra_types = [...new Set(extra_types)]; // remove duplicates
        // In fact, the length of the types must be 0 or 1, otherwise, it is a general property that can have any range
        if (extra_types.length > 1) {
            extra_types = [];
        }
        ;
        return { extra_types, range, strongURL };
    };
    // Check whether the external term is defined somewhere, ie, a defined by or at least a comment.
    // This function raises an error if this is not the case
    const set_and_check_external = (raw, output) => {
        if (output.prefix !== common_1.global.vocab_prefix) {
            // We have a term that is not part of the vocabulary but, nevertheless
            // defined in the YAML file. This is an external term.
            output.external = true;
        }
        // Extra check for the possible error
        else {
            if ((raw.comment === undefined || raw.comment === "") &&
                (raw.defined_by === undefined || raw.defined_by.length === 0)) {
                throw (new Error(`${raw.id} is incomplete: either "defined_by" or "comment" should be provided.`));
            }
        }
    };
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
    const allPrefixes = [
        ...vocab.vocab.map((raw) => {
            if (raw.id === undefined) {
                throw (new Error("The vocabulary has no prefix"));
            }
            if (raw.value === undefined) {
                throw (new Error("The vocabulary has no identifier"));
            }
            common_1.global.vocab_prefix = raw.id;
            common_1.global.vocab_url = raw.value;
            common_1.global.vocab_context = raw.context === undefined ? undefined : raw.context[0];
            if (common_1.global.vocab_context) {
                common_1.global.context_mentions[common_1.global.vocab_context] = [];
            }
            return {
                prefix: raw.id,
                url: raw.value,
            };
        }),
        ...((vocab.prefix && vocab.prefix.length > 0)
            ? vocab.prefix.map((raw) => {
                return {
                    prefix: raw.id,
                    url: (raw.value) ? raw.value : "UNDEFINED PREFIX VALUE",
                };
            })
            : []),
        ...common_2.defaultPrefixes
    ];
    // Remove duplicates; trick is that, using a map, the second setting of a prefix would overwrite the previous
    const prefixes = Array.from(new Map(allPrefixes.map(p => [p.prefix, p])).values());
    /********************************************************************************************/
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
    /********************************************************************************************/
    // We have to set up a term factory for the RDF Terms. That factory will be used to create
    // the terms, classes, properties, etc, but avoid duplicates.
    // Using the factory will ensure to have a smooth creation of subproperties, range or domain arrays
    // as needed, with cross references.
    factory_1.factory.initialize(prefixes);
    /********************************************************************************************/
    // Get the datatypes.
    const datatypes = (vocab.datatype !== undefined) ?
        vocab.datatype.map((raw) => {
            const output = factory_1.factory.datatype(raw.id);
            // Extra check for possible error for external terms
            set_and_check_external(raw, output);
            // In the former version of the package the user's type was done via the upper_value property, which was not clean
            // the current version has a separate type attribute, but the upper_value could also be used for backward compatibility
            // To be sure, an extra action below is necessary to make sure there are no repeated entries.
            const type_entries = [
                ...(raw.type !== undefined) ? raw.type : [],
                ...(raw.upper_value !== undefined) ? raw.upper_value : []
            ];
            const type = [...new Set(type_entries)].map(t => factory_1.factory.term(t));
            // Calculate the number of entries in various categories
            // The conditional assignment is actually unnecessary per the earlier processing,
            // but the deno typescript checker complains...
            common_1.global.status_counter.add(raw.status ? raw.status : common_1.Status.stable);
            // Setting the right pattern and enum values: if there is no pattern but there is an enum,
            // create a pattern artificially.
            // Both are restricted to string values, though.
            const subClassOf = raw.upper_value?.map((val) => factory_1.factory.class(val));
            const [pattern, one_of] = (() => {
                if (raw.one_of || raw.pattern) {
                    // The supertype must include an xsd:string
                    if (!(type && type.map((term) => `${term}`).includes('xsd:string'))) {
                        throw (new Error(`${output.id} must be an xsd:string for template or enumeration`));
                    }
                }
                if (raw.one_of && raw.one_of.length > 0) {
                    const pattern = raw.one_of.join('|');
                    return [pattern, raw.one_of];
                }
                else if (raw.pattern !== undefined) {
                    return [raw.pattern, []];
                }
                else {
                    return ["", []];
                }
            })();
            Object.assign(output, {
                label: raw.label,
                comment: raw.comment,
                deprecated: raw.deprecated,
                defined_by: raw.defined_by,
                status: raw.status,
                type: type,
                subClassOf: subClassOf,
                see_also: raw.see_also,
                known_as: raw.known_as,
                example: raw.example,
                context: final_contexts(raw, output),
                one_of: one_of,
                pattern: pattern,
                range_of: [], // these are set later, when all classes and properties are defined
                includes_range_of: [], // these are set later, when all classes and properties are defined
            });
            return output;
        }) : [];
    /********************************************************************************************/
    // Get the classes. Note the special treatment for deprecated classes and the location of relevant domains and ranges
    const classes = (vocab.class !== undefined) ?
        vocab.class.map((raw) => {
            const output = factory_1.factory.class(raw.id);
            // Extra check for possible error for external terms
            set_and_check_external(raw, output);
            const user_type = (raw.type === undefined) ? [] : raw.type;
            const types = [
                ...(raw.status === common_1.Status.deprecated) ? ["rdfs:Class", "owl:DeprecatedClass"] : ["rdfs:Class"],
                ...user_type
            ];
            // Calculate the number of entries in various categories
            // The conditional assignment is actually unnecessary per the earlier processing,
            // but the deno typescript checker complains...
            common_1.global.status_counter.add(raw.status ? raw.status : common_1.Status.stable);
            if (raw.one_of && raw.one_of.length > 0) {
                // The owl:Class has to be added to types because the
                // expression for one_of applies on an owl class only...
                types.push("owl:Class");
            }
            Object.assign(output, {
                type: [...new Set(types)].map(t => factory_1.factory.term(t)),
                user_type: user_type.map(t => factory_1.factory.term(t)),
                label: raw.label,
                comment: raw.comment,
                deprecated: raw.deprecated,
                defined_by: raw.defined_by,
                status: raw.status,
                subClassOf: raw.upper_value?.map((val) => factory_1.factory.class(val)),
                upper_union: raw.upper_union,
                one_of: raw.one_of?.map((val) => factory_1.factory.individual(val)),
                see_also: raw.see_also,
                known_as: raw.known_as,
                example: raw.example,
                context: final_contexts(raw, output),
                range_of: [], // these are set later, when all classes and properties are defined
                domain_of: [], // these are set later, when all classes and properties are defined
                included_in_domain_of: [], // these are set later, when all classes and properties are defined
                includes_range_of: [], // these are set later, when all classes and properties are defined
            });
            return output;
        }) : [];
    /********************************************************************************************/
    // Get the properties. Note the special treatment for deprecated properties, as well as
    // the extra owl types added depending on the range.
    //
    // Note that the function sets the object property or datatype property types in the obvious cases.
    // These extra types are also added when handling a class or a datatype, looking up the references.
    const properties = (vocab.property !== undefined) ?
        vocab.property.map((raw) => {
            const output = factory_1.factory.property(raw.id);
            // Extra check for possible error for external terms
            set_and_check_external(raw, output);
            // Calculate the number of entries in various categories
            // The conditional assignment is actually unnecessary per the earlier processing,
            // but the deno typescript checker complains...
            common_1.global.status_counter.add(raw.status ? raw.status : common_1.Status.stable);
            // Calculate the ranges, which can be a mixture of classes, datatypes, and unknown terms
            const { extra_types, range, strongURL } = get_ranges(factory_1.factory, raw, output.id);
            // A little hack to ensure backward compatibility: if the range includes rdf:List,
            // it should be removed and the information put aside because that should now
            // go to the separate "container" information.
            const finalRange = range.filter((r) => r.curie !== "rdf:List");
            const containerSet = (finalRange.length !== range.length);
            const user_type = (raw.type === undefined) ? [] : raw.type;
            const types = [
                ...(raw.status === common_1.Status.deprecated) ? ["rdf:Property", "owl:DeprecatedProperty"] : ["rdf:Property"],
                ...extra_types,
                ...user_type
            ];
            const dataset = (() => {
                if (raw.dataset) {
                    return true;
                }
                else if (raw.container !== undefined && raw.container === common_2.Container.graph) {
                    return true;
                }
                else {
                    return false;
                }
            })();
            const container = (() => {
                if (raw.container !== undefined) {
                    if (raw.container !== common_2.Container.graph) {
                        return raw.container;
                    }
                    else {
                        return undefined;
                    }
                }
                else if (containerSet) {
                    return common_2.Container.list;
                }
                else {
                    return undefined;
                }
            })();
            // Checking one combination: it is disallowed in JSON-LD to define a container to be a list and a graph
            if (container === common_2.Container.list && dataset) {
                throw (new Error(`${output.curie} is invalid: it combines a list container with a dataset, which is not allowed.`));
            }
            Object.assign(output, {
                type: types.map(t => factory_1.factory.term(t)),
                user_type: user_type.map(t => factory_1.factory.term(t)),
                label: raw.label,
                comment: raw.comment,
                deprecated: raw.deprecated,
                defined_by: raw.defined_by,
                status: raw.status,
                subPropertyOf: raw.upper_value?.map((val) => factory_1.factory.property(val)),
                see_also: raw.see_also,
                range: finalRange,
                range_union: raw.range_union,
                one_of: raw.one_of?.map((val) => factory_1.factory.individual(val)),
                domain: raw.domain?.map(val => factory_1.factory.class(val)),
                example: raw.example,
                known_as: raw.known_as,
                dataset: dataset,
                container: container,
                strongURL: strongURL,
                context: final_contexts(raw, output),
            });
            return output;
        }) : [];
    /********************************************************************************************/
    // Get the individuals. Note that, in this case, the 'type' value may be a full array of types provided in the YAML file
    const individuals = (vocab.individual !== undefined) ?
        vocab.individual.map((raw) => {
            const output = factory_1.factory.individual(raw.id);
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
                label: raw.label,
                comment: raw.comment,
                deprecated: raw.deprecated,
                defined_by: raw.defined_by,
                status: raw.status,
                type: [...new Set(type)].map(t => factory_1.factory.term(t)),
                see_also: raw.see_also,
                example: raw.example,
                known_as: raw.known_as,
                context: final_contexts(raw, output),
            });
            return output;
        }) : [];
    /********************************************************************************************/
    // Set the domain and range of the back references for ranges/domains for classes and datatypes.
    for (const current_class of classes) {
        for (const prop of properties) {
            if (prop.range?.length > 0) {
                if (prop.range.find((val) => factory_1.RDFTermFactory.equals(val, current_class))) {
                    ((prop.range.length > 1) ? current_class.includes_range_of : current_class.range_of).push(prop);
                }
            }
            if (prop.domain?.length > 0) {
                if (prop.domain.find((val) => factory_1.RDFTermFactory.equals(val, current_class))) {
                    ((prop.domain.length > 1) ? current_class.included_in_domain_of : current_class.domain_of).push(prop);
                }
            }
        }
    }
    for (const current_datatype of datatypes) {
        for (const prop of properties) {
            if (prop.range?.length > 0) {
                if (prop.range.find((val) => factory_1.RDFTermFactory.equals(val, current_datatype))) {
                    ((prop.range.length > 1) ? current_datatype.includes_range_of : current_datatype.range_of).push(prop);
                }
            }
        }
    }
    /********************************************************************************************/
    // The alias and import settings are not relevant for the individual terms, are to be set in the global space
    if (vocab.json_ld?.alias) {
        common_1.global.aliases = { ...common_1.global.aliases, ...vocab.json_ld.alias };
    }
    if (vocab.json_ld?.import) {
        common_1.global.import = common_1.global.import.concat(vocab.json_ld.import);
    }
    /********************************************************************************************/
    // We're all set: return the internal representation of the vocabulary
    return { prefixes, ontology_properties, classes, properties, individuals, datatypes };
}
