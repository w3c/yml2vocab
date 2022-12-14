import { Vocab, ValidationError }  from './lib/common';
import { get_data }                from "./lib/convert";
import { to_turtle }               from "./lib/turtle";
import { to_jsonld }               from './lib/jsonld';
import { to_html }                 from './lib/html';
import { to_context }              from './lib/context';
import { promises as fs }          from 'fs';


/**
 * Conversion class for YAML to the various syntaxes.
 */
export class VocabGeneration {
    private vocab: Vocab;

    /**
     * 
     * @param yml_content - the YAML content in string (before parsing)
     * @throws {ValidationError} Error raised by either the YAML parser or the Schema Validator
     */
    constructor(yml_content: string) {
        this.vocab = get_data(yml_content);
    }

    /**
     * Get the Turtle representation of the vocabulary
     * 
     * @returns The Turtle content
     */
    get_turtle(): string {
        return to_turtle(this.vocab);
    }

    /**
     * Get the JSON-LD representation of the vocabulary
     * 
     * @returns The JSON-LD content
     */
    get_jsonld(): string {
        return to_jsonld(this.vocab);
    }

    /**
     * Get the minimal JSON-LD Context file for the vocabulary
     * 
     * @returns The JSON-LD content
     */
     get_context(): string {
        return to_context(this.vocab);
    }

    /**
     * Get the HTML/RDFa representation of the vocabulary based on an HTML template
     * @param template - Textual version of the vocabulary template
     * @returns 
     */
    get_html(template: string): string {
        return to_html(this.vocab, template);
    }


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
 */
export async function generate_vocabulary_files(yaml_file_name: string, template_file_name: string, context: boolean): Promise<void> {
    // This trick allows the user to give the full yaml file name, or only the common base
    const basename = yaml_file_name.endsWith('.yml') ? yaml_file_name.slice(0,-4) : yaml_file_name;

    // Get the two files from the file system (at some point, this can be extended
    // to URL-s using fetch)
    const [yaml, template] = await Promise.all([
        fs.readFile(`${basename}.yml`,'utf-8'),
        fs.readFile(template_file_name, 'utf-8')
    ]);

    try {
        const conversion: VocabGeneration = new VocabGeneration(yaml);

        const fs_writes: Promise<void>[] = [
            fs.writeFile(`${basename}.ttl`, conversion.get_turtle()),
            fs.writeFile(`${basename}.jsonld`, conversion.get_jsonld()),
            fs.writeFile(`${basename}.html`, conversion.get_html(template)),
        ];
        if (context) {
            fs_writes.push(fs.writeFile(`${basename}_context.jsonld`, conversion.get_context()))
        }
        await Promise.all(fs_writes);    
    } catch(e: any) {
        console.error(`Validation error in the YAML file:\n${JSON.stringify(e,null,4)}`);
    }
}
