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

import type { RDFTerm, RDFProperty, RDFClass, RDFDatatype, RDFIndividual,  RDFPrefix } from './common';
import { global, bona_fide_urls, bona_fide_prefixes, TermType }                        from './common';
import { createHash }                                                                  from 'node:crypto';

// Calculate the SHA hash of a string. Used to encode the id of external terms
function computeHash(input: string, sh_func: string = "sha256"): string {
    return createHash(sh_func).update(input).digest('hex');
}

// Create a curie, if needed, from a core term
function createCurie(str: string): string {
    return str.includes(":") ? str : `${global.vocab_prefix}:${str}`;
}

// Split a curie into prefix and reference (the reference may contain colons)
function splitCurie(str: string): [string, string] {
    const firstColonIndex = str.indexOf(":");
    if (firstColonIndex !== -1) {
        const firstPart = str.substring(0, firstColonIndex);
        const secondPart = str.substring(firstColonIndex + 1);
        return [firstPart, secondPart];
    } else {
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
export class RDFTermFactory {
    private terms = new Map<string, RDFTerm>();
    private prefixes: RDFPrefix[] = [];
    private used_prefixes: Set<string> = new Set()

    /**
     * Initialize the factory with a set of prefixes.
     *
     * @param prefixes
     */
    initialize(prefixes: RDFPrefix[]) {
        this.prefixes = prefixes;
    }

    /**
     * Create or retrieve an term. When created, the term is initially considered as an `unknown` term.
     */
    term(index: string): RDFTerm {
        if (this.prefixes.length === 0) {
            throw new Error("Prefixes not initialized");
        }

        const curie = createCurie(index)

        if (this.terms.has(curie)) {
            return this.terms.get(curie)!;
        } else if (bona_fide_urls.some((url) => curie.startsWith(url))) {
            // This is definitely an external term using a "usual" url, ie, http, https, doi, etc
            const output: RDFTerm = {
                id:         curie,
                prefix:     "",
                html_id:    computeHash(curie),
                curie:      curie,
                url:        curie,
                type:       [],
                term_type:  TermType.fullUrl,
                label:      "",
                external:   true,
                context:    [],
                toString(): string {
                    return this.curie;
                }
            };
            this.terms.set(curie, output);
            return output;
        } else {
            const [prefix, reference, baseUrl, outsider, term_type] = ((): [string, string, string, boolean, TermType] => {
                const [prefix, reference] = splitCurie(curie);
                if (prefix === global.vocab_prefix) {
                    return [prefix, reference, global.vocab_url, false, TermType.unknown];
                } else {
                    const baseUrl = this.prefixes.find((p) => p.prefix === prefix)?.url;
                    if (!baseUrl) {
                        throw new Error(`URL for prefix "${prefix}" not found`);
                    }
                    if (bona_fide_prefixes.includes(prefix)) {
                        return [prefix, reference, baseUrl, false, TermType.core];
                    } else {
                        return [prefix, reference, baseUrl, true, TermType.unknown];
                    }
                }
            })();

            // Store the prefix as being really in use
            this.used_prefixes.add(prefix);

            const output: RDFTerm = {
                id:         reference,
                prefix:     prefix,
                html_id:    outsider ? computeHash(curie) : reference,
                curie:      curie,
                // curie:   `${prefix}:${reference}`,
                url:        `${baseUrl}${reference}`,
                type:       [],
                term_type:  term_type,
                // term_type: bona_fide_prefixes.includes(prefix) ? TermType.core : TermType.unknown,
                label:      "",
                // This is set to its final value at conversion time. It depends on whether a term is part of the definition in the yml file
                external:   false,
                context:    [],
                toString(): string {
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
    class(index: string): RDFClass {
        const curie = createCurie(index);
        const extras = {
            subClassOf            : [] as RDFClass[],
            range_of              : [] as RDFProperty[],
            domain_of             : [] as RDFProperty[],
            included_in_domain_of : [] as RDFProperty[],
            includes_range_of     : [] as RDFProperty[],
            term_type             : TermType.class,
        }
        if (this.terms.has(curie)) {
            const output = this.terms.get(curie);
            if (output?.term_type === TermType.class) {
                return output as RDFClass;
            } else if (output?.term_type === TermType.unknown || output?.term_type === TermType.core) {
                Object.assign(output, extras);
                // A hack. A datatype may appear as a class (which is semantically true)
                // but should not be treated as a class
                if( bona_fide_prefixes.includes(output.prefix)) {
                    output.term_type = TermType.unknown;
                }
                return output as RDFClass;
            } else {
                throw new Error(`When creating a class: term ${curie} exists, and it is not a class`);
            }
        } else {
            const output: RDFTerm = this.term(curie);
            Object.assign(output, extras);
            return output as RDFClass;
        }
    }

    /**
     * Create or retrieve a property.
     */
    property(index: string): RDFProperty {
        const curie = createCurie(index);
        const extras = {
            subPropertyOf : [] as RDFProperty[],
            domain        : [] as RDFClass[],
            range         : [] as RDFTerm[],
            dataset       : false,
            strongURL     : false,
            term_type     : TermType.property,
        }
        if (this.terms.has(curie)) {
            const output = this.terms.get(curie);
            if (output?.term_type === TermType.property) {
                return output as RDFProperty;
            } else if (output?.term_type === TermType.unknown || output?.term_type === TermType.core) {
                Object.assign(output, extras);
                return output as RDFProperty;
            } else {
                throw new Error(`When creating a property: term ${curie} exists, and it is not a property`);
            }
        } else {
            const output: RDFTerm = this.term(curie);
            Object.assign(output, extras);
            return output as RDFProperty;
        }
    }

    /**
     * Create or retrieve an individual.
     */
    individual(index: string): RDFIndividual {
        const curie = createCurie(index);
        const extras = {
            term_type  : TermType.individual,}
        if (this.terms.has(curie)) {
            const output = this.terms.get(curie);
            if (output?.term_type === TermType.individual) {
                return output as RDFIndividual;
            } else if (output?.term_type === TermType.unknown || output?.term_type === TermType.core) {
                Object.assign(output, extras);
                return output as RDFIndividual;
            } else {
                throw new Error(`When creating an individual: term ${curie} exists, and it is not an individual`);
            }
        } else {
            const output: RDFTerm = this.term(curie);
            Object.assign(output, extras);
            return output as RDFIndividual;
        }
    }

    /**
     * Create or retrieve a datatype.
     */
    datatype(index: string): RDFDatatype {
        const curie = createCurie(index);
        const extras = {
            subClassOf        : [] as RDFDatatype[],
            range_of          : [] as RDFProperty[],
            includes_range_of : [] as RDFProperty[],
            term_type         : TermType.datatype,
        }
        if (this.terms.has(curie)) {
            const output = this.terms.get(curie);
            if (output?.term_type === TermType.datatype) {
                return output as RDFDatatype;
            } else if (output?.term_type === TermType.unknown || output?.term_type === TermType.core) {
                Object.assign(output, extras);
                return output as RDFDatatype;
            } else {
                throw new Error(`When creating a datatype: term ${curie} exists, and it is not a datatype`);
            }
        } else {
            const output: RDFTerm = this.term(curie);
            Object.assign(output, extras);
            return output as RDFDatatype;
        }
    }

    /**
     * Promote an unknown term to a class. This is necessary when a term is used, e.g., in a range or domain, before it is defined.
     *
     * (Currently unused in the package.)
     */
    promoteToClass(term: RDFTerm): RDFClass {
        if (term.term_type === TermType.unknown) {
            Object.assign(term, {
                subClassOf:            [],
                range_of:              [],
                domain_of:             [],
                included_in_domain_of: [],
                includes_range_of:     [],
                term_type:             TermType.class,
            });
            return term as RDFClass;
        } else {
            throw new Error(`Term ${term.curie} is not an unknown term`);
        }
    }

    /**
     * Promote an unknown term to a datatype. This is necessary when a term is used, e.g., in a range or domain, before it is defined.
     *
     * (Currently unused in the package.)
     */
    promoteToDatatype(term: RDFTerm): RDFDatatype {
        if (term.term_type === TermType.unknown) {
            Object.assign(term, {
                subClassOf:        [],
                range_of:          [],
                includes_range_of: [],
                term_type:         TermType.datatype,
            });
            return term as RDFDatatype;
        } else {
            throw new Error(`Term ${term.curie} is not an unknown term`);
        }
    }

    /**
     * Check whether a term with a curie has been defined.
     */
    has(index: string): boolean {
        return this.terms.has(createCurie(index));
    }

    /**
     * Get a term by curie.
     *
     * (Currently unused in the package.)
     */
    get(index: string): RDFTerm | undefined {
        return this.terms.get(createCurie(index));
    }

    /**
     * Typeguard for classes.
     */
    static isClass(term: RDFTerm): term is RDFClass {
        return term.term_type === TermType.class;
    }

    /**
     * Typeguard for properties.
     */
    static isProperty(term: RDFTerm): term is RDFProperty {
        return term.term_type === TermType.property;
    }

    /**
     * Typeguard for individuals.
     *
     * (Currently unused in the package.)
     */
    static isIndividual(term: RDFTerm): term is RDFIndividual {
        return term.term_type === TermType.individual;
    }

    /**
     * Typeguard for datatypes.
     */
    static isDatatype(term: RDFTerm): term is RDFDatatype {
        return term.term_type === TermType.datatype;
    }

    /**
     * Typeguard for unknown terms.
     *
     * (Currently unused in the package.)
     */
    static isUnknown(term: RDFTerm): term is RDFTerm {
        return term.term_type === TermType.unknown;
    }

    /**
     * Equality of terms
     *
     */
    static equals(a: RDFTerm, b: RDFTerm): boolean {
        return a.curie === b.curie;
    }

    /**
     * Is a term included in a list of terms.
     *
     */
    static includesTerm(terms: RDFTerm[], term: RDFTerm): boolean {
        return terms.some((t) => RDFTermFactory.equals(t, term));
    }

    /**
      * Does a curie identify a term in a list of terms.
      *
      */
    static includesCurie(terms: RDFTerm[], index: string): boolean {
        const curie = createCurie(index)
        return terms.some((t) => t.curie === curie);
    }

    /**
     * Does the system really use a predefined prefix?
     *
     */
    usesPrefix(prefix: string): boolean {
        return this.used_prefixes.has(prefix);
    }
}

/**
 * The (only) factory object used in the package.
 */
export const factory = new RDFTermFactory();

