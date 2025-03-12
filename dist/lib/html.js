"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.toHTML = toHTML;
/**
 * Convert the internal representation of the vocabulary into HTML
 * (see the 'Vocab' interface).
 *
 * @packageDocumentation
 */
const common_1 = require("./common");
const common_2 = require("./common");
const minidom_1 = require("./minidom");
const factory_1 = require("./factory");
// This object is need for a proper formatting of some text
const formatter = new Intl.ListFormat('en', { style: 'long', type: 'conjunction' });
/**
 * Generate a new bnode id for the "union of" constructs...
 */
let idnum = 0;
const bnode = () => {
    const output = `_:a${idnum}`;
    idnum++;
    return output;
};
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
 * The current version adds a bunch of properties to the HTML to make it also RDFa, i.e.,
 * that the vocabulary can be extracted by an RDFa distiller. I am not sure if it is all
 * that useful, and it complicates the code, but let us keep it anyway.
 *
 * @param vocab - The internal representation of the vocabulary
 * @param template_text - The textual content of the template file
 * @returns
 */
function toHTML(vocab, template_text) {
    // Get the DOM of the template
    const document = new minidom_1.MiniDOM(template_text);
    /*********************************** Utility functions ******************************************/
    // Generate cross-link HTML snippets
    const termHTMLReference = (term) => {
        if (term.term_type === common_1.TermType.fullUrl) {
            return `<a href="${term.curie}"><code>${term.curie}</code></a>`;
        }
        else {
            return `<a href="${term.html_id}"><code>${term.id}</code></a>`;
        }
    };
    // Factor out all common fields for the terms
    // return the value that must be used as the id value of the containing section in HTML
    const commonFields = (section, item) => {
        // External terms have a different behavior: ranges/domains should be ignored, and no RDFa should be
        // generated.
        if (item.external) {
            document.addChild(section, 'h4', `<code>${item.id}</code>`);
            const term = document.addChild(section, 'p', `<em>${item.label}</code>`);
            if (item.status !== common_2.Status.stable) {
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
                        const refs = item.defined_by.map((def) => `<a href="${def}">here</a>`);
                        document.addChild(section, 'p', `See also the formal definitions ${formatter.format(refs)}.`);
                    }
                }
            }
        }
        else {
            section.setAttribute('resource', `${vocab_prefix}:${item.id}`);
            section.setAttribute('typeof', `${item.type.join(' ')}`);
            document.addChild(section, 'h4', `<code>${item.id}</code>`);
            const term = document.addChild(section, 'p', `<em>${item.label}</code>`);
            if (item.status !== common_2.Status.stable) {
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
                        document.addChild(section, 'p', `See the <a rel="rdfs:isDefinedBy" href="${item.defined_by[0]}">formal definition of the term</a>.`);
                        break;
                    }
                    default: {
                        const refs = item.defined_by.map((def) => `<a rel="rdfs:isDefinedBy" href="${def}">here</a>`);
                        document.addChild(section, 'p', `See the formal definitions ${formatter.format(refs)}.`);
                    }
                }
            }
        }
        if (item.comment !== "") {
            let description = item.comment;
            if (factory_1.factory.includesCurie(item.type, "owl:ObjectProperty")) {
                description += "<br><br>The property's value should be a URL, i.e., not a literal.";
            }
            const div = document.addChild(section, 'div', description);
            if (!item.external) {
                div.setAttribute('property', 'rdfs:comment');
                div.setAttribute('datatype', 'rdf:HTML');
            }
        }
        else if (factory_1.factory.includesCurie(item.type, "owl:ObjectProperty")) {
            document.addChild(section, 'p', "The property's value should be a URL, i.e., not a literal.");
        }
        // Add the external warning, if applicable
        if (item.external) {
            const external_warning_text = `
                <b>This term is formally defined in another vocabulary</b>
                (as <a href="${item.url}">${item.curie}</a>), but is frequently used with this vocabulary and has been 
                included to aid readability of this document.
            `;
            const warning = document.addChild(section, 'p', external_warning_text);
            warning.setAttribute('class', 'note');
        }
        if (item.see_also && item.see_also.length > 0) {
            const dl = document.addChild(section, 'dl');
            dl.className = 'terms';
            document.addChild(dl, 'dt', 'See also:');
            const dd = document.addChild(dl, 'dd');
            for (const link of item.see_also) {
                const a = document.addChild(dd, 'a', link.label);
                a.setAttribute('href', link.url);
                if (!item.external)
                    a.setAttribute('property', 'rdfs:seeAlso');
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
        if (!item.external) {
            // These do not display, they are only here for RDFa's sake!
            const span = document.addChild(section, 'span');
            span.setAttribute('property', 'rdfs:isDefinedBy');
            span.setAttribute('resource', `${vocab_prefix}:`);
            const status_span = document.addChild(section, 'span');
            status_span.setAttribute('style', 'display: none');
            status_span.setAttribute('property', 'vs:term_status');
            document.addText(`${item.status}`, status_span);
            if (item.deprecated) {
                const span = document.addChild(section, 'span');
                span.setAttribute('property', 'owl:deprecated');
                span.setAttribute('datatype', 'xsd:boolean');
                span.setAttribute('style', 'display: none');
                document.addText('true', span);
            }
        }
    };
    const setExample = (section, item) => {
        if (item.example && item.example.length > 0) {
            for (const ex of item.example) {
                const example = document.addChild(section, 'pre', ex.json);
                example.className = 'example prettyprint language-json';
                if (ex.label) {
                    example.setAttribute('title', ex.label);
                }
            }
        }
    };
    // Prefixes that are used to differentiate among stable, reserved, and deprecated values
    const statusSignals = (status) => {
        switch (status) {
            case common_2.Status.deprecated:
                return { id_prefix: 'deprecated_', intro_prefix: '<em><strong>deprecated</strong></em>' };
            case common_2.Status.reserved:
                return { id_prefix: 'reserved_', intro_prefix: '<em><strong>reserved</strong></em>' };
            case common_2.Status.stable:
                return { id_prefix: '', intro_prefix: '' };
            default:
                throw new Error(`Unknown status: ${status}`);
        }
    };
    // Add the references to the context files (if any)
    const contextReferences = (section, item) => {
        if (item.context !== undefined && item.context?.length > 0) {
            const dl = document.addChild(section, 'dl');
            dl.className = 'terms';
            document.addChild(dl, 'dt', `Relevant <code>${(item.context.length) > 1 ? "@contexts" : "@context"}</code>:`);
            const dd = document.addChild(dl, 'dd');
            dd.innerHTML = item.context.map((ctx) => {
                return `<span rev="schema:mentions"><a href="${ctx}"><code>${ctx}</code></a></span>`;
            }).join(", ");
        }
    };
    /************ Functions to add specific content to the final HTML, based also on the template ********************/
    // RDFa preamble.
    const rdfaPreamble = () => {
        const body = document.getElementsByTagName('body')[0];
        if (body) {
            body.setAttribute('resource', vocab_url);
            body.setAttribute('prefix', vocab.prefixes.map((value) => `${value.prefix}: ${value.url}`).join(' '));
        }
    };
    // Get some generic metadata for the vocabulary that are part of the template text
    // These come from the ontology properties of the vocabulary.
    const ontologyProperties = () => {
        try {
            const title = vocab.ontology_properties.filter((property) => property.property === 'dc:title')[0].value;
            document.addText(title, document.getElementsByTagName('title')[0]);
            document.addText(title, document.getElementById('title'));
        }
        catch (_e) {
            console.log("Vocabulary warning: ontology title is not provided.");
        }
        const date = vocab.ontology_properties.filter((property) => property.property === 'dc:date')[0].value;
        document.addText(date, document.getElementById('time'));
        try {
            const description = vocab.ontology_properties.filter((property) => property.property === 'dc:description')[0].value;
            const descriptionElement = document.getElementById('description');
            if (descriptionElement !== null) {
                document.addHTMLText(description, descriptionElement);
                descriptionElement.setAttribute('datatype', 'rdf:HTML');
                descriptionElement.setAttribute('property', 'dc:description');
            }
            else {
                console.log("Vocabulary warning: ontology description is not provided.");
            }
        }
        catch (_e) {
            console.log("Vocabulary warning: ontology description is not provided.");
        }
        try {
            const see_also = vocab.ontology_properties.filter((property) => property.property === 'rdfs:seeAlso')[0].value;
            const target = document.getElementById('see_also');
            if (target) {
                const a = document.addChild(target, 'a', see_also);
                a.setAttribute('href', see_also);
                a.setAttribute('property', 'rdfs:seeAlso');
            }
        }
        catch (_e) {
            console.log("Vocabulary warning: no reference to the ontology specification provided.");
        }
    };
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
    };
    // Add the list of all contexts to the file
    const contexts = () => {
        const ctx_ul = document.getElementById('contexts');
        // Check whether the template includes a section for context files
        if (ctx_ul) {
            const ctx_keys = Object.keys(common_2.global.context_mentions);
            if (ctx_keys.length > 0) {
                // An item for each context file
                for (const ctx of ctx_keys) {
                    if (common_2.global.context_mentions[ctx].length === 0) {
                        continue;
                    }
                    const li = document.addChild(ctx_ul, 'li');
                    const a = document.addChild(li, 'a', `<code>${ctx}</code>`);
                    a.setAttribute('href', ctx);
                    a.setAttribute('typeof', 'jsonld:Context');
                    const details = document.addChild(li, 'details');
                    document.addChild(details, 'summary', 'term list');
                    const ul = document.addChild(details, 'ul');
                    for (const term of common_2.global.context_mentions[ctx]) {
                        document.addChild(ul, 'li', `<a href="#${term.html_id}"><code>${term.id}<code></li>`);
                    }
                }
            }
            else {
                // Remove the full section, it is not used (no context files)
                // The extra condition checks are imposed by Typescript. In a DOM and
                // knowing the templates, these parent elements are always present.
                const section = ctx_ul.parentElement;
                if (section) {
                    section.parentElement?.removeChild(section);
                }
            }
        }
    };
    // Note that the functions for classes, properties, etc., have a second argument for "statusFilter", ie, for reserved,
    // deprecate, or stable. These values are used to find the right section in the template, and can also
    // affect the real function. These functions are called several time, each with different status values
    // and different list of terms; see at the end of the function
    // Generation of the section content for classes: a big table, with a row per class
    // There is a check for a possible template error and also whether there are class
    // definitions in the first place.
    //
    // The generated DOM nodes get a bunch of RDFa properties (typeof, resource, property,...)
    // that makes things fairly confusing :-(
    const classes = (cl_list, statusFilter) => {
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
                        dl.className = 'terms';
                        document.addChild(dl, 'dt', 'Subclass of:');
                        const dd = document.addChild(dl, 'dd');
                        for (const superclass of item.subClassOf) {
                            const span = document.addChild(dd, 'span');
                            span.innerHTML = termHTMLReference(superclass);
                            span.setAttribute('property', 'rdfs:subClassOf');
                            span.setAttribute('resource', superclass.curie);
                        }
                    }
                    // Again an extra list for range/domain references, if applicable
                    if (item.range_of.length > 0 ||
                        item.domain_of.length > 0 ||
                        item.includes_range_of.length > 0 ||
                        item.included_in_domain_of.length > 0) {
                        // This for the creation of a list of property references, each
                        // a hyperlink to the property's definition.
                        const prop_names = (t) => {
                            const names = t.map(termHTMLReference);
                            return names.join(', ');
                        };
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
            }
            else {
                // Remove section from the DOM
                if (section.parentElement)
                    section.parentElement.removeChild(section);
            }
        }
    };
    // Generation of the section content for properties: a big table, with a row per property
    // There is a check for a possible template error and also whether there are properties
    // definitions in the first place.
    //
    // The generated DOM nodes get a bunch of RDFa properties (typeof, resource, property,...)
    // that makes things fairly confusing :-(
    const properties = (pr_list, statusFilter) => {
        const { id_prefix, intro_prefix } = statusSignals(statusFilter);
        const section = document.getElementById(`${id_prefix}property_definitions`);
        if (section) {
            if (pr_list.length > 0) {
                document.addChild(section, 'p', `The following are ${intro_prefix} property definitions in the <code>${vocab_prefix}</code> namespace.`);
                for (const item of pr_list) {
                    const pr_section = document.addChild(section, 'section');
                    pr_section.id = item.html_id;
                    commonFields(pr_section, item);
                    // Extra list of superproperty, if applicable
                    if (!item.external && item.subPropertyOf && item.subPropertyOf.length > 0) {
                        const dl = document.addChild(pr_section, 'dl');
                        dl.className = 'terms';
                        document.addChild(dl, 'dt', 'Subproperty of:');
                        const dd = document.addChild(dl, 'dd');
                        for (const superproperty of item.subPropertyOf) {
                            const span = document.addChild(dd, 'span');
                            span.innerHTML = termHTMLReference(superproperty);
                            span.setAttribute('property', 'rdfs:subPropertyOf');
                            span.setAttribute('resource', superproperty.curie);
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
                            dd.setAttribute('property', 'rdfs:range');
                            if (item.range.length === 1) {
                                dd.setAttribute('resource', item.range[0]);
                                dd.innerHTML = termHTMLReference(item.range[0]);
                            }
                            else {
                                document.addText('Intersection of:', dd);
                                document.addChild(dd, 'br');
                                for (const entry of item.range) {
                                    const r_span = document.addChild(dd, 'span');
                                    r_span.setAttribute('resource', entry);
                                    r_span.innerHTML = termHTMLReference(entry);
                                    document.addChild(dd, 'br');
                                }
                            }
                        }
                        if (item.domain && item.domain.length > 0) {
                            document.addChild(dl, 'dt', 'Domain:');
                            const dd = document.addChild(dl, 'dd');
                            dd.setAttribute('property', 'rdfs:domain');
                            if (item.domain.length === 1) {
                                dd.setAttribute('resource', item.domain[0]);
                                dd.innerHTML = termHTMLReference(item.domain[0]);
                            }
                            else {
                                // The union-of list is to be enclosed in a bnode in RDF
                                // this has to be added to the RDFa manually...
                                const u_bnode = bnode();
                                dd.setAttribute('resource', u_bnode);
                                document.addText('Union of: ', dd);
                                document.addChild(dd, 'br');
                                for (const entry of item.domain) {
                                    const sp = document.addChild(dd, 'span');
                                    sp.setAttribute('about', u_bnode);
                                    sp.setAttribute('inlist', 'true');
                                    sp.setAttribute('property', 'owl:unionOf');
                                    sp.setAttribute('resource', entry);
                                    sp.innerHTML = termHTMLReference(entry);
                                    document.addChild(dd, 'br');
                                }
                            }
                        }
                    }
                    contextReferences(pr_section, item);
                    setExample(pr_section, item);
                }
            }
            else {
                if (section.parentElement)
                    section.parentElement.removeChild(section);
            }
        }
    };
    // Generation of the section content for individuals: a big table, with a row per individual
    // There is a check for a possible template error and also whether there are individual
    // definitions in the first place.
    //
    // The generated DOM nodes get a bunch of RDFa properties (typeof, resource, property,...)
    // that makes things fairly confusing :-(
    const individuals = (ind_list, statusFilter) => {
        const { id_prefix, intro_prefix } = statusSignals(statusFilter);
        const section = document.getElementById(`${id_prefix}individual_definitions`);
        if (section) {
            if (ind_list.length > 0) {
                document.addChild(section, 'p', `The following are definitions for ${intro_prefix} individuals in the <code>${vocab_prefix}</code> namespace.`);
                for (const item of ind_list) {
                    const ind_section = document.addChild(section, 'section');
                    ind_section.id = item.html_id;
                    commonFields(ind_section, item);
                    const dl = document.addChild(ind_section, 'dl');
                    dl.className = 'terms';
                    if (!item.external && item.type.length > 0) {
                        document.addChild(dl, 'dt', 'Type');
                        const dd = document.addChild(dl, 'dd');
                        for (const item_type of item.type) {
                            document.addChild(dd, 'span', termHTMLReference(item_type));
                            document.addChild(dd, 'br');
                        }
                    }
                    contextReferences(ind_section, item);
                    setExample(ind_section, item);
                }
            }
            else {
                // removing the section from the DOM
                if (section.parentElement)
                    section.parentElement.removeChild(section);
            }
        }
    };
    // Generation of the section content for datatypes: a big table, with a row per datatype
    // There is a check for a possible template error and also whether there are individual
    // definitions in the first place.
    //
    // The generated DOM nodes get a bunch of RDFa properties (typeof, resource, property,...)
    // that makes things fairly confusing :-(
    const datatypes = (dt_list, statusFilter) => {
        const { id_prefix, intro_prefix } = statusSignals(statusFilter);
        const section = document.getElementById(`${id_prefix}datatype_definitions`);
        if (section) {
            if (dt_list.length > 0) {
                document.addChild(section, 'p', `The following are ${intro_prefix} datatype definitions in the <code>${vocab_prefix}</code> namespace.`);
                for (const item of dt_list) {
                    const dt_section = document.addChild(section, 'section');
                    dt_section.id = item.html_id;
                    commonFields(dt_section, item);
                    if (item.subClassOf && item.subClassOf.length > 0) {
                        const dl = document.addChild(dt_section, 'dl');
                        dl.className = 'terms';
                        document.addChild(dl, 'dt', 'Derived from:');
                        const dd = document.addChild(dl, 'dd');
                        for (const superclass of item.subClassOf) {
                            const span = document.addChild(dd, 'span');
                            span.innerHTML = termHTMLReference(superclass);
                            span.setAttribute('property', 'rdfs:subClassOf');
                            span.setAttribute('resource', superclass.curie);
                        }
                    }
                    if (item.range_of.length > 0 || item.includes_range_of.length > 0) {
                        // This for the creation of a list of property references, each
                        // a hyperlink to the property's definition.
                        const prop_names = (ids) => {
                            const names = ids.map(termHTMLReference);
                            return names.join(', ');
                        };
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
            }
            else {
                // removing the section from the DOM
                if (section.parentElement)
                    section.parentElement.removeChild(section);
            }
        }
    };
    /*********************** The real processing part, making use of all these functions ****************************/
    // The prefix and the URL for the vocabulary itself
    // I am just lazy to type things that are too long... :-)
    const vocab_prefix = common_2.global.vocab_prefix;
    const vocab_url = common_2.global.vocab_url;
    // 1. Set the necessary RDFa preamble into the body element
    rdfaPreamble();
    // 2. Set the general properties on the ontology itself
    ontologyProperties();
    // 3. The introductory list of prefixes used in the document
    prefixes();
    // 4. The introductory list of contexts used in the document
    contexts();
    // 5. Sections on classes
    Object.values(common_2.Status).map((filter) => {
        const actual_classes = vocab.classes.filter((entry) => entry.status === filter);
        classes(actual_classes, filter);
    });
    // 6. Sections on properties
    Object.values(common_2.Status).map((filter) => {
        const actual_properties = vocab.properties.filter((entry) => entry.status === filter);
        properties(actual_properties, filter);
    });
    // 7. Sections on individuals
    Object.values(common_2.Status).map((filter) => {
        const actual_individuals = vocab.individuals.filter((entry) => entry.status === filter);
        individuals(actual_individuals, filter);
    });
    // 8. Sections on datatypes
    Object.values(common_2.Status).map((filter) => {
        const actual_datatypes = vocab.datatypes.filter((entry) => entry.status === filter);
        datatypes(actual_datatypes, filter);
    });
    // 9. Remove the sections on reserved/deprecation in case there aren't any...
    if (common_2.global.status_counter.counter(common_2.Status.reserved) === 0) {
        const section = document.getElementById('reserved_term_definitions');
        if (section !== null && section.parentElement)
            section.parentElement.removeChild(section);
    }
    if (common_2.global.status_counter.counter(common_2.Status.deprecated) === 0) {
        const section = document.getElementById('deprecated_term_definitions');
        if (section !== null && section.parentElement)
            section.parentElement.removeChild(section);
    }
    return `<!DOCTYPE html>\n<html lang="en">${document.innerHTML()}</html>`;
}
