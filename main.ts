#!/usr/bin/env node
import * as yml2vocab from './index';
import { Command }    from 'commander';
import * as process   from 'node:process';

/**
 * Entry point for running the script on the command line: 
 * 
 * 1. Read the YAML file
 * 2. Transform the content into an internal representation of the vocabulary
 * 3. Use the internal representation to generate a Turtle, JSON-LD, and HTML versions and, optionally, a JSON-LD context file.
 * 
 * The common name of the yml/ttl/html/jsonld.context files (differing only in the suffixes) can be given as the argument of the script.
 * The default is `vocabulary`. Similarly, the name of the HTML file can also be provided; the default is `template.html`.
 * 
 */
async function main() {
    const program = new Command();
    program
        .name('yml2vocab')
        .description('Convert a simple vocabulary, defined in YAML, to formal Turtle, JSON-LD, and HTML/RDFa files.')
        .usage('[options]')
        .option('-v --vocab [vocab]', 'vocabulary file name, defaults to "vocabulary.yml"')
        .option('-t --template [template]', 'template file name, defaults to "template.html"')
        .option('-c --context', 'whether a JSON-LD context file should also be generated, defaults to "false"')
        .parse(process.argv);
    
    const options = program.opts();
    
    const vocabulary: string = options.vocab ? options.vocab : 'vocabulary.yml';
    const template: string   = options.template ? options.template : 'template.html'; 
    const context: boolean   = options.context ? true : false;
    await yml2vocab.generateVocabularyFiles(vocabulary, template, context);
}

// At some point, node.js will allow to have async calls at the top level, and this extra function will
// become unnecessary. Until then…
main();


