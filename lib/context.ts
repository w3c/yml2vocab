  /**
 * Generate a (minimal) JSON-LD context file for the vocabulary
 * (see the 'Vocab' interface).
 *
 * @packageDocumentation
 */

import { type Vocab, global, Container, type RDFProperty } from './common';
import { RDFTermFactory }                                  from './factory';
import { beautify }                                        from './beautify';


// Just to get an extra help from TS if I mistype something...
interface Context {
    [index: string]: string | string[] | Context | boolean | null;
}

// These are the context statements appearing in all
// embedded contexts, as well as the top level one.
const preamble: Context = {
    "@protected" : true,
};

// Minor utility: return the full URL for a prefix
function prefix_url(prefix: string | undefined, vocab: Vocab): string {
    if (!prefix) {
        // This never happens per the program logic, but we keep TS happy...
        return global.vocab_url;
    }
    for (const pr of vocab.prefixes) {
        if (pr.prefix === prefix) {
            return pr.url;
        }
    }
    return global.vocab_url;
}

/**
 * Generate the minimal JSON-LD context for the vocabulary.
 *
 * @param vocab - The internal representation of the vocabulary
 * @returns - the full context in string (ready to be written to a file)
 */
export function toContext(vocab: Vocab): string {

    // Generation of a unit for properties
    const propertyContext = (property: RDFProperty, forClass = true): Context|string => {
        // the real id of the property...
        const baseUrl = prefix_url(property.prefix, vocab);
        const url = `${baseUrl}${property.id}`;
        const output: Context = {
            "@id" : url
        }
        if (forClass && RDFTermFactory.includesCurie(property.type, "owl:ObjectProperty")) {
            output["@type"] = "@id";
        }
        // Try to catch the datatype settings; these can be used
        // to set these in the context as well
        if (property.range) {
            for (const rangeTerm of property.range) {
                const curie = rangeTerm.curie;
                if (curie.startsWith("xsd:")) {
                    output["@type"] = rangeTerm.url;
                    break;
                } else if (curie === "rdf:JSON") {
                    output["@type"] = "@json";
                    break;
                } else if (["rdf:HTML", "rdf:XMLLiteral", "rdf:PlainLiteral", "rdf:langString"].includes(curie)) {
                    output["@type"] = rangeTerm.url;
                    break;
                 } else if (RDFTermFactory.includesCurie(property.type, "owl:DatatypeProperty")) {
                    // This is the case when the property refers to an explicitly defined, non-standard datatype
                    output["@type"] = rangeTerm.url;
                    break;
                 } else {
                     if (RDFTermFactory.isClass(rangeTerm)) {
                        output["@type"] = "@id";
                        break;
                    }
                }
            }
        }

        if (property.one_of?.length > 0 && !property.dataset) {
            // Thanks to Pierre-Antoine Champin for this tricky representation of the constraints.
            const mappings = property.one_of.map((term) => [term.id, term.url]);
            mappings.push(["@vocab", `${global.vocab_prefix}:INVALID_VALUE:`]);
            // Note that this may overwrite earlier values...
            output["@type"] = "@vocab";
            output["@context"] = Object.fromEntries(mappings);
        }

        if (property.dataset) {
            if (property.container === Container.set) {
                output["@container"] = ["@set", "@graph"];
            } else {
                output["@container"] = "@graph";
            }
            output["@type"]      = "@id";
        } else if (property.container !== undefined) {
            output["@container"] = `@${property.container}`;
        }

        // if only the URL is set, it makes the context simpler to use its direct value,
        // no need for an indirection
        return (Object.keys(output).length === 1) ? url: output;
    }

    // This is the top level context that will be returned to the caller
    const import_context = ((): Context => {
        if (global.import.length === 0) {
            return {};
        } else if( global.import.length === 1) {
            return {
                "@version" : "1.1",
                "@import" : global.import[0]
            }
        } else {
            return {
                "@version": "1.1",
                "@import" : global.import
            }
        }
    })();
    const top_level: Context = { ...import_context, ...preamble, ...global.aliases };

    // Set of properties that are "handled" as parts of embedded contexts of classes.
    // This is used to avoid repeating the properties at the top level
    const class_properties: Set<string> = new Set();

    // Add the classes; note that this will also cover the mapping of
    // all properties whose domain include a top level class
    for (const cl of vocab.classes) {
        const base_url = cl.prefix ? prefix_url(cl.prefix, vocab) : global.vocab_url;
        const url = `${base_url}${cl.id}`;

        // Create an embedded context for the class
        // starting with the preamble and the final URL for the class
        const embedded: Context = {
            ...preamble
        };

        // Get all the properties that have this class in its domain
        for (const prop of vocab.properties) {
            if (prop.domain) {
                if (RDFTermFactory.includesTerm(prop.domain, cl)) {
                    // bingo, this property can be added here
                    embedded[prop.known_as ?? prop.id] = propertyContext(prop);
                    class_properties.add(prop.id);
                }
            }
        }

        // If no properties are added, then the embedded context is unnecessary
        top_level[cl.known_as ?? cl.id] = (Object.keys(embedded).length === Object.keys(preamble).length)
            ? url
            : { "@id": url, "@context": embedded };
    }

    // Add the properties that have not been handled in the
    // previous step
    for (const prop of vocab.properties) {
        if (!class_properties.has(prop.id)) {
            top_level[prop.known_as ?? prop.id] = propertyContext(prop, false);
        }
    }

    // Add the individuals
    for (const individual of vocab.individuals) {
        top_level[individual.known_as ?? individual.id] = `${individual.url}`;
    }

    // Add the datatypes
    for (const datatype of vocab.datatypes) {
        top_level[datatype.known_as ?? datatype.id] = `${datatype.url}`;
    }

    // Done... just turn the result into bona fide (and readable) json
    const final_jsonld = JSON.stringify({ "@context": top_level });
    const nice_jsonld = beautify(final_jsonld, 'jsonld');
    return nice_jsonld;
}
