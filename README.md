
- [1. Generate RDFS vocabulary files from YAML](#1-generate-rdfs-vocabulary-files-from-yaml)
  - [1.1. Introduction](#11-introduction)
  - [1.2. Definition of the vocabulary in the YAML file](#12-definition-of-the-vocabulary-in-the-yaml-file)
    - [1.2.1. General Vocabulary blocks](#121-general-vocabulary-blocks)
      - [1.2.1.1. Vocabulary Constants —`vocab` Block](#1211-vocabulary-constants-vocab-block)
      - [1.2.1.2. 1.1.2 CURIE Prefixes — `prefix` Block](#1212-112-curie-prefixes--prefix-block)
      - [1.2.1.3. Vocabulary Metadata —`ontology` Block](#1213-vocabulary-metadata-ontology-block)
      - [1.2.1.4. Generated JSON-LD context data — `json_ld` block](#1214-generated-json-ld-context-data--json_ld-block)
    - [1.2.2. Ontology term blocks](#122-ontology-term-blocks)
      - [1.2.2.1. Common Term Entries](#1221-common-term-entries)
      - [1.2.2.2. Class definitions —`class` Block](#1222-class-definitions-class-block)
      - [1.2.2.3. Property definitions — `property` Block](#1223-property-definitions--property-block)
      - [1.2.2.4. Individual definitions —`individual` Block](#1224-individual-definitions-individual-block)
      - [1.2.2.5. Datatype definitions — `datatype` Block](#1225-datatype-definitions--datatype-block)
  - [1.3. Formatting the output](#13-formatting-the-output)
- [2. Installation and use](#2-installation-and-use)
  - [2.1. Running the script on a command line](#21-running-the-script-on-a-command-line)
    - [2.1.1. NPM + Node.js](#211-npm--nodejs)
    - [2.1.2. Deno](#212-deno)
    - [2.1.3. Command line argument](#213-command-line-argument)
  - [2.2. Running from a Javascript/TypeScript program](#22-running-from-a-javascripttypescript-program)
    - [2.2.1. Usage with node.js](#221-usage-with-nodejs)
      - [2.2.1.1. Usage with deno](#2211-usage-with-deno)
- [3. Cloning the repository](#3-cloning-the-repository)
  - [3.1. Content of the directory](#31-content-of-the-directory)
- [4. Acknowledgement](#4-acknowledgement)


# 1. Generate RDFS vocabulary files from YAML

## 1.1. Introduction

This script in this module converts a simple [RDF](https://www.w3.org/TR/rdf11-concepts/) vocabulary, described in [YAML](https://yaml.org/spec/1.2.2/), into a formal [RDFS](https://www.w3.org/TR/rdf-schema/) in [JSON-LD](https://www.w3.org/TR/json-ld11/), [Turtle](https://www.w3.org/TR/turtle/), and HTML. Optionally, a simple [JSON-LD `@context`](https://www.w3.org/TR/json-ld11/#the-context) is also generated for the vocabulary. Neither the script nor the YAML format is prepared for complex vocabularies; its primary goal is to simplify the generation of simple, straightforward RDFS vocabularies not requiring, for instance, sophisticated OWL statements.

When running, the script relies on two files:

1. The `vocabulary.yml` file, containing the definition for the vocabulary entries. (It is also possible to use a different name for the YAML file, see below.)
2. The `template.html` file, used to create the HTML file version of the vocabulary. (It is also possible to use a different name for the template file, see below.) The template may also be an HTML fragment (ie, without the `<html>`, `<head>`, etc.), which comes handy if the generated fragment is to be included into the full specification as, say, an Appendix. Note that if a fragment is used, the `defined_by` entries use only the fragment part of the URL in the generated code (the URL is supposed to refer to the specification file itself).

## 1.2. Definition of the vocabulary in the YAML file

The vocabulary is defined in a YAML file, which contains several block sequences with the following keys:  `vocab`, `prefix`, `ontology`, `class`, `property`, `individual`,`datatype`, and `json_ld`. Only the `vocab` and `ontology` blocks are _required_, all others are optional.

Each block sequence consists of blocks with a number of keys, depending on the specific block. The interpretation of these key/value pairs may depend on the top level block where they reside, but some have a common interpretation. The detailed specification of the keys and values are as follows.

### 1.2.1. General Vocabulary blocks

#### 1.2.1.1. Vocabulary Constants —`vocab` Block

Constants for the vocabulary being defined. ***This block is required***.


<table>
    <thead>
        <tr>
            <th>Key</th>
            <th>Possible values</th>
            <th>Description</th>
            <th>Required?</th>
        </tr>
    </thead>
    <tbody>
        <tr>
            <td><code>id</code></td>
            <td>prefix string</td>
            <td>
                Provides a prefix that can be used in the vocabulary
                description and in the generated RDF serializations, e.g., for
                cross-references.
            </td>
            <td>Yes</td>
        </tr>
        <tr>
            <td><code>value</code></td>
            <td>URL</td>
            <td>The official URL for the vocabulary.</td>
            <td>Yes</td>
        </tr>
        <tr>
            <td><code>context</code></td>
            <td>URL</td>
            <td>
                Provides a default <code>@context</code> file reference, used by all terms unless locally overwritten.
            </td>
            <td>Yes if the template file contains a context section, otherwise no.</td>
        </tr>
    </tbody>
</table>


Example:

```yaml
vocab:
    id: ex
    value: https://example.org/vocabulary#
    context: https://example.org/context.jsonld
```

#### 1.2.1.2. 1.1.2 CURIE Prefixes — `prefix` Block

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

| Prefix   | URL                                           |
| :------- | :-------------------------------------------- |
| `dc`     | `http://purl.org/dc/terms/`                   |
| `owl`    | `http://www.w3.org/2002/07/owl#`              |
| `rdf`    | `http://www.w3.org/1999/02/22-rdf-syntax-ns#` |
| `rdfs`   | `http://www.w3.org/2000/01/rdf-schema#`       |
| `xsd`    | `http://www.w3.org/2001/XMLSchema#`           |
| `schema` | `http://schema.org/`                          |
| `foaf`   | `http://xmlns.com/foaf/0.1/`                  |


#### 1.2.1.3. Vocabulary Metadata —`ontology` Block

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

#### 1.2.1.4. Generated JSON-LD context data — `json_ld` block

 A block affecting the generated JSON-LD context file, if generated.

<table>
    <thead>
        <tr>
            <th>Key</th>
            <th>Possible values</th>
            <th>Description</th>
            <th>Required?</th>
        </tr>
    </thead>
    <tbody>
        <tr>
            <td><code>alias</code></td>
            <td>Object with key/value pairs; the values must be URLs.</td>
            <td>
                Defines <a href="https://www.w3.org/TR/json-ld11/#aliasing-keywords">keyword aliases</a>. Possible values for keywords
                are: <code>@direction</code>, <code>@graph</code>, <code>@id</code>, <code>@included</code>, <code>@index</code>, <code>@json</code>,
                <code>@language</code>, <code>@list</code>, <code>@nest</code>, <code>@none</code>, <code>@reverse</code>, <code>@set</code>,
                <code>@type</code>, and <code>@value</code>.
            </td>
            <td>No</td>
        </tr>
        <tr>
            <td><code>import</code></td>
            <td>Either a single URL or an array thereof.</td>
            <td>
                Defines references to external <code>@context</code> files that must be
                imported (via the JSON-LD <code>@import</code>) at the beginning of the
                generated context file.
            </td>
            <td>No</td>
        </tr>
    </tbody>
</table>

Example:

```yaml
json_ld:
    alias:
        "language"  : "@language"
        "direction" : "@direction"
        "id"        : "@id"
    import: "http://example.org/othervoc.jsonld"
```

### 1.2.2. Ontology term blocks

#### 1.2.2.1. Common Term Entries

These keys are common to all term definitions, although their exact interpretation may be dependent on the terms themselves.

<table>
    <thead>
        <tr>
            <th>Key</th>
            <th>Possible values</th>
            <th>Description</th>
            <th>Required?</th>
        </tr>
    </thead>
    <tbody>
        <tr>
            <td><code>comment</code></td>
            <td>string</td>
            <td>
                Refers to a longer description of the term. It may include <a href="https://developer.mozilla.org/en-US/docs/Web/Guide/HTML/Content_categories">HTML Flow content elements</a>. The comment will be
                encapsulated into an HTML <code>&lt;div&gt;</code> element and will then
                be displayed verbatim in the HTML version of the vocabulary, and as a
                literal of type <code>rdf:HTML</code> in the
                JSON-LD and Turtle versions.
            </td>
            <td>Either <code>comment</code> or <code>defined_by</code> is required.</td>
        </tr>
        <tr>
            <td><code>context</code></td>
            <td>URLs or the constant <code>vocab</code> or <code>none</code>, or an array thereof</td>
            <td>
                Used to add information on JSON-LD <code >@context</code> file(s) that “mention” the term; the list of URLs refer to the relevant
                <code >@context</code> file. If the value is <code>vocab</code>, and a global <code >@context</code> file is defined in the
                <code>vocab</code> block, that “default” <code>@context</code> is used. If the value of the property is <code>none</code>,
                there is no context file reference for the term. The default setting is <code >vocab</code> (i.e., unless it is otherwise
                specified, the default value is used for the term).
            </td>
            <td>No</td>
        </tr>
        <tr>
            <td><code>defined_by</code></td>
            <td>One or more URLs</td>
            <td>
                Refers to the formal definition(s) of the term. This should always be a full URL, because it is also used in the generated turtle or JSON-LD
                version of the vocabulary.
            </td>
            <td>Either <code>comment</code> or
                <code>defined_by</code> is required.</td>
        </tr>
        <tr>
            <td><code>deprecated</code></td>
            <td>Boolean</td>
            <td>
                The key signals whether term is deprecated or not. Default is <code>false</code>. This property is a leftover from earlier
                version and is overwritten, if present, by the value of <code>status</code>.
            </td>
            <td>No</td>
        </tr>
        <tr>
            <td><code>example</code></td>
            <td>One or more blocks</td>
            <td>
                Blocks with <code>label</code> and <code>json</code> keys providing a (JSON-LD) example with a title. These examples are placed, in the HTML version, to
                the end of the section referring to a term; the examples are ignored in the Turtle and the JSON-LD versions. Care should be taken to use the
                <code>"|"</code> <a href="https://yaml-multiline.info">block style indicator</a> in the YAML file for the examples.
            </td>
            <td>No</td>
        </tr>
        <tr>
            <td><code>id</code></td>
            <td>term string or CURIE</td>
            <td>
                The identifier of the term. If a term string is used, it is considered to be in the namespace of the vocabulary. If a CURIE is used, the term
                is considered to be <em>external</em>: terms that are formally defined in another vocabulary, and are listed only to increase the readability
                of the vocabulary specification.
                <br>External terms, while they appear in the HTML document generated by the tool, do not result in formal RDF statements
                in Turtle or JSON-LD; they only appear as information only items in the generated document.<br> The CURIE prefix must be defined
                in the <code>prefix</code> top level block.
            </td>
            <td>Yes</td>
        </tr>
        <tr>
            <td><code>known_as</code></td>
            <td>term string</td>
            <td>
                A term can be used as an alias to the term's label in JSON-LD. It is used when generating a JSON-LD context file, as the name of
                the property in the context file instead of the official label. This means that JSON-LD users, using that context file, must
                refer to this alternative name in their code.
            </td>
            <td>No</td>
        </tr>
        <tr>
            <td><code>label</code></td>
            <td>string</td>
            <td>
                Short header label to the term. If missing, the capitalized value of <code>id</code> is used.
            </td>
            <td>No</td>
        </tr>
        <tr>
            <td><code>see_also</code></td>
            <td>One or more blocks</td>
            <td>
                Blocks with <code>label</code> and <code>url</code> keys, providing a human-readable title and a URL, respectively,
                to an external document that can be referred to by the description of the term.
                (These are translated into an <code>rdfs:seeAlso</code> statement in the vocabulary.)
            </td>
            <td>No</td>
        </tr>
        <tr>
            <td><code>status</code></td>
            <td>
                <code>stable</code>, <code >reserved</code>, or <code >deprecated</code>
            </td>
            <td>
                The terms are divided, in the HTML output, into these three sections. <code>stable</code> is the default.
            </td>
            <td>No</td>
        </tr>
        <tr>
            <td><code>type</code></td>
            <td>One or more CURIEs</td>
            <td>
                Refers to RDF types. Note that the tool automatically adds types like <code>rdf:Property</code>, <code >rdfs:Class</code>, etc.;
                this key is to be used for the vocabulary specific types only.
            </td>
            <td>No</td>
        </tr>
    </tbody>
</table>


#### 1.2.2.2. Class definitions —`class` Block

<table>
    <thead>
        <tr>
            <th>Key</th>
            <th>Possible values</th>
            <th>Description</th>
            <th>Required?</th>
        </tr>
    </thead>
    <tbody>
        <tr>
            <td><code>upper_union</code></td>
            <td>boolean</td>
            <td>
                If several superclasses are specified then, by default, this means the <em>intersection</em> (or logical <em>conjunction</em>) of the classes.
                If the value is <code>true</code>, the statement refers to the <em>union</em> (or logical <em>disjunction</em>) of the classes.
            </td>
            <td>No</td>
        </tr>
        <tr>
            <td><code>upper_value</code></td>
            <td>One or more terms or CURIEs</td>
            <td>Superclasses.</td>
            <td>No</td>
        </tr>
    </tbody>
</table>

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
      one_of: [ex:Individual_1, ex:Individual_2, …,ex:Individual_n]
      comment: The class consists of the listed individuals.
```


#### 1.2.2.3. Property definitions — `property` Block

<table>
    <thead>
        <tr>
            <th>Key</th>
            <th>Possible values</th>
            <th>Description</th>
            <th>Required?</th>
        </tr>
    </thead>
    <tbody>
        <tr>
            <td><code>container</code></td>
            <td><code>set</code> or <code>list</code></td>
            <td>
                If set to one of these values, the entry for the property in the generated JSON-LD <code>@context</code> includes the <code>@container</code>
                keyword, set to <code>@set</code> or <code >@list</code>, respectively. In both cases a warning message is also included in the generated HTML
                text whereby, when using JSON-LD data with this vocabulary, the value for the property is expected to be an array even if there is only one.
                <br>For the particular case of a <code >list</code> value, the range of the property is set to be an <code>rdf:List</code>.
                <br>The value <code >graph</code> is also accepted for the key, as an alternative to the <code>dataset</code> key.
            </td>
            <td>No</td>
        </tr>
        <tr>
            <td><code>dataset</code></td>
            <td>boolean</td>
            <td>
                This key only influences the generated JSON-LD <code >@context</code>: if the value is <code >true</code>, the JSON-LD <code >@container</code>
                is set to the <code >@graph</code> value for the property, signalling that the value refers to a
                <em>dataset</em> (or <em>graph</em>). See the <a href="https://www.w3.org/TR/json-ld/#graph-containers">JSON-LD Specification</a>
                for further details.
            </td>
            <td>No</td>
        </tr>
        <tr>
            <td><code>domain</code></td>
            <td>One or more terms or CURIEs</td>
            <td>
                The RDF domain statements of the property. If several classes are specified, the statement refers to the <em>union</em> (or logical <em>disjunction</em>) of the classes.
            </td>
            <td>No</td>
        </tr>
        <tr>
            <td><code>range</code></td>
            <td>One or more terms or CURIES, or the single <code>URL</code> term</td>
            <td>
                The RDF domain statements of the property. If the <code >URL</code> (alternatively: <code >IRI</code>) term is used, the block
                defines a property that has no explicit range type, but whose objects are expected to be IRI references. The generated vocabularies
                annotate these properties as belonging to the <code >owl:ObjectProperty</code> class, which is the reserved term for properties
                whose objects are not supposed to be literals. A corresponding comment is also generated into the HTML description of the term.
            </td>
            <td>No</td>
        </tr>
        <tr>
            <td><code>one_of</code>
            <td>One or more terms or CURIEs</td>
            <td>
                The final range includes an (anonymous) class exclusively consisting of the individuals listed in the value.
                It effectively lists the (CURIE) references that the property is supposed to have.
                Note that the generated context file creates strings as values, mapping to the entries
                in the list.
                <br>The entries are required to refer to individuals.
            </td>
        </tr>
        <tr>
            <td><code>range_union</code></td>
            <td>boolean</td>
            <td>
                If several range classes are specified then, by default, this means the <em>intersection</em> (or logical <em>conjunction</em>) of the classes.
                If the value is <code>true</code>, the statement refers to the <em>union</em> (or logical <em>disjunction</em>) of the classes.
            </td>
            <td>No</td>
        </tr>
        <tr>
            <td><code>upper_value</code></td>
            <td>One or more terms or CURIEs</td>
            <td>Superproperties.</td>
            <td>No</td>
        </tr>
    </tbody>
</table>


Example:

```yaml
property:
    - id: pr1
      label: this is example pr1
      upper_value: oa:hasTarget
      domain: Class1
      range: Class4
      defined_by: https://example.org/vocabulary-definition#pr11
      comment: Something about pr1.

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
      comment: Restricting the values to ex:val1, ex:val2, or ex:val3; in JSON-LD using the generated context "val1", "val2", "val3" should be used.
```

#### 1.2.2.4. Individual definitions —`individual` Block

No extra keys are defined for this block. The `type` key is used to define the class which contains this individual

Example:

```yaml
individual:
    - id: ind1
      label: this is an individual belonging to Class1
      type: Class1
      defined_by: https://example.org/vocabulary-definition#ind1
```

#### 1.2.2.5. Datatype definitions — `datatype` Block

<table>
    <thead>
        <tr>
            <th>Key</th>
            <th>Possible values</th>
            <th>Description</th>
            <th>Required?</th>
        </tr>
    </thead>
    <tbody>
        <tr>
            <td><code>one_of</code></td>
            <td>array of strings</td>
            <td>This is a shorthand for a pattern property with the value of <code>"val1\|val2\|…\|valn"</code>, i.e., it restricts the value to a predefined set of strings (without spaces).</td>
            <td>No</td>
        </tr>
        <tr>
            <td><code>pattern</code></td>
            <td>string</td>
            <td>An <a href="https://www.w3.org/TR/xmlschema-2/#regexs">XML Schema regular expression</a>, used to restrict an <code>xsd:string</code> type literal. Note that, while this restriction
            become part of the generated vocabulary, not all  RDF/OWL reasoners are capable of processing it.</td>
            <td>No</td>
        </tr>
    </tbody>
</table>


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

## 1.3. Formatting the output

Some efforts are made to make the output files (HTML, JSON-LD, and Turtle) properly formatted to make them readable. A subset of the [`editorconfig`](https://spec.editorconfig.org) facilities are also taken into account. Namely, if an `.editorconfig` file is found, the following supported pairs are used (with the default values in parenthesis):

- `indent_style` (`space`)
- `insert_final_newline` (`false`)
- `indent_size` (4)
- `max_line_length` (0)
- `end_of_line` (`lf`)

See the [`.editorconfig`](https://spec.editorconfig.org/#supported-pairs) for further details.

# 2. Installation and use

The script has been written in TypeScript (version 5.0.2 and beyond) running on top of [`node.js`](https://nodejs.org) (version 21 and beyond) or  [`deno`](http://deno.land) (version 2.1 and beyond).

Beyond the YAML file itself, the script relies on an HTML template file, i.e., a skeleton file in HTML that is completed by the vocabulary entries. The [example template file on GitHub](https://github.com/w3c/yml2vocab/tree/main/example/template.html) provides a good starting point for a template that also makes use of [respec](https://respec.org). The script relies on the existing `id` values and section structures to be modified/extended by the script. Unused subsections (e.g., when there are no deprecated classes) are removed from the final HTML file.

## 2.1. Running the script on a command line

### 2.1.1. NPM + Node.js

The script can be used as a standard npm module via:

```sh
npm install yml2vocab
```


The npm installation installs the `node_modules/.bin/yml2vocab` script. The script can be used as:

```sh
yml2vocab [-v vocab_file_name] [-t template_file_name] [-c]
```

### 2.1.2. Deno

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

### 2.1.3. Command line argument

The script generates the `vocab_file_name.ttl`, `vocab_file_name.jsonld`, and `vocab_file_name.html` files for the Turtle, JSON-LD, and HTML versions, respectively. The script relies on the `vocab_file_name.yml` file for the vocabulary specification in YAML and a `template_file_name` file for a template file. The defaults are `vocabulary` and `template.html`, respectively.

If the `-c` flag is also set, the additional `vocab_file_name.context.jsonld` is also generated, containing a JSON-LD file that can be used as a separate `@context` reference in a JSON-LD file. Note that this JSON-LD file does not necessarily use all the sophistication that JSON-LD [defines](https://www.w3.org/TR/json-ld11/#the-context) for `@context`; these may have to be added manually.

## 2.2. Running from a Javascript/TypeScript program

### 2.2.1. Usage with node.js

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
// The third argument specifies (as a boolean) whether a context file is also generated
// (if yes, some extra explanatory notes may appear in the HTML output)
const html: string    = vocabGeneration.getHTML(template_file_content, basename_for_files, context_generated);
// returns the minimal @context file for the vocabulary
const context: string = vocabGeneration.getContext();
```

Running TypeScript instead of Javascript is similar, except that the `require` must be replaced by:

```js
import yml2vocab from 'yml2vocab';
```

There is no need to install any extra typing, it is included in the package. The interfaces are simply using strings, no extra TypeScript type definitions have been added.

#### 2.2.1.1. Usage with deno

The package is also available on JSR `@iherman/yml2vocab`. All previous examples are valid for deno, except for the import statements which should be:

```js
import yml2vocab from 'jsr:@iherman/yml2vocab'
```

Note that deno can also import npm packages if explicitly named, so the following import statement is also valid:

```js
import yml2vocab from 'npm:yml2vocab'
```

No prior installation step is necessary.

# 3. Cloning the repository

The [repository](https://github.com/yml2vocab) may also be cloned.

## 3.1. Content of the directory

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

# 4. Acknowledgement

I got inspired by the structure and Ruby script  that was created by my late colleague and friend Gregg Kellogg for version 1 of the Credentials Vocabulary. The vocabulary definition itself was using CSV. The CSV definitions have been changed to YAML, and the script itself has been re-written in TypeScript, and developed further since by adding new features based on usage.

Many features are the result of further discussions with Many Sporny, Benjamin Young, and Pierre-Antoine Champin.

I dedicate this script to the memory of Gregg. R.I.P.









