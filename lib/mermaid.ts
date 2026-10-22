
import type { Vocab, RDFClass, RDFProperty } from "./common";
import { RDFTermFactory } from "./factory";

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

interface MClass {
    name         : string;
    superclasses : string[];
    properties   : Property[];
    externals    : Property[];
    relations    : Relation[];
};

interface Property {
    name  : string;
    type ?: string
}

interface Relation {
    target   : string;
    property : string;
    kind     : "graph" | "property";
}

const arrows = {
    subclass   : "--|>",
    graph      : "..>",
    property   : "-->",
} as const;

function generateMermaid(classesIn: MClass[]): string {
    const lines = ["classDiagram"];

    // --------
    // Hopefully, this is a temporary measure. At the moment
    // the mermaid interpreter with respec cannot handle
    // identifiers with a ':' in them. This means
    // all the curies must be changed to prefix.value format.
    const sanitizeName = (inp: string): string => {
        return inp.replace(':','.');
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
        lines.push(`    class ${c.name} {`)
        for (const p of c.properties) {
            if ( p.type) {
                lines.push(`        ${p.name} ➝ ${p.type}`);
            } else {
                lines.push(`        ${p.name}`)
            }
        }
        if (c.externals.length > 0) {
        lines.push('— External properties —*')
            for (const p of c.externals) {
                if (p.type) {
                    lines.push(`        ${p.name} ➝ ${p.type}`);
                } else {
                    lines.push(`        ${p.name}`);
                }
            }
        }

        lines.push("    }");
    }
    lines.push("");

    // Get the subclasses:
    for (const c of classes) {
        for (const sub of c.superclasses) {
            lines.push(`    ${c.name} ${arrows["subclass"]} ${sub}`)
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

function toMClass(vocab: Vocab) : MClass[] {
    const output: MClass[] = [];

    const addPropertyToMClass = (_cl: RDFClass, prop: RDFProperty, properties: Property[], relations: Relation[]): void => {
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
                    if (RDFTermFactory.isClass(rangeTerm) && !rangeTerm.external) {
                        relations.push({
                            target: rangeTerm.id,
                            property: name,
                            kind: prop.dataset ? "graph" : "property",
                        });
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

    // First handle the bona fide domain/range for all classes
    for (const cl of vocab.classes) {
        if (cl.external) continue;
        const name = cl.id;
        const superclasses: string[] = cl.subClassOf?.map((sup: RDFClass): string => sup.id) ?? [];

        const properties: Property[] = [];
        const relations:  Relation[] = [];

        for (const prop of [...cl.domain_of, ...cl.included_in_domain_of]) {
            addPropertyToMClass(cl, prop, properties, relations);
        }
        output.push({
            name,
            superclasses,
            properties,
            externals : [],
            relations
        });
    }

    // Handle the properties with scope instead of domain
    for (const prop of vocab.properties) {
        if (prop.scope !== undefined) {
            for (const scope of prop.scope) {
                if (scope.external) continue;
                const theClass = output.find((value: MClass): boolean => value.name === scope.id);
                if (theClass !== undefined) {
                    addPropertyToMClass(scope, prop, theClass.externals, []);
                }
            }
        }
    }

    return output;
}

export function toMermaid(vocab: Vocab): string {
    const mermaid_classes = toMClass(vocab);
    const mermaid         = generateMermaid(mermaid_classes);
    const output = mmd_template.replace("<<VOCAB>>>", mermaid);
    return output;
}
