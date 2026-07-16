/**
 * Convert the internal representation of the vocabulary into JSONType-LD
 * (see the 'Vocab' interface).
 *
 * @packageDocumentation
 */
// deno-lint-ignore-file no-explicit-any

import { type Vocab, global, type RDFTerm, type Link, Status, Container } from './common';
import { requiredJsonPrefixes }                                           from './common';
import { beautify }                                                       from './beautify';
import { factory }                                                        from './factory';


type JSONType = Record<string,unknown>;

// Generic context. All items may not be used in a specific vocabulary, but it
// is not harmful to have them here.
const generic_context = {
    "dc:date":                  { "@type": "xsd:date" },
    "rdfs:domain":              { "@type": "@id" },
    "rdfs:range":               { "@type": "@id" },
    "rdfs:seeAlso":             { "@type": "@id" },
    "rdfs:subClassOf":          { "@type": "@id" },
    "rdfs:subPropertyOf":       { "@type": "@id" },
    "rdfs:isDefinedBy":         { "@type": "@id" },
    // "owl:equivalentClass":      { "@type": "@vocab" },
    // "owl:equivalentProperty":   { "@type": "@vocab" },
    "owl:oneOf":                { "@container": "@list", "@type": "@vocab" },
    "owl:deprecated":           { "@type": "xsd:boolean" },
    // "owl:imports":              { "@type": "@id" },
    // "owl:versionInfo":          { "@type": "@id" },
    "owl:inverseOf":            { "@type": "@vocab" },
    "owl:unionOf":              { "@container": "@list", "@type": "@vocab" },
    "rdfs_classes":             { "@reverse": "rdfs:isDefinedBy", "@type": "@id" },
    "rdfs_properties":          { "@reverse": "rdfs:isDefinedBy", "@type": "@id" },
    "rdfs_individuals":         { "@reverse": "rdfs:isDefinedBy", "@type": "@id" },
    "rdfs_datatypes":           { "@reverse": "rdfs:isDefinedBy", "@type": "@id" },
    "mentions":                 { "@id": "schema:mentions",  "@type": "@id" },
}

/**
 * Generate the JSONType-LD representation of the vocabulary.
 *
 * The function does not generate JSONType-LD directly; instead, a standard JS object
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
 * @param vocab - The internal representation of the vocabulary
 * @returns
 */
