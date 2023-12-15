// deno-lint-ignore-file no-explicit-any
/**
 * Common types and variables.
 * 
 * @packageDocumentation
 */

/**
 * List of datatypes that are formally defined in the RDF World, and are beyond the
 * list of core, XSD datatypes
 */
export const EXTRA_DATATYPES: string[] = [
    "rdf:JSON",
    "rdf:HTML",
    "rdf:XMLLiteral",
    "rdf:PlainLiteral",
    "rdf:langString"
]

/**
 * Characterization of a class/property/individual on whether it is stable or not.
 */
export enum Status {
    stable     = "stable", 
    reserved   = "reserved", 
    deprecated = "deprecated"
}

/**
* Simple counter to track how many terms are defined as `stable`, `reserved`, or `deprecated`.
*/
export class StatusCounter {
    private stableNum    = 0;
    private reservedNum  = 0;
    private deprecateNum = 0;

    add(status: Status): void {
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
    counter(status: Status): number {
        switch (status) {
            case Status.stable: return this.stableNum; 
            case Status.reserved: return this.reservedNum;
            case Status.deprecated: return this.deprecateNum;
        }
    }
}

/**
 * Placeholder for some global data. 
 */
export const global = {
    /** Vocabulary prefix for the vocabulary being handled */
    vocab_prefix   : "",
    /** Vocabulary URL for the vocabulary being handled */
    vocab_url      : "",
    /** 
     * Counter for the terms with various status values.
     * Some serializers (eg HTML) may optimize/improve the final
     * output if one of the categories have no entries whatsoever.
     */
    status_counter : new StatusCounter(), 
} 

/**
 * Generic structure for a hyperlink
 */
export interface Link {
    label : string;
    url   : string;
}

/**
 * Common structure for an example that can be added to the code and shown in the HTML version of the data.
 */
export interface Example {
    label ?: string;
    json   : string;
}

/** 
* Superset of all YAML entries expressed in TS. Look at the Readme.md file for what they are meant for.
*
* Used to induce some extra checks by TS compile time; the classes are converted into
* the common classes in this module
*/
export interface RawVocabEntry {
    id           : string;
    property    ?: string;
    value       ?: string;
    label        : string;
    upper_value ?: string[];
    domain      ?: string[];
    range       ?: string[];
    deprecated  ?: boolean;
    status      ?: Status;
    defined_by  ?: string;
    comment     ?: string;
    see_also    ?: Link[];
    example     ?: Example[];
    dataset     ?: boolean;
};

/**
 * This is the structure of the YAML file itself. Note that only vocab and ontology is required, everything else is optional
 */
export interface RawVocab {
    vocab       : RawVocabEntry[];
    prefix     ?: RawVocabEntry[];
    ontology    : RawVocabEntry[];
    class      ?: RawVocabEntry[];
    property   ?: RawVocabEntry[];
    individual ?: RawVocabEntry[];
    datatype   ?: RawVocabEntry[];
}

/**
 * Type needed for the JSON Schema validation interface
 * 
 * One of the two values are null, depending on the validation result.
 */
export interface ValidationResults {
    /** 
     * The YAML content converted into a JSON object; ready to be converted further.
     * If the content is valid, the error array is empty. Otherwise, the vocab field is null, and
     * the validation error(s) are returned.
     */
    vocab : RawVocab | null,
    error : ValidationError[];
}

/**
 * This is a shortened version of the full Ajv error message (the schema is very simple,
 * the generic Ajv error message is way to complex for this use)
 */
export interface ValidationError {
    message ?: string,
    params  ?: any,
    data    ?: any,
}

/**
 * Top level class for a term in general. Pretty much self-explanatory...
 */
export interface RDFTerm {
    id          : string;
    type        : string[];
    label       : string;
    comment    ?: string;
    defined_by ?: string;
    see_also   ?: Link[];
    deprecated ?: boolean;
    status     ?: Status;
    example    ?: Example[];
}

/**
 * Extra information necessary for a class: its superclasses.
 * The cross references for domains and ranges are calculated.
 * None is required.
 */
export interface RDFClass extends RDFTerm {
    subClassOf            ?: string[];
    range_of              : string[];
    domain_of             : string[];
    included_in_domain_of : string[];
    includes_range_of     : string[];
}

/**
 * Extra information necessary for a property: its superproperties, range, and domain.
 * None of these are required.
 */
export interface RDFProperty extends RDFTerm {
    subPropertyOf ?: string[];
    domain        ?: string[];
    range         ?: string[];
    dataset       ?: boolean;
}

/**
 * No extra information is necessary for an individual, but it makes the code
 * more readable if there is a separate interface for it. And one may never
 * know how things will evolve...
 */
// deno-lint-ignore no-empty-interface
export interface RDFIndividual extends RDFTerm {
}

/**
 * Extra optional information is the superclass (ie, the datatypes that was used to derive this one).
 * The cross references for domains and ranges are calculated.
 */
export interface RDFDatatype extends RDFTerm {
    subClassOf        ?: string[],
    range_of          : string[];
    includes_range_of : string[];
}


/**
 * Information for a prefix (to be used either as a prefix in Turtle or in the context of a JSON-LD).
 */
export interface RDFPrefix {
    prefix : string;
    url    : string;
}

/**
 * Information for the ontology properties, i.e., properties that are defined on the top level. 
 * 
 * The third value (url) indicates whether the property is a URL value. For values extracted from the CSV
 * this is decided by checking whether the string can be considered to be a valid URL or not.
 */
export interface OntologyProperty {
    property : string;
    value    : string;
    url      : boolean;
}

/**
 * A vocabulary consists of prefixes, top level (ontology) properties, classes, properties and,
 * possibly, datatypes and individuals…
 */
export interface Vocab {
    prefixes            : RDFPrefix[],
    ontology_properties : OntologyProperty[]
    classes             : RDFClass[],
    properties          : RDFProperty[],
    individuals         : RDFIndividual[],
    datatypes           : RDFDatatype[],
}

