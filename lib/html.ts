/**
 * Convert the internal representation of the vocabulary into HTML 
 * (see the 'Vocab' interface).
 * 
 * @packageDocumentation
 */
import { Vocab, Link, RDFTerm, global, RDFClass, RDFProperty, RDFIndividual } from './common';
import { JSDOM }  from 'jsdom';

/* ---------------- Utility functions ------------------------- */
/**
 * Add a new HTML Element to a parent, and return the new element
 * 
 * @param parent - The parent HTML Element
 * @param element - The new element's name
 * @param content - The new element's (HTML) content
 * @returns the new element
 * 
 * @internal
 */
 const addChild = (parent: HTMLElement, element: string, content: string|undefined = undefined): HTMLElement => {
    const new_element = parent.ownerDocument.createElement(element);
    parent.appendChild(new_element);
    if (content !== undefined) new_element.innerHTML = content;
    return new_element;
}

/**
 * Add some text to an element, including the obligatory checks that Typescript imposes
 * 
 * @param content - text to add
 * @param element HTML Element to add it to
 * @returns 
 * 
 * @internal
 */
const addText = (content: string, element: HTMLElement|null): HTMLElement|null => {
    if (element) {
        element.textContent = content
    }
    return element;
}

/**
 * Generate a new bnode id for the "union of" constructs...
 */
let idnum = 0;
const bnode = (): string => {
    const retval = `_:a${idnum}`;
    idnum++;
    return retval
}


/**
 * Generate the HTML representation of the vocabulary, based on an HTML template file. The
 * template file is parsed to create a DOM, which is manipulated using the standard
 * DOM calls before stored.
 * 
 * The template files have element with a predefined `@id` value at all points where some
 * content must be added. Ie, the usual model in the code below is:
 * 
 * const some_element = document.getElementById('namespaces');
 * manipulate the subtree at 'some_element' to add content
 * 
 * The current version adds a bunch of properties to the HTML to make it also RDFa, ie,
 * that the vocabulary can be extracted by an RDFa distiller. I am not sure it is all
 * that useful and it complicates the code; at some point we may decide to remove this.
 * 
 * @param vocab - The internal representation of the vocabulary
 * @param template_text - The textual content of the template file 
 * @returns
 */
