#!/usr/bin/env/node
import * as yml2vocab from './index';

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
import { promises as fs } from 'fs';

async function main() {
    const get_fname = () : string => {
        if (process.argv.length > 2) {
            const vocab_name = process.argv[2];
            return vocab_name.endsWith('.yml') ? vocab_name.slice(0,-4) : vocab_name;
        } else {
            return 'vocabulary'
        }  
    }
    const fname = get_fname();
    await yml2vocab.generate_vocabulary_files(fname, "template.html");
}

// At some point, node.js will allow to have async calls at the top level, and this extra function will
// become unnecessary. Until then…

main();


