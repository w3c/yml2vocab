"use strict";
// deno-lint-ignore-file no-explicit-any
/**
 * Common types and variables.
 *
 * @packageDocumentation
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.TermType = exports.bona_fide_prefixes = exports.bona_fide_urls = exports.global = exports.StatusCounter = exports.Status = exports.EXTRA_DATATYPES = void 0;
/**
 * List of datatypes that are formally defined in the RDF World beyond the
 * list of XSD datatypes.
 */
exports.EXTRA_DATATYPES = [
    "rdf:JSON",
    "rdf:HTML",
    "rdf:XMLLiteral",
    "rdf:PlainLiteral",
    "rdf:langString",
];
/**
 * Characterization of a class/property/individual on whether it is stable or not.
 */
var Status;
(function (Status) {
    Status["stable"] = "stable";
    Status["reserved"] = "reserved";
    Status["deprecated"] = "deprecated";
})(Status || (exports.Status = Status = {}));
/**
 * Simple counter to track how many terms are defined as `stable`, `reserved`, or `deprecated`.
 * This information is used in the HTML generation to decide whether the relevant section(s) in the template
 * should be removed (because it is empty), or not.
 */
class StatusCounter {
    stableNum = 0;
    reservedNum = 0;
    deprecatedNum = 0;
    /**
     * Increase the relevant counter.
     *
     * @param status
     */
    add(status) {
        switch (status) {
            case Status.stable: {
                this.stableNum++;
                return;
            }
            case Status.reserved: {
                this.reservedNum++;
                return;
            }
            case Status.deprecated: {
                this.deprecatedNum++;
                return;
            }
        }
    }
    /**
     * Return the relevant counter value.
     * @param status
     */
    counter(status) {
        switch (status) {
            case Status.stable: return this.stableNum;
            case Status.reserved: return this.reservedNum;
            case Status.deprecated: return this.deprecatedNum;
            default: throw new Error(`Unknown term status: ${status}`);
        }
    }
}
exports.StatusCounter = StatusCounter;
/**
 * As it name says: some global data that are needed by most of the media type specific modules.
 */
exports.global = {
    vocab_prefix: "",
    vocab_url: "",
    vocab_context: "",
    status_counter: new StatusCounter(),
    context_mentions: {},
    real_curies: [],
};
/* ************************************* Internal representation ***********************************/
/**
 * URL schemes; curies may be false when using these prefixes; they are, in fact, full URLs.
 */
exports.bona_fide_urls = [
    "http:", "https:", "mailto:", "urn:", "doi:",
    "ftp:", "did:", "tel:", "geo:", "cid:", "mid:", "news:", "nfs:", "tag:"
];
/**
 * Prefixes that are not defined in the vocabulary but frequently used, and are considered
 * as "part of the RDF world". They are listed as prefixes vocabulary, but their terms
 * are not displayed with a URL.
 */
exports.bona_fide_prefixes = ["rdf", "rdfs", "owl", "xsd", "dc", "dcterms", "jsonld"];
/**
 * Type of the term: class, property, individual, datatype, but also some transient, internal types
 * that categorize terms
 */
var TermType;
(function (TermType) {
    TermType["class"] = "class";
    TermType["property"] = "property";
    TermType["individual"] = "individual";
    TermType["datatype"] = "datatype";
    /**
     * This is a "core" term, i.e., terms in RDF, xsd, rdfs, etc.
     * Their full URL-s are unused, because they are well-known.
     */
    TermType["core"] = "core";
    /*
    * This is a term that is not defined in the vocabulary, but used in the context of a vocabulary item
    * description. The URL should be displayed whenever appropriate.
    *
    * This is often a transient term: it is created during the conversion process because it appears
    * as a reference (supertype, domain, range, etc.) but gets its final category only later in the process.
    */
    TermType["unknown"] = "unknown";
    /**
     * This is not a real term, but just a URL that has been used as a term
     * (e.g., in the domain or range of a property).
     * See also {@link bona_fide_urls}.
     */
    TermType["fullUrl"] = "fullUrl";
})(TermType || (exports.TermType = TermType = {}));
