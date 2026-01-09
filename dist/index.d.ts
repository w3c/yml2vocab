/**
 * # Generate RDFS vocabulary files from YAML
 *
 * This script in this module converts a simple [RDF](https://www.w3.org/TR/rdf11-concepts/) vocabulary, described in [YAML](https://yaml.org/spec/1.2.2/),
 * into a formal [RDFS](https://www.w3.org/TR/rdf-schema/) in [JSON-LD](https://www.w3.org/TR/json-ld11/), [Turtle](https://www.w3.org/TR/turtle/),
 * and [HTML+RDFa](https://www.w3.org/TR/rdfa-core/). Optionally, a simple [JSON-LD `@context`](https://www.w3.org/TR/json-ld11/#the-context)
 * is also generated for the vocabulary. Neither the script nor the YAML format is prepared for complex vocabularies; its primary goal is to simplify
 * the generation of simple, straightforward RDFS vocabularies not requiring, for instance, sophisticated OWL statements.
 *
 * When running, the script relies on two files:
 *
 * 1. The `vocabulary.yml` file, containing the definition for the vocabulary entries. (It is also possible to use a different name for the YAML file, see below.)
 * 2. The `template.html` file, used to create the HTML file version of the vocabulary. (It is also possible to use a different name for the template file, see below.)
 *
 * For further details, see the more detailed documentation on [GitHub](https://w3c.github.io/yml2vocab/).
 *
 * @module
 */
/**
 * Conversion class for YAML to the various syntaxes.
 * The constructor of the class does the real work: converting the yaml file into
 * an internal representation of the vocabulary (see {@link Vocab}). The class methods
 * are the interfaces to the different representations of the vocabulary (done through
 * separate modules).
 */
export declare class VocabGeneration {
    private readonly vocab;
    /**
     * Conversion class for YAML to the various syntaxes. The real action is in the {@link getData} method.
     *
     * @param yml_content - the YAML content in string (before parsing)
     * @throws {ValidationError} Error raised by either the YAML parser or the Schema Validator
     */
    constructor(yml_content: string);
    /**
     * Get the Turtle representation of the vocabulary.
     *
     * @returns The Turtle content
     */
    getTurtle(): string;
    /**
     * Get the JSON-LD representation of the vocabulary.
     *
     * @returns The JSON-LD content
     */
    getJSONLD(): string;
    /**
     * Get the minimal JSON-LD Context file for the vocabulary.
     *
     * @returns The JSON-LD content
     */
    getContext(): string;
    /**
     * Get the HTML representation of the vocabulary based on an HTML template
     * @param template - Textual version of the vocabulary template
     * @param basename - Common basename for the generation of the output files
     * @param context - Whether a JSON-LD context file is also generated
     * @returns
     */
    getHTML(template: string, basename: string, context: boolean): string;
    /** @internal */
    get_turtle(): string;
    /** @internal */
    get_jsonld(): string;
    /** @internal */
    get_html(template: string, basename?: string, context?: boolean): string;
    /** @internal */
    get_context(): string;
}
/**
 * The most common usage, currently, of the library: convert a YAML file into Turtle, JSON-LD, and HTML,
 * using a common basename for all three files, derived from the YAML file itself. The resulting vocabulary
 * files are stored on the local file system.
 *
 * If the YAML file is incorrect (i.e., either the YAML parser or the Schema validation reports an error), an
 * error message is printed on the console and no additional files are generated.
 *
 * @param yaml_file_name - the vocabulary file in YAML
 * @param template_file_name - the HTML template file
 * @param context - whether the JSON-LD context file should also be generated
 * @throws on error situation in reading the input files, in yml validation, or when writing the result
 */
export declare function generateVocabularyFiles(yaml_file_name: string, template_file_name: string, context: boolean): Promise<void>;
/**
 *
 * @param yaml_file_name
 * @param template_file_name
 * @param context
 *
 * @internal
 */
export declare function generate_vocabulary_files(yaml_file_name: string, template_file_name: string, context: boolean): Promise<void>;
