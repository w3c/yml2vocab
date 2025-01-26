/**
 * API entry point to the package.
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
     * Get the HTML/RDFa representation of the vocabulary based on an HTML template
     * @param template - Textual version of the vocabulary template
     * @returns
     */
    getHTML(template: string): string;
    /** @internal */
    get_turtle(): string;
    /** @internal */
    get_jsonld(): string;
    /** @internal */
    get_html(template: string): string;
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
