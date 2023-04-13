# Generate RDFS vocabulary files from YAML

This script in this module converts a simple [RDF](https://www.w3.org/TR/rdf11-concepts/) vocabulary, described in [YAML](https://yaml.org/spec/1.2.2/), into a formal [RDFS](https://www.w3.org/TR/rdf-schema/) in [JSON-LD](https://www.w3.org/TR/json-ld11/), [Turtle](https://www.w3.org/TR/turtle/), and [HTML+RDFa](https://www.w3.org/TR/rdfa-core/). Optionally, a simple [JSON-LD `@context`](https://www.w3.org/TR/json-ld11/#the-context)  is also generated for the vocabulary. Neither the script nor the YAML format is prepared for complex vocabularies; its primary goal is to simplify the generation of simple, straightforward RDFS vocabularies not requiring, for instance, sophisticated OWL statements. 

When running, the script relies on two files:

1. The `vocabulary.yml` file, containing the definition for the vocabulary entries. (It is also possible to use a different name for the YAML file, see below.)
2. The `template.html` file, used to create the HTML file version of the vocabulary. (It is also possible to use a different name for the template file, see below.)

## Definition of the vocabulary in the YAML file

The vocabulary is defined in a YAML file, which contains several block sequences with the following keys: `vocab`, `prefix`, `ontology`, `class`, `property`, and `individual`. Only the `vocab` and `ontology` blocks are _required_, all others are optional.

Each block sequence consists of blocks with the following keys:`id`, `property`, `value`, `label`, `upper_value`, `domain`, `range`, `deprecated`, `comment`, and `see_also`. The interpretation of these key/value pairs may depend on the top level block where they reside, but some have a common interpretation.

- Common key/value pairs for the `class`, `property`, and `individual` blocks:
  - `label` refers to a short header label to the term.
  - `comment` refers to a longer description of the term, and can be used for blocks in the `class`, `property` and `individual` top-level blocks. It may include [HTML Flow content elements](https://developer.mozilla.org/en-US/docs/Web/Guide/HTML/Content_categories). The comment will be encapsulated into an HTML `<div>` element and will then be displayed verbatim in the HTML version of the vocabulary, and as a literal of type `rdf:HTML` in the JSON-LD and Turtle versions. Note that the Markdown syntax for simple formatting, like the use of "`" for `<code.../>`, may also be used.
  - `see_also` refers to one or more blocks with `label` and `url` keys, providing a human readable title and a URL, respectively, to an external document that can be referred to by the description of the term. (These are translated into an `rdfs:seeAlso` term in the vocabulary.)
  - The `status` key refers to a string that can be `stable`, `unstable`, or `deprecated`. The terms are divided, in the HTML output, into these three sections.    
  - The `deprecated` key refers to a boolean, signaling whether term is deprecated or not. Default is `false`. This property is a leftover from earlier version and is overwritten, if applicable, by the value of `status`.
  - The `example` key refers to on or more blocks with `label` and `json` keys, providing a (JSON) example with a title. These examples are placed, in the HTML version, to the end of the section referring to a term (the examples are ignored in the Turtle and the JSON-LD versions). Care should be taken to use the `"|"` [block style indicator](https://yaml-multiline.info) in the YAML file for the examples. 

- Top level blocks:
  - `vocab`: a block with the `prefix` and the `value` keys defining the prefix and the URL of the vocabulary, respectively. The prefix can be used in the vocabulary descriptions, e.g., for cross references.

  - `prefix`: definition of a prefixes, and corresponding URLs, for each external external vocabulary in use, defined by the `id` and `value` keys, respectively. 

    Some prefix/value pairs are defined by default, and it is not necessary to define them here. These are: `dc` (for `http://purl.org/dc/terms/`), `owl` (for `http://www.w3.org/2002/07/owl#`), `rdf` (for `http://www.w3.org/1999/02/22-rdf-syntax-ns#`), `rdfs` (for `http://www.w3.org/2000/01/rdf-schema#`), and `xsd` (for `http://www.w3.org/2001/XMLSchema#`).

  - `ontology`: definition of "ontology properties", that is, statements made about the vocabulary itself. The (prefixed) property term is defined by the `property` key, and the value by the `value` key. If the value can be parsed as a URL, it is considered to be the URL of an external resource; otherwise, the value is considered to be (English) text.

    It is good practice to provide, at least, `dc:description` as an ontology property with a short description of the vocabulary.

    The script automatically adds a `dc:date` key with the generation time as a value.

  - `class`: blocks of a class definitions. For each class he `id` key defines the class name (no prefix should be used here). Possible superclasses are defined by the `upper_value` key as a single term, or a sequence of terms.
 
  - `property`: blocks of a property definitions. For each property the `id` key defines the property name (no prefix should be used here); possible superproperties are defined in the by the `upper_value` as a single term, or as a sequence of terms. The domain and range classes can also be provided as a single term, or as a sequence of terms, through the `domain` and `range` keys, respectively.
  
    The `range` key may also use the (single) `IRI` (or `URL`) term instead of class references. This keyword denotes a property that has no explicit range, but whose objects are expected to be IRI references. The generated vocabulary annotates these properties as belonging to the `owl:ObjectProperty` class, which is the term reserved for properties whose objects are not supposed to be literals.

    The `dataset` key can also be set to a boolean value. This key only influences the generated JSON-LD `@context`: if the value is `true`, the JSON-LD `@container` is set to the `@graph` value for the property, signalling that the value refers to a _dataset_ (or _graph_). See the [JSON-LD Specification](https://www.w3.org/TR/json-ld/#graph-containers) for further details.
  
  - `individual`: blocks of definitions of individuals, i.e., a single resources defined in the vocabulary. For each individual the `id` key defines the property name (no prefix should be used here); the possible types are defined in the block for `upper_value` as a single term, or a sequence of terms.

There are some examples in the [example directory on github](https://github.com/w3c/yml2vocab/tree/main/example) that illustrate all of these terms.

## Installation and use

The script is in TypeScript (version 5.0.2 and beyond) running on top of `node.js` (version 16 and beyond).

Beyond the YAML file itself, the script relies on an HTML template file, i.e., a skeleton file in HTML that is completed by the vocabulary entries. The
[example template file on github](https://github.com/w3c/yml2vocab/tree/main/example/template.html) provides a good starting point for a template that also makes use of [respec](https://respec.org). The script relies on the existing `id` values and section structures to be modified/extended by the script. Unused subsections (e.g., when there are no deprecated classes) are removed from the final HTML file.

### Installation from npm

The script can be used as a standard npm module via:

```
npm install yml2vocab
```

#### Running on a command line

The npm installation installs the `node_modules/.bin/yml2vocab` script. The script can be used as:

```
yml2vocab [-v vocab_file_name] [-t template_file_name] [-c]
```

Running this script generates the `vocab_file_name.ttl`, `vocab_file_name.jsonld`, and `vocab_file_name.html` files for the Turtle, JSON-LD, and HTML+RDFa versions, respectively. The script relies on the `vocab_file_name.yml` file for the vocabulary specification in YAML and a `template_file_name` file for a template file. The defaults are `vocabulary` and `template.html`, respectively.

If the `-c` flag is also set, the additional `vocab_file_name_context.jsonld` is also generated, containing a simple `@context` structure that can be used as a separate `@context` file or embedded in a JSON file. Note that this is a "minimal" JSON-LD file, which does not necessarily use all the sophistication that JSON-LD [defines](https://www.w3.org/TR/json-ld11/#the-context) for `@context`; these may have to be added manually.

#### Running from a Javascript/TypeScript program

The simplest way of using the module from Javascript is:

```
const yml2vocab = require('yml2vocab');
async function main() {
    await yml2vocab.generateVocabularyFiles("vocabulary","template.html",false);
}
main();
```

This reads (asynchronously) the YAML and template files and stores the generated vocabulary representations (see the command line interface for details) in the directory alongside the YAML file. By setting the last argument to `true` a `@context` is also generated.

The somewhat lower level  `yml2vocab.VocabGeneration` class can also be used:

```
const yml2vocab = require('yml2vocab');
const vocabGeneration = new yml2vocab.VocabGeneration(yml_content);     // YAML content is text form, before parsing
const turtle: string  = vocabGeneration.getTurtle();                    // returns the turtle content as a string
const jsonld: string  = vocabGeneration.getJSONLD();                    // returns the JSON-LD content as a string
const html: string    = vocabGeneration.getHTML(template_file_content); // returns the HTML+RDFa content as a string
const html: string    = vocabGeneration.getContext();                   // returns the minimal @context file for the vocabulary
```

If TypeScript is used instead of Javascript the same works, except that the `require` must be replaced by:

```
import yml2vocab from 'yml2vocab';
```

There is no need to install any extra typing, it is included in the package. The interfaces are simply using strings, no extra TypeScript type definitions have been defined.


### Cloning the repository

The [repository](https://github.com/yml2vocab) may also be cloned. For a complete installation:

1. If necessary, install [`node.js`](https://nodejs.org/) on your local machine. Installation of `node.js` should automatically install the [`npm`](https://www.npmjs.com) package manager.
2. Clone the repository (i.e., https://github.com/w3c/yml2vocab/) to your local machine.
3. In the directory of the repository clone, run `npm install` on the command line. This installs all the necessary packages in the `node_modules` subdirectory.
4. Create a directory for the vocabulary definition; this should include
   1. A `vocabulary.yml` file. You can start with the YAML file in the `example` directory of the repository, and change the cells for your vocabulary.
   2. A `template.html` file. You can start with the HTML file in the `example` directory of the repository, and adapt/change it as you wish.
5. Run the `main.ts` file in the directory vocabulary definition. This generates the `vocabulary.ttl`, `vocabulary.jsonld`, and `vocabulary.html` files for, respectively, the Turtle, JSON-LD, and HTML representations.

   "Running" may be done in two different ways:

   1. Run, via `node`, the file `dist/main.js` of the repository
   2. Run, via `node_modules/.bin/ts-node`, the file `main.ts` of the repository

   The script also accepts a single argument to be used instead of `vocabulary` to name the various files (see above).

#### Content of the directory

- `Readme.md`: this file.
- `package.json`: configuration file for `npm`.
- `example`: a folder with examples for vocabulary definition files and the generated RDF vocabulary files.
- `lib` directory: the TypeScript modules for the script.
- `dist` directory: the Javascript distribution files (compiled from the TypeScript sources)
- `main.ts`: the TypeScript entry point to the script as a command line tool
- `index.ts`: the top level type interface, to be used if the files are used by an external script.

The following files and directories are generated/modified by either the script or `npm`; better not to touch these directly:

- `package-lock.json`: used by `npm` as an internal file for the packages.
- `node_modules` directory: the various Javascript libraries used by the script. This directory should _not_ be uploaded to github, it is strictly for the local activation of the script.

## Acknowledgement

The original idea, structure, and script (in Ruby) was created by Gregg Kellogg for v1 of the Credentials Vocabulary and with a vocabulary definition using CSV. The CSV definitions have been changed to YAML, and the script itself has been re-written in TypeScript.
