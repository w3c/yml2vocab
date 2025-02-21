"use strict";
// deno-lint-ignore-file no-explicit-any
/**
 * Common types and variables.
 *
 * @packageDocumentation
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.TermType = exports.global = exports.StatusCounter = exports.Status = exports.EXTRA_DATATYPES = void 0;
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
 * This information is used in the HTML generation, for example, to decide whether a section in the template
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
var TermType;
(function (TermType) {
    TermType["class"] = "class";
    TermType["property"] = "property";
    TermType["individual"] = "individual";
    TermType["datatype"] = "datatype";
    TermType["unknown"] = "unknown";
    TermType["fullUrl"] = "fullUrl";
})(TermType || (exports.TermType = TermType = {}));
