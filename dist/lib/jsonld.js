"use strict";
/**
 * Convert the internal representation of the vocabulary into JSON-LD
 * (see the 'Vocab' interface).
 *
 * @packageDocumentation
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.toJSONLD = toJSONLD;
const common_1 = require("./common");
// Generic context. All items may not be used in a specific vocabulary, but it
// is not harmful to have them here.
const generic_context = {
    "dc:date": { "@type": "xsd:date" },
    "rdfs:domain": { "@type": "@id" },
    "rdfs:range": { "@type": "@id" },
    "rdfs:seeAlso": { "@type": "@id" },
    "rdfs:subClassOf": { "@type": "@id" },
    "rdfs:subPropertyOf": { "@type": "@id" },
    "owl:equivalentClass": { "@type": "@vocab" },
    "owl:equivalentProperty": { "@type": "@vocab" },
    "owl:oneOf": { "@container": "@list", "@type": "@vocab" },
    "owl:deprecated": { "@type": "xsd:boolean" },
    "owl:imports": { "@type": "@id" },
    "owl:versionInfo": { "@type": "@id" },
    "owl:inverseOf": { "@type": "@vocab" },
    "owl:unionOf": { "@container": "@list", "@type": "@vocab" },
    "rdfs_classes": { "@reverse": "rdfs:isDefinedBy", "@type": "@id" },
    "rdfs_properties": { "@reverse": "rdfs:isDefinedBy", "@type": "@id" },
    "rdfs_instances": { "@reverse": "rdfs:isDefinedBy", "@type": "@id" },
    "rdfs_datatypes": { "@reverse": "rdfs:isDefinedBy", "@type": "@id" },
    "mentioned": { "@reverse": "schema:mentions", "@type": "@id" },
    "dc:title": { "@container": "@language" },
    "dc:description": { "@container": "@language" },
};
/**
 * Generate the JSON-LD representation of the vocabulary.
 *
 * The function does not generate JSON-LD directly; instead, a standard JS object
 * is generated and the built-in JSON serializer takes care of the idiosyncrasies of
 * the JSON syntax.
 *
 * There is one neat trick in the generated code: the JSON-LD code, usually,
 * becomes very complicated if the structure is not a tree. This problem is handled here
 * by the repeated usage of reverse properties that put, in the JSON sense,
 * the vocabulary itself on the top, linked to the individual terms via a
 * (reversed) rdfs:isDefinedBy. (See the definition of the 'rdfs_classes',
 * 'rdfs_properties', and 'rdfs_instances'). Thanks to Gregg Kellogg for that trick...
 *
 *
 * @param vocab - The internal representation of the vocabulary
 * @returns
 */
