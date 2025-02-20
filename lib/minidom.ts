/**
 * A thin layer on top of the regular DOM Document. Necessary to "hide" the differences between
 * the JSDOM and Deno's DOM WASM implementations; higher layers should not depend on these.
 * 
 * @packageDocumentation
 */

import { JSDOM } from 'jsdom';

/**
 * A thin layer on top of the regular DOM Document. Necessary to "hide" the differences between
 * the JSDOM and Deno's DOM WASM implementations; higher layers should not depend on these.
 *
 * The class also includes some handy shorthands to make the code cleaner…
 * 
 * 2024-02-02: as of today, with deno v. >1.4, this layer is not necessary any more,
 * because jsdom finally runs with deno as well. The class has been kept as a separate layer
 * following the wisdom of "ain't broken, don't fix it" :-)
 * 
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
