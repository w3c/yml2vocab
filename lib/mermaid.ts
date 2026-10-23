
import type { Vocab, RDFClass, RDFProperty } from "./common";
import { RDFTermFactory }                    from "./factory";
import { getRequestedSpaces }                from "./beautify";


/**
 * Basic template; this is used if no external template is provided
 */
const mmd_template = `
%%{
    init: {
        "theme" : "neutral",
        "class": {
            "hideEmptyMembersBox": true
        }
    }
}%%
<<VOCAB>>>
`;

/**
 * Each RDFS class is represented by a class in the class diagram.
 */
interface MClass {
    /** The name of the class, usually the class.id value from the vocabulary. */
    name         : string;

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
    // this seems an overkill, but is there for possible
    // future additions of relationship types...
    kind     : "property";
}

/**
 * The types of link used by mermaid for the relationships among classes
 */
const arrows = {
    subclass   : "--|>",
    property   : "-->",
} as const;

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
    const spaces = getRequestedSpaces('mmd');

    const lines = ["classDiagram"];

    // --------
    // Hopefully, this is a temporary measure. At the moment
    // the mermaid interpreter with respec cannot handle
    // identifiers with a ':' in them. This means
    // all the curies must be changed to prefix.value format.
    const sanitizeName = (inp: string): string => {
        // This is now a null operation, ie, no sanitization happens
        // Kept it here, because what works and does not work
        // in the respec plugin is a bit iffy...
        // return inp.replace(':','.');
        return inp;
    }
    const sanitizeProperty = (prop: Property) : Property => {
        return {
            name : sanitizeName(prop.name),
            type : (prop.type === undefined) ? undefined: sanitizeName(prop.type),
        }
    };
    const sanitizeRelation = (rel: Relation): Relation => {
        return {
            target   : sanitizeName(rel.target),
            property : sanitizeName(rel.property),
            kind     : rel.kind,
        }
    }
    const sanitizeClass = (cl: MClass): MClass => {
        return {
            name : sanitizeName(cl.name),
            superclasses : cl.superclasses.map(sanitizeName),
            properties : cl.properties.map(sanitizeProperty),
            externals : cl.externals.map(sanitizeProperty),
            relations : cl.relations.map(sanitizeRelation),
        }
    }
    const classes = classesIn.map(sanitizeClass);
    //
    //-----


    // first get the class definitions
    for (const c of classes) {
        lines.push(`${spaces}class ${c.name} {`);
        for (const p of c.properties) {
            if ( p.type) {
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

        lines.push(`${spaces}}\n`);
    }
    lines.push("\n");

    // Get the subclasses:
    for (const c of classes) {
        for (const sub of c.superclasses) {
            lines.push(`    ${c.name} ${arrows["subclass"]} ${sub} : rdfs.subClassOf`)
        }
    }
    lines.push("");

    // Get the relationships:
    for (const c of classes) {
        for (const rel of c.relations) {
            lines.push(`    ${c.name} ${arrows[rel.kind]} ${rel.target} : ${rel.property}`)
        }
    }
    lines.push("");
    return lines.join('\n');
}

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
                } else {
                    if (relations !== undefined) {
                        if (RDFTermFactory.isClass(rangeTerm) && !rangeTerm.external) {
                            relations.push({
                                target: rangeTerm.id,
                                property: name,
                                kind:  "property",
                            });
                        }
                    }
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

    // Get all the classes and add the properties and relations
    for (const cl of vocab.classes) {
        if (cl.external) continue;

        const theClass: MClass = {
            name : cl.id,
            superclasses : cl.subClassOf?.map((sup: RDFClass): string => sup.id) ?? [],
            properties : [],
            externals  : [],
            relations  : [],
        }
        for (const prop of [...cl.domain_of, ...cl.included_in_domain_of]) {
            addPropertyToMClass(prop, theClass.properties, theClass.relations);
        }
        output.push(theClass);
    }

    // Add the properties with scope instead of domain
    for (const prop of vocab.properties) {
        if (prop.scope !== undefined) {
            for (const scope of prop.scope) {
                if (scope.external) continue;
                const theClass = output.find((value: MClass): boolean => value.name === scope.id);
                if (theClass !== undefined) {
                    // Note that relationships are irrelevant here
                    addPropertyToMClass(prop, theClass.externals);
                }
            }
        }
    }

    return output;
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
