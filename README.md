# Generate RDFS vocabulary files from YAML

This script in this module converts a simple [RDF](https://www.w3.org/TR/rdf11-concepts/) vocabulary, described in [YAML](https://yaml.org/spec/1.2.2/), into a formal [RDFS](https://www.w3.org/TR/rdf-schema/) in [JSON-LD](https://www.w3.org/TR/json-ld11/), [Turtle](https://www.w3.org/TR/turtle/), and HTML. Optionally, a simple [JSON-LD `@context`](https://www.w3.org/TR/json-ld11/#the-context) is also generated for the vocabulary. Neither the script nor the YAML format is prepared for complex vocabularies; its primary goal is to simplify the generation of simple, straightforward RDFS vocabularies not requiring, for instance, sophisticated OWL statements.

When running, the script relies on two files:

1. The `vocabulary.yml` file, containing the definition for the vocabulary entries. (It is also possible to use a different name for the YAML file, see below.)
2. The `template.html` file, used to create the HTML file version of the vocabulary. (It is also possible to use a different name for the template file, see below.)

## Definition of the vocabulary in the YAML file

The vocabulary is defined in a YAML file, which contains several block sequences with the following keys: `vocab`, `prefix`, `ontology`, `class`, `property`, `individual`, and `datatype`. Only the `vocab` and `ontology` blocks are _required_, all the others are optional.

Each block sequence consists of blocks with a number of keys, depending on the specific block. The interpretation of these key/value pairs may depend on the top level block where they reside, but some have a common interpretation. The detailed specification of the keys and values are as follows.

- Common key/value pairs for the `class`, `property`, `datatype`, and `individual` blocks:
  - `label` refers to a short header label to the term. If missing, the capitalized value of `id` is used.
  - `comment` refers to a longer description of the term, and can be used for blocks in the `class`, `property` and `individual` top-level blocks. It may include [HTML Flow content elements](https://developer.mozilla.org/en-US/docs/Web/Guide/HTML/Content_categories). The comment will be encapsulated into an HTML `<div>` element and will then be displayed verbatim in the HTML version of the vocabulary, and as a literal of type `rdf:HTML` in the JSON-LD and Turtle versions.
  - `type` refers to RDF types. Note that the tool automatically adds types like `rdf:Property`, `rdfs:Class`, etc.; this key is to be used for the vocabulary specific types only.
  - `defined_by` should be a URL, or a list thereof, referring to the formal definition(s) of the term.
  - `see_also` refers to one or more blocks with `label` and `url` keys, providing a human-readable title and a URL, respectively, to an external document that can be referred to by the description of the term. (These are translated into an `rdfs:seeAlso` term in the vocabulary.)
  - The `status` key refers to a string that can be `stable`, `reserved`, or `deprecated`. The terms are divided, in the HTML output, into these three sections. `stable` is the default.
  - The `deprecated` key refers to a boolean, signaling whether term is deprecated or not. Default is `false`. This property is a leftover from earlier version and is overwritten, if applicable, by the value of `status`.
  - The `context` key refers to list of URLs or two special keywords. It is used to add information on JSON-LD `@context` file(s) that "mention" the term; the list of URLs refer to the relevant `@context` file. If the value is `vocab`, and a global `@context` file is defined in the `vocab` block, that "default" `@context` is used. Finally, if the value of the property is `none`, there is no context file reference for the term. The default setting is `vocab` (i.e., unless it is otherwise specified, the default value is used for the term).
  - The `example` key refers to on or more blocks with `label` and `json` keys, providing a (JSON) example with a title. These examples are placed, in the HTML version, to the end of the section referring to a term (the examples are ignored in the Turtle and the JSON-LD versions). Care should be taken to use the `"|"` [block style indicator](https://yaml-multiline.info) in the YAML file for the examples.
  - The `known_as` key refers to a string, that can be used, in rare occasions, as an alias to the term's label. It currently used when generating a JSON-LD context file, as the name of the property in the context file instead of the official label. This means that JSON-LD users, using that context file, must refer to this alternative name in their code (this may come in handy when the official name changes but the old name is kept for JSON users for backward compatibility reasons).

- Top level blocks:

  - `vocab`: a block with the `id` and the `value` keys defining the prefix and the URL of the vocabulary, respectively. The `id` provides a prefix that can be used in the vocabulary descriptions, e.g., for cross-references. The additional, optional `context` key may provide a default context file reference (as a URI), used by all terms unless locally overwritten (see above). Note that the `context` key is required if the HTML template includes a context section.

  - `prefix`: definition of a prefixes, and corresponding URLs, for each external vocabulary in use, defined by the `id` and `value` keys, respectively.

    Some id/value pairs are defined by default, and it is not necessary to define them here. These are: `dc` (for `http://purl.org/dc/terms/`), `owl` (for `http://www.w3.org/2002/07/owl#`), `rdf` (for `http://www.w3.org/1999/02/22-rdf-syntax-ns#`), `rdfs` (for `http://www.w3.org/2000/01/rdf-schema#`), `xsd` (for `http://www.w3.org/2001/XMLSchema#`), and `schema` (for `http://schema.org/`).

  - `ontology`: definition of "ontology properties", that is, statements made about the vocabulary itself. The (prefixed) property term is defined by the `property` key, and the value by the `value` key. If the value can be parsed as a URL, it is considered to be the URL of an external resource; otherwise, the value is considered to be (English) text.

    It is good practice to provide, at least, `dc:description` as an ontology property with a short description of the vocabulary.

    The script automatically adds a `dc:date` key with the generation time as a value.

  - `class`: blocks of a class definitions. For each class he `id` key defines the class name (no prefix should be used here). Possible superclasses are defined by the `upper_value` key as a single term, or a sequence of terms.

  - `property`: blocks of a property definitions. For each property the `id` key defines the property name (no prefix should be used here); possible superproperties are defined by the `upper_value` as a single term, or as a sequence of terms. The domain and range classes can also be provided as a single term, or as a sequence of terms, through the `domain` and `range` keys, respectively.

    Note that both the `domain` and the `range` keys can take an array of class references as values. For the former this means the resulting domain is the _union_ of the referred classes, whereas for the latter it is the _intersection_.

    The `range` key may also use the (single) `IRI` (or `URL`) term instead of class references. This keyword denotes a property that has no explicit range, but whose objects are expected to be IRI references. The generated vocabulary annotates these properties as belonging to the `owl:ObjectProperty` class, which is the term reserved for properties whose objects are not supposed to be literals. A comment is also generated into the HTML description of the term.

    The `dataset` key can be set to a boolean value. This key only influences the generated JSON-LD `@context`: if the value is `true`, the JSON-LD `@container` is set to the `@graph` value for the property, signalling that the value refers to a _dataset_ (or _graph_). See the [JSON-LD Specification](https://www.w3.org/TR/json-ld/#graph-containers) for further details.

    The `container` key can be set to the single values `set` or `list`. If set to one of these values, the entry for the property in the generated JSON-LD `@context` includes the `@container` set to `@set` or `@list`, respectively. In both cases a warning message is also included in the generated HTML text, whereby, when defining JSON-LD data with this vocabulary, the value for the property is expected to be an array even if there is only one. Furthermore, for the particular case of a `list` value, the range of the property is set to be an `rdf:List`. (The value `graph` is also accepted for the key, as an alternative to the `dataset` key.)

  - `individual`: blocks of definitions of individuals, i.e., a single resources defined in the vocabulary. For each individual the `id` key defines the property name (no prefix should be used here); the possible types are defined in the block for `type` as a single term, or a sequence of terms. (Earlier versions of this tool used `upper_value` for the same purpose, but that usage, though still understood for backward compatibility reasons, is deprecated.)

  - `datatype`: blocks of datatype definitions. For each datatype the `id` key defines the datatype name (no prefix should be used here). The possible types are defined in the block for `upper_value` or for `type`, as a single term for possible datatype this is derived from.

  - `json_ld`: a block affecting the generated JSON-LD context file, if generated. It may contain the `alias` block, defining key/value pairs for [keyword aliases](https://www.w3.org/TR/json-ld11/#aliasing-keywords). It may also contain the `import` statement, whose value is either a single URL, or an array of URLs. These URLs will be added as a `@import` JSON-LD statement to the top of the generated context file.

    Note that, in line with the JSON-LD specification, only the following keywords can be aliased: `@direction`, `@graph`, `@id`, `@included`, `@index`, `@json`, `@language`, `@list`, `@nest`, `@none`, `@reverse`, `@set`, `@type`, and `@value`.

For classes, properties, individuals, and datatypes, the `id` key, and either the `comment` or the `defined_by` keys, are _required_. All the others are optional.

There are some examples in the [example directory on GitHub](https://github.com/w3c/yml2vocab/tree/main/example) that illustrate all of these terms.

### External terms

The value of the `id` key is, usually, simple reference identifying the class, property, etc., as part of the vocabulary. It is also possible to use a [curie](https://www.w3.org/TR/curie/) instead of a simple reference. Such terms are considered to be _external_ terms: terms that are formally defined in another vocabulary, and are listed only to increase the readability of the vocabulary specification. (Typical cases are schema.org or Dublin Core terms, that are frequently used in combination with other vocabularies.)

External terms, while they appear in the HTML document generated by the tool, do not result in formal RDF statements in Turtle or JSON-LD; they only appear as information only items in the generated document.

The prefix part of the curie _must_ be defined through the `prefix` top level block.

## Formatting the output

Some efforts are made to make the output files (HTML, JSON-LD, and Turtle) properly formatted to make them readable. A subset of the [`editorconfig`](https://spec.editorconfig.org) facilities are also taken into account. Namely, if an `.editorconfig` file is found, the following supported pairs are used (with the default values in parenthesis):

- `indent_style` (`space`)
- `insert_final_newline` (`false`)
- `indent_size` (4)
- `max_line_length` (0)
- `end_of_line` (`lf`)

See the [`.editorconfig`](https://spec.editorconfig.org/#supported-pairs) for further details.

## Installation and use

The script is in TypeScript (version 5.0.2 and beyond) running on top of [`node.js`](https://nodejs.org) (version 21 and beyond). It can also run with [`deno`](http://deno.land) (version 2.1 and beyond).

Beyond the YAML file itself, the script relies on an HTML template file, i.e., a skeleton file in HTML that is completed by the vocabulary entries. The [example template file on GitHub](https://github.com/w3c/yml2vocab/tree/main/example/template.html) provides a good starting point for a template that also makes use of [respec](https://respec.org). The script relies on the existing `id` values and section structures to be modified/extended by the script. Unused subsections (e.g., when there are no deprecated classes) are removed from the final HTML file.

### Installation from npm

The script can be used as a standard npm module via:

```
npm install yml2vocab
```

### Running on a command line

#### NPM/Node.js

The npm installation installs the `node_modules/.bin/yml2vocab` script. The script can be used as:

```
yml2vocab [-v vocab_file_name] [-t template_file_name] [-c]
```

#### Deno

If `deno` is installed globally, one can also run the script directly (without any further installation) by

```
deno run --allow-read --allow-write --allow-env /a/b/c/main.ts [-v vocab_file_name] [-t template_file_name] [-c]
```

in the top level. To make it simpler, a binary, compiled version of the program can be generated by

```
deno compile --allow-read --allow-write --allow-env main.ts
```

which results in an executable file, called `yml2vocab`, that can be stored anywhere in the user's `$PATH`.

The program can also be run without installing the package locally. Just do a:

```
deno run -A jsr:@iherman/yml2vocab/cli [-v vocab_file_name] [-t template_file_name] [-c]
```

#### Command line argument

The script generates the `vocab_file_name.ttl`, `vocab_file_name.jsonld`, and `vocab_file_name.html` files for the Turtle, JSON-LD, and HTML versions, respectively. The script relies on the `vocab_file_name.yml` file for the vocabulary specification in YAML and a `template_file_name` file for a template file. The defaults are `vocabulary` and `template.html`, respectively.

If the `-c` flag is also set, the additional `vocab_file_name.context.jsonld` is also generated, containing a JSON-LD file that can be used as a separate `@context` reference in a JSON-LD file. Note that this JSON-LD file does not necessarily use all the sophistication that JSON-LD [defines](https://www.w3.org/TR/json-ld11/#the-context) for `@context`; these may have to be added manually.

### Running from a Javascript/TypeScript program

#### Usage by node.js

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
// YAML content is text form, before parsing
const vocabGeneration = new yml2vocab.VocabGeneration(yml_content);
// returns the turtle content as a string
const turtle: string  = vocabGeneration.getTurtle();
// returns the JSON-LD content as a string
const jsonld: string  = vocabGeneration.getJSONLD();
// returns the HTML content as a string
const html: string    = vocabGeneration.getHTML(template_file_content, basename_for_files, is_context_generated);
// returns the minimal @context file for the vocabulary
const context: string = vocabGeneration.getContext();
```

Running TypeScript is used instead of Javascript is similar, except that the `require` must be replaced by:

```
import yml2vocab from 'yml2vocab';
```

There is no need to install any extra typing, it is included in the package. The interfaces are simply using strings, no extra TypeScript type definitions have been defined.

#### Usage by deno

The package is also available on JSR `@iherman/yml2vocab`. All previous examples are valid for deno, except for the import statements which should be:

```
import yml2vocab from 'jsr:@iherman/yml2vocab'
```

Note that deno can also import npm packages if explicitly named, so the following import statement is also valid:

```
import yml2vocab from 'npm:yml2vocab'
```

No prior installation step is necessary.

### Cloning the repository

The [repository](https://github.com/yml2vocab) may also be cloned.

#### Content of the directory

- `Readme.md`: this file.
- `package.json`: configuration file for `npm`.
- `deno.json`: configuration file for `deno`
- `example`: a folder with examples for vocabulary definition files and the generated RDF vocabulary files.
- `lib` directory: the TypeScript modules for the script.
- `dist` directory: the Javascript distribution files (compiled from the TypeScript sources using `tsc` in `node.js`)
- `main.ts`: the TypeScript entry point to the script as a command line tool
- `index.ts`: the top level type interface, to be used if the files are used by an external script.
- `docs` directory: documentation of the package as generated by Typedoc

The following files and directories are generated/modified by either the script or `npm`; better not to touch these directly:

- `package-lock.json`: used by `npm` as an internal file for the packages.
- `node_modules` directory: the various Javascript libraries used by the script. This directory should _not_ be uploaded to GitHub, it is strictly for the local activation of the script.
- `deno.lock`: used by `deno` to manage imported packages using its own mechanism (bypassing `node_modules`).

## Acknowledgement

The original idea, structure, and script (in Ruby) was created by Gregg Kellogg for v1 of the Credentials Vocabulary and with a vocabulary definition using CSV. The CSV definitions have been changed to YAML, and the script itself has been re-written in TypeScript, and developed further since.

Many features are the result of further discussions with Many Sporny and Benjamin Young.
