#! /Users/ivan/W3C/github/VC/yml2vocab/node_modules/.bin/ts-node
import { Vocab }          from './lib/common';
import { get_data }       from "./lib/convert";
import { to_turtle }      from "./lib/turtle";
import { to_jsonld }      from './lib/jsonld';
import { to_html }        from './lib/html';

/**
 * Entry point for the script: 
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
    const get_fname = () : string => {
        if (process.argv.length > 2) {
            const vocab_name = process.argv[2];
            return vocab_name.endsWith('.yml') ? vocab_name.slice(0,-4) : vocab_name;
        } else {
            return 'vocabulary'
        }  
    }
    const fname = get_fname();
    const vocab: Vocab = await get_data(`${fname}.yml`);
    await Promise.all([
        to_turtle(`${fname}.ttl`, vocab),
        to_jsonld(`${fname}.jsonld`, vocab),
        to_html(`${fname}.html`, "template.html", vocab)
    ])
}

// At some point, node.js will allow to have async calls at the top level, and this extra function will
// become unnecessary. Until then…
main();

