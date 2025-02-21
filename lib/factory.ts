import { RDFTerm, RDFProperty, RDFClass, RDFDatatype, RDFIndividual, TermType } from "./common";
import { global, RDFPrefix, }                                                   from "./common";
import { createHash }                                                           from 'node:crypto';


const bona_fide_urls = [
    "http:", "https:", "mailto:", "urn:", "doi:", 
    "ftp:", "did:", "tel:", "geo:", "cid:", "mid:", "news:", "nfs:", "tag:"
];
const bona_fide_prefixes = ["rdf", "rdfs", "owl", "xsd", "dc", "dcterms", "jsonld"];

// Calculate the SHA hash of a string. Used to encode the id of external terms
function computeHash(input: string, sh_func: string = "sha256"): string {
    return createHash(sh_func).update(input).digest('hex');
}

export class RDFTermFactory {
    private terms = new Map<string, RDFTerm>();
    private prefixes: RDFPrefix[] = [];

    /**
     * Initialize the factory with a set of prefixes.
     * 
     * @param prefixes 
     */
    initialize(prefixes: RDFPrefix[]) {
        this.prefixes = prefixes;
    }

    /**
     * Create or retrieve an (unknown) term.
     */
    term(curie: string): RDFTerm {
        if (this.prefixes.length === 0) {
            throw new Error("Prefixes not initialized");
        }

        if (this.terms.has(curie)) {
            return this.terms.get(curie)!;
        } else if (bona_fide_urls.some((url) => curie.startsWith(url))) {
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
            };
            this.terms.set(curie, output);
            return output;
        } else {
            const [prefix, reference, baseUrl, external] = ((): [string, string, string, boolean] => {
                if (curie.includes(":")) {
                    const [prefix, reference] = curie.split(":");
                    const baseUrl = this.prefixes.find((p) => p.prefix === prefix)?.url;
                    if (!baseUrl) {
                        throw new Error(`Prefix ${prefix} not found`);
                    }
                    const external = !([global.vocab_prefix, ...bona_fide_prefixes].includes(prefix));
                    return [prefix, reference, baseUrl, external];
                } else {
                    return [global.vocab_prefix, curie, global.vocab_url, false];
                }
            })();

            const output: RDFTerm = { 
                id:         reference,
                prefix:     prefix,
                html_id:    external ? computeHash(curie) : reference,
                curie:      curie,
                url:        `${baseUrl}${reference}`,
                type:       [],
                term_type:  TermType.unknown,
                label:      "",
                external:   external,
                context:    [],
            };
            this.terms.set(curie, output);
            return output;
        }
    }

    /**
     * Create or retrieve a class.
     */
    class(curie: string): RDFClass {
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
            } else if (output?.term_type === TermType.unknown) {
                Object.assign(output, extras);
                return output as RDFClass;
            } else {
                throw new Error(`Term ${curie} exists, and it is not a class`);
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
    property(curie: string): RDFProperty {
        const extras = {
            subPropertyOf : [] as RDFProperty[],
            domain        : [] as RDFClass[],
            range         : [] as RDFTerm[],
            dataset       : false,
            term_type     : TermType.property,
        }
        if (this.terms.has(curie)) {
            const output = this.terms.get(curie);
            if (output?.term_type === TermType.property) {
                return output as RDFProperty;
            } else if (output?.term_type === TermType.unknown) {
                Object.assign(output, extras);
                return output as RDFProperty;
            } else {
                throw new Error(`Term ${curie} exists, and it is not a property`);
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
    individual(curie: string): RDFIndividual {
        const extras = {
            term_type  : TermType.individual,}
        if (this.terms.has(curie)) {
            const output = this.terms.get(curie);
            if (output?.term_type === TermType.individual) {
                return output as RDFIndividual;
            } else if (output?.term_type === TermType.unknown) {
                Object.assign(output, extras);
                return output as RDFIndividual;
            } else {
                throw new Error(`Term ${curie} exists, and it is not an individual`);
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
    datatype(curie: string): RDFDatatype {
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
            } else if (output?.term_type === TermType.unknown) {
                Object.assign(output, extras);
                return output as RDFDatatype;
            } else {
                throw new Error(`Term ${curie} exists, and it is not a datatype`);
            }
        } else {
            const output: RDFTerm = this.term(curie);
            Object.assign(output, extras);
            return output as RDFDatatype;   
        }
    }

    /**
     * Promote an unknown term to a class. This is necessary when a term is used, e.g., in a range or domain, before it is defined.
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
            throw new Error(`Term ${term.id} is not an unknown term`);
        }
    }

    /**
     * Promote an unknown term to a datatype. This is necessary when a term is used, e.g., in a range or domain, before it is defined.
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
            throw new Error("Term ${term.id} is not an unknown term");
        }
    }

    /**
     * Check whether a term with a curie has been defined.
     */ 
    has(curie: string): boolean {
        return this.terms.has(curie);
    }

    /**
     * Get a term by curie.
     */
    get(curie: string): RDFTerm | undefined {
        return this.terms.get(curie);
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
     */
    static isUnknown(term: RDFTerm): term is RDFTerm {
        return term.term_type === TermType.unknown;
    }

    /**
     * Equality of terms
     */
    static equals(a: RDFTerm, b: RDFTerm): boolean {
        return a.id === b.id && a.prefix === b.prefix;
    }

    /**
     * Includes a curie in a list of terms. 
     * 
     */
    static includesTerm(terms: RDFTerm[], term: RDFTerm): boolean { 
        return terms.some((t) => RDFTermFactory.equals(t, term));
    }

    /**
      * Includes a curie in a list of terms. 
      * 
      */
    static includesCurie(terms: RDFTerm[], curie: string): boolean {
        return terms.some((t) => t.curie === curie);
    }
}

export const factory = new RDFTermFactory();

/******************************************************************* Testing **************************/

/**
 * 
 * Pseudo code for setting the range
 * 
 * See a curie defined by the user:
 * - if it has already been defined, retrieve it
 *   - if it is a class or a datatype, set the range; can be used to set the datatype or object property feature
 *   - if it is unknown, keep it as unknown, but if the prefix is xsd, or rdf:json and co, set it as a datatype property
 *   - otherwise, throw an error
 * - else, create a new, unknown term for the range
 * 
 * 
 * Define first classes and datatypes, this makes the stuff above work properly. The additional references for classes, ie,
 * the setting of domain_of etc, should be done in a separate step, after all classes and datatypes have been defined.
 *
 * If this is done at the end of all processing, the classes of datatypes, but even unknowns, are already defined
 */
// //**** Testing */
// function test() {
//     const testPrefixes: RDFPrefix[] = [
//         {
//             prefix: "a",
//             url: "http://example.org/", 
//         },
//         {
//             prefix: "dc",
//             url: "http://purl.org/dc/terms/",
//         },
//         {
//             prefix: "dcterms",
//             url: "http://purl.org/dc/terms/",
//         },
//         {
//             prefix: "owl",
//             url: "http://www.w3.org/2002/07/owl#",
//         },
//         {
//             prefix: "rdf",
//             url: "http://www.w3.org/1999/02/22-rdf-syntax-ns#"
//         },
//         {
//             prefix: "rdfs",
//             url: "http://www.w3.org/2000/01/rdf-schema#"
//         },
//         {
//             prefix: "xsd",
//             url: "http://www.w3.org/2001/XMLSchema#"
//         },
//         {
//             prefix: "vs",
//             url: "http://www.w3.org/2003/06/sw-vocab-status/ns#"
//         },
//         {
//             prefix: "schema",
//             url: "http://schema.org/"
//         },
//         {
//             prefix: "jsonld",
//             url: "http://www.w3.org/ns/json-ld#"
//         }
//     ];

//     Object.assign(global, { 
//     vocab_prefix: "a",
//     vocab_url: "http://example.org/",
//     });

//     factory.initialize(testPrefixes);

//     let C: RDFClass = factory.class("a:c");
//     const P: RDFProperty = factory.property("a:p");

//     const domain = {
//         domain: [C],
//     }

//     Object.assign(P, domain);

//     const extra = {
//         subClassOf: [factory.class("rdf:cc")],
//         range_of: [factory.property("schema:pp")],
//     };

//     Object.assign(C, extra);

//     console.log(P);

//     if (P.domain && P.domain.length !== 0) {
//         const Q: RDFClass = P.domain[0];
//         Q.subClassOf.push(factory.class("xsd:i"));
//     }   

//     console.log(C)
// }

// test();
