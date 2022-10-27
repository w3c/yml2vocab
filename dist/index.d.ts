import { Vocab }          from './lib/common';
import { get_data }       from "./lib/convert";
import { to_turtle }      from "./lib/turtle";
import { to_jsonld }      from './lib/jsonld';
import { to_html }        from './lib/html';
import { promises as fs } from 'fs';


/**
 * Conversion class for YAML to the various syntaxes.
 */
export class VocabGeneration {
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
    get_turtle(): string ;

    /**
     * Get the JSON-LD representation of the vocabulary
     * 
     * @returns The JSON-LD content
     */
    get_jsonld(): string ;

    /**
     * Get the HTML/RDFa representation of the vocabulary based on an HTML template
     * @param template - Textual version of the vocabulary template
     * @returns 
     */
    get_html(template: string): string ;
}

/**
 * The most common usage, currently, of the library: convert a YAML file into Turtle, JSON-LD, and HTML,
 * using a common basename for all three files, derived from the YAML file itself. The resulting vocabulary 
 * files are stored on the local file system.
 * 
 * @param yaml_file_name - the vocabulary file in YAML 
 * @param template_file_name - the HTML template file
 */
export function generate_vocabulary_files(yaml_file_name: string, template_file_name: string): Promise<void> ;
