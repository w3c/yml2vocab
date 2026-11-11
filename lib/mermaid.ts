
import type { Vocab, RDFClass, RDFProperty, RDFTerm } from "./common";
import { RDFTermFactory }                    from "./factory";
import { getRequestedSpaces }                from "./beautify";


/**
 * Basic template; this is used if no external template is provided
 */
const mmd_template = `
%%{
    init: {
        "theme" : "mermaid",
        "class": {
            "hideEmptyMembersBox": true
        }
    }
}%%
classDiagram
<<VOCAB>>>
`;

/**
 * Each RDFS class is represented by a class in the class diagram.
 */
interface MClass {
    /** The name of the class, usually the class.id value from the vocabulary. */
    name         : string;

    /**
     * Label added to the MClass name. Can be Class, Property, or Individual. The Property label is
     * very rarely used, except when punning is done for a Property also acting as individual.
     */
    label        : string;

    /** Superclasses have a different line style and are labeled as rdfs:subClassOf */
    superclasses : string[];

    /**
     * Properties that are within the vocabulary but do not relate to other classes
     * they appear as attribute within the mermaid class
     */
    properties   : Property[];

    /**
     * External properties that are listed in the vocabulary for readability; they appear
     * as attributes within the mermaid class
     */
    externals    : Property[];

    /**
     * Labelled relation to another mermaid class; they refer to RDF properties.
     */
    relations    : Relation[];
};


interface Property {
    name  : string;
    type ?: string
}

interface Relation {
    target   : string;
    property : string;
    kind     : string;
}

/**
 * The types of link used by mermaid for the relationships among classes
 */

const arrows: Record<string,string> = {
    subclass   : "--|>",
    property   : "-->",
    set        : "--o",  // array of targets
    list       : "--*",  // list of targets
    type       : "..>",  // rdf:type
    graph      : "..|>",
} as const;


/**
 * Convert the internal data into a series of MClass instances
 *
 * @param vocab
 * @returns
 */
function toMClass(vocab: Vocab) : MClass[] {
    const output: MClass[] = [];

    //
    // This is the tricky bit: it generates a reasonable entry for the properties that do not represent a link
    // within the vocabulary (eg, datatype properties).
    // If it is a bona fide relationship within the vocabulary, that is also added  in the separate "relations" array
    //
    const addPropertyToMClass = (prop: RDFProperty, properties: Property[], relations: Relation[] | undefined = undefined): void => {
        if (prop.mermaid === false) return;

        const name = prop.external ? prop.curie : prop.id;
        if (prop.range && prop.range.length > 0) {
            for (const rangeTerm of prop.range) {
                const curie = rangeTerm.curie;
                if (prop.langString === true) {
                    properties.push({ name, type: "localizable string" });
                    break;
                } else if (curie.startsWith("xsd:")) {
                    properties.push({ name, type: curie });
                    break;
                } else if (["rdf:HTML", "rdf:JSON", "rdf:XMLLiteral", "rdf:PlainLiteral", "rdf:langString", "rdf:dirLangString"].includes(curie)) {
                    properties.push({ name, type: curie });
                    break;
                } else if (RDFTermFactory.includesCurie(prop.type, "owl:DatatypeProperty")) {
                    // This is the case when the property refers to an explicitly defined, non-standard datatype
                    if (prop.range.length === 1) {
                        properties.push({ name, type: curie });
                    }
                    break;
                } else if (RDFTermFactory.isClass(rangeTerm) && rangeTerm.mermaid === true) {
                    if (relations !== undefined) {
                        const kind: string = ((): string => {
                            if (prop.container) {
                                const con = `${prop.container}`;
                                if (con === "list" || con === "set") {
                                    return con;
                                } else {
                                    return "property";
                                }
                            } else {
                                return "property";
                            }
                        })();

                        relations.push({
                            target: rangeTerm.id,
                            property: name,
                            kind,
                        });
                    }
                } else {
                    properties.push(({name, type: curie}))
                }
            }
        } else {
            if (prop.langString === true) {
                properties.push({ name, type: "localizable string" });
            }
            if (RDFTermFactory.includesCurie(prop.type, "owl:ObjectProperty")) {
                properties.push({ name, type: "URL" });
            } else {
                properties.push({ name });
            }
        }
    };

    // Add rdf:type relationships, if applicable
    const addTypeRelationships = (term: RDFTerm) : Relation[] => {
        const output: Relation[] = [];
        for (const typ of term.type) {
            // see if it is a class defined by the vocabulary
            const typeClass = vocab.classes.find((value: RDFClass): RDFClass | boolean => value.id === typ.id && value.mermaid === true);
            if (typeClass) {
                // add a type relationship to the relation block
                output.push({
                    target: typeClass.id,
                    property: "rdf:type",
                    kind: "type",
                });
            }
        }
        return output;
    };

    // Get all the classes and add the properties and relations
    for (const cl of vocab.classes) {
        if (cl.external || cl.mermaid === false) continue;

        const theClass: MClass = {
            name : cl.id,
            label: "Class",
            superclasses : cl.subClassOf?.map((sup: RDFClass): string => sup.id) ?? [],
            properties : [],
            externals  : [],
            relations  : [],
        }
        for (const prop of [...cl.domain_of, ...cl.included_in_domain_of]) {
            addPropertyToMClass(prop, theClass.properties, theClass.relations);
        }

        // get the possible (though unlikely) case of punned types
        const types = addTypeRelationships(cl);
        if (types.length >0) theClass.relations = [...theClass.relations, ...types];

        output.push(theClass);
    }

    // Add the properties with scope instead of domain
    for (const prop of vocab.properties) {
        if (prop.scope !== undefined) {
            for (const scope of prop.scope) {
                if (scope.external || scope.mermaid === false) continue;
                const theClass = output.find((value: MClass): boolean => value.name === scope.id);
                if (theClass !== undefined) {
                    // Note that relationships are irrelevant here
                    addPropertyToMClass(prop, theClass.externals);
                }
            }
        }
    }

    // taking care of the explicit types
    for (const term of [...vocab.properties, ...vocab.individuals]) {
        if (term.mermaid === false) continue;
        const relations = addTypeRelationships(term);
        if (relations.length > 0) {
            output.push({
                name: term.id,
                label: term.term_type === "property" ? "Property" : "Individual",
                superclasses: [],
                properties: [],
                externals: [],
                relations,
            });
        }
    }
    return output;
}


