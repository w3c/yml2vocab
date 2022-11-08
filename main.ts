#!/usr/bin/env node
import * as yml2vocab from './index';
import { Command }    from 'commander';

/**
 * Entry point for running the script on the command line: 
 * 
 * 1. Read the YAML file
 * 2. Transform the content into an internal representation of the vocabulary
 * 3. Use the internal representation to generate a Turtle, JSON-LD, and HTML versions.
 * 
 * The common name of the yml/ttl/html/jsonld files (differing only in the suffixes) can be given as the argument of the script.
 * The default is `vocabulary`
 * 
 */
async function main() {
    const program = new Command();
    program
        .name('yml2vocab')
        .description('Convert a simple vocabulary, defined in YAML, to formal Turtle, JSON-LD, and HTML/RDFa files.')
        .usage('[options]')
        .option('-v --vocab [vocab]')
        .option('-t --template [template]')
        .on('--help', () => {
            console.log('\nvocab:     vocabulary file name, defaults to "vocabulary.yml"\ntemplate:  template file name, defaults to "template.html"')
        })
        .parse(process.argv);
    
    const options = program.opts();
    
    const vocabulary = options.vocab ? options.vocab : 'vocabulary.yml';
    const template = options.template ? options.template : 'template.html'; 
    await yml2vocab.generate_vocabulary_files(vocabulary,template);
}

// At some point, node.js will allow to have async calls at the top level, and this extra function will
// become unnecessary. Until then…

main();