export function toHTML(vocab: Vocab, template_text: string): string {
    // Factor out all common fields for the terms
    const commonFields = (section: HTMLElement, item: RDFTerm): void => {        
        section.setAttribute('resource',`${vocab_prefix}:${item.id}`);
        section.setAttribute('typeof', `${item.type.join(' ')}`);

        const h = addChild(section,'h4', `<code>${item.id}</code>`);
        const term = addChild(section, 'p', `<em>${item.label}</code>`);
        term.setAttribute('property', 'rdfs:label');
        if (item.deprecated) {
            const span = addChild(term, 'span');
            span.className = 'bold';
            addChild(span, 'em', ' (deprecated)');
        }

        // let explanation = addBreak(item.comment);
        let explanation = item.comment;
        if (item.type.includes("owl:ObjectProperty")) {
            explanation += "<br><br>The property's value should be a URL, i.e., not a literal."
        }
        const div = addChild(section, 'div', explanation);
        div.setAttribute('property', 'rdfs:comment');

        if (item.see_also && item.see_also.length > 0) {
            const dl = addChild(section, 'dl');
            dl.className = 'terms';
            addChild(dl, 'dt', 'See also:');
            const dd = addChild(dl, 'dd');
            for (const link of item.see_also) {
                const a = addChild(dd, 'a', link.label);
                a.setAttribute('href', link.url);
                a.setAttribute('property', 'rdfs:seeAlso');
                addChild(dd, 'br');
            }
        }

        const span = addChild(section, 'span');
        span.setAttribute('property', 'rdfs:isDefinedBy');
        span.setAttribute('resource', `${vocab_prefix}:`);

        if (item.deprecated) {
            const span = addChild(section, 'span');
            span.setAttribute('property', 'owl:deprecated');
            span.setAttribute('datatype', 'xsd:boolean');
            span.style.display = 'none';
            addText('true', span);
        }
    }

    const setExample = (section: HTMLElement, item: RDFClass|RDFIndividual|RDFProperty): void => {
        if (item.example && item.example.length > 0) {
            for (const ex of item.example) {
                const example = addChild(section, 'pre', ex.json);
                example.className = 'example prettyprint language-json';
                if (ex.label) {
                    example.setAttribute('title', ex.label)
                }
            }
        }
    }

    // RDFa preamble. If, at some point, we decide that the RDFa part is superfluous, this block can be removed.
    const rdfaPreamble = () => {
        const body = document.getElementsByTagName('body')[0];
        if (body) {
            body.setAttribute('resource', vocab_url);
            body.setAttribute('prefix', vocab.prefixes.map((value): string => `${value.prefix}: ${value.url}`).join(' '));
        }
    }    

    // Get some generic metadata for the vocabulary that are part of the template text
    // These come from the ontology properties of the vocabulary.
    const ontologyProperties = () => {
         try {
            const title = vocab.ontology_properties.filter((property): boolean => property.property === 'dc:title')[0].value;
            addText(title, document.getElementsByTagName('title')[0]);
            addText(title, document.getElementById('title'));    
        } catch(e) {
            console.log("Vocabulary warning: title is not provided.")
        }

        const date = vocab.ontology_properties.filter((property): boolean => property.property === 'dc:date')[0].value;
        addText(date, document.getElementById('time'));

        try {
            const description = vocab.ontology_properties.filter((property): boolean => property.property === 'dc:description')[0].value;
            addText(description, document.getElementById('description'));    
        } catch(e) {
            console.log("Vocabulary warning: description is not provided.")
        }

        try {
            const see_also = vocab.ontology_properties.filter((property): boolean => property.property === 'rdfs:seeAlso')[0].value;
            const target = document.getElementById('see_also');
            if (target) {
                const a = addChild(target, 'a', see_also)
                a.setAttribute('href', see_also);
                a.setAttribute('property', 'rdfs:seeAlso')
            }
        } catch(e) {
            console.log("Vocabulary warning: no reference to specification provided.")
        }
    }

    // There is a separate list in the template for all the namespaces used by the vocabulary
    // The prefix part of the vocabulary is just for that.
    const prefixes = () => {
        const ns_dl = document.getElementById('namespaces');
        if (ns_dl) {
            for (const ns of vocab.prefixes) {
                const dt = addChild(ns_dl, 'dt');
                addChild(dt, 'code', ns.prefix);
                const dd = addChild(ns_dl, 'dd');
                addChild(dd, 'code', ns.url);
            }
        }
    }

    // Generation of the section content for classes: a big table, with a row per class
    // There is a check for a possible template error and also whether there are class
    // definitions in the first place.
    //
    // The generated DOM nodes get a bunch of RDFa properties (typeof, resource, property,...)
    // that makes things fairly confusing :-(
    const classes = (cl_list: RDFClass[], deprecated: boolean) => {
        const section = document.getElementById(`${deprecated ? 'deprecated_' : ''}class_definitions`);
        if (section) {
            if (cl_list.length > 0) {
                addChild(section, 'p', `The following are ${deprecated ? '<em><strong>deprecated</strong></em>' : ''} class definitions in the <code>${vocab_prefix}</code> namespace:`)

                for (const item of cl_list) {
                    const cl_section = addChild(section, 'section');
                    cl_section.id = item.id;
                    commonFields(cl_section,item);
                    // Extra list of superclasses, if applicable
                    if (item.subClassOf && item.subClassOf.length > 0) {
                        const dl = addChild(cl_section, 'dl');
                        dl.className = 'terms'
                        addChild(dl, 'dt', 'Subclass of:')
                        const dd = addChild(dl, 'dd');
                        for (const superclass of item.subClassOf) {
                            const code = addChild(dd, 'code', superclass)
                            code.setAttribute('property', 'rdfs:subClassOf');
                            code.setAttribute('resource', superclass);
                            addChild(dd, 'br')
                        }
                    }
                    setExample(cl_section, item);
                }                
            } else {
                // Remove section from the DOM
                if (section.parentElement) section.parentElement.removeChild(section);
            }
        }  else {
            console.log(`Template error: no section prepared for ${deprecated ? 'deprecated' : ''} classes!`)
        }
    }

    // Generation of the section content for properties: a big table, with a row per property
    // There is a check for a possible template error and also whether there are properties
    // definitions in the first place.
    //
    // The generated DOM nodes get a bunch of RDFa properties (typeof, resource, property,...)
    // that makes things fairly confusing :-(
    const properties = (pr_list: RDFProperty[], deprecated: boolean) => {
        const section = document.getElementById(`${deprecated ? 'deprecated_' : ''}property_definitions`);
        if (section) {
            if (pr_list.length > 0) {
                addChild(section, 'p', `The following are ${deprecated ? '<em><strong>deprecated</strong></em>' : ''} property definitions in the <code>${vocab_prefix}</code> namespace:`)

                for (const item of pr_list) {
                    const pr_section = addChild(section, 'section');
                    pr_section.id = item.id;
                    commonFields(pr_section,item);
                    // Extra list of superproperties, if applicable
                    if (item.subPropertyOf && item.subPropertyOf.length > 0) {
                        const dl = addChild(pr_section, 'dl');
                        dl.className = 'terms'
                        addChild(dl, 'dt', 'Subproperty of:')
                        const dd = addChild(dl, 'dd');
                        for (const superproperty of item.subPropertyOf) {
                            const code = addChild(dd, 'code', superproperty)
                            code.setAttribute('property', 'rdfs:subPropertyOf');
                            code.setAttribute('resource', superproperty);
                            addChild(dd, 'br');
                        }
                    }

                    // Again an extra list for range/domain definitions, if applicable
                    if ((item.range && item.range.length > 0) || (item.domain && item.domain.length > 0)) {
                        const dl = addChild(pr_section, 'dl');
                        dl.className = 'terms';

                        if (item.range && item.range.length > 0) {
                            addChild(dl, 'dt', 'Range:');
                            const dd = addChild(dl, 'dd');
                            dd.setAttribute('property', 'rdfs:range');
                            if (item.range.length === 1) {
                                dd.setAttribute('resource',item.range[0])
                                addChild(dd, 'code', item.range[0]);
                            } else {
                                addText('Intersection of:', dd)
                                addChild(dd, 'br')
                                for (const entry of item.range) {
                                    const r_span = addChild(dd, 'span')
                                    r_span.setAttribute('resource', entry);
                                    addChild(r_span, 'code', ` ${entry}`);
                                    addChild(dd, 'br')
                                }
                            }
                        } 
                                         
                        if (item.domain && item.domain.length > 0) {
                            addChild(dl, 'dt', 'Domain:');
                            const dd = addChild(dl, 'dd');
                            dd.setAttribute('property', 'rdfs:domain')
                            if (item.domain.length === 1) {
                                dd.setAttribute('resource',item.domain[0])
                                addChild(dd, 'code', item.domain[0]);
                            } else {
                                // The union-of list is to be enclosed in a bnode in RDF
                                // this has to be added to the RDFa manually...
                                const u_bnode = bnode();
                                dd.setAttribute('resource', u_bnode)
                                addText('Union of: ', dd);
                                addChild(dd, 'br')
                                for (const entry of item.domain) {
                                    const sp = addChild(dd, 'span');
                                    sp.setAttribute('about', u_bnode);
                                    sp.setAttribute('inlist', 'true');
                                    sp.setAttribute('property', 'owl:unionOf');
                                    sp.setAttribute('resource', entry);
                                    addChild(sp, 'code', ` ${entry}`);
                                    addChild(dd, 'br')
                                }
                            }
                        }
                    }
                    setExample(pr_section, item);
                }
            } else {
                if (section.parentElement) section.parentElement.removeChild(section);
            }
        } else {
            console.log(`Template error: no section prepared for ${deprecated ? 'deprecated' : ''} properties!`)
        }
    }

    // Generation of the section content for individuals: a big table, with a row per individual
    // There is a check for a possible template error and also whether there are individual
    // definitions in the first place.
    //
    // The generated DOM nodes get a bunch of RDFa properties (typeof, resource, property,...)
    // that makes things fairly confusing :-(
    const individuals = (ind_list: RDFIndividual[], deprecated: boolean) => {
        const section = document.getElementById(`${deprecated ? 'deprecated_' : ''}individual_definitions`);
        if (section) {
            if (ind_list.length > 0) {
                addChild(section, 'p', `The following are definitions for ${deprecated ? '<em><strong>deprecated</strong></em>' : ''} individuals in the <code>${vocab_prefix}</code> namespace:`)

                for (const item of ind_list) {
                    const ind_section = addChild(section, 'section');
                    ind_section.id = item.id;
                    commonFields(ind_section,item);
                    const dl = addChild(ind_section, 'dl');
                    dl.className = 'terms';
                    if (item.type.length > 0) {
                        addChild(dl, 'dt', 'Type')
                        const dd = addChild(dl, 'dd');
                        for (const itype of item.type) {
                            addChild(dd, 'code', itype);
                            addChild(dd, 'br')    
                        }
                    }
                    setExample(ind_section, item);
                }
            } else {
                // removing the section from the DOM
                if (section.parentElement) section.parentElement.removeChild(section);
            }
        } else {
            console.log(`Template error: no section prepared for ${deprecated ? 'deprecated' : ''} individuals!`)
        }
    }

    /* *********************** The real processing part ****************** */
    // Get the DOM of the template
    const document = (new JSDOM(template_text)).window.document;

    // The prefix and the URL for the vocabulary itself
    // I am just lazy to type things that are too long... :-)
    const vocab_prefix = global.vocab_prefix;
    const vocab_url    = global.vocab_url;

    // 1. Set the necessary RDFa preamble into the body element
    rdfaPreamble();

    // 2. Set the general properties on the ontology itself
    ontologyProperties();

    // 3. The introductory list of prefixes used in the document
    prefixes();

    // 4. Sections on classes
    const actual_classes = vocab.classes.filter((entry: RDFClass): boolean => entry.deprecated === false)
    const deprecated_classes = vocab.classes.filter((entry: RDFClass): boolean => entry.deprecated === true)
    classes(actual_classes, false)
    classes(deprecated_classes, true)

    // 5. Sections on properties
    const actual_properties = vocab.properties.filter((entry: RDFProperty): boolean => entry.deprecated === false)
    const deprecated_properties = vocab.properties.filter((entry: RDFProperty): boolean => entry.deprecated === true)
    properties(actual_properties, false);
    properties(deprecated_properties, true);

    // 6. Sections on individuals
    const actual_individuals = vocab.individuals.filter((entry: RDFIndividual): boolean => entry.deprecated === false)
    const deprecated_individuals = vocab.individuals.filter((entry: RDFIndividual): boolean => entry.deprecated === true)
    individuals(actual_individuals, false);
    individuals(deprecated_individuals, true);

    // 7. Remove the section on deprecation in case there aren't any...
    if ((deprecated_classes.length + deprecated_properties.length + deprecated_individuals.length) === 0) {
        const section = document.getElementById('deprecated_term_definitions');
        if (section !== null && section.parentElement) section.parentElement.removeChild(section);
    }

    // That is it... generate the output
    // I wish it was possible to generate a properly formatted HTML source, but I am not sure how to do that
    return `<!DOCTYPE html>\n<html>${document.documentElement.innerHTML}</html>`;
}



