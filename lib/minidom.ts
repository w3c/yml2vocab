/**
 * A thin layer on top of the regular DOM Document. It was, originally, necessary to "hide" the
 * differences between the JSDOM and Deno's DOM WASM implementations; higher layers were not supposed to depend on these.
 * Then deno could handle npm packages like JSDOM natively with version>1.4, but some extra utilities were added to the
 * class which made it useful on its own right... As these utilities were used in the package,
 * I follow the wisdom of "ain't broken, don't fix it" :-)
 *
 * @packageDocumentation
 */

import { JSDOM } from 'jsdom';

/**
 * A thin layer on top of the regular DOM Document.
 * The class includes some handy shorthands to make the code cleaner…
 */
export class MiniDOM {
    private readonly _localDocument: Document;

    constructor(html_text: string) {
        const doc = (new JSDOM(html_text)).window.document;
        if (doc) {
            this._localDocument = doc;
        } else {
            throw new Error("Problem with parsing the template text");
        }
    }

    // noinspection JSUnusedGlobalSymbols
    get document(): Document {
        return this._localDocument;
    }

    /**
     * Add a new HTML Element to a parent, and return the new element.
     *
     * @param parent - The parent HTML Element
     * @param element - The new element's name
     * @param content - The new element's (HTML) content
     * @returns the new element
     *
     */
    addChild(parent: Element, element: string, content: string | undefined = undefined): Element {
        const new_element = this._localDocument.createElement(element);
        parent.appendChild(new_element);
        if (content !== undefined) {
            new_element.innerHTML = content;
        }
        return new_element;
    }

    /**
     * Add some text to an element, including the obligatory checks that Typescript imposes
     *
     * @param content - text to add
     * @param element HTML Element to add it to
     * @returns
     *
     * @internal
     */
    addText(content: string, element: Element | null): Element | null {
        if (element) {
            element.textContent = content;
        }
        return element;
    }

    /**
     * Add some HTMLtext to an element, including the obligatory checks that Typescript imposes
     *
     * @param content - text to add
     * @param element HTML Element to add it to
     * @returns
     *
     * @internal
     */
    addHTMLText(content: string, element: Element | null): Element | null {
        if (element) {
            element.innerHTML = content;
        }
        return element;
    }

    /**
     * Just the mirroring of the official DOM call.
     *
     * @param id
     * @returns
     */
    getElementById(id: string): Element | null {
        return this._localDocument.getElementById(id);
    }

    /**
      * Just the mirroring of the official DOM call.
      *
      * @param tag
      * @returns
      */
    getElementsByTagName(tag: string): HTMLCollection {
        return this._localDocument.getElementsByTagName(tag);
    }

    /**
     * Just the mirroring of the official DOM call.
     *
     * @returns
     */
    innerHTML(): string {
        const output = this._localDocument.documentElement?.innerHTML;
        return output ? output : "";
    }
}
