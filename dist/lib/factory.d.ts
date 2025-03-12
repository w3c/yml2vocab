import { RDFTerm, RDFProperty, RDFClass, RDFDatatype, RDFIndividual } from "./common.ts";
import { RDFPrefix } from "./common.ts";
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
     * Create or retrieve an (unknown) term.
     */
    term(curie: string): RDFTerm;
    /**
     * Create or retrieve a class.
     */
    class(curie: string): RDFClass;
    /**
     * Create or retrieve a property.
     */
    property(curie: string): RDFProperty;
    /**
     * Create or retrieve an individual.
     */
    individual(curie: string): RDFIndividual;
    /**
     * Create or retrieve a datatype.
     */
    datatype(curie: string): RDFDatatype;
    /**
     * Promote an unknown term to a class. This is necessary when a term is used, e.g., in a range or domain, before it is defined.
     */
    promoteToClass(term: RDFTerm): RDFClass;
    /**
     * Promote an unknown term to a datatype. This is necessary when a term is used, e.g., in a range or domain, before it is defined.
     */
    promoteToDatatype(term: RDFTerm): RDFDatatype;
    /**
     * Check whether a term with a curie has been defined.
     */
    has(curie: string): boolean;
    /**
     * Get a term by curie.
     */
    get(curie: string): RDFTerm | undefined;
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
     */
    static isIndividual(term: RDFTerm): term is RDFIndividual;
    /**
     * Typeguard for datatypes.
     */
    static isDatatype(term: RDFTerm): term is RDFDatatype;
    /**
     * Typeguard for unknown terms.
     */
    static isUnknown(term: RDFTerm): term is RDFTerm;
    /**
     * Equality of terms
     */
    static equals(a: RDFTerm, b: RDFTerm): boolean;
    /**
     * Includes a curie in a list of terms.
     *
     */
    static includesTerm(terms: RDFTerm[], term: RDFTerm): boolean;
    /**
      * Includes a curie in a list of terms.
      *
      */
    static includesCurie(terms: RDFTerm[], curie: string): boolean;
}
export declare const factory: RDFTermFactory;
