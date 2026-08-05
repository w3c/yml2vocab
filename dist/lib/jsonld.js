"use strict";
/**
 * Convert the internal representation of the vocabulary into JSONType-LD
 * (see the 'Vocab' interface).
 *
 * @packageDocumentation
 */
// deno-lint-ignore-file no-explicit-any
Object.defineProperty(exports, "__esModule", { value: true });
exports.toJSONLD = toJSONLD;
const common_1 = require("./common");
const common_2 = require("./common");
const beautify_1 = require("./beautify");
const factory_1 = require("./factory");
// Generic context. All items may not be used in a specific vocabulary, but it
// is not harmful to have them here.
const generic_context = {
    "dc:date": { "@type": "xsd:date" },
    "rdfs:domain": { "@type": "@id" },
    "rdfs:range": { "@type": "@id" },
    "rdfs:seeAlso": { "@type": "@id" },
    "rdfs:subClassOf": { "@type": "@id" },
    "rdfs:subPropertyOf": { "@type": "@id" },
    "rdfs:isDefinedBy": { "@type": "@id" },
    // "owl:equivalentClass":      { "@type": "@vocab" },
    // "owl:equivalentProperty":   { "@type": "@vocab" },
    "owl:oneOf": { "@container": "@list", "@type": "@vocab" },
    "owl:deprecated": { "@type": "xsd:boolean" },
    // "owl:imports":              { "@type": "@id" },
    // "owl:versionInfo":          { "@type": "@id" },
    "owl:inverseOf": { "@type": "@vocab" },
    "owl:unionOf": { "@container": "@list", "@type": "@vocab" },
    mentions: { "@id": "schema:mentions", "@type": "@id" }
};
/**
 * Generate the JSON-LD representation of the vocabulary.
 *
 * The function does not generate JSON-LD directly; instead, a standard JS object
 * is generated and the built-in JSON serializer takes care of the idiosyncrasies of
 * the JSON syntax.
 *
 * @param vocab - The internal representation of the vocabulary
 * @returns
 */
