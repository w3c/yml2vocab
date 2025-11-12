/**
 * Convert the internal representation of the vocabulary into JSON-LD
 * (see the 'Vocab' interface).
 *
 * @packageDocumentation
 */

import { type Vocab, global, type RDFTerm, type Link, Status, Container } from './common';
import { beautify }                                                       from './beautify';

type JSON = Record<string,unknown>;

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
    "owl:equivalentClass":      { "@type": "@vocab" },
    "owl:equivalentProperty":   { "@type": "@vocab" },
    "owl:oneOf":                { "@container": "@list", "@type": "@vocab" },
    "owl:deprecated":           { "@type": "xsd:boolean" },
    "owl:imports":              { "@type": "@id" },
    "owl:versionInfo":          { "@type": "@id" },
    "owl:inverseOf":            { "@type": "@vocab" },
    "owl:unionOf":              { "@container": "@list", "@type": "@vocab" },
    "rdfs_classes":             { "@reverse": "rdfs:isDefinedBy", "@type": "@id" },
    "rdfs_properties":          { "@reverse": "rdfs:isDefinedBy", "@type": "@id" },
    "rdfs_individuals":         { "@reverse": "rdfs:isDefinedBy", "@type": "@id" },
    "rdfs_datatypes":           { "@reverse": "rdfs:isDefinedBy", "@type": "@id" },
    "mentioned":                { "@reverse": "schema:mentions",  "@type": "@id" },
}

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
                "owl:unionOf": value
            };
        }
    }

    // This is just for symmetry v.a.v. the domain...
    const multiRange = (term: RDFTerm[]): unknown => {
        const value: string[] = term.map(termToStringCallback);
        if (value.length === 1) {
            return value[0];
        } else {
            return value;
        }
    }

    // This is the target object
    const jsonld: JSON = {}

    // Factoring out the common fields
    const commonFields = (target: JSON, entry: RDFTerm): void => {
        target["rdfs:label"]  = entry.label;
        if (entry.comment !== '') {
            target["rdfs:comment"] = {
                "@value" : `<div>${entry.comment}</div>`,
                "@type"  : "http://www.w3.org/1999/02/22-rdf-syntax-ns#HTML"
            }
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
            target["rdfs:seeAlso"] = entry.see_also.map( (link: Link): string => link.url);
        }
    }

    const contexts = (target: JSON, entry: RDFTerm): void => {
        if (entry.context !== undefined && entry.context.length !== 0) {
            target["mentioned"] = entry.context.map((ctx:string): JSON => {
                return {
                    "@id": ctx,
                    "@type": "jsonld:Context"
                }
            });
        }
    }

    // Creation of the context: take the prefixes from the vocabulary definition
    // and add the generic context
    {
        let context: JSON = {};
        for (const prefix of vocab.prefixes) {
            context[prefix.prefix] = prefix.url
        }
        context = {...context, ...generic_context};
        jsonld["@context"] = context;
    }

    // That is the core: the ID of the ontology itself!
    jsonld["@id"] = global.vocab_url;

    // Here we go, category by category...
    {
        // The Ontology properties are all top level...
        jsonld["@type"] = "owl:Ontology";
        for (const ont of vocab.ontology_properties) {
            if (ont.property === 'dc:date' || ont.url) {
                jsonld[ont.property] = ont.value;
            } else if (ont.property === 'dc:description') {
                jsonld[ont.property] = {
                    "@value" : ont.value,
                    "@type": "http://www.w3.org/1999/02/22-rdf-syntax-ns#HTML"
                }
            } else {
                jsonld[ont.property] = {
                    "@value" : ont.value,
                    "@language" : "en"
                }
            }
        }
    }

    {
        // Get the properties
        const properties: JSON[] = [];
        for (const prop of vocab.properties) {
            if (!prop.external) {
                const pr_object: JSON = {};
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
                if (prop.domain) {
                    pr_object["rdfs:domain"] = multiDomain(prop.domain);
                }
                if (prop.container === Container.list) {
                    pr_object["rdfs:range"] = "rdf:List";
                } else if (prop.range) {
                    pr_object["rdfs:range"] = multiRange(prop.range);
                }
                commonFields(pr_object, prop);
                contexts(pr_object, prop);
                properties.push(pr_object);
            }
        }
        if (properties.length > 0) jsonld.rdfs_properties = properties;
    }

    {
        // Get the classes
        const classes: JSON[] = [];
        for (const cl of vocab.classes) {
            if (!cl.external) {
                const cl_object: JSON = {};
                cl_object["@id"] = `${cl}`;
                if (cl.type.length === 1) {
                    cl_object["@type"] = `${cl.type[0]}`;
                } else {
                    cl_object["@type"] = cl.type.map(termToStringCallback);
                }
                if (cl.status === Status.deprecated) {
                    cl_object["owl:deprecated"] = true
                }
                if (cl.subClassOf && cl.subClassOf.length > 0) {
                    cl_object["rdfs:subClassOf"] = cl.subClassOf.map(termToStringCallback);
                }
                commonFields(cl_object, cl);
                contexts(cl_object, cl);
                classes.push(cl_object);
            }
        }
        if (classes.length > 0) jsonld.rdfs_classes = classes;
    }

    {
        // Get the individuals
        const individuals: JSON[] = [];
        for (const ind of vocab.individuals) {
            if (!ind.external) {
                const ind_object: JSON = {};
                ind_object["@id"] = `${ind}`;
                if (ind.type.length === 1) {
                    ind_object["@type"] = `${ind.type[0]}`;
                } else {
                    ind_object["@type"] = ind.type.map(termToStringCallback);
                }
                if (ind.status === Status.deprecated) {
                    ind_object["owl:deprecated"] = true
                }
                commonFields(ind_object, ind);
                contexts(ind_object, ind);
                individuals.push(ind_object);
            }
        }
        if (individuals.length > 0) jsonld.rdfs_individuals = individuals;
    }

    {
        // Get the datatypes
        const datatypes: JSON[] = [];
        for (const dt of vocab.datatypes) {
            if (!dt.external) {
                const dt_object: JSON = {};
                dt_object["@id"] = `${dt}`;
                dt_object["@type"] = "rdfs:Datatype";
                if (dt.subClassOf && dt.subClassOf.length > 0) {
                    dt_object["rdfs:subClassOf"] = dt.subClassOf.map(termToStringCallback);
                }
                commonFields(dt_object, dt);
                contexts(dt_object, dt);
                datatypes.push(dt_object);
            }
        }
        if (datatypes.length > 0) jsonld.rdfs_datatypes = datatypes;

    }

    // Done... just turn the result into bona fide (and readable) json
    const final_jsonld = JSON.stringify(jsonld);
    const nice_jsonld  = beautify(final_jsonld, 'jsonld')
    return nice_jsonld;
}
