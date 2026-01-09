"use strict";
/**
 * A factory object for the creation of RDF Terms.
 *
 * The main reason for using this factory is that fact that some terms may be used before they are formally defined.
 * The factory will create a term with the minimal information needed, and then promotes it to a class, property, etc.,
 * when defined.
 *
 * Also: some terms refer to internal terms, i.e., defined by the input yml file, and some refer to external terms,
 * i.e., defined by external ontologies. The factory will put in the correct properties, used by the generator functions
 * to HTML, Turtle, or JSON-LD.
 *
 * @packageDocumentation
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.factory = exports.RDFTermFactory = void 0;
const common_1 = require("./common");
const node_crypto_1 = require("node:crypto");
// Calculate the SHA hash of a string. Used to encode the id of external terms
function computeHash(input, sh_func = "sha256") {
    return (0, node_crypto_1.createHash)(sh_func).update(input).digest('hex');
}
// Create a curie, if needed, from a core term
function createCurie(str) {
    return str.includes(":") ? str : `${common_1.global.vocab_prefix}:${str}`;
}
// Split a curie into prefix and reference (the reference may contain colons)
function splitCurie(str) {
    const firstColonIndex = str.indexOf(":");
    if (firstColonIndex !== -1) {
        const firstPart = str.substring(0, firstColonIndex);
        const secondPart = str.substring(firstColonIndex + 1);
        return [firstPart, secondPart];
    }
    else {
        throw new Error(`Invalid curie (${str})`);
    }
}
/**
 * A factory object for the creation of RDF Terms.
 *
 * The main reason for using this factory is that fact that some terms may be used before they are formally defined.
 * The factory will create a term with the minimal information needed, and then promote it to a class, property, etc.,
 * when defined.
 *
 * Also: some terms refer to internal terms, i.e., defined by the input yml file, and some refer to external terms,
 * i.e., defined by external ontologies. The factory will put in the correct properties, used by the generator functions
 * to HTML, Turtle, or JSON-LD.
 *
 * Terms are stored in an internal map, indexed by their _curie_. The curie is used even if the term is defined locally;
 * the general prefix of the vocabulary (defined in the yml file) is used for that purpose.
 *
 * Note that the factory includes some methods that are not (yet?) used in the package. They are included for possible future use.
 *
 */
