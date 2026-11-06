"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.toMermaid = toMermaid;
const factory_1 = require("./factory");
const beautify_1 = require("./beautify");
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
;
/**
 * The types of link used by mermaid for the relationships among classes
 */
const arrows = {
    subclass: "--|>",
    property: "-->",
};
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
function generateMermaid(classesIn) {
    const spaces = (0, beautify_1.getRequestedSpaces)("mmd");
    const lines = ["classDiagram"];
    // ----------------------------------------
    // Hopefully, this is a temporary measure. At the moment
    // the mermaid interpreter with respec cannot handle
    // identifiers with a ':' in them.
    // Hopefully, at some point, this will be safely solved and
    // the escape mechanism will work (This escape mechanism
    // is the alternative I found on the web...)
    // In the meantime, if it is indeed a curie, only the
    // name part is used.
    const sanitizeName = (inp) => {
        // return inp.replace(':', '#58;')
        const arr = inp.split(':');
        return arr.length === 1 ? arr[0] : arr[1];
    };
    const sanitizeProperty = (prop) => {
        return {
            name: sanitizeName(prop.name),
            type: prop.type === undefined ? undefined : sanitizeName(prop.type),
        };
    };
    const sanitizeRelation = (rel) => {
        return {
            target: sanitizeName(rel.target),
            property: sanitizeName(rel.property),
            kind: rel.kind,
        };
    };
    const sanitizeClass = (cl) => {
        return {
            name: sanitizeName(cl.name),
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
        if (c.externals.length + c.properties.length === 0) {
            // worth compacting the class definition line
            lines.push(`${spaces}class ${c.name} {}`);
        }
        else {
            lines.push(`${spaces}class ${c.name} {`);
            for (const p of c.properties) {
                if (p.type) {
                    lines.push(`${spaces}${spaces}${p.name} : ${p.type}`);
                }
                else {
                    lines.push(`${spaces}${spaces}${p.name}`);
                }
            }
            if (c.externals.length > 0) {
                // The respec plugin does not like this...
                // lines.push('        — External properties —*')
                for (const p of c.externals) {
                    if (p.type) {
                        lines.push(`${spaces}${spaces}${p.name} : ${p.type}`);
                    }
                    else {
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
 * Convert the internal data into a series of MClass instances
 *
 * @param vocab
 * @returns
 */
function toMClass(vocab) {
    const output = [];
    //
    // This is the tricky bit: it generates a reasonable entry for the properties that do not represent a link
    // within the vocabulary (eg, datatype properties).
    // If it is a bona fide relationship within the vocabulary, that is also added  in the separate "relations" array
    //
    const addPropertyToMClass = (prop, properties, relations = undefined) => {
        const name = prop.external ? prop.curie : prop.id;
        if (prop.range && prop.range.length > 0) {
            for (const rangeTerm of prop.range) {
                const curie = rangeTerm.curie;
                if (prop.langString === true) {
                    properties.push({ name, type: "localizable string" });
                    break;
                }
                else if (curie.startsWith("xsd:")) {
                    properties.push({ name, type: curie });
                    break;
                }
                else if (["rdf:HTML", "rdf:JSON", "rdf:XMLLiteral", "rdf:PlainLiteral", "rdf:langString", "rdf:dirLangString"].includes(curie)) {
                    properties.push({ name, type: curie });
                    break;
                }
                else if (factory_1.RDFTermFactory.includesCurie(prop.type, "owl:DatatypeProperty")) {
                    // This is the case when the property refers to an explicitly defined, non-standard datatype
                    if (prop.range.length === 1) {
                        properties.push({ name, type: curie });
                    }
                    break;
                }
                else {
                    if (relations !== undefined) {
                        if (factory_1.RDFTermFactory.isClass(rangeTerm) && !rangeTerm.external) {
                            relations.push({
                                target: rangeTerm.id,
                                property: name,
                                kind: "property",
                            });
                        }
                    }
                }
            }
        }
        else {
            if (prop.langString === true) {
                properties.push({ name, type: "localizable string" });
            }
            if (factory_1.RDFTermFactory.includesCurie(prop.type, "owl:ObjectProperty")) {
                properties.push({ name, type: "URL" });
            }
            else {
                properties.push({ name });
            }
        }
    };
    // Get all the classes and add the properties and relations
    for (const cl of vocab.classes) {
        if (cl.external)
            continue;
        const theClass = {
            name: cl.id,
            superclasses: cl.subClassOf?.map((sup) => sup.id) ?? [],
            properties: [],
            externals: [],
            relations: [],
        };
        for (const prop of [...cl.domain_of, ...cl.included_in_domain_of]) {
            addPropertyToMClass(prop, theClass.properties, theClass.relations);
        }
        output.push(theClass);
    }
    // Add the properties with scope instead of domain
    for (const prop of vocab.properties) {
        if (prop.scope !== undefined) {
            for (const scope of prop.scope) {
                if (scope.external)
                    continue;
                const theClass = output.find((value) => value.name === scope.id);
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
function toMermaid(vocab, template = "") {
    // Convert the data into mermaid classes
    const mermaid_classes = toMClass(vocab);
    // Generate the mermaid data itself
    const mermaid = generateMermaid(mermaid_classes);
    // Plug it into the template and return
    const final_template = template.length === 0 ? mmd_template : template;
    return final_template.replace("<<VOCAB>>>", mermaid);
}
