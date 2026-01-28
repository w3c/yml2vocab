/**
 * Common types, variables, and utilities.
 *
 * @packageDocumentation
 */
/**
 * List of datatypes that are formally defined in the RDF World beyond the
 * list of XSD datatypes.
 */
export declare const EXTRA_DATATYPES: string[];
/**
 * Characterization of a class/property/individual on whether it is stable or not.
 */
export declare enum Status {
    stable = "stable",
    reserved = "reserved",
    deprecated = "deprecated"
}
/**
 * Simple counter to track how many terms are defined as `stable`, `reserved`, or `deprecated`.
 * This information is used in the HTML generation to decide whether the relevant section(s) in the template
 * should be removed (because it is empty), or not.
 */
export declare class StatusCounter {
    private stableNum;
    private reservedNum;
    private deprecatedNum;
    /**
     * Increase the relevant counter.
     *
     * @param status
     */
    add(status: Status): void;
    /**
     * Return the relevant counter value.
     * @param status
     */
    counter(status: Status): number;
}
export interface JSON_LD {
    alias?: Record<string, string>;
    import?: string | string[];
}
/**
 * Context references. Lists, for a context, the terms that are listed in them.
 * Used when generating the list of terms used by a context in, e.g., the HTML output.
 * Terms in the values are identified by their CURIE (i.e., the namespace is also included)
 */
export interface Contexts {
    [ctx: string]: RDFTerm[];
}
/**
 * Placeholder for some global data. This class has only one instance ({@link global}); see its
 * documentation for the meaning of the different fields.
 */
export interface GlobalData {
    /** Vocabulary prefix for the vocabulary being handled. */
    vocab_prefix: string;
    /** Vocabulary URL for the vocabulary being handled. */
    vocab_url: string;
    /** Default context URL for the vocabulary being handled. */
    vocab_context?: string;
    /**
     * Counter for the terms with various status values.
     * Some serializers (e.g. HTML) may optimize/improve the final
     * output if one of the categories have no entries whatsoever.
     */
    status_counter: StatusCounter;
    /**
     * Inverted info for contexts: for each context the list of relevant terms are listed.
     */
    context_mentions: Contexts;
    /**
     * List of "real" curies that occur in the vocabulary as terms. These are, usually,
     * external terms but, in theory, may also be bona fide terms defined as part of this
     * vocabulary.
     *
     * Used to set the right 'id' values for cross-references in the generated HTML file
     */
    real_curies: string[];
    /**
     * JSON-LD keyword aliases, to be added to the JSON-LD context file on the user's request
     */
    aliases: Record<string, string>;
    /**
     * Imported context files, to be added to the JSON-LD context file on the user's request
     */
    import: string[];
}
/**
 * As it name says: some global data that are needed by some of the media type specific modules.
 */
export declare const global: GlobalData;
/**
 * Generic structure for a hyperlink
 */
export interface Link {
    label: string;
    url: string;
}
/**
 * Common structure for an example that can be added to the code and shown in the HTML version of the data.
 */
export interface Example {
    label?: string;
    json: string;
}
/**
 * Enumeration for possible container values
 */
export declare enum Container {
    list = "list",
    set = "set",
    graph = "graph"
}
/**
 * Superset of all YAML entries, expressed in TS. Look at the Readme.md file for what they are meant for.
 *
 * Instances of the classes are converted into the internal classes (e.g., {@link RDFClass},
 * {@link RDFProperty}, etc.) in the `convert` module.
 */
export interface RawVocabEntry {
    id: string;
    property?: string;
    value?: string;
    label: string;
    type?: string[];
    upper_value?: string[];
    upper_union?: boolean;
    domain?: string[];
    range?: string[];
    range_union?: boolean;
    deprecated?: boolean;
    status?: Status;
    external?: boolean;
    defined_by?: string[];
    comment?: string;
    see_also?: Link[];
    known_as?: string;
    example?: Example[];
    dataset?: boolean;
    container?: Container;
    context?: string[];
    one_of?: string[];
    pattern?: string;
}
/**
 * This is the structure of the YAML file itself. Note that only vocab and ontology are required, everything else is optional
 */
export interface RawVocab {
    vocab: RawVocabEntry[];
    prefix?: RawVocabEntry[];
    ontology: RawVocabEntry[];
    class?: RawVocabEntry[];
    property?: RawVocabEntry[];
    individual?: RawVocabEntry[];
    datatype?: RawVocabEntry[];
    json_ld?: JSON_LD;
}
/**
 * Type needed for the JSON Schema validation interface.
 *
 * One of the two values are null, depending on the validation result. (That is how Ajv works…)
 */
export interface ValidationResults {
    /**
     * The YAML content converted into a JSON object; ready to be converted further.
     * If the content is valid, the error array is empty. Otherwise, the vocab field is null, and
     * the validation error(s) are returned.
     */
    vocab: RawVocab | null;
    error: ValidationError[];
}
/**
 * This is a shortened version of the full Ajv error message (the schema is very simple,
 * the generic Ajv error message is way too complex for our use)
 */
export interface ValidationError {
    message?: string;
    params?: any;
    data?: any;
}
/**
 * URL schemes; curies may be false when using these prefixes; they are, in fact, full URLs.
 */