class RDFTermFactory {
    terms = new Map();
    prefixes = [];
    used_prefixes = new Set(['dc']);
    /**
     * Initialize the factory with a set of prefixes.
     *
     * @param prefixes
     */
    initialize(prefixes) {
        this.prefixes = prefixes;
    }
    /**
     * Create or retrieve an term. When created, the term is initially considered as an `unknown` term.
     */
    term(index) {
        if (this.prefixes.length === 0) {
            throw new Error("Prefixes not initialized");
        }
        const curie = createCurie(index);
        if (this.terms.has(curie)) {
            return this.terms.get(curie);
        }
        else if (common_1.bona_fide_urls.some((url) => curie.startsWith(url))) {
            // This is definitely an external term using a "usual" url, ie, http, https, doi, etc
            const output = {
                id: curie,
                prefix: "",
                html_id: computeHash(curie),
                curie: curie,
                url: curie,
                type: [],
                term_type: common_1.TermType.fullUrl,
                label: "",
                external: true,
                context: [],
                toString() {
                    return this.curie;
                }
            };
            this.terms.set(curie, output);
            return output;
        }
        else {
            const [prefix, reference, baseUrl, outsider, term_type] = (() => {
                const [prefix, reference] = splitCurie(curie);
                if (prefix === common_1.global.vocab_prefix) {
                    return [prefix, reference, common_1.global.vocab_url, false, common_1.TermType.unknown];
                }
                else {
                    const baseUrl = this.prefixes.find((p) => p.prefix === prefix)?.url;
                    if (!baseUrl) {
                        throw new Error(`URL for prefix "${prefix}" not found`);
                    }
                    if (common_1.bona_fide_prefixes.includes(prefix)) {
                        return [prefix, reference, baseUrl, false, common_1.TermType.core];
                    }
                    else {
                        return [prefix, reference, baseUrl, true, common_1.TermType.unknown];
                    }
                }
            })();
            // Store the prefix as being really in use
            this.used_prefixes.add(prefix);
            const output = {
                id: reference,
                prefix: prefix,
                html_id: outsider ? computeHash(curie) : reference,
                curie: curie,
                // curie:   `${prefix}:${reference}`,
                url: `${baseUrl}${reference}`,
                type: [],
                term_type: term_type,
                // term_type: bona_fide_prefixes.includes(prefix) ? TermType.core : TermType.unknown,
                label: "",
                // This is set to its final value at conversion time. It depends on whether a term is part of the definition in the yml file
                external: false,
                context: [],
                toString() {
                    return this.curie;
                }
            };
            this.terms.set(output.curie, output);
            return output;
        }
    }
    /**
     * Create or retrieve a class.
     */
    class(index) {
        const curie = createCurie(index);
        const extras = {
            subClassOf: [],
            range_of: [],
            domain_of: [],
            included_in_domain_of: [],
            includes_range_of: [],
            term_type: common_1.TermType.class,
        };
        if (this.terms.has(curie)) {
            const output = this.terms.get(curie);
            if (output?.term_type === common_1.TermType.class) {
                return output;
            }
            else if (output?.term_type === common_1.TermType.unknown || output?.term_type === common_1.TermType.core) {
                Object.assign(output, extras);
                // A hack. A datatype may appear as a class (which is semantically true)
                // but should not be treated as a class
                if (common_1.bona_fide_prefixes.includes(output.prefix)) {
                    output.term_type = common_1.TermType.unknown;
                }
                return output;
            }
            else {
                throw new Error(`When creating a class: term ${curie} exists, and it is not a class`);
            }
        }
        else {
            const output = this.term(curie);
            Object.assign(output, extras);
            return output;
        }
    }
    /**
     * Create or retrieve a property.
     */
    property(index) {
        const curie = createCurie(index);
        const extras = {
            subPropertyOf: [],
            domain: [],
            range: [],
            dataset: false,
            strongURL: false,
            term_type: common_1.TermType.property,
        };
        if (this.terms.has(curie)) {
            const output = this.terms.get(curie);
            if (output?.term_type === common_1.TermType.property) {
                return output;
            }
            else if (output?.term_type === common_1.TermType.unknown || output?.term_type === common_1.TermType.core) {
                Object.assign(output, extras);
                return output;
            }
            else {
                throw new Error(`When creating a property: term ${curie} exists, and it is not a property`);
            }
        }
        else {
            const output = this.term(curie);
            Object.assign(output, extras);
            return output;
        }
    }
    /**
     * Create or retrieve an individual.
     */
    individual(index) {
        const curie = createCurie(index);
        const extras = {
            term_type: common_1.TermType.individual,
        };
        if (this.terms.has(curie)) {
            const output = this.terms.get(curie);
            if (output?.term_type === common_1.TermType.individual) {
                return output;
            }
            else if (output?.term_type === common_1.TermType.unknown || output?.term_type === common_1.TermType.core) {
                Object.assign(output, extras);
                return output;
            }
            else {
                throw new Error(`When creating an individual: term ${curie} exists, and it is not an individual`);
            }
        }
        else {
            const output = this.term(curie);
            Object.assign(output, extras);
            return output;
        }
    }
    /**
     * Create or retrieve a datatype.
     */
    datatype(index) {
        const curie = createCurie(index);
        const extras = {
            subClassOf: [],
            range_of: [],
            includes_range_of: [],
            term_type: common_1.TermType.datatype,
        };
        if (this.terms.has(curie)) {
            const output = this.terms.get(curie);
            if (output?.term_type === common_1.TermType.datatype) {
                return output;
            }
            else if (output?.term_type === common_1.TermType.unknown || output?.term_type === common_1.TermType.core) {
                Object.assign(output, extras);
                return output;
            }
            else {
                throw new Error(`When creating a datatype: term ${curie} exists, and it is not a datatype`);
            }
        }
        else {
            const output = this.term(curie);
            Object.assign(output, extras);
            return output;
        }
    }
    /**
     * Promote an unknown term to a class. This is necessary when a term is used, e.g., in a range or domain, before it is defined.
     *
     * (Currently unused in the package.)
     */
    promoteToClass(term) {
        if (term.term_type === common_1.TermType.unknown) {
            Object.assign(term, {
                subClassOf: [],
                range_of: [],
                domain_of: [],
                included_in_domain_of: [],
                includes_range_of: [],
                term_type: common_1.TermType.class,
            });
            return term;
        }
        else {
            throw new Error(`Term ${term.curie} is not an unknown term`);
        }
    }
    /**
     * Promote an unknown term to a datatype. This is necessary when a term is used, e.g., in a range or domain, before it is defined.
     *
     * (Currently unused in the package.)
     */
    promoteToDatatype(term) {
        if (term.term_type === common_1.TermType.unknown) {
            Object.assign(term, {
                subClassOf: [],
                range_of: [],
                includes_range_of: [],
                term_type: common_1.TermType.datatype,
            });
            return term;
        }
        else {
            throw new Error(`Term ${term.curie} is not an unknown term`);
        }
    }
    /**
     * Check whether a term with a curie has been defined.
     */
    has(index) {
        return this.terms.has(createCurie(index));
    }
    /**
     * Get a term by curie.
     *
     * (Currently unused in the package.)
     */
    get(index) {
        return this.terms.get(createCurie(index));
    }
    /**
     * Typeguard for classes.
     */
    static isClass(term) {
        return term.term_type === common_1.TermType.class;
    }
    /**
     * Typeguard for properties.
     */
    static isProperty(term) {
        return term.term_type === common_1.TermType.property;
    }
    /**
     * Typeguard for individuals.
     *
     * (Currently unused in the package.)
     */
    static isIndividual(term) {
        return term.term_type === common_1.TermType.individual;
    }
    /**
     * Typeguard for datatypes.
     */
    static isDatatype(term) {
        return term.term_type === common_1.TermType.datatype;
    }
    /**
     * Typeguard for unknown terms.
     *
     * (Currently unused in the package.)
     */
    static isUnknown(term) {
        return term.term_type === common_1.TermType.unknown;
    }
    /**
     * Equality of terms
     *
     */
    static equals(a, b) {
        return a.curie === b.curie;
    }
    /**
     * Is a term included in a list of terms.
     *
     */
    static includesTerm(terms, term) {
        return terms.some((t) => RDFTermFactory.equals(t, term));
    }
    /**
      * Does a curie identify a term in a list of terms.
      *
      */
    static includesCurie(terms, index) {
        const curie = createCurie(index);
        return terms.some((t) => t.curie === curie);
    }
    /**
     * List the prefixes used by the vocabulary
     *
     */
    listPrefixes() {
        return [...this.used_prefixes];
    }
    /**
     * Does the system really use a predefined prefix?
     *
     */
    usesPrefix(prefix) {
        return this.used_prefixes.has(prefix);
    }
}
exports.RDFTermFactory = RDFTermFactory;
/**
 * The (only) factory object used in the package.
 */
exports.factory = new RDFTermFactory();
