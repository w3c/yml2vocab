"use strict";
/**
 * Generate a (minimal) JSON-LD context file for the vocabulary
 * (see the 'Vocab' interface).
 *
 * @packageDocumentation
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.to_context = void 0;
const common_1 = require("./common");
// These are the context statements appearing in all 
// embedded contexts, as well as the top level one.
const preamble = {
    "@protected": true,
    "id": "@id",
    "type": "@type",
};
/**
 * Generate the minimal JSON-LD context for the vocabulary.
 *
 * @param vocab - The internal representation of the vocabulary
 * @returns
 */
function to_context(vocab) {
    // Generation of a unit for properties
    const pr_context = (property, for_class = true) => {
        // the real id of the property...
        const url = `${common_1.global.vocab_url}${property.id}`;
        const retval = {
            "@id": url
        };
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
                }
                else if (range === "rdf:List") {
                    retval["@container"] = "@list";
                }
            }
        }
        if (property.dataset) {
            retval["@container"] = "@graph";
        }
        // if only the URL is set, it makes the context simpler to use its direct value,
        // no need for an indirection
        return (Object.keys(retval).length === 1) ? url : retval;
    };
    // This is the top level context that will be returned to the caller
    const top_level = { ...preamble };
    // Set of properties that are "handled" as parts of embedded contexts of classes.
    // This is used to avoid repeating the properties at the top level
    const class_properties = new Set();
    // Not sure all the prefixes are necessary, but it probably does not harm...
    // for (const prefix of vocab.prefixes) {
    //     top_level[prefix.prefix] = prefix.url;
    // }
    // Add the classes; note that this will also cover the mapping of
    // all properties whose domain include a top level class
    for (const cl of vocab.classes) {
        const url = `${common_1.global.vocab_url}${cl.id}`;
        // Create an embedded context for the class
        // starting with the preamble and the final URL for the class
        const embedded = {
            ...preamble
        };
        // The domain field in the property structure contains
        // the prefixed version of the class ID...
        const prefixed_id = `${common_1.global.vocab_prefix}:${cl.id}`;
        // Flag signalling whether there is any embedded properties at all
        let embedded_properties = false;
        // Get all the properties that have this class in its domain
        for (const prop of vocab.properties) {
            if (prop.domain && prop.domain.includes(prefixed_id)) {
                // bingo, this property can be added here
                embedded[prop.id] = pr_context(prop);
                class_properties.add(prop.id);
                embedded_properties = true;
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
            top_level[prop.id] = pr_context(prop, false);
        }
    }
    // Finally, add the individuals
    for (const individual of vocab.individuals) {
        top_level[individual.id] = `${common_1.global.vocab_url}${individual.id}`;
    }
    // That is it... return the nicely formatted JSON text 
    return JSON.stringify({ "@context": top_level }, null, 4);
}
exports.to_context = to_context;
