/**
 * Conversion class for YAML to the various syntaxes.
 */
declare class VocabGeneration {
    /**
     * 
     * @param yml_content - the YAML content in string (before parsing)
     */
    constructor(yml_content: string);

    /**
     * Get the Turtle representation of the vocabulary
     * 
     * @returns The Turtle content
     */
    getTurtle(): string ;

    /**
     * Get the JSON-LD representation of the vocabulary
     * 
     * @returns The JSON-LD content
     */
    getJSOLD(): string ;

    /**
     * Get the minimal JSON-LD Context file for the vocabulary
     * 
     * @returns The JSON-LD content
     */
     getContext(): string ;

    /**
     * Get the HTML/RDFa representation of the vocabulary based on an HTML template
     * @param template - Textual version of the vocabulary template
     * @returns 
     */
    getHTML(template: string): string ;

    /* Deprecated; these are just to avoid problems for users of earlier versions */
    get_turtle() :string;
    get_jsonld() :string;
    get_html(template: string) :string;
    get_context() :string;
}

/**
 * The most common usage, currently, of the library: convert a YAML file into Turtle, JSON-LD, and HTML,
 * using a common basename for all three files, derived from the YAML file itself. The resulting vocabulary 
 * files are stored on the local file system.
 * 
 * @param yaml_file_name - the vocabulary file in YAML 
 * @param template_file_name - the HTML template file
 */
declare function generateVocabularyFiles(yaml_file_name: string, template_file_name: string): Promise<void> ;
declare function generate_vocabulary_files(yaml_file_name: string, template_file_name: string): Promise<void> ;
