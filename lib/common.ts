/**
 * Common types and variables.
 * 
 * @packageDocumentation
 */


/**
 * Placeholder for global data. At the moment, the only thing
 * it holds is the prefix and the URL of the URL that is being 
 * handled/
 */
export interface Global {
    vocab_prefix : string;
    vocab_url    : string;
}

export const global = {
    vocab_prefix : "",
    vocab_url    : ""
} 

export interface Link {
    label : string;
    url   : string;
}

export interface Example {
    label ?: string;
    json   : string;
}

/** 
* Superset of all YAML entries expressed in TS. Look at the Readme.md file for what they are meant for.
*
* This is used to induce some extra checks by TS compile time; the classes are converted into
* the common classes defined in common.ts in this module
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
    comment      : string;
    see_also    ?: Link[];
    example     ?: Example[];
    dataset     ?: boolean;
};

/**
 * This is the structure of the YAML file itself. Note that vocab and ontology is required, everything else is optional
 */
export interface RawVocab {
    vocab       : RawVocabEntry[];
    prefix     ?: RawVocabEntry[];
    ontology    : RawVocabEntry[];
    class      ?: RawVocabEntry[];
    property   ?: RawVocabEntry[];
    individual ?: RawVocabEntry[];
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
    comment     : string;
    see_also   ?: Link[];
    deprecated ?: boolean;
    example    ?: Example[];
}

/**
 * Extra information necessary for a class: its superclasses.
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
 * more readable if there is a separate interface for it.
 */
export interface RDFIndividual extends RDFTerm {
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
 * possibly, individuals…
 */
export interface Vocab {
    prefixes            : RDFPrefix[],
    ontology_properties : OntologyProperty[]
    classes             : RDFClass[],
    properties          : RDFProperty[],
    individuals         : RDFIndividual[],
}

