"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generate_vocabulary_files = exports.generateVocabularyFiles = exports.VocabGeneration = void 0;
const convert_1 = require("./lib/convert");
const turtle_1 = require("./lib/turtle");
const jsonld_1 = require("./lib/jsonld");
const html_1 = require("./lib/html");
const context_1 = require("./lib/context");
const node_fs_1 = require("node:fs");
/**
 * Conversion class for YAML to the various syntaxes.
 */
class VocabGeneration {
    vocab;
    /**
     *
     * @param yml_content - the YAML content in string (before parsing)
     * @throws {ValidationError} Error raised by either the YAML parser or the Schema Validator
     */
    constructor(yml_content) {
        this.vocab = (0, convert_1.getData)(yml_content);
    }
    /**
     * Get the Turtle representation of the vocabulary
     *
     * @returns The Turtle content
     */
    getTurtle() {
        return (0, turtle_1.toTurtle)(this.vocab);
    }
    /**
     * Get the JSON-LD representation of the vocabulary
     *
     * @returns The JSON-LD content
     */
    getJSONLD() {
        return (0, jsonld_1.toJSONLD)(this.vocab);
    }
    /**
     * Get the minimal JSON-LD Context file for the vocabulary
     *
     * @returns The JSON-LD content
     */
    getContext() {
        return (0, context_1.toContext)(this.vocab);
    }
    /**
     * Get the HTML/RDFa representation of the vocabulary based on an HTML template
     * @param template - Textual version of the vocabulary template
     * @returns
     */
    getHTML(template) {
        return (0, html_1.toHTML)(this.vocab, template);
    }
    /* Deprecated; these are just to avoid problems for users of earlier versions */
    get_turtle() { return this.getTurtle(); }
    get_jsonld() { return this.getJSONLD(); }
    get_html(template) { return this.getHTML(template); }
    get_context() { return this.getContext(); }
}
exports.VocabGeneration = VocabGeneration;
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
async function generateVocabularyFiles(yaml_file_name, template_file_name, context) {
    // This trick allows the user to give the full yaml file name, or only the common base
    const basename = yaml_file_name.endsWith('.yml') ? yaml_file_name.slice(0, -4) : yaml_file_name;
    // Get the two files from the file system (at some point, this can be extended
    // to URL-s using fetch instead of an fs.read but, so far, there was no need)
    let yaml = '', template = '';
    const read_errors = [];
    const reads = await Promise.allSettled([
        node_fs_1.promises.readFile(`${basename}.yml`, 'utf-8'),
        node_fs_1.promises.readFile(template_file_name, 'utf-8')
    ]);
    if (reads[0].status === "fulfilled") {
        yaml = reads[0].value;
    }
    else {
        read_errors[0] = reads[0].reason;
    }
    if (reads[1].status === "fulfilled") {
        template = reads[1].value;
    }
    else {
        read_errors.push(reads[1].reason);
    }
    if (read_errors.length !== 0) {
        // One of the two files could not be read, we should abort here:
        throw (new AggregateError(read_errors.join('\n')));
    }
    try {
        const conversion = new VocabGeneration(yaml);
        {
            const fs_writes = [
                node_fs_1.promises.writeFile(`${basename}.ttl`, conversion.getTurtle()),
                node_fs_1.promises.writeFile(`${basename}.jsonld`, conversion.getJSONLD()),
                node_fs_1.promises.writeFile(`${basename}.html`, conversion.getHTML(template)),
            ];
            if (context) {
                fs_writes.push(node_fs_1.promises.writeFile(`${basename}_context.jsonld`, conversion.getContext()));
            }
            const write_errors = (await Promise.allSettled(fs_writes))
                .filter((result) => result.status === "rejected")
                .map((result) => (result.status === "rejected" ? result.reason : ''));
            if (write_errors.length != 0) {
                // One or more files could not be written, we should throw an exception...
                throw (new AggregateError(write_errors.join('\n')));
            }
        }
    }
    catch (e) {
        console.error(`Error in the YML conversion:\n${e.message}\nCause: ${e.cause}`);
    }
}
exports.generateVocabularyFiles = generateVocabularyFiles;
//
// This function is retained for historical reasons, before the naming conventions have been changed to camel case for functions.
// Older usage may rely on this format, and there is no reason to make them invalid...
//
async function generate_vocabulary_files(yaml_file_name, template_file_name, context) {
    return await generateVocabularyFiles(yaml_file_name, template_file_name, context);
}
exports.generate_vocabulary_files = generate_vocabulary_files;
