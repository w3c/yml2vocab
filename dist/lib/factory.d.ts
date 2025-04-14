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
 * @packageDocumentation
 */
import { RDFTerm, RDFProperty, RDFClass, RDFDatatype, RDFIndividual } from "./common";
import { RDFPrefix } from "./common";
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
export declare class RDFTermFactory {
    private terms;
    private prefixes;
    /**
     * Initialize the factory with a set of prefixes.
     *
     * @param prefixes
     */
    initialize(prefixes: RDFPrefix[]): void;
    /**
     * Create or retrieve an term. When created, the term is initially considered as an `unknown` term.
     */
    term(index: string): RDFTerm;
    /**
     * Create or retrieve a class.
     */
    class(index: string): RDFClass;
    /**
     * Create or retrieve a property.
     */
    property(index: string): RDFProperty;
    /**
     * Create or retrieve an individual.
     */
    individual(index: string): RDFIndividual;
    /**
     * Create or retrieve a datatype.
     */
    datatype(index: string): RDFDatatype;
    /**
     * Promote an unknown term to a class. This is necessary when a term is used, e.g., in a range or domain, before it is defined.
     *
     * (Currently unused in the pacakage.)
     */
    promoteToClass(term: RDFTerm): RDFClass;
    /**
     * Promote an unknown term to a datatype. This is necessary when a term is used, e.g., in a range or domain, before it is defined.
     *
     * (Currently unused in the package.)
     */
    promoteToDatatype(term: RDFTerm): RDFDatatype;
    /**
     * Check whether a term with a curie has been defined.
     */
    has(index: string): boolean;
    /**
     * Get a term by curie.
     *
     * (Currently unused in the package.)
     */
    get(index: string): RDFTerm | undefined;
    /**
     * Typeguard for classes.
     */
    static isClass(term: RDFTerm): term is RDFClass;
    /**
     * Typeguard for properties.
     */
    static isProperty(term: RDFTerm): term is RDFProperty;
    /**
     * Typeguard for individuals.
     *
     * (Currently unused in the package.)
     */
    static isIndividual(term: RDFTerm): term is RDFIndividual;
    /**
     * Typeguard for datatypes.
     */
    static isDatatype(term: RDFTerm): term is RDFDatatype;
    /**
     * Typeguard for unknown terms.
     *
     * (Currently unused in the package.)
     */
    static isUnknown(term: RDFTerm): term is RDFTerm;
    /**
     * Equality of terms
     *
     */
    static equals(a: RDFTerm, b: RDFTerm): boolean;
    /**
     * Is a term included in a list of terms.
     *
     */
    static includesTerm(terms: RDFTerm[], term: RDFTerm): boolean;
    /**
      * Does a curie identify a term in a list of terms.
      *
      */
    static includesCurie(terms: RDFTerm[], index: string): boolean;
}
/**
 * The (only) factory object used in the package.
 */
export declare const factory: RDFTermFactory;