function toJSONLD(vocab) {
    // Handling of the domain is a bit complicated due to the usage
    // of the owl:unionOf construct; factored it here to make the 
    // code more readable.
    const multiDomain = (term) => {
        const value = term.map((t) => t.curie);
        if (value.length === 1) {
            return value[0];
        }
        else {
            return {
                "owl:unionOf": value
            };
        }
    };
    // This is just for symmetry v.a.v. the domain...
    const multiRange = (term) => {
        const value = term.map((t) => t.curie);
        if (value.length === 1) {
            return value[0];
        }
        else {
            return value;
        }
    };
    // This is the target object
    const jsonld = {};
    // Factoring out the common fields
    const commonFields = (target, entry) => {
        target["rdfs:label"] = entry.label;
        if (entry.comment !== '') {
            target["rdfs:comment"] = {
                "@value": `<div>${entry.comment}</div>`,
                "@type": "http://www.w3.org/1999/02/22-rdf-syntax-ns#HTML"
            };
        }
        if (entry.defined_by?.length !== 0) {
            if (entry.defined_by?.length === 1) {
                target["rdfs:isDefinedBy"] = entry.defined_by[0];
            }
            else {
                target["rdfs:isDefinedBy"] = entry.defined_by;
            }
        }
        target["vs:term_status"] = `${entry.status}`;
        if (entry.see_also && entry.see_also.length > 0) {
            target["rdfs:seeAlso"] = entry.see_also.map((link) => link.url);
        }
    };
    const contexts = (target, entry) => {
        if (entry.context !== undefined && entry.context.length !== 0) {
            target["mentioned"] = entry.context.map((ctx) => {
                return {
                    "@id": ctx,
                    "@type": "jsonld:Context"
                };
            });
        }
    };
    // Creation of the context: take the prefixes from the vocabulary definition
    // and add the generic context
    {
        let context = {};
        for (const prefix of vocab.prefixes) {
            context[prefix.prefix] = prefix.url;
        }
        context = { ...context, ...generic_context };
        jsonld["@context"] = context;
    }
    // That is the core: the ID of the ontology itself!
    jsonld["@id"] = common_1.global.vocab_url;
    // Here we go, category by category...
    {
        // The Ontology properties are all top level...
        jsonld["@type"] = "owl:Ontology";
        for (const ont of vocab.ontology_properties) {
            if (ont.property === 'dc:date' || ont.url) {
                jsonld[ont.property] = ont.value;
            }
            else if (ont.property === 'dc:description') {
                jsonld[ont.property] = {
                    "@value": ont.value,
                    "@type": "http://www.w3.org/1999/02/22-rdf-syntax-ns#HTML"
                };
            }
            else {
                jsonld[ont.property] = {
                    "@value": ont.value,
                    "@language": "en"
                };
            }
        }
    }
    {
        // Get the properties
        const properties = [];
        for (const prop of vocab.properties) {
            if (!prop.external) {
                const pr_object = {};
                pr_object["@id"] = `${common_1.global.vocab_prefix}:${prop.id}`;
                if (prop.type.length === 1) {
                    pr_object["@type"] = prop.type[0];
                }
                else {
                    pr_object["@type"] = prop.type;
                }
                if (prop.status === common_1.Status.deprecated) {
                    pr_object["owl:deprecated"] = true;
                }
                if (prop.subPropertyOf && prop.subPropertyOf.length > 0) {
                    pr_object["rdfs:subPropertyOf"] = prop.subPropertyOf;
                }
                if (prop.domain) {
                    pr_object["rdfs:domain"] = multiDomain(prop.domain);
                }
                if (prop.range) {
                    pr_object["rdfs:range"] = multiRange(prop.range);
                }
                commonFields(pr_object, prop);
                contexts(pr_object, prop);
                properties.push(pr_object);
            }
        }
        if (properties.length > 0)
            jsonld.rdfs_properties = properties;
    }
    {
        // Get the classes
        const classes = [];
        for (const cl of vocab.classes) {
            if (!cl.external) {
                const cl_object = {};
                cl_object["@id"] = `${common_1.global.vocab_prefix}:${cl.id}`;
                if (cl.type.length === 1) {
                    cl_object["@type"] = cl.type[0];
                }
                else {
                    cl_object["@type"] = cl.type;
                }
                if (cl.status === common_1.Status.deprecated) {
                    cl_object["owl:deprecated"] = true;
                }
                if (cl.subClassOf && cl.subClassOf.length > 0) {
                    cl_object["rdfs:subClassOf"] = cl.subClassOf;
                }
                commonFields(cl_object, cl);
                contexts(cl_object, cl);
                classes.push(cl_object);
            }
        }
        if (classes.length > 0)
            jsonld.rdfs_classes = classes;
    }
    {
        // Get the individuals
        const individuals = [];
        for (const ind of vocab.individuals) {
            if (!ind.external) {
                const ind_object = {};
                ind_object["@id"] = `${common_1.global.vocab_prefix}:${ind.id}`;
                if (ind.type.length === 1) {
                    ind_object["@type"] = ind.type[0];
                }
                else {
                    ind_object["@type"] = ind.type;
                }
                if (ind.status === common_1.Status.deprecated) {
                    ind_object["owl:deprecated"] = true;
                }
                commonFields(ind_object, ind);
                contexts(ind_object, ind);
                individuals.push(ind_object);
            }
        }
        if (individuals.length > 0)
            jsonld.rdfs_individuals = individuals;
    }
    {
        // Get the datatypes
        const datatypes = [];
        for (const dt of vocab.datatypes) {
            if (!dt.external) {
                const dt_object = {};
                dt_object["@id"] = `${common_1.global.vocab_prefix}:${dt.id}`;
                dt_object["@type"] = `rdfs:Datatype`;
                if (dt.subClassOf && dt.subClassOf.length > 0) {
                    dt_object["rdfs:subClassOf"] = dt.subClassOf;
                }
                commonFields(dt_object, dt);
                contexts(dt_object, dt);
                datatypes.push(dt_object);
            }
        }
        if (datatypes.length > 0)
            jsonld.rdfs_datatypes = datatypes;
    }
    // Done... just turn the result into bona fide (and readable) json
    return JSON.stringify(jsonld, null, 4);
}