/**
 * Generate a mermaid file from the MClass instances, both the class definitions and the relationships.
 *
 * Technically, it is not necessary to generate an empty class definition if there are no properties, but
 * it may make the result more readable.
 *
 * There is one possible complication: it is not clear whether the character ":" is allowed or not within
 * a term name; some mermaid interpreter take it, others don't. At this moment
 * it seems that the respec plugin for mermaid (which is probably the primary use of this module) is ok with it.
 *
 * Nevertheless, the function includes a pass to "sanitize" all names, potentially turning all ":" characters
 * into ".". At this moment, this action is commented out. Future versions of this code may have a separate flag
 * somewhere on whether this conversion is necessary or not, so I kept the tooling in the code even if,
 * at this moment, it is not used. The action itself is in sanitizeName, all the rest is just to traverse all
 * terms in the data.
 *
 * @param classesIn
 * @returns The mermaid text
 */
function generateMermaid(classesIn: MClass[]): string {
    const spaces = getRequestedSpaces("mmd");

    // const lines = ["classDiagram"];
    const lines = [];

    // ----------------------------------------
    // Hopefully, this is a temporary measure. At the moment
    // the mermaid interpreter with respec cannot handle
    // identifiers with a ':' in them.
    // Hopefully, at some point, this will be safely solved and
    // the escape mechanism will work (This escape mechanism
    // is the alternative I found on the web...)
    // In the meantime, if it is indeed a curie, only the
    // name part is used.
    const sanitizeName = (inp: string): string => {
        // return inp.replace(':', '#58;')
        const arr: string[] = inp.split(':');
        return arr.length === 1 ? arr[0] : arr[1];
    };
    const sanitizeProperty = (prop: Property): Property => {
        return {
            name: sanitizeName(prop.name),
            type: prop.type === undefined ? undefined : sanitizeName(prop.type),
        };
    };
    const sanitizeRelation = (rel: Relation): Relation => {
        return {
            target: sanitizeName(rel.target),
            property: sanitizeName(rel.property),
            kind: rel.kind,
        };
    };
    const sanitizeClass = (cl: MClass): MClass => {
        return {
            name: sanitizeName(cl.name),
            label: sanitizeName(cl.label),
            superclasses: cl.superclasses.map(sanitizeName),
            properties: cl.properties.map(sanitizeProperty),
            externals: cl.externals.map(sanitizeProperty),
            relations: cl.relations.map(sanitizeRelation),
         };
    };
    const classes = classesIn.map(sanitizeClass);
    //
    // ----------------------------------------

    // first get the class definitions
    for (const c of classes) {
        // Properties and individuals are marked on the diagram; they are the
        // exceptional cases
        const extra_label = c.label === "Class" ? "" : ` ["${c.name} (${c.label})"]`;
        if(c.externals.length + c.properties.length === 0) {
            // worth compacting the class definition line
            lines.push(`${spaces}class ${c.name}${extra_label} {}`);
        } else {
            lines.push(`${spaces}class ${c.name}${extra_label} {`);
            for (const p of c.properties) {
                if (p.type) {
                    lines.push(`${spaces}${spaces}${p.name} : ${p.type}`);
                } else {
                    lines.push(`${spaces}${spaces}${p.name}`);
                }
            }
            if (c.externals.length > 0) {
                // The respec plugin does not like this...
                // lines.push('        — External properties —*')
                for (const p of c.externals) {
                    if (p.type) {
                        lines.push(`${spaces}${spaces}${p.name} : ${p.type}`);
                    } else {
                        lines.push(`${spaces}${spaces}${p.name}`);
                    }
                }
            }
            lines.push(`${spaces}}`);
        }
    }
    lines.push("\n");

    // Get the subclasses:
    for (const c of classes) {
        for (const sub of c.superclasses) {
            lines.push(`${spaces}${c.name} ${arrows["subclass"]} ${sub} : ${sanitizeName('rdfs:subClassOf')}`);
        }
    }
    lines.push("");

    // Get the relationships added as a separate block
    for (const c of classes) {
        for (const rel of c.relations) {
            lines.push(`${spaces}${c.name} ${arrows[rel.kind]} ${rel.target} : ${rel.property}`);
        }
    }
    lines.push("");
    return lines.join("\n");
}


/**
 * Generation of an illustrative mermaid diagram. It is not the goal to be 100% exhaustive: general properties may
 * not appear. It concentrates on the vocabulary classes and their relationships via properties from
 * within the vocabulary.
 *
 * @param vocab
 * @param template
 * @returns
 */
export function toMermaid(vocab: Vocab, template: string = ""): string {
    // Convert the data into mermaid classes
    const mermaid_classes = toMClass(vocab);

    // Generate the mermaid data itself
    const mermaid         = generateMermaid(mermaid_classes);

    // Plug it into the template and return
    const final_template  = template.length === 0 ? mmd_template : template;
    return final_template.replace("<<VOCAB>>>", mermaid);
}
