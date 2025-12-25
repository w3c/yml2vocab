/**
 * Convert the internal representation of the vocabulary into turtle
 * (see the 'Vocab' interface).
 *
 * @packageDocumentation
 */
import { type Vocab, global, type RDFTerm, type Link, Status, Container } from './common';
import { getEditorConfigOptions }                                         from './beautify';

const spaces: string = ((suffix: string): string => {
    const options = getEditorConfigOptions(suffix);
    // console.log(JSON.stringify(options,null,4))
    if (options.indent_with_tabs) {
        return "\t";
    } else {
        // We know that the indent size is always a number, but TS does not...
        const number = typeof options.indent_size === 'number' ? options.indent_size : 4;
        let output = "";
        for (let i = 0; i < number; i++) {
            output += " ";
        }
        return output;
    }
})('ttl');


/**
 * Generate the Turtle representation of the vocabulary.
 * Nothing complex, just a straightforward conversion of the information into the turtle syntax.
 *
 * @param vocab - The internal representation of the vocabulary
 * @returns - the full Turtle representation of the vocabulary
 */
export function toTurtle(vocab: Vocab): string {
    const termToStringCallback = (t: RDFTerm): string => `${t}`;

    // Handling of the domain is a bit complicated due to the usage
    // of the owl:unionOf construct if there are several domains; factored it here to make the
    // code more readable.
    const multiDomain = (term: RDFTerm[]): string => {
        const value: string[] = term.map(termToStringCallback)
        if (value.length === 1) {
            return value[0];
        } else {
            return `[ a owl:Class; owl:unionOf (${value.join(" ")}) ]`;
        }
    }

    // Like the domain, but the union possibly appears for the range
    const multiRange = (term: RDFTerm[], union: boolean): string => {
        const value: string[] = term.map(termToStringCallback);
        if (value.length === 1) {
            return value[0];
        } else if (union) {
            return `[ a owl:Class; owl:unionOf (${value.join(' ')}) ]`
        } else {
            return value.join(", ")
        }
    }

    // This will be the output...
    let turtle = "";

    // Factoring out the common fields
    const commonFields = (entry: RDFTerm): void => {
        turtle += `${spaces}rdfs:label "${entry.label}" ;\n`;
        if (entry.comment !== '') {
            turtle += `${spaces}rdfs:comment """<div>${entry.comment}</div>"""^^rdf:HTML ;\n`;
        }
        if (entry.defined_by && entry.defined_by.length !== 0) {
            const defs: string = entry.defined_by.map((def: string): string => `<${def}>`).join(", ");
            turtle += `${spaces}rdfs:isDefinedBy ${defs}, <${global.vocab_url}> ;\n`;
        } else {
            turtle += `${spaces}rdfs:isDefinedBy <${global.vocab_url}> ;\n`;
        }
        turtle += `${spaces}vs:term_status "${entry.status}" ;\n`;
        if (entry.see_also && entry.see_also.length > 0) {
            const urls = entry.see_also.map( (link: Link): string => `<${link.url}>`).join(", ");
            turtle +=`${spaces}rdfs:seeAlso ${urls} ;\n`
        }
        turtle += ".\n\n";
    }

    // Here we go, category by category...
    {
        // Copy-paste (sort of...) the prefix definitions
        for (const prefix of vocab.prefixes) {
            turtle += `@prefix ${prefix.prefix}: <${prefix.url}> .\n`;
        }
        turtle += "\n";
    }

    {
        // Block for the top level ontology entries
        turtle += "# Ontology definition\n";
        turtle += `${global.vocab_prefix}: a owl:Ontology ;\n`;
        for (const ont of vocab.ontology_properties) {
            if (ont.property === 'dc:date') {
                turtle += `${spaces}dc:date "${ont.value}"^^xsd:date ;\n`
            } else if (ont.property === 'dc:description') {
                turtle += `${spaces}dc:description """${ont.value}"""^^rdf:HTML ;\n`
            } else {
                if (ont.url) {
                    turtle += `${spaces}${ont.property} <${ont.value}> ;\n`;
                } else {
                    turtle += `${spaces}${ont.property} """${ont.value}"""@en ;\n`;
                }
            }
        }
        turtle += ".\n\n"
    }

    if (vocab.properties.length > 0) {
        turtle += "# Property definitions\n";
        for (const prop of vocab.properties) {
            // External definitions should be ignored
            if (!prop.external) {
                turtle += `${prop} a ${prop.type.join(", ")} ;\n`;
                if (prop.status === Status.deprecated) {
                    turtle += `${spaces}owl:deprecated true ;\n`;
                }
                if (prop.subPropertyOf) {
                    // some magic is happening here...
                    // the results of the `${prop.subPropertyOf.join(", ")}` is an array
                    // of object, but by virtue of the string interpretation, each object
                    // is converted to a string automatically (by calling the toString() method)
                    // and the result is a comma-separated list of the stringified objects.
                    turtle += `${spaces}rdfs:subPropertyOf ${prop.subPropertyOf.join(", ")} ;\n`;
                }
                if (prop.domain) {
                    turtle += `${spaces}rdfs:domain ${multiDomain(prop.domain)} ;\n`;
                }

                if (prop.container === Container.list) {
                    turtle += `${spaces}rdfs:range rdf:List ;\n`
                } else if (prop.range) {
                    const range = multiRange(prop.range, prop.range_union);
                    if (!(range === '' || range === '[]')) {
                        turtle += `${spaces}rdfs:range ${range} ;\n`;
                    }
                }
                commonFields(prop);
            }
        }
    }

    if (vocab.classes.length > 0) {
        turtle += "# Class definitions\n"
        for (const cl of vocab.classes) {
            if (!cl.external) {
                turtle += `${cl} a ${cl.type.join(", ")} ;\n`;
                if (cl.status === Status.deprecated) {
                    turtle += `${spaces}owl:deprecated true ;\n`;
                }
                if (cl.subClassOf && cl.subClassOf.length > 0) {
                    if (cl.subClassOf.length > 1 && cl.upper_union) {
                        turtle += `${spaces}rdfs:subClassOf [ a owl:Class; owl:unionOf (${cl.subClassOf.join(' ')}) ] ;\n`;
                    } else {
                        // See the comment on magic in the property section...
                        turtle += `${spaces}rdfs:subClassOf ${cl.subClassOf.join(", ")} ;\n`;
                    }
                }
                commonFields(cl);
            }
        }
        turtle += "\n\n";
    }

    if (vocab.individuals.length > 0) {
        turtle += "# Definitions of individuals\n"
        for (const ind of vocab.individuals) {
            if (!ind.external) {
                // See the comment on magic in the property section...
                turtle += `${ind} a ${ind.type.join(", ")} ;\n`;
                if (ind.status === Status.deprecated) {
                    turtle += `${spaces}owl:deprecated true ;\n`;
                }
                commonFields(ind);
            }
        }
    }

    if (vocab.datatypes.length > 0) {
        turtle += "# Definitions of datatypes\n"
        for (const dt of vocab.datatypes) {
            if (!dt.external) {
                turtle += `${dt} a rdfs:Datatype ;\n`
                if (dt.status === Status.deprecated) {
                    turtle += `${spaces}owl:deprecated true ;\n`;
                }
                if (dt.subClassOf && dt.subClassOf.length > 0) {
                    // See the comment on magic in the property section...
                    turtle += `${spaces}rdfs:subClassOf ${dt.subClassOf.join(", ")} ;\n`;
                }
                commonFields(dt);
            }
        }
    }

    const ctx_s = Object.keys(global.context_mentions);
    if (ctx_s.length > 0) {
        turtle += "# Context files and their mentions\n"
        for (const ctx of ctx_s) {
            const terms = global.context_mentions[ctx];
            if (terms.length === 0) {
                continue;
            }
            // The default sort is the alphabetical sort of the string representation, which is, in this case
            // the curie of the term.
            terms.sort();
            turtle += `<${ctx}> a jsonld:Context ;\n`;
            turtle += `${spaces}schema:mentions\n`
            turtle += (terms.map((term: RDFTerm): string => `${spaces}${spaces}${term}`).join(",\n")) + " ;\n.\n\n"
        }
    }

    return turtle;
}
