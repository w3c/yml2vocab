/**
 * Generate a (minimal) JSON-LD context file for the vocabulary 
 * (see the 'Vocab' interface).
 * 
 * @packageDocumentation
 */

import { Vocab, global, RDFProperty } from './common';

// Just to get an extra help from TS if I mistype something...
interface Context {
    [index: string]: string|Context|boolean;
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
 * @returns
 */
export function toContext(vocab: Vocab): string {
    // Generation of a unit for properties
    const propertyContext = (property: RDFProperty, for_class = true): Context|string => {
        // the real id of the property...
        const url = `${global.vocab_url}${property.id}`
        const retval: Context = {
            "@id" : url
        }
        if (for_class || property.type.includes("owl:ObjectProperty")) {
            retval["@type"] = "@id";
        }
        // Try to catch the datatype settings; these can be used
        // to set these in the context as well
        if (property.range) {
            for (const range of property.range) {
                if (range.startsWith("xsd:")) {
                    retval["@type"] = range.replace('xsd:', 'http://www.w3.org/2001/XMLSchema#');
                    break;
                } else if (range === "rdf:List") {
                    retval["@container"] = "@list"
                }
            } 
        }
        if (property.dataset) {
            retval["@container"] = "@graph";
        }

        // if only the URL is set, it makes the context simpler to use its direct value,
        // no need for an indirection
        return (Object.keys(retval).length === 1) ? url: retval;
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
        top_level[individual.id] = `${global.vocab_url}${individual.id}`
    }

    // Add the individuals
    for (const datatype of vocab.datatypes) {
        top_level[datatype.id] = `${global.vocab_url}${datatype.id}`;
    }


    // That is it... return the nicely formatted JSON text 
    return JSON.stringify({"@context" : top_level}, null, 4);
}
