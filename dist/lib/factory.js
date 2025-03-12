"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.factory = exports.RDFTermFactory = void 0;
const common_ts_1 = require("./common.ts");
const common_ts_2 = require("./common.ts");
const node_crypto_1 = require("node:crypto");
const bona_fide_urls = [
    "http:", "https:", "mailto:", "urn:", "doi:",
    "ftp:", "did:", "tel:", "geo:", "cid:", "mid:", "news:", "nfs:", "tag:"
];
const bona_fide_prefixes = ["rdf", "rdfs", "owl", "xsd", "dc", "dcterms", "jsonld"];
// Calculate the SHA hash of a string. Used to encode the id of external terms
function computeHash(input, sh_func = "sha256") {
    return (0, node_crypto_1.createHash)(sh_func).update(input).digest('hex');
}
class RDFTermFactory {
    terms = new Map();
    prefixes = [];
    /**
     * Initialize the factory with a set of prefixes.
     *
     * @param prefixes
     */
    initialize(prefixes) {
        this.prefixes = prefixes;
    }
    /**
     * Create or retrieve an (unknown) term.
     */
    term(curie) {
        if (this.prefixes.length === 0) {
            throw new Error("Prefixes not initialized");
        }
        if (this.terms.has(curie)) {
            return this.terms.get(curie);
        }
        else if (bona_fide_urls.some((url) => curie.startsWith(url))) {
            const output = {
                id: curie,
                prefix: "",
                html_id: computeHash(curie),
                curie: curie,
                url: curie,
                type: [],
                term_type: common_ts_1.TermType.fullUrl,
                label: "",
                external: true,
                context: [],
            };
            this.terms.set(curie, output);
            return output;
        }
        else {
            const [prefix, reference, baseUrl, external] = (() => {
                if (curie.includes(":")) {
                    const [prefix, reference] = curie.split(":");
                    const baseUrl = this.prefixes.find((p) => p.prefix === prefix)?.url;
                    if (!baseUrl) {
                        throw new Error(`Prefix ${prefix} not found`);
                    }
                    const external = !([common_ts_2.global.vocab_prefix, ...bona_fide_prefixes].includes(prefix));
                    return [prefix, reference, baseUrl, external];
                }
                else {
                    return [common_ts_2.global.vocab_prefix, curie, common_ts_2.global.vocab_url, false];
                }
            })();
            const output = {
                id: reference,
                prefix: prefix,
                html_id: external ? computeHash(curie) : reference,
                curie: curie,
                url: `${baseUrl}${reference}`,
                type: [],
                term_type: common_ts_1.TermType.unknown,
                label: "",
                external: external,
                context: [],
            };
            this.terms.set(curie, output);
            return output;
        }
    }
    /**
     * Create or retrieve a class.
     */
    class(curie) {
        const extras = {
            subClassOf: [],
            range_of: [],
            domain_of: [],
            included_in_domain_of: [],
            includes_range_of: [],
            term_type: common_ts_1.TermType.class,
        };
        if (this.terms.has(curie)) {
            const output = this.terms.get(curie);
            if (output?.term_type === common_ts_1.TermType.class) {
                return output;
            }
            else if (output?.term_type === common_ts_1.TermType.unknown) {
                Object.assign(output, extras);
                return output;
            }
            else {
                throw new Error(`Term ${curie} exists, and it is not a class`);
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
    property(curie) {
        const extras = {
            subPropertyOf: [],
            domain: [],
            range: [],
            dataset: false,
            term_type: common_ts_1.TermType.property,
        };
        if (this.terms.has(curie)) {
            const output = this.terms.get(curie);
            if (output?.term_type === common_ts_1.TermType.property) {
                return output;
            }
            else if (output?.term_type === common_ts_1.TermType.unknown) {
                Object.assign(output, extras);
                return output;
            }
            else {
                throw new Error(`Term ${curie} exists, and it is not a property`);
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
    individual(curie) {
        const extras = {
            type: [],
            term_type: common_ts_1.TermType.individual,
        };
        if (this.terms.has(curie)) {
            const output = this.terms.get(curie);
            if (output?.term_type === common_ts_1.TermType.individual) {
                return output;
            }
            else if (output?.term_type === common_ts_1.TermType.unknown) {
                Object.assign(output, extras);
                return output;
            }
            else {
                throw new Error(`Term ${curie} exists, and it is not an individual`);
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
    datatype(curie) {
        const extras = {
            subClassOf: [],
            range_of: [],
            includes_range_of: [],
            term_type: common_ts_1.TermType.datatype,
        };
        if (this.terms.has(curie)) {
            const output = this.terms.get(curie);
            if (output?.term_type === common_ts_1.TermType.datatype) {
                return output;
            }
            else if (output?.term_type === common_ts_1.TermType.unknown) {
                Object.assign(output, extras);
                return output;
            }
            else {
                throw new Error(`Term ${curie} exists, and it is not a datatype`);
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
     */
    promoteToClass(term) {
        if (term.term_type === common_ts_1.TermType.unknown) {
            Object.assign(term, {
                subClassOf: [],
                range_of: [],
                domain_of: [],
                included_in_domain_of: [],
                includes_range_of: [],
                term_type: common_ts_1.TermType.class,
            });
            return term;
        }
        else {
            throw new Error(`Term ${term.id} is not an unknown term`);
        }
    }
    /**
     * Promote an unknown term to a datatype. This is necessary when a term is used, e.g., in a range or domain, before it is defined.
     */
    promoteToDatatype(term) {
        if (term.term_type === common_ts_1.TermType.unknown) {
            Object.assign(term, {
                subClassOf: [],
                range_of: [],
                includes_range_of: [],
                term_type: common_ts_1.TermType.datatype,
            });
            return term;
        }
        else {
            throw new Error("Term ${term.id} is not an unknown term");
        }
    }
    /**
     * Check whether a term with a curie has been defined.
     */
    has(curie) {
        return this.terms.has(curie);
    }
    /**
     * Get a term by curie.
     */
    get(curie) {
        return this.terms.get(curie);
    }
    /**
     * Typeguard for classes.
     */
    static isClass(term) {
        return term.term_type === common_ts_1.TermType.class;
    }
    /**
     * Typeguard for properties.
     */
    static isProperty(term) {
        return term.term_type === common_ts_1.TermType.property;
    }
    /**
     * Typeguard for individuals.
     */
    static isIndividual(term) {
        return term.term_type === common_ts_1.TermType.individual;
    }
    /**
     * Typeguard for datatypes.
     */
    static isDatatype(term) {
        return term.term_type === common_ts_1.TermType.datatype;
    }
    /**
     * Typeguard for unknown terms.
     */
    static isUnknown(term) {
        return term.term_type === common_ts_1.TermType.unknown;
    }
    /**
     * Equality of terms
     */
    static equals(a, b) {
        return a.id === b.id && a.prefix === b.prefix;
    }
    /**
     * Includes a curie in a list of terms.
     *
     */
    static includesTerm(terms, term) {
        return terms.some((t) => RDFTermFactory.equals(t, term));
    }
    /**
      * Includes a curie in a list of terms.
      *
      */
    static includesCurie(terms, curie) {
        return terms.some((t) => t.curie === curie);
    }
}
exports.RDFTermFactory = RDFTermFactory;
exports.factory = new RDFTermFactory();
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
function test() {
    const testPrefixes = [
        {
            prefix: "a",
            url: "http://example.org/",
        },
        {
            prefix: "dc",
            url: "http://purl.org/dc/terms/",
        },
        {
            prefix: "dcterms",
            url: "http://purl.org/dc/terms/",
        },
        {
            prefix: "owl",
            url: "http://www.w3.org/2002/07/owl#",
        },
        {
            prefix: "rdf",
            url: "http://www.w3.org/1999/02/22-rdf-syntax-ns#"
        },
        {
            prefix: "rdfs",
            url: "http://www.w3.org/2000/01/rdf-schema#"
        },
        {
            prefix: "xsd",
            url: "http://www.w3.org/2001/XMLSchema#"
        },
        {
            prefix: "vs",
            url: "http://www.w3.org/2003/06/sw-vocab-status/ns#"
        },
        {
            prefix: "schema",
            url: "http://schema.org/"
        },
        {
            prefix: "jsonld",
            url: "http://www.w3.org/ns/json-ld#"
        }
    ];
    Object.assign(common_ts_2.global, {
        vocab_prefix: "a",
        vocab_url: "http://example.org/",
    });
    exports.factory.initialize(testPrefixes);
    let C = exports.factory.class("a:c");
    const P = exports.factory.property("a:p");
    const domain = {
        domain: [C],
    };
    Object.assign(P, domain);
    const extra = {
        subClassOf: [exports.factory.class("rdf:cc")],
        range_of: [exports.factory.property("schema:pp")],
    };
    Object.assign(C, extra);
    console.log(P);
    if (P.domain && P.domain.length !== 0) {
        const Q = P.domain[0];
        Q.subClassOf.push(exports.factory.class("xsd:i"));
    }
    console.log(C);
}
test();
