"use strict";
// deno-lint-ignore-file no-explicit-any
/**
 * Common types and variables.
 *
 * @packageDocumentation
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.global = exports.StatusCounter = exports.Status = exports.EXTRA_DATATYPES = void 0;
/**
 * List of datatypes that are formally defined in the RDF World, and are beyond the
 * list of core, XSD datatypes
 */
exports.EXTRA_DATATYPES = [
    "rdf:JSON",
    "rdf:HTML",
    "rdf:XMLLiteral",
    "rdf:PlainLiteral",
    "rdf:langString"
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
*/
class StatusCounter {
    stableNum = 0;
    reservedNum = 0;
    deprecateNum = 0;
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
                this.deprecateNum++;
                return;
            }
        }
    }
    counter(status) {
        switch (status) {
            case Status.stable: return this.stableNum;
            case Status.reserved: return this.reservedNum;
            case Status.deprecated: return this.deprecateNum;
        }
    }
}
exports.StatusCounter = StatusCounter;
exports.global = {
    /** Vocabulary prefix for the vocabulary being handled */
    vocab_prefix: "",
    /** Vocabulary URL for the vocabulary being handled */
    vocab_url: "",
    /** Default context URL for the vocabulary being handled */
    vocab_context: "",
    /**
     * Counter for the terms with various status values.
     * Some serializers (eg HTML) may optimize/improve the final
     * output if one of the categories have no entries whatsoever.
     */
    status_counter: new StatusCounter(),
    /**
     * Inverted info for contexts: for each context the list of relevant terms are listed
     */
    context_mentions: {},
};
;
