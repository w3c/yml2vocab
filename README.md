# Generate RDFS vocabulary files from YAML

This script in this module converts a simple [RDF](https://www.w3.org/TR/rdf11-concepts/) vocabulary, described in [YAML](https://yaml.org/spec/1.2.2/), into a formal [RDFS](https://www.w3.org/TR/rdf-schema/) in [JSON-LD](https://www.w3.org/TR/json-ld11/), [Turtle](https://www.w3.org/TR/turtle/), and HTML. Optionally, a simple [JSON-LD `@context`](https://www.w3.org/TR/json-ld11/#the-context) is also generated for the vocabulary. Neither the script nor the YAML format is prepared for complex vocabularies; its primary goal is to simplify the generation of simple, straightforward RDFS vocabularies not requiring, for instance, sophisticated OWL statements.

When running, the script relies on two files:

1. The `vocabulary.yml` file, containing the definition for the vocabulary entries. (It is also possible to use a different name for the YAML file, see below.)
2. The `template.html` file, used to create the HTML file version of the vocabulary. (It is also possible to use a different name for the template file, see below.) The template may also be an HTML fragment (ie, without the `<html>`, `<head>`, etc.), which comes handy if the generated fragment is to be included into the full specification as, say, an Appendix. Note that if a fragment is used, the `defined_by` entries use only the fragment part of the URL in the generated code (the URL is supposed to refer to the specification file itself).
## 1	Definition of the vocabulary in the YAML file

The vocabulary is defined in a YAML file, which contains several block sequences with the following keys:  `vocab`, `prefix`, `ontology`, `class`, `property`, `individual`,`datatype`, and `json_ld`. Only the `vocab` and `ontology` blocks are _required_, all others are optional.

Each block sequence consists of blocks with a number of keys, depending on the specific block. The interpretation of these key/value pairs may depend on the top level block where they reside, but some have a common interpretation. The detailed specification of the keys and values are as follows.

### 1.1	General Vocabulary blocks
#### 1.1.1	Vocabulary Constants —`vocab` Block

Constants for the vocabulary being defined. ***This block is required***.

| Key       | Possible values | Description                                                                                                                           | Required?                                                  |
| --------- | --------------- | ------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| `id`      | prefix string   | Provides a prefix that can be used in the vocabulary description and in the generated RDF serializations, e.g., for cross-references. | Yes                                                        |
| `value`   | URL             | The official URL for the vocabulary.                                                                                                  | Yes                                                        |
| `context` | URL             | Providea a default `@context` file reference, used by all terms unless locally overwritten.                                           | No<br/>Yes if the template file contains a context section |

Example:

```yaml
vocab:
    id: ex
    value: https://example.org/vocabulary#
    context: https://example.org/context.jsonld
```
#### 1.1.2	CURIE Prefixes —`prefix` Block

List of CURIE prefix definitions for each external vocabulary being used. Each entry is as follows:

| Key   | Possible values | Description                                                                                                     | Required? |
| ----- | --------------- | --------------------------------------------------------------------------------------------------------------- | --------- |
| `id`  | prefix string   | Provides a CURIE prefix that can be used in the vocabulary description and in the generated RDF serializations. | Yes       |
| value | URL             | The URL for the external vocabulary                                                                             | Yes       |

Example:

```yaml
prefix:
    - id: oa
      value: http://www.w3.org/ns/oa#

    - id: as
      value: http://www.w3.org/ns/activitystreams#
```

Some id/value pairs are defined by default, and it is not necessary to define them here. These are:

- `dc` (for `http://purl.org/dc/terms/`)
- `owl` (for `http://www.w3.org/2002/07/owl#`)
- `rdf` (for `http://www.w3.org/1999/02/22-rdf-syntax-ns#`)
- `rdfs` (for `http://www.w3.org/2000/01/rdf-schema#`)
- `xsd` (for `http://www.w3.org/2001/XMLSchema#`)
- `schema` (for `http://schema.org/`)
#### 1.1.3	Vocabulary Metadata —`ontology` Block

Definition of “ontology properties”, that is, statements made about the vocabulary itself. These are added to the top level definition of the ontology in the generated files. ***This block is required***.

The block is a list of property/value pairs; each entry is as follows:

| Key        | Possible values | Description                                | Required? |
| ---------- | --------------- | ------------------------------------------ | --------- |
| `property` | CURIE           | The property being used in a CURIE format. | Yes       |
| `value`    | URL or string   | The value of the property.                 | Yes       |

Example:

```yaml
ontology:
    - property: dc:title
      value: EPUB Annotations vocabulary

    - property: dc:description
      value: See also <a href="http://example.org/explanation">further details</a.

    - property: rdfs:seeAlso
      value: https://exampl.org/description
```


It is good practice to provide, at least, `dc:description` as an ontology property with a short description of the vocabulary and `dc:title` with a short name of the vocabulary.

The script automatically adds a `dc:date` key with the generation time as a value.
#### 1.1.4 Generated JSON-LD context data —	`json_ld` block

 A block affecting the generated JSON-LD context file, if generated.

| Key      | Possible values                                       | Description                                                                                                                                                                                                                                                        | Required? |
| -------- | ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------- |
| `alias`  | Object with key/value pairs; the values must be URLs. | Defines [keyword aliases](https://www.w3.org/TR/json-ld11/#aliasing-keywords). Possible values for keywords are: `@direction`, `@graph`, `@id`, `@included`, `@index`, `@json`, `@language`, `@list`, `@nest`, `@none`, `@reverse`, `@set`, `@type`, and `@value`. | No        |
| `import` | Either a single URL or an array thereof.              | Defines references to external `@contex` files that must be imported (via the JSON-LD `@import`) at the beginning of the generated context file.                                                                                                                   | No        |

Example:

```yaml
json_ld:
    alias:
        "language"  : "@language"
        "direction" : "@direction"
        "id"        : "@id"
    import: "http://example.org/othervoc.jsonld"
```

### 1.2	Ontology term blocks

#### 1.2.1	Common Term Entries

These keys are common to all term definitions, although their exact interpretation may be dependent on the terms themselves.

| Key          | Possible values                                              | Description                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   | Required?                                     |
| ------------ | ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------- |
| `comment`    | string                                                       | Refers to a longer description of the term. It may include [HTML Flow content elements](https://developer.mozilla.org/en-US/docs/Web/Guide/HTML/Content_categories). The comment will be encapsulated into an HTML `<div>` element and will then be displayed verbatim in the HTML version of the vocabulary, and as a literal of type `rdf:HTML` in the JSON-LD and Turtle versions.                                                                                                                                                                                                                         | Either `comment` or `defined_by` is required. |
| `context`    | URLs or the constant `vocab` or `none`, or a n array thereof | Used to add information on JSON-LD `@context` file(s) that “mention” the term; the list of URLs refer to the relevant `@context` file. If the value is `vocab`, and a global `@context` file is defined in the `vocab` block, that “default” `@context` is used. If the value of the property is `none`, there is no context file reference for the term. The default setting is `vocab` (i.e., unless it is otherwise specified, the default value is used for the term).                                                                                                                                    | No                                            |
| `defined_by` | One or more URLs                                             | Refers to the formal definition(s) of the term. This should always be a full URL, because it is also used in the generated turtle or JSON-LD version of the vocabulary.                                                                                                                                                                                                                                                                                                                                                                                                                                       | Either `comment` or `defined_by` is required. |
| `deprecated` | Boolean                                                      | The key signals whether term is deprecated or not. Default is `false`. This property is a leftover from earlier version and is overwritten, if applicable, by the value of `status`.                                                                                                                                                                                                                                                                                                                                                                                                                          | No                                            |
| `example`    | One or more blocks                                           | Blocks with `label` and `json` keys providing a (JSON-LD) example with a title. These examples are placed, in the HTML version, to the end of the section referring to a term; the examples are ignored in the Turtle and the JSON-LD versions. Care should be taken to use the `"\|"` [block style indicator](https://yaml-multiline.info) in the YAML file for the examples.                                                                                                                                                                                                                                | No                                            |
| `id`         | term string or CURIE                                         | The identifier of the term. If a string is used, it is considered to be in the namespace of the vocabulary. If a CURIE is used, the term is considered to be _external_: terms that are formally defined in another vocabulary, and are listed only to increase the readability of the vocabulary specification. <br/>External terms, while they appear in the HTML document generated by the tool, do not result in formal RDF statements in Turtle or JSON-LD; they only appear as information only items in the generated document.<br/> The CURIE prefix must be defined in the `prefix` top level block. | Yes                                           |
| `known_as`   | term string                                                  | A term can be used as an alias to the term's label in JSON-LD. It is used when generating a JSON-LD context file, as the name of the property in the context file instead of the official label. This means that JSON-LD users, using that context file, must refer to this alternative name in their code.                                                                                                                                                                                                                                                                                                   | No                                            |
| `label`      | string                                                       | Short header label to the term. If missing, the capitalized value of `id` is used.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            | No                                            |
| `see_also`   | One or more blocks                                           | Blocks with `label` and `url` keys, providing a human-readable title and a URL, respectively, to an external document that can be referred to by the description of the term. (These are translated into an `rdfs:seeAlso` term in the vocabulary.)                                                                                                                                                                                                                                                                                                                                                           | No                                            |
| `status`     | `stable`, `reserved`, or `deprecated`                        | The terms are divided, in the HTML output, into these three sections. `stable` is the default.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | No                                            |
| `type`       | One or more CURIEs                                           | Refers to RDF types. Note that the tool automatically adds types like `rdf:Property`, `rdfs:Class`, etc.; this key is to be used for the vocabulary specific types only.                                                                                                                                                                                                                                                                                                                                                                                                                                      | No                                            |

#### 1.2.2	Class definitions —`class` Block

| Key           | Possible values             | Description                                                                                                                                                                                                                             | Required? |
| ------------- | --------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- |
| `one_of`      | One or more terms or CURIEs | The class consists of exactly the individuals listed in the values.                                                                                                                                                                     | No        |
| `upper_union` | boolean                     | If several superclasses are specified then, by default, this means the _intersection_ (or logical _conjunction_) of the classes. If the value is `true`, the statement refers to the _union_ (or logical _disjunction_) of the classes. | No        |
| `upper_value` | One or more terms or CURIEs | Superclasses.                                                                                                                                                                                                                           | No        |

Example:

```yaml
class:
    - id: Class1
      label: An example Class1
      upper_value: [schema:Resource, Class2]
      defined_by: https://example.org/vocabulary-definition#class1
      comment: Something about class1

    - id: Class2
      label: An example Class2
      upper_value: [Class3, Class4]
      defined_by: https://example.org/vocabulary-definition#class2
      comment: Referring to the union of <code>Class3</code> and <code>Class4</code>
      upper_union: true

    - id: Class5
      label: An example Class5
      one_of: [ex:Individual1, ex:Individual2, …,ex:Individualn]
      comment: The class consists of the listed individuals.

```


#### 1.2.3 Property definitions —	`property` Block

| Key           | Possible values                                       | Description                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | Required? |
| ------------- | ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------- |
| `container`   | `set` or `list`                                       | If set to one of these values, the entry for the property in the generated JSON-LD `@context` includes the `@container` keyword, set to `@set` or `@list`, respectively. In both cases a warning message is also included in the generated HTML text whereby, when using JSON-LD data with this vocabulary, the value for the property is expected to be an array even if there is only one.<br/> Furthermore, for the particular case of a `list` value, the range of the property is set to be an `rdf:List`.<br/> The value `graph` is also accepted for the key, as an alternative to the `dataset` key. | No        |
| `dataset`     | boolean                                               | This key only influences the generated JSON-LD `@context`: if the value is `true`, the JSON-LD `@container` is set to the `@graph` value for the property, signalling that the value refers to a _dataset_ (or _graph_). See the [JSON-LD Specification](https://www.w3.org/TR/json-ld/#graph-containers) for further details.                                                                                                                                                                                                                                                                               | No        |
| `domain`      | One or more terms or CURIEs                           | The RDF domain statements of the propery. If several classes are specified, the statement refers to the _union_ (or logical _disjunction_) of the classes.                                                                                                                                                                                                                                                                                                                                                                                                                                                   | No        |
| `one_of`      | One or more terms or CURIEs                           | The range includes an (anonymous) class consists of exactly the individuals listed in the values. It effectively lists the (CURIE) values that the property is supposed to have. Note that the generated context file creates strings as values, mapping to the entries in the list. The entries are supposed to refer to individuals.                                                                                                                                                                                                                                                                       | No        |
| `range`       | One or more terms or CURIES, or the single `URL` term | The RDF domain statements of the property. If the `URL` (alternatively: `IRI`) term is used, the block defines a property that has no explicit range, but whose objects are expected to be IRI references. The generated vocabularies annotate these properties as belonging to the `owl:ObjectProperty` class, which is the term reserved for properties whose objects are not supposed to be literals. A comment is also generated into the HTML description of the term.                                                                                                                                  | No        |
| `range_union` | boolean                                               | If several range classes are specified then, by default, this means the _intersection_ (or logical _conjunction_) of the classes. If the value is `true`, the statement refers to the _union_ (or logical _disjunction_) of the classes.                                                                                                                                                                                                                                                                                                                                                                     | No        |
| `upper_value` | One or more terms or CURIEs                           | Superproperties.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | No        |

Example:

```yaml
property:
    - id: pr1
      label: this is example pr1
      upper_value: oa:hasTarget
      domain: Class1
      range: Class4
      defined_by: https://example.org/vocabulary-definition#pr11
      comment: Something anbout pr1.

    - id: pr2
      label: this is example pr2
      upper_value: [pr1, pr3]
      domain: Class2
      range: [Class3, Class10]
      defined_by: https://example.org/vocabulary-definition#pr2
      comment: Something about pr2; the range is the union of Class3 and Class10
      range_union: true

    - id: pr3
      label: this is an example pr3
      one_of: [ex:val1, ex:val2, ex:val3]
      comment: Restricting the values to ex:val1, ex:val2, or ex:val3; in JSON-LD with the generated context "val1", "val2", "val3" can be used.

```

#### 1.2.4	Individual definitions —`individual` Block

No extra keys are defined for this block. The `type` key is used to define the class which contains this individual

Example:

```yaml
individual:
	- id: ind1
	  label: this is an individual belonging to Class1
	  type: Class1
	  defined_by: https://example.org/vocabulary-definition#ind1
```
#### 1.2.5 Datatype definitions —	`datatype` Block

| Key       | Possible values  | Description                                                                                                                                                                                                                                                       | Required? |
| --------- | ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- |
| `one_of`  | array of strings | This is a shorthand for a pattern property with the value of `"val1\|val2\|…\|valn`, i.e., it restricts the value to a predefined set of strings (without spaces).                                                                                                | No        |
| `pattern` | string           | An [XML Schema regular expression](https://www.w3.org/TR/xmlschema-2/#regexs), used to restrict an `xsd:string` type literal. Note that, while this restriction become part of the generated vocabulary, not all  RDF/OWL reasoners are capable of processing it. | No        |

The `type` or `upper_value`keys are used to define the possible datatype this term is derived from.

Example:

```yaml
datatype:
  - id: dt1
    label: Datatype some usage
    upper_value: xsd:string
    one_of: [One, Two, Three]
    defined_by: https://example.org/vocabulary-definition#dt1
    see_also:
      - label: Goal of the datatype
        url:  https://example.org/further-description.html

```

## 2	Formatting the output

Some efforts are made to make the output files (HTML, JSON-LD, and Turtle) properly formatted to make them readable. A subset of the [`editorconfig`](https://spec.editorconfig.org) facilities are also taken into account. Namely, if an `.editorconfig` file is found, the following supported pairs are used (with the default values in parenthesis):

- `indent_style` (`space`)
- `insert_final_newline` (`false`)
- `indent_size` (4)
- `max_line_length` (0)
- `end_of_line` (`lf`)

See the [`.editorconfig`](https://spec.editorconfig.org/#supported-pairs) for further details.

## 3	Installation and use

The script has been written in TypeScript (version 5.0.2 and beyond) running on top of [`node.js`](https://nodejs.org) (version 21 and beyond) or  [`deno`](http://deno.land) (version 2.1 and beyond).

Beyond the YAML file itself, the script relies on an HTML template file, i.e., a skeleton file in HTML that is completed by the vocabulary entries. The [example template file on GitHub](https://github.com/w3c/yml2vocab/tree/main/example/template.html) provides a good starting point for a template that also makes use of [respec](https://respec.org). The script relies on the existing `id` values and section structures to be modified/extended by the script. Unused subsections (e.g., when there are no deprecated classes) are removed from the final HTML file.

### 3.1	Running the script on a command line

#### 3.1.1	NPM + Node.js

The script can be used as a standard npm module via:

```sh
npm install yml2vocab
```


The npm installation installs the `node_modules/.bin/yml2vocab` script. The script can be used as:

```
yml2vocab [-v vocab_file_name] [-t template_file_name] [-c]
```

#### 3.1.2	Deno

If `deno` is installed globally, one can also run the script directly (without any further installation) from the code by

```sh
deno run -A /a/b/c/main.ts [-v vocab_fname] [-t template_fname] [-c]
```

on the top level. To make it simpler, a binary, compiled version of the program can be generated by

```sh
deno compile --allow-read --allow-write --allow-env main.ts
```

which results in an executable file, called `yml2vocab`, that can be stored anywhere in the user's `$PATH`.

The program can also be run without installing the package locally from JSR. Just do a:

```sh
deno run -A jsr:@iherman/yml2vocab/cli [-v vocab_file_name] [-t template_file_name] [-c]
```

#### 3.1.3	Command line argument

The script generates the `vocab_file_name.ttl`, `vocab_file_name.jsonld`, and `vocab_file_name.html` files for the Turtle, JSON-LD, and HTML versions, respectively. The script relies on the `vocab_file_name.yml` file for the vocabulary specification in YAML and a `template_file_name` file for a template file. The defaults are `vocabulary` and `template.html`, respectively.

If the `-c` flag is also set, the additional `vocab_file_name.context.jsonld` is also generated, containing a JSON-LD file that can be used as a separate `@context` reference in a JSON-LD file. Note that this JSON-LD file does not necessarily use all the sophistication that JSON-LD [defines](https://www.w3.org/TR/json-ld11/#the-context) for `@context`; these may have to be added manually.

### 3.2	Running from a Javascript/TypeScript program

#### 3.2.1	Usage with node.js

The simplest way of using the module from Javascript is:

```js
const yml2vocab = require('yml2vocab');
async function main() {
    await yml2vocab.generateVocabularyFiles("vocabulary","template.html",false);
}
main();
```

This reads (asynchronously) the YAML and template files and stores the generated vocabulary representations (see the command line interface for details) in the directory alongside the YAML file. By setting the last argument to `true` a `@context` is also generated.

The somewhat lower level  `yml2vocab.VocabGeneration` class can also be used:

```js
const yml2vocab = require('yml2vocab');
// YAML content is text form, before parsing
const vocabGeneration = new yml2vocab.VocabGeneration(yml_content);
// returns the turtle content as a string
const turtle: string  = vocabGeneration.getTurtle();
// returns the JSON-LD content as a string
const jsonld: string  = vocabGeneration.getJSONLD();
// returns the HTML content as a string
const html: string    = vocabGeneration.getHTML(template_file_content, basename_for_files, context_generated);
// returns the minimal @context file for the vocabulary
const context: string = vocabGeneration.getContext();
```

Running TypeScript is used instead of Javascript is similar, except that the `require` must be replaced by:

```js
import yml2vocab from 'yml2vocab';
```

There is no need to install any extra typing, it is included in the package. The interfaces are simply using strings, no extra TypeScript type definitions have been defined.

#### 3.2.2	Usage with deno

The package is also available on JSR `@iherman/yml2vocab`. All previous examples are valid for deno, except for the import statements which should be:

```js
import yml2vocab from 'jsr:@iherman/yml2vocab'
```

Note that deno can also import npm packages if explicitly named, so the following import statement is also valid:

```js
import yml2vocab from 'npm:yml2vocab'
```

No prior installation step is necessary.

### 3.3	Cloning the repository

The [repository](https://github.com/yml2vocab) may also be cloned.

#### 3.3.1	Content of the directory

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

## 4	Acknowledgement

I got inspired by the structure and Ruby script  that was created by my late colleague and friend Gregg Kellogg for version 1 of the Credentials Vocabulary. The vocabulary definition itself was using CSV. The CSV definitions have been changed to YAML, and the script itself has been re-written in TypeScript, and developed further since by adding new features based on usage.

Many features are the result of further discussions with Many Sporny, Benjamin Young, and Pierre-Antoine Champin.

I dedicate this script to the memory of Gregg. R.I.P.