export declare const bona_fide_urls: string[];
/**
 * Prefixes that are not defined in the vocabulary but frequently used, and are considered
 * as "part of the RDF world". They are listed as prefixes vocabulary, but their terms
 * are not displayed with a URL.
 */
export declare const bona_fide_prefixes: string[];
/**
 * Type of the term: class, property, individual, datatype, but also some transient, internal types
 * that categorize terms
 */
export declare enum TermType {
    class = "class",
    property = "property",
    individual = "individual",
    datatype = "datatype",
    /**
     * This is a "core" term, i.e., terms in RDF, xsd, rdfs, etc.
     * Their full URL-s are unused, because they are well-known.
     */
    core = "core",
    unknown = "unknown",
    /**
     * This is not a real term, but just a URL that has been used as a term
     * (e.g., in the domain or range of a property).
     * See also {@link bona_fide_urls}.
     */
    fullUrl = "fullUrl"
}
/**
 * Top level class for an RDF term in general. Pretty much self-explanatory...
 */
export interface RDFTerm {
    /** The _name_ of the term, without the namespace prefix. */
    id: string;
    /** The namespace prefix; usually the same as the vocabulary prefix, but not always (e.g., external terms). */
    prefix: string;
    /** The ID used in the HTML listing. It is, usually, the same as the id, except for an external term */
    html_id: string;
    /** The curie of the term. Used this way, for example, in turtle */
    curie: string;
    /** The full URL of the term */
    url: string;
    /** The exact term type; used in the categorization of the terms */
    term_type: TermType;
    /** The types provided by the YAML file _and_ the generated types by the conversion (e.g., `rdf:Property`). */
    type: RDFTerm[];
    /** The types provided by the YAML file */
    user_type?: RDFTerm[];
    label: string;
    comment?: string;
    defined_by?: string[];
    see_also?: Link[];
    /** This field is, in fact, potentially deprecated, because the status has taken over. Kept for backward compatibility. */
    deprecated?: boolean;
    /** Alternative label to be used, e.g., in a context file. Rarely used. */
    known_as?: string;
    status?: Status;
    /** Whether this term is really part of the vocabulary, or is defined externally. */
    external?: boolean;
    example?: Example[];
    context: string[];
    /** This is to simplify the text conversion of the terms to strings; it usually refers to the curie */
    toString: () => string;
}
/**
 * Extra information necessary for a class: its superclasses.
 * The cross-references for domains and ranges are calculated at conversion time.
 * None is required.
 */
export interface RDFClass extends RDFTerm {
    subClassOf: RDFClass[];
    upper_union: boolean;
    one_of: RDFIndividual[];
    range_of: RDFProperty[];
    domain_of: RDFProperty[];
    included_in_domain_of: RDFProperty[];
    includes_range_of: RDFProperty[];
}
/**
 * Extra information necessary for a property: its super-properties, range, and domain.
 * None of these are required.
 */
export interface RDFProperty extends RDFTerm {
    subPropertyOf: RDFProperty[];
    domain: RDFClass[];
    range: RDFTerm[];
    range_union: boolean;
    one_of: RDFIndividual[];
    dataset: boolean;
    container: Container | undefined;
    strongURL: boolean;
}
/**
 * No extra information is necessary for an individual, but it makes the code
 * more readable if there is a separate interface for it. And one may never
 * know how things will evolve...
 */
export interface RDFIndividual extends RDFTerm {
}
/**
 * Extra optional information is the superclass (ie, the datatypes that was used to derive this one).
 * The cross-references for domains and ranges are calculated.
 */
export interface RDFDatatype extends RDFTerm {
    subClassOf: RDFDatatype[];
    upper_union: boolean;
    one_of: string[];
    pattern: string;
    range_of: RDFProperty[];
    includes_range_of: RDFProperty[];
}
/**
 * Information for a prefix (to be used either as a prefix in Turtle or in the context of a JSON-LD).
 */
export interface RDFPrefix {
    prefix: string;
    url: string;
}
/**
 * Information for the ontology properties, i.e., properties that are defined on the top level.
 *
 * The third value (url) indicates whether the property is a URL value. For values extracted from the YAML file
 * this is decided by checking whether the string can be considered to be a valid URL or not.
 */
export interface OntologyProperty {
    property: string;
    value: string;
    url: boolean;
}
/**
 * Representation of a full vocabulary: it consists of prefixes, top level (ontology) properties, classes, properties and,
 * possibly, datatypes and individuals…
 */
export interface Vocab {
    prefixes: RDFPrefix[];
    ontology_properties: OntologyProperty[];
    classes: RDFClass[];
    properties: RDFProperty[];
    individuals: RDFIndividual[];
    datatypes: RDFDatatype[];
}
/**
 * These prefixes are added no matter what; they are not vocabulary specific,
 * but likely to be used in the vocabulary. Excesses are filtered out at the end...
 *
 * @internal
 */
export declare const defaultPrefixes: RDFPrefix[];
/**
 * Some prefixes are not dependent on the users' vocabulary but, rather, on the
 * specificities of a particular serialization. These should not be filtered out
 * when optimizing the prefixes...
 */
export declare const requiredTurtlePrefixes: string[];
export declare const requiredJsonPrefixes: string[];
