/**
 * Convert the internal representation of the vocabulary into HTML 
 * (see the 'Vocab' interface).
 * 
 * @packageDocumentation
 */
import { Vocab, RDFTerm, global, RDFClass, RDFProperty, RDFIndividual, Status, RDFDatatype } from './common';
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
    // This is used to generate cross links, possible to external entities, too
    const resolveCurie = (curie: string): string => {
        const components = curie.split(':');
        if (components.length === 1) {
            return `<a href="#${curie}"><code>${curie}</code></a>`;
        } else if (components[0] === vocab.prefixes[0].prefix) {
            return `<a href="#${components[1]}"><code>${components[1]}</code></a>`;
        } else {
            // The curse of CURIE-s: bona fide URL prefixes should not be touched
            const bona_fide_prefixes = ['http', 'https', 'mailto', 'urn', 'doi', 'ftp', 'did'];
            if (bona_fide_prefixes.includes(components[0])) {
                // Do not touch that!!!!
                return `<a href="${curie}"><code>${curie}</code></a>`;
            } else {
                // it is fairly unnecessary to make references to some of the core
                // vocabularies, like rdf or xsd, which do not have a proper HTML target
                // anyway...
                const no_url = ['rdf', 'xsd', 'rdfs', 'owl'];
                if (no_url.includes(components[0]) === false) {
                    for (const prefix_def of vocab.prefixes.slice(1)) {
                        if (prefix_def.prefix === components[0]) {
                            return `<a href="${prefix_def.url}${components[1]}"><code>${curie}</code></a>`;
                        }
                    }    
                }
                return `<code>${curie}</code>`;
            }
        }
    };

    // Factor out all common fields for the terms
    const commonFields = (section: HTMLElement, item: RDFTerm): void => {        
        section.setAttribute('resource',`${vocab_prefix}:${item.id}`);
        section.setAttribute('typeof', `${item.type.join(' ')}`);

        const h = addChild(section,'h4', `<code>${item.id}</code>`);
        const term = addChild(section, 'p', `<em>${item.label}</code>`);
        term.setAttribute('property', 'rdfs:label');
        if (item.status !== Status.stable) {
            const span = addChild(term, 'span');
            span.className = 'bold';
            addChild(span, 'em', ` (${item.status})`);
        }

        if (item.defined_by !== "") {
            addChild(section, 'p', `See the <a rel="rdfs:isDefinedBy" href="${item.defined_by}">formal definition of the term</a>.`);
        }

        if (item.comment !== "") {
            let description = item.comment;
            if (item.type.includes("owl:ObjectProperty")) {
                description += "<br><br>The property's value should be a URL, i.e., not a literal."
            }
            const div = addChild(section, 'div', description);
            div.setAttribute('property', 'rdfs:comment');
            div.setAttribute('datatype', 'rdf:HTML')
        } else if (item.type.includes("owl:ObjectProperty")) {
            addChild(section, 'p', "The property's value should be a URL, i.e., not a literal.");
        }

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

        const status_span = addChild(section, 'span');
        status_span.setAttribute('style', 'display: none');
        status_span.setAttribute('property', 'vs:term_status');
        addText(`${item.status}`, status_span);

        if (item.deprecated) {
            const span = addChild(section, 'span');
            span.setAttribute('property', 'owl:deprecated');
            span.setAttribute('datatype', 'xsd:boolean');
            span.setAttribute('style', 'display: none');
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


    // Prefixes that are used to differentiate among stable, reserved, and deprecated values
    const statusSignals = (status: Status): {id_prefix: string, intro_prefix: string} => {
        switch (status) {
            case Status.deprecated : 
                return { id_prefix : 'deprecated_', intro_prefix: '<em><strong>deprecated</strong></em>' };
            case Status.reserved :
                return { id_prefix : 'reserved_', intro_prefix: '<em><strong>reserved</strong></em>' };
            case Status.stable :
                return { id_prefix : '', intro_prefix : '' };
                
        }
    }

    // Generation of the section content for classes: a big table, with a row per class
    // There is a check for a possible template error and also whether there are class
    // definitions in the first place.
    //
    // The generated DOM nodes get a bunch of RDFa properties (typeof, resource, property,...)
    // that makes things fairly confusing :-(
    const classes = (cl_list: RDFClass[], statusFilter: Status) => {
        const { id_prefix, intro_prefix } = statusSignals(statusFilter);
        const section = document.getElementById(`${id_prefix}class_definitions`);
        if (section) {
            if (cl_list.length > 0) {
                addChild(section, 'p', `The following are ${intro_prefix} class definitions in the <code>${vocab_prefix}</code> namespace.`);

                for (const item of cl_list) {
                    const cl_section = addChild(section, 'section');
                    cl_section.id = item.id;
                    commonFields(cl_section, item);
                    // Extra list of superclasses, if applicable
                    if (item.subClassOf && item.subClassOf.length > 0) {
                        const dl = addChild(cl_section, 'dl');
                        dl.className = 'terms'
                        addChild(dl, 'dt', 'Subclass of:')
                        const dd = addChild(dl, 'dd');
                        for (const superclass of item.subClassOf) {
                            const span = addChild(dd,'span');
                            span.innerHTML = resolveCurie(superclass);
                            span.setAttribute('property', 'rdfs:subClassOf');
                            span.setAttribute('resource', superclass);
                        }
                    }
                    // Again an extra list for range/domain references, if applicable
                    if (item.range_of.length > 0 || 
                        item.domain_of.length > 0 || 
                        item.includes_range_of.length > 0 || 
                        item.included_in_domain_of.length > 0) {
                        
                        // This for the creation of a list of property references, each
                        // a hyperlink to the property's definition.
                        const prop_names = (ids: string[]): string => {
                            const names = ids.map(resolveCurie);
                            return names.join(', ');
                        }
                        
                        const dl = addChild(cl_section, 'dl');
                        dl.className = 'terms';

                        if (item.range_of.length > 0) {
                            addChild(dl, 'dt', "Range of:");
                            const dd = addChild(dl, 'dd');
                            dd.innerHTML = prop_names(item.range_of);
                        }
                        if (item.includes_range_of.length > 0) {
                            addChild(dl, 'dt', "Includes the range of:");
                            const dd = addChild(dl, 'dd');
                            dd.innerHTML = prop_names(item.includes_range_of);
                        }
                        if (item.domain_of.length > 0) {
                            addChild(dl, 'dt', "Domain of:");
                            const dd = addChild(dl, 'dd');
                            dd.innerHTML = prop_names(item.domain_of);
                        }
                        if (item.included_in_domain_of.length > 0) {
                            addChild(dl, 'dt', "In the domain of:");
                            const dd = addChild(dl, 'dd');
                            dd.innerHTML = prop_names(item.included_in_domain_of);
                        }
                    }
                    setExample(cl_section, item);
                }                
            } else {
                // Remove section from the DOM
                if (section.parentElement) section.parentElement.removeChild(section);
            }
        }
    }

    // Generation of the section content for properties: a big table, with a row per property
    // There is a check for a possible template error and also whether there are properties
    // definitions in the first place.
    //
    // The generated DOM nodes get a bunch of RDFa properties (typeof, resource, property,...)
    // that makes things fairly confusing :-(
    const properties = (pr_list: RDFProperty[], statusFilter: Status) => {
        const { id_prefix, intro_prefix } = statusSignals(statusFilter);
        const section = document.getElementById(`${id_prefix}property_definitions`);
        if (section) {
            if (pr_list.length > 0) {
                addChild(section, 'p', `The following are ${intro_prefix} property definitions in the <code>${vocab_prefix}</code> namespace.`);

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
                            const span = addChild(dd, 'span');
                            span.innerHTML = resolveCurie(superproperty);
                            span.setAttribute('property', 'rdfs:subPropertyOf');
                            span.setAttribute('resource', superproperty);
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
                                dd.innerHTML = resolveCurie(item.range[0]);
                            } else {
                                addText('Intersection of:', dd)
                                addChild(dd, 'br')
                                for (const entry of item.range) {
                                    const r_span = addChild(dd, 'span')
                                    r_span.setAttribute('resource', entry);
                                    r_span.innerHTML = resolveCurie(entry);
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
                                dd.innerHTML = resolveCurie(item.domain[0]);
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
                                    sp.innerHTML = resolveCurie(entry);
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
        }
    }

    // Generation of the section content for individuals: a big table, with a row per individual
    // There is a check for a possible template error and also whether there are individual
    // definitions in the first place.
    //
    // The generated DOM nodes get a bunch of RDFa properties (typeof, resource, property,...)
    // that makes things fairly confusing :-(
    const individuals = (ind_list: RDFIndividual[], statusFilter: Status) => {
        const { id_prefix, intro_prefix } = statusSignals(statusFilter);
        const section = document.getElementById(`${id_prefix}individual_definitions`);
        if (section) {
            if (ind_list.length > 0) {
                addChild(section, 'p', `The following are definitions for ${intro_prefix} individuals in the <code>${vocab_prefix}</code> namespace.`);

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
                            addChild(dd, 'span', resolveCurie(itype));
                            addChild(dd, 'br')    
                        }
                    }
                    setExample(ind_section, item);
                }
            } else {
                // removing the section from the DOM
                if (section.parentElement) section.parentElement.removeChild(section);
            }
        }
    }

    // Generation of the section content for datatypes: a big table, with a row per datatype
    // There is a check for a possible template error and also whether there are individual
    // definitions in the first place.
    //
    // The generated DOM nodes get a bunch of RDFa properties (typeof, resource, property,...)
    // that makes things fairly confusing :-(
    const datatypes = (dt_list: RDFDatatype[], statusFilter: Status) => {
        const { id_prefix, intro_prefix } = statusSignals(statusFilter);
        const section = document.getElementById(`${id_prefix}datatype_definitions`);
        if (section) {
            if (dt_list.length > 0) {
                addChild(section, 'p', `The following are ${intro_prefix} datatype definitions in the <code>${vocab_prefix}</code> namespace.`);

                for (const item of dt_list) {
                    const dt_section = addChild(section, 'section');
                    dt_section.id = item.id;
                    commonFields(dt_section, item);

                    if (item.subClassOf && item.subClassOf.length > 0) {
                        const dl = addChild(dt_section, 'dl');
                        dl.className = 'terms';
                        addChild(dl, 'dt', 'Derived from:');
                        const dd = addChild(dl, 'dd');
                        for (const superclass of item.subClassOf) {
                            const span = addChild(dd, 'span');
                            span.innerHTML = resolveCurie(superclass);
                            span.setAttribute('property', 'rdfs:subClassOf');
                            span.setAttribute('resource', superclass);
                        }
                    }
                    if (item.range_of.length > 0 || item.includes_range_of.length > 0) {
                        // This for the creation of a list of property references, each
                        // a hyperlink to the property's definition.
                        const prop_names = (ids: string[]): string => {
                            const names = ids.map(resolveCurie);
                            return names.join(', ');
                        }
                        const dl = addChild(dt_section, 'dl');
                        dl.className = 'terms';
                        if (item.range_of.length > 0) {
                            addChild(dl, 'dt', "Range of:");
                            const dd = addChild(dl, 'dd');
                            dd.innerHTML = prop_names(item.range_of);
                        }
                        if (item.includes_range_of.length > 0) {
                            addChild(dl, 'dt', "Includes the range of:");
                            const dd = addChild(dl, 'dd');
                            dd.innerHTML = prop_names(item.includes_range_of);
                        }
                    }
                    setExample(dt_section, item);
                }

            } else {
                // removing the section from the DOM
                if (section.parentElement) section.parentElement.removeChild(section);
            }
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
    Object.values(Status).map((filter: Status): void => {
        const actual_classes = vocab.classes.filter((entry: RDFClass): boolean => entry.status === filter);
        classes(actual_classes, filter);
    });

    // 5. Sections on properties
    Object.values(Status).map((filter: Status): void => {
        const actual_properties = vocab.properties.filter((entry: RDFProperty): boolean => entry.status === filter);
        properties(actual_properties, filter);
    });

    // 6. Sections on individuals
    Object.values(Status).map((filter: Status): void => {
        const actual_individuals = vocab.individuals.filter((entry: RDFIndividual): boolean => entry.status === filter);
        individuals(actual_individuals, filter);
    });

    // 7. Sections on datatypes
    Object.values(Status).map((filter: Status): void => {
        const actual_datatypes = vocab.datatypes.filter((entry: RDFDatatype): boolean => entry.status === filter);
        datatypes(actual_datatypes, filter);
    });

    // 8. Remove the sections on reserved/deprecation in case there aren't any...
    if (global.status_counter.counter(Status.reserved) === 0) {
        const section = document.getElementById('reserved_term_definitions');
        if (section !== null && section.parentElement) section.parentElement.removeChild(section);
    }
    
    if (global.status_counter.counter(Status.deprecated) === 0) {
        const section = document.getElementById('deprecated_term_definitions');
        if (section !== null && section.parentElement) section.parentElement.removeChild(section);
    }

    // That is it... generate the output
    // I wish it was possible to generate a properly formatted HTML source, but I am not sure how to do that
    return `<!DOCTYPE html>\n<html>${document.documentElement.innerHTML}</html>`;
}