export function toJSONLD(vocab: Vocab): string {
    const termToStringCallback = (t: RDFTerm): string => `${t}`;

    // Handling of the domain is a bit complicated due to the usage
    // of the owl:unionOf construct; factored it here to make the
    // code more readable.
    const multiDomain = (term: RDFTerm[]): unknown => {
        const value: string[] = term.map(termToStringCallback);
        if (value.length === 1) {
            return value[0];
        } else {
            return {
                "@type": "owl:Class",
                "owl:unionOf": value,
            };
        }
    };

    // Like domain, but the creation of a union structure is conditional.
    const multiRange = (term: RDFTerm[], union: boolean, one_of: undefined | RDFTerm[]): any[] => {
        const basicRange: any[] = ((): any[] => {
            const value: string[] = term.map(termToStringCallback);
            if (value.length === 1) {
                return value;
            } else if (union) {
                return [
                    {
                        "@type": "ows:Class",
                        "owl:unionOf": value,
                    },
                ];
            } else {
                return value;
            }
        })();

        const extra: any[] = ((): any[] => {
            if (one_of && one_of.length > 0) {
                const value: string[] = one_of.map(termToStringCallback);
                return [
                    {
                        "@type": "owl:class",
                        "owl:oneOf": value,
                    },
                ];
            } else {
                return [];
            }
        })();

        return [...basicRange, ...extra];
    };

    // This is the target object
    const jsonld: JSONType = {};

    // Factoring out the common fields
    const commonFields = (target: JSONType, entry: RDFTerm): void => {
        target["rdfs:label"] = entry.label;
        if (entry.comment !== "") {
            target["rdfs:comment"] = {
                "@value": `<div>${entry.comment}</div>`,
                "@type": "http://www.w3.org/1999/02/22-rdf-syntax-ns#HTML",
            };
        }
        if (entry.defined_by?.length !== 0) {
            if (entry.defined_by?.length === 1) {
                target["rdfs:isDefinedBy"] = entry.defined_by[0];
            } else {
                target["rdfs:isDefinedBy"] = entry.defined_by;
            }
        }
        target["vs:term_status"] = `${entry.status}`;
        if (entry.see_also && entry.see_also.length > 0) {
            target["rdfs:seeAlso"] = entry.see_also.map((link: Link): string => link.url);
        }
    };

    // Creation of the context: take the prefixes from the vocabulary definition
    // and add the generic context
    {
        let context: JSONType = {};
        for (const prefix of vocab.prefixes) {
            if (requiredJsonPrefixes.includes(prefix.prefix) || factory.usesPrefix(prefix.prefix)) {
                context[prefix.prefix] = prefix.url;
            }
        }
        context = { ...context, ...generic_context };
        jsonld["@context"] = context;
    }

    // Do we have to generate the reference to contexts that mention a specific term?
    const contextsMentions: boolean = ((): boolean => {
        for (const ctx of Object.keys(global.context_mentions)) {
            const terms = global.context_mentions[ctx];
            if (terms.length > 0) return true;
        }
        return false;
    })();

    const target: JSONType = ((): JSONType => {
        if (contextsMentions) {
            // The real values are added at the very end, to put the context
            // mentions at the end of the JSONType-LD file
            const contents: JSONType[] = [{}];
            jsonld["@graph"] = contents;
            return contents[0];
        } else {
            return jsonld;
        }
    })();

    // That is the core: the ID of the ontology itself!
    target["@id"] = global.vocab_url;

    // Here we go, category by category...
    {
        // The Ontology properties are all top level...
        target["@type"] = "owl:Ontology";
        for (const ont of vocab.ontology_properties) {
            if (ont.property === "dc:date" || ont.url) {
                target[ont.property] = ont.value;
            } else if (ont.property === "dc:description") {
                target[ont.property] = {
                    "@value": ont.value,
                    "@type": "http://www.w3.org/1999/02/22-rdf-syntax-ns#HTML",
                };
            } else {
                target[ont.property] = {
                    "@value": ont.value,
                    "@language": "en",
                };
            }
        }
    }

    {
        // Get the properties
        const properties: JSONType[] = [];
        for (const prop of vocab.properties) {
            if (!prop.external) {
                const pr_object: JSONType = {};
                pr_object["@id"] = `${prop}`;
                if (prop.type.length === 1) {
                    pr_object["@type"] = `${prop.type[0]}`;
                } else {
                    pr_object["@type"] = prop.type.map(termToStringCallback);
                }
                if (prop.status === Status.deprecated) {
                    pr_object["owl:deprecated"] = true;
                }
                if (prop.subPropertyOf && prop.subPropertyOf.length > 0) {
                    pr_object["rdfs:subPropertyOf"] = prop.subPropertyOf.map(termToStringCallback);
                }
                if (prop.domain && prop.domain.length > 0) {
                    pr_object["rdfs:domain"] = multiDomain(prop.domain);
                }
                if (prop.container === Container.list) {
                    pr_object["rdfs:range"] = "rdf:List";
                } else if (prop.range?.length > 0 || prop.one_of?.length > 0) {
                    const range = multiRange(prop.range, prop.range_union, prop.one_of);
                    pr_object["rdfs:range"] = range.length > 1 ? range : range[0];
                }
                commonFields(pr_object, prop);
                // contexts(pr_object, prop);
                properties.push(pr_object);
            }
        }
        if (properties.length > 0) target.rdfs_properties = properties;
    }

    {
        // Get the classes
        const classes: JSONType[] = [];
        for (const cl of vocab.classes) {
            if (!cl.external) {
                const cl_object: JSONType = {};
                cl_object["@id"] = `${cl}`;
                if (cl.type.length === 1) {
                    cl_object["@type"] = `${cl.type[0]}`;
                } else {
                    cl_object["@type"] = cl.type.map(termToStringCallback);
                }
                if (cl.status === Status.deprecated) {
                    cl_object["owl:deprecated"] = true;
                }
                if (cl.subClassOf && cl.subClassOf.length > 0) {
                    if (cl.subClassOf.length > 1 && cl.upper_union) {
                        cl_object["rdfs:subClassOf"] = {
                            "@type": "owl:Class",
                            "owl:unionOf": cl.subClassOf.map(termToStringCallback),
                        };
                    } else {
                        cl_object["rdfs:subClassOf"] = cl.subClassOf.map(termToStringCallback);
                    }
                }
                if (cl.one_of && cl.one_of.length > 0) {
                    cl_object["owl:oneOf"] = cl.one_of.map(termToStringCallback);
                }
                commonFields(cl_object, cl);
                // contexts(cl_object, cl);
                classes.push(cl_object);
            }
        }
        if (classes.length > 0) target.rdfs_classes = classes;
    }

    {
        // Get the individuals
        const individuals: JSONType[] = [];
        for (const ind of vocab.individuals) {
            if (!ind.external) {
                const ind_object: JSONType = {};
                ind_object["@id"] = `${ind}`;
                if (ind.type.length === 0) {
                    ind_object["@type"] = "rdfs:Resource";
                } else if (ind.type.length === 1) {
                    ind_object["@type"] = `${ind.type[0]}`;
                } else {
                    ind_object["@type"] = ind.type.map(termToStringCallback);
                }
                if (ind.status === Status.deprecated) {
                    ind_object["owl:deprecated"] = true;
                }
                commonFields(ind_object, ind);
                // contexts(ind_object, ind);
                individuals.push(ind_object);
            }
        }
        if (individuals.length > 0) target.rdfs_individuals = individuals;
    }

    {
        // Get the datatypes
        const datatypes: JSONType[] = [];
        for (const dt of vocab.datatypes) {
            if (!dt.external) {
                const dt_object: JSONType = {};
                dt_object["@id"] = `${dt}`;
                dt_object["@type"] = "rdfs:Datatype";
                if (dt.type && dt.type.length > 0) {
                    if (dt.type.length > 1 && dt.upper_union) {
                        dt_object["rdfs:subClassOf"] = {
                            "@type": "owl:Class",
                            "owl:unionOf": dt.type.map(termToStringCallback),
                        };
                    } else {
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
                datatypes.push(dt_object);
            }
        }
        if (datatypes.length > 0) target.rdfs_datatypes = datatypes;
    }

    // Add, if applicable, the context mentions to the array of graphs in the output
    if (contextsMentions) {
        // Take all the context mentions one by one, and add a new @graph entry...
        for (const ctx of Object.keys(global.context_mentions)) {
            const mentions: JSONType = {};
            const terms = global.context_mentions[ctx];
            if (terms.length === 0) {
                continue;
            }
            // The default sort is the alphabetical sort of the string representation, which is, in this case
            // the curie of the term.
            terms.sort();
            mentions["@id"] = `${ctx}`;
            mentions["@type"] = "jsonld:Context";
            mentions["mentions"] = terms.map((term: RDFTerm): string => `${term}`);
            (jsonld["@graph"] as JSONType[]).push(mentions);
        }
    }

    // Done... just turn the result into bona fide (and readable) json
    const final_jsonld = JSON.stringify(jsonld);
    const nice_jsonld = beautify(final_jsonld, "jsonld");
    return nice_jsonld;
}
