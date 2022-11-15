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
export function to_context(vocab: Vocab): string {
    // Generation of a unit for properties
    const pr_context = (property: RDFProperty, for_class: boolean = true): Context|string => {
        // Set in case there is any "extra set beyond the simple ID setting"
        let extras = false;
        const url = `${global.vocab_url}${property.id}`
        const retval: Context = {
            "@id" : url
        }
        if (for_class || property.type.includes("owl:ObjectProperty")) {
            retval["@type"] = "@id";
            extras = true;
        }
        // Try to catch the datatype settings; these can be used
        // to set these in the context as well
        if (property.range) {
            for (const range of property.range) {
                if (range.startsWith("xsd:")) {
                    retval["@type"] = range.replace('xsd:', 'http://www.w3.org/2001/XMLSchema#');
                    extras = true
                    break;
                }
            } 
        }
        return (extras) ? retval : url;
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
        // Flag signalling whether there is any embedded properties at all
        let embedded_properties: boolean = false;
        // Get all the properties that have this class in its domain
        for (const prop of vocab.properties) {
            if (prop.domain && prop.domain.includes(prefixed_id)) {
                // bingo, this property can be added here
                embedded[prop.id] = pr_context(prop);
                class_properties.add(prop.id);
                embedded_properties = true;
            }
        }

        if (embedded_properties) {
            top_level[cl.id] = {
                "@id" : url,
                "@complex": embedded
            }
        } else {
            top_level[cl.id] =  url;
        }
    }

    // Add the properties that have not been handled in the 
    // previous step
    for (const prop of vocab.properties) {
        if (!class_properties.has(prop.id)) {
            top_level[prop.id] = pr_context(prop, false);
        }
    }

    // Finally, add the individuals
    for (const individual of vocab.individuals) {
        top_level[individual.id] = `${global.vocab_url}${individual.id}`
    }

    // That is it... return the nicely formatted JSON text 
    return JSON.stringify({"@context" : top_level}, null, 4);
}
