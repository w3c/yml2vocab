  /**
 * Generate a (minimal) JSON-LD context file for the vocabulary 
 * (see the 'Vocab' interface).
 * 
 * @packageDocumentation
 */

import { Vocab, global, RDFProperty } from './common';
import { RDFTermFactory }             from './factory';

// Just to get an extra help from TS if I mistype something...
interface Context {
    [index: string]: string|Context|boolean|null;
}

// These are the context statements appearing in all 
// embedded contexts, as well as the top level one.
const preamble: Context = {
    "@protected" : true,
    "id"         : "@id",
    "type"       : "@type",
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
                } else if (curie === "rdf:List") {
                    output["@container"] = "@list";
                    break;
                } else if (RDFTermFactory.includesCurie(property.type, "owl:DatatypeProperty")) {
                    // This is the case when the property refers to an explicitly defined, non-standard datatype
                    output["@type"] = rangeTerm.url;
                    break;
                } else {
                    // if range is a class, then it is a reference
                    if (RDFTermFactory.isClass(rangeTerm)) {
                        output["@type"] = "@id";
                        break;
                    }
                }
            } 
        }
        if (property.dataset) {
            output["@container"] = "@graph";
            output["@type"]      = "@id";
        }

        // if only the URL is set, it makes the context simpler to use its direct value,
        // no need for an indirection
        return (Object.keys(output).length === 1) ? url: output;
    }

    // This is the top level context that will be returned to the caller
    const top_level: Context = {...preamble};

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


    // That is it... return the nicely formatted JSON text 
    return JSON.stringify({"@context" : top_level}, null, 4);
}
