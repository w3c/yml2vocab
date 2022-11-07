#!/usr/bin/env node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const yml2vocab = require("./index");
async function main() {
    const get_fname = () => {
        if (process.argv.length > 2) {
            const vocab_name = process.argv[2];
            return vocab_name.endsWith('.yml') ? vocab_name.slice(0, -4) : vocab_name;
        }
        else {
            return 'vocabulary';
        }
    };
    const fname = get_fname();
    await yml2vocab.generate_vocabulary_files(fname, "template.html");
}
// At some point, node.js will allow to have async calls at the top level, and this extra function will
// become unnecessary. Until then…
main();
