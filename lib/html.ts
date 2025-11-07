/**
 * Convert the internal representation of the vocabulary into HTML
 * (see the 'Vocab' interface).
 *
 * @packageDocumentation
 */
import type { RDFClass, RDFProperty, RDFIndividual, RDFDatatype, Vocab, RDFTerm } from './common';
import { global, Status, TermType }                                               from './common';
import { MiniDOM }                                                                from './minidom';
import { RDFTermFactory }                                                         from './factory';
import { beautify }                                                               from './beautify';

// This object is need for a proper formatting of some text
const formatter = new Intl.ListFormat('en', { style: 'long', type: 'conjunction' });


/**
 * Generate the HTML representation of the vocabulary, based on an HTML template file. The
 * template file is parsed to create a DOM, which is manipulated using the standard
 * DOM calls before stored.
 *
 * The template files have element with a predefined `@id` value at all points where some
 * content must be added. Ie, the usual model in the code below is:
 *
 * ```javascript
 * const some_element = document.getElementById('properties');
 * manipulate the subtree at 'some_element' to add content
 * ```
 *
 * @param vocab - The internal representation of the vocabulary
 * @param template_text - The textual content of the template file
 * @returns
 */
export function toHTML(vocab: Vocab, template_text: string, basename: string): string {
    // Get the DOM of the template
    const document: MiniDOM = new MiniDOM(template_text);

    // The prefix and the URL for the vocabulary itself
    // I am just lazy to type things that are too long... :-)
    const vocab_prefix = global.vocab_prefix;
    // const vocab_url = global.vocab_url;

    /*********************************** Utility functions ******************************************/

    // Generate cross-link HTML snippets
    const termHTMLReference = (term: RDFTerm): string => {
        if (term.term_type === TermType.fullUrl) {
            return `<a href="${term.curie}"><code>${term.curie}</code></a>`;
        } else if (term.term_type === TermType.core) {
            // Typical case: an xsd datatype; a full curie is displayed, but
            // no link (would be unnecessary)
            return `<code>${term.curie}</code>`;
        } else if (term.term_type === TermType.unknown) {
            // Typical case: an xsd datatype; a full curie is displayed, but
            // no link (would be unnecessary)
            return `<a href="${term.url}"><code>${term.curie}</code></a>`;
        } else if (term.prefix === vocab_prefix) {
            // This is a term from the same vocabulary, it is locally defined
            // and the id should only be displayed.
            return `<a href="#${term.html_id}"><code>${term.id}</code></a>`;
        } else if (term.external) {
            // This is a term from another vocabulary, but the definition is included
            // as an 'external' term. Typical case is a schema.org term listed in the vocabulary definition
            // It displays similarly as a locally defined term, but it is kept
            // separately in the code, if we decide to change things.
            // Note that the value of html_id is different; in this case, it is a hash value
            return `<a href="#${term.html_id}"><code>${term.id}</code></a>`;
        } else {
            // This is a term from another vocabulary, and the definition is not included
            // so it should be clearly referred to as external and link to its
            // "real" identity. Typical case is cred:CredentialStatus used from
            // another vocabulary.
            return `<a href="${term.url}"><code>${term.curie}</code></a>`;
        }
    }

    // Handle the common fields for the terms
    const commonFields = (section: Element, item: RDFTerm): void => {
        if (item.external) {
            document.addChild(section,'h4', `<code>${item.id}</code>`);
            const term = document.addChild(section, 'p', `<em>${item.label}</code>`);

            if (item.status !== Status.stable) {
                const span = document.addChild(term, 'span');
                span.className = 'bold';
                document.addChild(span, 'em', ` (${item.status})`);
            }

            if (item.defined_by) {
                // By the logic of the program, at this point defined_by is always defined
                // but picky compilers, like deno, push me to put this extra condition
                switch (item.defined_by.length) {
                    case 0:
                        break;
                    case 1: {
                        document.addChild(section, 'p', `See also the <a href="${item.defined_by[0]}">formal definition of the term</a>.`);
                        break;
                    }
                    default: {
                        const refs: string[] = item.defined_by.map((def: string): string => `<a href="${def}">here</a>`);
                        document.addChild(section, 'p', `See also the formal definitions ${formatter.format(refs)}.`);
                    }
                }
            }
        } else {
            document.addChild(section, 'h4', `<code>${item.id}</code>`);
            const term = document.addChild(section, 'p', `<em>${item.label}</code>`);

            if (item.status !== Status.stable) {
                const span = document.addChild(term, 'span');
                span.className = 'bold';
                document.addChild(span, 'em', ` (${item.status})`);
            }

            if (item.defined_by) {
                // By the logic of the program, at this point defined_by is always defined
                // but picky compilers, like deno, push me to put this extra condition
                switch (item.defined_by.length) {
                    case 0:
                        break;
                    case 1: {
                        document.addChild(section, 'p', `See the <a href="${item.defined_by[0]}">formal definition of the term</a>.`);
                        break;
                    }
                    default: {
                        const refs: string[] = item.defined_by.map((def: string): string => `<a href="${def}">here</a>`);
                        document.addChild(section, 'p', `See the formal definitions ${formatter.format(refs)}.`);
                    }
                }
            }
        }

        if (item.comment !== "") {
            let description = item.comment;
            if (RDFTermFactory.isProperty(item)) {
                if ((item as RDFProperty).strongURL) {
                    description += "<br><br>The property's value should be a URL, i.e., not a literal."
                }
            }
            document.addChild(section, 'div', description);
        } else if (RDFTermFactory.includesCurie(item.type, "owl:ObjectProperty")) {
            if (RDFTermFactory.isProperty(item)) {
                if ((item as RDFProperty).strongURL) {
                    document.addChild(section, 'p', "The property's value should be a URL, i.e., not a literal.");
                }
            }
        }

        // Add the external warning, if applicable
        if (item.external) {
            const external_warning_text = `
                <b>This term is formally defined in another vocabulary</b>
                (as <a href="${item.url}">${item.curie}</a>), but is frequently used with this vocabulary and has been
                included to aid readability of this document.
            `;
            const warning = document.addChild(section, 'p', external_warning_text);
            warning.setAttribute('class', 'note')
        }

        if (item.see_also && item.see_also.length > 0) {
            const dl = document.addChild(section, 'dl');
            dl.className = 'terms';
            document.addChild(dl, 'dt', 'See also:');
            const dd = document.addChild(dl, 'dd');
            for (const link of item.see_also) {
                const a = document.addChild(dd, 'a', link.label);
                a.setAttribute('href', link.url);
                document.addChild(dd, 'br');
            }
        }

        if (item.user_type && item.user_type.length > 0) {
            const dl = document.addChild(section, 'dl');
            dl.className = 'terms';
            document.addChild(dl, 'dt', 'Type');
            const dd = document.addChild(dl, 'dd');
            for (const item_type of item.user_type) {
                document.addChild(dd, 'span', termHTMLReference(item_type));
                document.addChild(dd, 'br');
            }
        }
    }

    const setExample = (section: Element, item: RDFClass | RDFIndividual | RDFProperty): void => {
        if (item.example && item.example.length > 0) {
            for (const ex of item.example) {
                const example = document.addChild(section, 'pre', ex.json);
                example.className = 'example prettyprint language-json';
                if (ex.label) {
                    example.setAttribute('title', ex.label)
                }
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
            default :
                throw new Error(`Unknown status: ${status}`);
        }
    }

    // Add the references to the context files (if any)
    const contextReferences = (section: Element, item: RDFTerm): void => {
        if (item.context !== undefined && item.context?.length > 0) {
            const dl = document.addChild(section, 'dl');
            dl.className = 'terms';
            document.addChild(dl, 'dt', `Relevant <code>${(item.context.length) > 1 ? "@contexts" : "@context"}</code>:`);
            const dd = document.addChild(dl, 'dd');
            dd.innerHTML = item.context.map((ctx: string): string => {
                return `<a href="${ctx}"><code>${ctx}</code></a>`;
            }).join(",<br> ");
        }
    }

    /************ Functions to add specific content to the final HTML, based also on the template ********************/

    //
    // Set links to the json-ld and turtle versions of the vocabulary
    const alternateLinks = () => {
        const addLink = (parent: Element, suffix:string, media_type: string): void => {
            const link = document.addChild(parent, 'link');
            link.setAttribute('href', `${basename}.${suffix}`);
            link.setAttribute('rel', 'alternate');
            link.setAttribute('type', media_type);
        };

        const addAref = (id: string, suffix: string): void => {
            document.getElementById(id)?.setAttribute('href', `${basename}.${suffix}`)
        }

        const head = document.getElementsByTagName('head')[0];
        if (head && basename !== '') {
            addLink(head, 'jsonld', 'application/ld+json');
            addLink(head, 'ttl', 'text/turtle');
        }

        // Handle the alternate 'a' links, if any of them are
        // present in the template
        addAref('alt-turtle', 'ttl');
        addAref('alt-jsonld', 'jsonld');

        // Hide this code here because it is related: removes an unnecessary
        // RDFa link from the body if it is there.
        // This is useful for older template files...
        (document.getElementsByTagName('body')[0])?.removeAttribute('typeof');
    };

    // Get some generic metadata for the vocabulary that are part of the template text
    // These come from the ontology properties of the vocabulary.
    const ontologyProperties = () => {
         try {
            const title = vocab.ontology_properties.filter((property): boolean => property.property === 'dc:title')[0].value;
            document.addText(title, document.getElementsByTagName('title')[0]);
            document.addText(title, document.getElementById('title'));
         } catch(e) {
            console.warn(`Vocabulary warning: ontology title is not provided. (${e})`);
         }

        const date = vocab.ontology_properties.filter((property): boolean => property.property === 'dc:date')[0].value;
        document.addText(date, document.getElementById('time'));

        try {
            const description = vocab.ontology_properties.filter((property): boolean => property.property === 'dc:description')[0].value;
            const descriptionElement = document.getElementById('description');
            if (descriptionElement !== null) {
                document.addHTMLText(description, descriptionElement);
            } else {
                console.warn("Vocabulary warning: ontology description is not provided.");
            }
        } catch(e) {
            console.warn(`Vocabulary warning: ontology description is not provided. (${e})`);
        }

        try {
            const see_also = vocab.ontology_properties.filter((property): boolean => property.property === 'rdfs:seeAlso');
            if (see_also && see_also.length > 0) {
                const target = document.getElementById('see_also');
                if (target) {
                    const a = document.addChild(target, 'a', see_also[0].value)
                    a.setAttribute('href', see_also[0].value);
                }
            } else {
                console.warn(`Vocabulary warning: no reference to the ontology specification provided.`)
            }
        } catch(e) {
            console.warn(`Vocabulary warning: no reference to the ontology specification provided. (${e})`)
        }
    }

    // There is a separate list in the template for all the namespaces used by the vocabulary
    // The prefix part of the vocabulary is just for that.
    const prefixes = () => {
        const ns_dl = document.getElementById('namespaces');
        if (ns_dl) {
            for (const ns of vocab.prefixes) {
                const dt = document.addChild(ns_dl, 'dt');
                document.addChild(dt, 'code', ns.prefix);
                const dd = document.addChild(ns_dl, 'dd');
                document.addChild(dd, 'code', ns.url);
            }
        }
    }

    // Add the list of all contexts to the file
    const contexts = (): void => {
        const ctx_ul = document.getElementById('contexts');
        // Check whether the template includes a section for context files
        if (ctx_ul) {
            const ctx_keys: string[] = Object.keys(global.context_mentions);
            if (ctx_keys.length > 0) {
                // An item for each context file
                for (const ctx of ctx_keys) {
                    if (global.context_mentions[ctx].length === 0) {
                        continue;
                    }

                    const li = document.addChild(ctx_ul, 'li');

                    const a  = document.addChild(li, 'a', `<code>${ctx}</code>`);
                    a.setAttribute('href', ctx);

                    const details = document.addChild(li, 'details');
                    document.addChild(details, 'summary', 'term list');
                    const ul = document.addChild(details, 'ul');

                    const terms: RDFTerm[] = global.context_mentions[ctx];
                    // The default sort is by the string version of the entries which is, in this case
                    // the curie identifier of the term.
                    terms.sort();

                    for (const term of terms) {
                        document.addChild(ul, 'li', `<a href="#${term.html_id}"><code>${term.id}<code></li>`);
                    }
                }
            } else {
                // Remove the full section, it is not used (no context files)
                // The extra condition checks are imposed by Typescript. In a DOM and
                // knowing the templates, these parent elements are always present.
                const section = ctx_ul.parentElement;
                if (section) {
                    section.parentElement?.removeChild(section);
                }
            }
        }
    }

    // Note that the functions for classes, properties, etc., have a second argument for "statusFilter", ie, for reserved,
    // deprecate, or stable. These values are used to find the right section in the template, and can also
    // affect the real function. These functions are called several time, each with different status values
    // and different list of terms; see at the end of the function


    // Generation of the section content for classes: a big table, with a row per class
    // There is a check for a possible template error and also whether there are class
    // definitions in the first place.
    //
    const classes = (cl_list: RDFClass[], statusFilter: Status): void => {
        const { id_prefix, intro_prefix } = statusSignals(statusFilter);
        const section = document.getElementById(`${id_prefix}class_definitions`);
        if (section) {
            if (cl_list.length > 0) {
                document.addChild(section, 'p', `The following are ${intro_prefix} class definitions in the <code>${vocab_prefix}</code> namespace.`);

                for (const item of cl_list) {
                    const cl_section = document.addChild(section, 'section');
                    cl_section.id = item.html_id;
                    commonFields(cl_section, item);
                    // Extra list of superclasses, if applicable
                    if (!item.external && item.subClassOf && item.subClassOf.length > 0) {
                        const dl = document.addChild(cl_section, 'dl');
                        dl.className = 'terms'
                        document.addChild(dl, 'dt', 'Subclass of:')
                        const dd = document.addChild(dl, 'dd');
                        for (const superclass of item.subClassOf) {
                            const span = document.addChild(dd,'span');
                            span.innerHTML = termHTMLReference(superclass);
                        }
                    }
                    // Again an extra list for range/domain references, if applicable
                    if (item.range_of.length > 0 ||
                        item.domain_of.length > 0 ||
                        item.includes_range_of.length > 0 ||
                        item.included_in_domain_of.length > 0) {

                        // This for the creation of a list of property references, each
                        // a hyperlink to the property's definition.
                        const prop_names = (t: RDFTerm[]): string => {
                            const names = t.map(termHTMLReference);
                            return names.join(', ');
                        }

                        const dl = document.addChild(cl_section, 'dl');
                        dl.className = 'terms';

                        if (item.range_of.length > 0) {
                            document.addChild(dl, 'dt', "Range of:");
                            const dd = document.addChild(dl, 'dd');
                            dd.innerHTML = prop_names(item.range_of);
                        }
                        if (item.includes_range_of.length > 0) {
                            document.addChild(dl, 'dt', "Includes the range of:");
                            const dd = document.addChild(dl, 'dd');
                            dd.innerHTML = prop_names(item.includes_range_of);
                        }
                        if (item.domain_of.length > 0) {
                            document.addChild(dl, 'dt', "Domain of:");
                            const dd = document.addChild(dl, 'dd');
                            dd.innerHTML = prop_names(item.domain_of);
                        }
                        if (item.included_in_domain_of.length > 0) {
                            document.addChild(dl, 'dt', "In the domain of:");
                            const dd = document.addChild(dl, 'dd');
                            dd.innerHTML = prop_names(item.included_in_domain_of);
                        }
                    }
                    contextReferences(cl_section, item);
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
    const properties = (pr_list: RDFProperty[], statusFilter: Status): void => {
        const { id_prefix, intro_prefix } = statusSignals(statusFilter);
        const section = document.getElementById(`${id_prefix}property_definitions`);
        if (section) {
            if (pr_list.length > 0) {
                document.addChild(section, 'p', `The following are ${intro_prefix} property definitions in the <code>${vocab_prefix}</code> namespace.`);

                for (const item of pr_list) {
                    const pr_section = document.addChild(section, 'section');
                    pr_section.id = item.html_id;
                    commonFields(pr_section,item);
                    // Extra list of superproperty, if applicable
                    if (!item.external && item.subPropertyOf && item.subPropertyOf.length > 0) {
                        const dl = document.addChild(pr_section, 'dl');
                        dl.className = 'terms'
                        document.addChild(dl, 'dt', 'Subproperty of:')
                        const dd = document.addChild(dl, 'dd');
                        for (const superproperty of item.subPropertyOf) {
                            const span = document.addChild(dd, 'span');
                            span.innerHTML = termHTMLReference(superproperty);
                            document.addChild(dd, 'br');
                        }
                    }

                    // Again an extra list for range/domain definitions, if applicable
                    if (!item.external && ((item.range && item.range.length > 0) || (item.domain && item.domain.length > 0))) {
                        const dl = document.addChild(pr_section, 'dl');
                        dl.className = 'terms';

                        if (item.range && item.range.length > 0) {
                            document.addChild(dl, 'dt', 'Range:');
                            const dd = document.addChild(dl, 'dd');
                            if (item.range.length === 1) {
                                dd.innerHTML = termHTMLReference(item.range[0]);
                            } else {
                                document.addText('Intersection of:', dd)
                                document.addChild(dd, 'br')
                                for (const entry of item.range) {
                                    const r_span = document.addChild(dd, 'span')
                                    r_span.innerHTML = termHTMLReference(entry);
                                    document.addChild(dd, 'br')
                                }
                            }
                        }

                        if (item.domain && item.domain.length > 0) {
                            document.addChild(dl, 'dt', 'Domain:');
                            const dd = document.addChild(dl, 'dd');
                            if (item.domain.length === 1) {
                                dd.innerHTML = termHTMLReference(item.domain[0]);
                            } else {
                                document.addText('Union of: ', dd);
                                document.addChild(dd, 'br')
                                for (const entry of item.domain) {
                                    dd.innerHTML = termHTMLReference(entry);
                                    document.addChild(dd, 'br')
                                }
                            }
                        }
                    }
                    contextReferences(pr_section, item);
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
    const individuals = (ind_list: RDFIndividual[], statusFilter: Status): void => {
        const { id_prefix, intro_prefix } = statusSignals(statusFilter);
        const section = document.getElementById(`${id_prefix}individual_definitions`);
        if (section) {
            if (ind_list.length > 0) {
                document.addChild(section, 'p', `The following are definitions for ${intro_prefix} individuals in the <code>${vocab_prefix}</code> namespace.`);

                for (const item of ind_list) {
                    const ind_section = document.addChild(section, 'section');
                    ind_section.id = item.html_id;
                    commonFields(ind_section,item);
                    const dl = document.addChild(ind_section, 'dl');
                    dl.className = 'terms';
                    if (!item.external && item.type.length > 0) {
                        document.addChild(dl, 'dt', 'Type')
                        const dd = document.addChild(dl, 'dd');
                        for (const item_type of item.type) {
                            document.addChild(dd, 'span', termHTMLReference(item_type));
                            document.addChild(dd, 'br')
                        }
                    }
                    contextReferences(ind_section, item);
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
    const datatypes = (dt_list: RDFDatatype[], statusFilter: Status): void => {
        const { id_prefix, intro_prefix } = statusSignals(statusFilter);
        const section = document.getElementById(`${id_prefix}datatype_definitions`);
        if (section) {
            if (dt_list.length > 0) {
                document.addChild(section, 'p', `The following are ${intro_prefix} datatype definitions in the <code>${vocab_prefix}</code> namespace.`);

                for (const item of dt_list) {
                    const dt_section = document.addChild(section, 'section');
                    dt_section.id = item.html_id
                    commonFields(dt_section, item);

                    if (item.subClassOf && item.subClassOf.length > 0) {
                        const dl = document.addChild(dt_section, 'dl');
                        dl.className = 'terms';
                        document.addChild(dl, 'dt', 'Derived from:');
                        const dd = document.addChild(dl, 'dd');
                        for (const superclass of item.subClassOf) {
                            dd.innerHTML = termHTMLReference(superclass);
                        }
                    }
                    if (item.range_of.length > 0 || item.includes_range_of.length > 0) {
                        // This for the creation of a list of property references, each
                        // a hyperlink to the property's definition.
                        const prop_names = (ids: RDFTerm[]): string => {
                            const names = ids.map(termHTMLReference);
                            return names.join(', ');
                        }
                        const dl = document.addChild(dt_section, 'dl');
                        dl.className = 'terms';
                        if (item.range_of.length > 0) {
                            document.addChild(dl, 'dt', "Range of:");
                            const dd = document.addChild(dl, 'dd');
                            dd.innerHTML = prop_names(item.range_of);
                        }
                        if (item.includes_range_of.length > 0) {
                            document.addChild(dl, 'dt', "Includes the range of:");
                            const dd = document.addChild(dl, 'dd');
                            dd.innerHTML = prop_names(item.includes_range_of);
                        }
                    }

                    contextReferences(dt_section, item);

                    setExample(dt_section, item);
                }

            } else {
                // removing the section from the DOM
                if (section.parentElement) section.parentElement.removeChild(section);
            }
        }
    }

    /*********************** The real processing part, making use of all these functions ****************************/


    // 1. Set the reference to the json-ld and turtle versions into the header
    alternateLinks();

    // 2. Set the general properties on the ontology itself
    ontologyProperties();

    // 3. The introductory list of prefixes used in the document
    prefixes();

    // 4. The introductory list of contexts used in the document
    contexts();

    // 5. Sections on classes
    Object.values(Status).map((filter: Status): void => {
        const actual_classes = vocab.classes.filter((entry: RDFClass): boolean => entry.status === filter);
        classes(actual_classes, filter);
    });

    // 6. Sections on properties
    Object.values(Status).map((filter: Status): void => {
        const actual_properties = vocab.properties.filter((entry: RDFProperty): boolean => entry.status === filter);
        properties(actual_properties, filter);
    });

    // 7. Sections on individuals
    Object.values(Status).map((filter: Status): void => {
        const actual_individuals = vocab.individuals.filter((entry: RDFIndividual): boolean => entry.status === filter);
        individuals(actual_individuals, filter);
    });

    // 8. Sections on datatypes
    Object.values(Status).map((filter: Status): void => {
        const actual_datatypes = vocab.datatypes.filter((entry: RDFDatatype): boolean => entry.status === filter);
        datatypes(actual_datatypes, filter);
    });

    // 9. Remove the sections on reserved/deprecation in case there aren't any...
    if (global.status_counter.counter(Status.reserved) === 0) {
        const section = document.getElementById('reserved_term_definitions');
        if (section !== null && section.parentElement) section.parentElement.removeChild(section);
    }
    if (global.status_counter.counter(Status.deprecated) === 0) {
        const section = document.getElementById('deprecated_term_definitions');
        if (section !== null && section.parentElement) section.parentElement.removeChild(section);
    }

    // 10. Beautify the text before it is returned
    const final_html = `<!DOCTYPE html>\n<html lang="en">${document.innerHTML()}</html>`;
    const nice_html = beautify(final_html, 'html', { max_preserve_newlines: 2 })
    return nice_html;
}