function toJSONLD(vocab) {
    // This is the target object, serialized at the end.
    const jsonld = {};
    /* ****** All kinds of internal utility functions ****** */
    const termToStringCallback = (t) => `${t}`;
    // Handling of the domain is a bit complicated due to the usage
    // of the owl:unionOf construct; factored it here to make the
    // code more readable.
    const multiDomain = (term) => {
        const value = term.map(termToStringCallback);
        if (value.length === 1) {
            return value[0];
        }
        else {
            return {
                "@type": "owl:Class",
                "owl:unionOf": value,
            };
        }
    };
    // Like domain, but the creation of a union structure is conditional.
    const multiRange = (term, union, one_of) => {
        const basicRange = (() => {
            const value = term.map(termToStringCallback);
            if (value.length === 1) {
                return value;
            }
            else if (union) {
                return [
                    {
                        "@type": "ows:Class",
                        "owl:unionOf": value,
                    },
                ];
            }
            else {
                return value;
            }
        })();
        const extra = (() => {
            if (one_of && one_of.length > 0) {
                const value = one_of.map(termToStringCallback);
                return [
                    {
                        "@type": "owl:class",
                        "owl:oneOf": value,
                    },
                ];
            }
            else {
                return [];
            }
        })();
        return [...basicRange, ...extra];
    };
    // Factoring out the common fields
    const commonFields = (target, entry) => {
        target["rdfs:label"] = entry.label;
        if (entry.comment !== "") {
            target["rdfs:comment"] = {
                "@value": `<div>${entry.comment}</div>`,
                "@type": "http://www.w3.org/1999/02/22-rdf-syntax-ns#HTML",
            };
        }
        if (entry.defined_by && entry.defined_by?.length !== 0) {
            target["rdfs:isDefinedBy"] = [...entry.defined_by, common_1.global.vocab_url];
        }
        else {
            target["rdfs:isDefinedBy"] = common_1.global.vocab_url;
        }
        target["vs:term_status"] = `${entry.status}`;
        if (entry.see_also && entry.see_also.length > 0) {
            target["rdfs:seeAlso"] = entry.see_also.map((link) => link.url);
        }
    };
    // Creation of the context: take the prefixes from the vocabulary definition
    // and add the generic context
    {
        let context = {};
        for (const prefix of vocab.prefixes) {
            if (common_2.requiredJsonPrefixes.includes(prefix.prefix) || factory_1.factory.usesPrefix(prefix.prefix)) {
                context[prefix.prefix] = prefix.url;
            }
        }
        context = { ...context, ...generic_context };
        jsonld["@context"] = context;
    }
    /* ******** Here we go, category by category... ******* */
    /* ****** Set up the overall structure of the generated JSON-LD ****** */
    // Each term, as well as the context references, are put into a separate graph
    // Based on the idea of PA, the term @included is used instead of @graph
    // avoiding the semantic ambiguity of that term...
    const graphs = [];
    jsonld["@included"] = graphs;
    // Get the ontology description itself
    {
        const ontology = {};
        graphs.push(ontology);
        // That is the core: the ID of the ontology itself!
        ontology["@id"] = common_1.global.vocab_url;
        ontology["@type"] = "owl:Ontology";
        for (const ont of vocab.ontology_properties) {
            if (ont.property === "dc:date" || ont.url) {
                ontology[ont.property] = ont.value;
            }
            else if (ont.property === "dc:description") {
                ontology[ont.property] = {
                    "@value": ont.value,
                    "@type": "http://www.w3.org/1999/02/22-rdf-syntax-ns#HTML",
                };
            }
            else {
                ontology[ont.property] = {
                    "@value": ont.value,
                    "@language": "en",
                };
            }
        }
    }
    // Get the properties
    for (const prop of vocab.properties) {
        if (!prop.external) {
            const pr_object = {};
            graphs.push(pr_object);
            pr_object["@id"] = `${prop}`;
            if (prop.type.length === 1) {
                pr_object["@type"] = `${prop.type[0]}`;
            }
            else {
                pr_object["@type"] = prop.type.map(termToStringCallback);
            }
            if (prop.status === common_1.Status.deprecated) {
                pr_object["owl:deprecated"] = true;
            }
            if (prop.subPropertyOf && prop.subPropertyOf.length > 0) {
                pr_object["rdfs:subPropertyOf"] = prop.subPropertyOf.map(termToStringCallback);
            }
            if (prop.domain && prop.domain.length > 0) {
                pr_object["rdfs:domain"] = multiDomain(prop.domain);
            }
            if (prop.container === common_1.Container.list) {
                pr_object["rdfs:range"] = "rdf:List";
            }
            else if (prop.range?.length > 0 || prop.one_of?.length > 0) {
                // When the enumeration is open, the one_of values are not turned into an
                // anonymous owl:oneOf class; instead, a fresh named class was added to prop.range.
                const range = multiRange(prop.range, prop.range_union, prop.open_enumeration ? undefined : prop.one_of);
                pr_object["rdfs:range"] = range.length > 1 ? range : range[0];
            }
            commonFields(pr_object, prop);
            // contexts(pr_object, prop);
        }
    }
    // Get the classes
    for (const cl of vocab.classes) {
        if (!cl.external) {
            const cl_object = {};
            graphs.push(cl_object);
            cl_object["@id"] = `${cl}`;
            if (cl.type.length === 1) {
                cl_object["@type"] = `${cl.type[0]}`;
            }
            else {
                cl_object["@type"] = cl.type.map(termToStringCallback);
            }
            if (cl.status === common_1.Status.deprecated) {
                cl_object["owl:deprecated"] = true;
            }
            if (cl.subClassOf && cl.subClassOf.length > 0) {
                if (cl.subClassOf.length > 1 && cl.upper_union) {
                    cl_object["rdfs:subClassOf"] = {
                        "@type": "owl:Class",
                        "owl:unionOf": cl.subClassOf.map(termToStringCallback),
                    };
                }
                else {
                    cl_object["rdfs:subClassOf"] = cl.subClassOf.map(termToStringCallback);
                }
            }
            if (cl.one_of && cl.one_of.length > 0) {
                cl_object["owl:oneOf"] = cl.one_of.map(termToStringCallback);
            }
            commonFields(cl_object, cl);
            // contexts(cl_object, cl);
        }
    }
    // Get the individuals
    for (const ind of vocab.individuals) {
        if (!ind.external) {
            const ind_object = {};
            graphs.push(ind_object);
            ind_object["@id"] = `${ind}`;
            if (ind.type.length === 0) {
                ind_object["@type"] = "rdfs:Resource";
            }
            else if (ind.type.length === 1) {
                ind_object["@type"] = `${ind.type[0]}`;
            }
            else {
                ind_object["@type"] = ind.type.map(termToStringCallback);
            }
            if (ind.status === common_1.Status.deprecated) {
                ind_object["owl:deprecated"] = true;
            }
            commonFields(ind_object, ind);
            // contexts(ind_object, ind);
        }
    }
    // Get the datatypes
    for (const dt of vocab.datatypes) {
        if (!dt.external) {
            const dt_object = {};
            graphs.push(dt_object);
            dt_object["@id"] = `${dt}`;
            dt_object["@type"] = "rdfs:Datatype";
            if (dt.type && dt.type.length > 0) {
                if (dt.type.length > 1 && dt.upper_union) {
                    dt_object["rdfs:subClassOf"] = {
                        "@type": "owl:Class",
                        "owl:unionOf": dt.type.map(termToStringCallback),
                    };
                }
                else {
                    dt_object["rdfs:subClassOf"] = dt.type.map(termToStringCallback);
                }
            }
            if (dt.pattern) {
                dt_object["owl:onDatatype"] = "xsd:string";
                dt_object["owl:withRestrictions"] = {
                    "@list": [
                        {
                            "xsd:pattern": `${dt.pattern}`,
                        },
                    ],
                };
            }
            commonFields(dt_object, dt);
            // contexts(dt_object, dt);
        }
    }
    // Add, if applicable, the context mentions to the array of graphs in the output
    // Do we have to generate the reference to contexts that mention a specific term?
    const contextsMentions = (() => {
        for (const ctx of Object.keys(common_1.global.context_mentions)) {
            const terms = common_1.global.context_mentions[ctx];
            if (terms.length > 0)
                return true;
        }
        return false;
    })();
    if (contextsMentions) {
        // Take all the context mentions one by one, and add a new @graph entry...
        for (const ctx of Object.keys(common_1.global.context_mentions)) {
            const mentions = {};
            graphs.push(mentions);
            const terms = common_1.global.context_mentions[ctx];
            if (terms.length === 0) {
                continue;
            }
            // The default sort is the alphabetical sort of the string representation, which is, in this case
            // the curie of the term.
            terms.sort();
            mentions["@id"] = `${ctx}`;
            mentions["@type"] = "jsonld:Context";
            mentions["mentions"] = terms.map((term) => `${term}`);
        }
    }
    // Done... just turn the result into bona fide (and readable) json
    const final_jsonld = JSON.stringify(jsonld);
    const nice_jsonld = (0, beautify_1.beautify)(final_jsonld, "jsonld");
    return nice_jsonld;
}
