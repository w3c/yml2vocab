  /**
 * Generate a (minimal) JSON-LD context file for the vocabulary 
 * (see the 'Vocab' interface).
 * 
 * @packageDocumentation
 */

import { Vocab, global, RDFProperty } from './common';

// Just to get an extra help from TS if I mistype something...
interface Context {
    [index: string]: string|Context|boolean|null;
}

// These are the context statements appearing in all 
// embedded contexts, as well as the top level one.
const preamble: Context = {
    "@protected": true,
    "id" : "@id",
    "type": "@type",
};

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

        const baseUrl: string = (()=> {
            for (const pr of vocab.prefixes) {
                if (property.prefix === pr.prefix) {
                    return pr.url;
                }
            }
            return global.vocab_url
        })();
        const url = `${baseUrl}${property.id}`;
        const output: Context = {
            "@id" : url
        }
        if (forClass && property.type.includes("owl:ObjectProperty")) {
            output["@type"] = "@id";
        }
        // Try to catch the datatype settings; these can be used
        // to set these in the context as well
        if (property.range) {
            for (const range of property.range) {
                if (range.startsWith("xsd:")) {
                    output["@type"] = range.replace('xsd:', 'http://www.w3.org/2001/XMLSchema#');
                    break;
                } else if (range === "rdf:JSON") {
                    output["@type"] = "@json";
                    break;
                } else if (["rdf:HTML", "rdf:XMLLiteral", "rdf:PlainLiteral", "rdf:langString"].includes(range)) {
                    output["@type"] = range.replace("rdf:", "http://www.w3.org/1999/02/22-rdf-syntax-ns#");
                    break;
                } else if (range === "rdf:List") {
                    output["@container"] = "@list";
                    break;
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

    // Not sure all the prefixes are necessary, but it probably does not harm...
    // for (const prefix of vocab.prefixes) {
    //     top_level[prefix.prefix] = prefix.url;
    // }

    // Add the classes; note that this will also cover the mapping of
    // all properties whose domain include a top level class
    for (const cl of vocab.classes) {
        const url = `${global.vocab_url}${cl.id}`;
        // Create an embedded context for the class
        // starting with the preamble and the final URL for the class
        const embedded: Context = {
            ...preamble
        };

        // The domain field in the property structure contains
        // the prefixed version of the class ID...
        const prefixed_id = `${global.vocab_prefix}:${cl.id}`;
        // Get all the properties that have this class in its domain
        for (const prop of vocab.properties) {
            if (prop.domain && prop.domain.includes(prefixed_id)) {
                // bingo, this property can be added here
                embedded[prop.id] = propertyContext(prop);
                class_properties.add(prop.id);
            }
        }

        // If no properties are added, then the embedded context is unnecessary
        top_level[cl.id] = (Object.keys(embedded).length === Object.keys(preamble).length) ? 
            url : { "@id": url, "@context": embedded };
    }

    // Add the properties that have not been handled in the 
    // previous step
    for (const prop of vocab.properties) {
        if (!class_properties.has(prop.id)) {
            top_level[prop.id] = propertyContext(prop, false);
        }
    }

    // Add the individuals
    for (const individual of vocab.individuals) {
        top_level[individual.id] = `${global.vocab_url}${individual.id}`;
    }

    // Add the datatypes
    for (const datatype of vocab.datatypes) {
        top_level[datatype.id] = `${global.vocab_url}${datatype.id}`;
    }


    // That is it... return the nicely formatted JSON text 
    return JSON.stringify({"@context" : top_level}, null, 4);
}
