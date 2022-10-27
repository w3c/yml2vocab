# Generate RDFS vocabulary files from YAML

The script in the directory generates RDFS vocabulary files in JSON and Turtle formats, plus a human readable HTML file containing the vocabulary in RDFa, based on a simple vocabulary definition in a YAML file. Neither the script nor the YAML format is prepared for complex vocabularies; its primary goal is to simplify the generation of simple, straightforward RDFS vocabularies without, for instance, sophisticated OWL statements.

When running, the script relies on two files:

1. The `vocabulary.yml` file, containing the definition cells for the vocabulary. (It is also possible to use a different name for the YAML file, see below.)
2. The `template.html` file, used to create the HTML file version of the vocabulary.

## Definition of the vocabulary in the YAML file

The vocabulary is defined in a YAML file, which contains several block sequences, with the following keys: `vocab`, `prefix`, `ontology`, `class`, `property`, and `individual`. Only the `vocab` and `ontology` blocks are _required_, all others are optional.

Each block sequence consists of blocks with the following keys:`id`, `property`, `value`, `label`, `upper_value`, `domain`, `range`, `deprecated`, `comment`, and `see_also`. The interpretation of these key/value pairs may depend on the top level block where they reside, but some have a common interpretation.

- Common key/value pairs for the `class`, `property`, and `individual` blocks:
  - `label` refers to a short header label to the term.
  - `comment`  refers to a longer description of the term, and can be used for blocks in the `class`, `property` and `individual` top-level blocks. It may include HTML tags; these will be filtered out for Turtle and JSON-LD, but will be copied into HTML (note, b.t.w., that the markdown syntax for simple formatting, like the use of "`" for code, may also be used).
  - `see_also` refers to a block with `label` and `url` keys, providing a human readable title and a URL, respectively, to an external document that can be referred to by the description of the term. (These are translated into an `rdfs:seeAlso` term in the vocabulary.)
  - The `deprecated` key refers to a boolean, signaling whether term is deprecated or not. Default is `false`.

- Top level blocks:
  - `vocab`: a block with the `prefix` and the `value` keys defining the prefix and the URL of the vocabulary, respectively. The prefix can be used in the vocabulary descriptions, e.g., for cross references.

  - `prefix`: definition of a prefixes, and corresponding URLs, for each external external vocabulary in use, defined by the `id` and `value` keys, respectively. 

    Note that some prefix/value pairs are defined by default, and it is not necessary to define them here. These are: `dc` (for `http://purl.org/dc/terms/`), `owl` (for `http://www.w3.org/2002/07/owl#`), `rdf` (for `http://www.w3.org/1999/02/22-rdf-syntax-ns#`), `rdfs` (for `http://www.w3.org/2000/01/rdf-schema#`), and `xsd` (for `http://www.w3.org/2001/XMLSchema#`).

  - `ontology`: definition of "ontology properties", that is, statements made about the vocabulary itself. The (prefixed) property term is defined by the `property` key, and the value by the `value` key. If the value can be parsed as a URL, it is considered to be the URL of an external resource; otherwise, the value is considered to be (English) text.

    It is good practice to provide, at least, `dc:description` as an ontology property with a short description of the vocabulary.

    The script automatically adds a `dc:date` key with the generation time as a value.

  - `class`: blocks of a class definitions. For each class he `id` key defines the class name (no prefix should be used here). Possible superclasses are defined by the `upper_value` key as a single term, or a sequence of terms. 
 
  - `property`: blocks of a property definitions. For each property the `id` key defines the property name (no prefix should be used here); possible superproperties are defined in the by tge `upper_value` as a single term, or as a sequence of terms. The domain and range classes can also be provided as a single term, or as a sequence of terms, through the `domain` and `range` keys, respectively.
  
    The `range` column may also use the (single) term `IRI` (or `URL`) instead of class references. This keyword denotes a property that has no explicit range, but whose objects are expected to be IRI references. The generated vocabulary annotates these properties as belonging to the `owl:ObjectProperty` class, which is the term reserved for properties whose objects are not supposed to be literals. 
  
  - `individual`: blocks of definitions of individuals, i.e., a single resources defined in the vocabulary. For each individual the `id` key defines the property name (no prefix should be used here); the possible types are defined in the column `upper_value` as a single term, or a sequence of terms.

## Installation and use

### Using it from the command line
The script is in TypeScript (version 4.6 and beyond) running on top of `node.js` (version 16 and beyond). Take the following steps to install and run the script:

1. Install [`node.js`](https://nodejs.org/) on your local machine. Installation of `node.js` should automatically install the [`npm`](https://www.npmjs.com) package manager.
2. Clone the repository to your local machine.
3. In the directory of the repository clone, run `npm install` on the command line. This installs all the necessary packages in the `node_modules` subdirectory.
4. Create a directory for the vocabulary definition; this should include
   1. A `vocabulary.yml` file. You can start with the YAML file in the `example` directory of the repository, and change the cells for your vocabulary.
   2. A `template.html` file. You can start with the HTML file in the `example` directory of the repository, and adapt/change it as you wish. Be careful with the changes, though: the script relies on the existing `id` values and section structures.
5. Run the `main.ts` file in the directory vocabulary definition. This generates the `vocabulary.ttl`, `vocabulary.jsonld`, and `vocabulary.html` files for, respectively, the Turtle, JSON-LD, and HTML representations.

   "Running" may be done in two different ways:

   1. Run, via `node`, the file `dist/main.js` of the repository
   2. Run, via `node_modules/.bin/ts-node`, the file `main.ts` of the repository

   The script also accepts a single argument to be used instead of `vocabulary` to name the various files.

### Using it as a library

The library can also be used as a standard npm module in a node based TypeScript project via:

```
npm install yml2vocab
```

The simplest way of using the module is to use 

```
import * as yml2vocab from 'yml2vocab';
await yml2vocab.generate_vocabulary_files(yaml_file_name, template_file_name)
```

that will read the YAML/Template files and store the generated vocabulary representations (see the command line interface for details). Alternatively, the `yml2vocab.VocabGeneration` class can be used:


```
import * as yml2vocab from 'yml2vocab';
const vocab_generation = new yml2vocab.VocabGeneration(yml_content); // yml_content is text form, before parsing
const turtle: string = vocab_generation.get_turtle();
const jsonld: string = vocab_generation.get_jsonld();
const html: string   = vocab_generation.get_html(template_file_content);
```


## Content of the directory

- `Readme.md`: this file.
- `package.json`: configuration file for `npm`.
- `example`: a folder with examples for vocabulary definition files and the generated RDF vocabulary files.
- `lib` directory: the TypeScript modules for the script.
- `main.ts`: the TypeScript entry point to the script.

The following files and directories are generated/modified by either the script or `npm`; better not to touch these directly:

- `package-lock.json`: used by `npm` as an internal file for the packages.
- `node_modules` directory: the various Javascript libraries used by the script. This directory should _not_ be uploaded to github, it is strictly for the local activation of the script.

## Acknowledgement

The original idea, structure, and script (in Ruby) was created by Gregg Kellogg for v1 of the Credentials Vocabulary and with a vocabulary definition using CSV. The CSV definitions have been changed to YAML, and the script itself has been re-written in TypeScript.
