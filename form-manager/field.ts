import { IDeref } from '@thi.ng/api';
import {
    fromDOMEvent,
    metaStream,
    stream,
    Stream,
    Subscription,
    MetaStream,
    StreamMerge,
    merge,
} from '@thi.ng/rstream';
import * as tx from '@thi.ng/transducers';

export class Field implements IDeref<any> {
    id: string;
    arrayPath: string;
    htmlElement: HTMLElement;
    manualStream: Stream<any>;
    eventStream: MetaStream<Subscription<Event, any>, any>;
    valueStream: StreamMerge<any, any>;

    constructor (id: string, defaultValue: any, arrayPath: string = null) {
        this.id = id
        this.arrayPath = arrayPath;
        this.manualStream = stream(s => s.next(defaultValue))
        this.eventStream = this.getEventStream(defaultValue)
        this.valueStream = merge({ src: [ this.manualStream, this.eventStream ] })
    }

    getEventStream = (defaultValue: any): MetaStream<Subscription<Event, any>, any> => {
        // wrap the event stream (fromDOMEvent) in a meta stream and return a stream with default value until the element is found
        // arbitrarily retry getting the element every 300ms up to 10 times
        const meta = metaStream((eventStream: Subscription<Event, any>) => {
            return eventStream instanceof Subscription
                ? eventStream
                : stream(x => x.next(defaultValue))
        })
    
        let count = 1;
        const intervalId = setInterval(() => {
            if (count === 10 || count == -1) {
                clearInterval(intervalId)
                return;
            }
    
            let elem = document.getElementById(this.id);
            if (!elem) {
                count++;
                return;
            }
    
            // TODO: handle all: https://www.w3schools.com/html/html_form_elements.asp
            if (elem.nodeName !== 'INPUT' && elem.nodeName !== 'SELECT')
                elem = elem.querySelector('input') || elem.querySelector('select');
    
            if (!elem) {
                count++;
                return;
            } else {
                this.htmlElement = elem;
            }
    
            (this.htmlElement as HTMLInputElement).value = defaultValue;
    
            const eventStream = (this.htmlElement as HTMLInputElement).type === 'checkbox'
                ? fromDOMEvent(this.htmlElement, 'input').subscribe(tx.map((e: InputEvent) => (e.target as HTMLInputElement).checked))
                : fromDOMEvent(this.htmlElement, 'input').subscribe(tx.map((e: InputEvent) => (e.target as HTMLInputElement).value));
            meta.next(eventStream)
            count = -1;
        }, 300)
    
        return meta;
    }

    deref () {
        return this.valueStream;
    }

    remove (): void {
        this.manualStream.done()
        this.eventStream.done()
    }

    setValue (value: any): void {
        this.manualStream.next(value);
        (this.htmlElement as HTMLInputElement).value = value;
    }

    shiftLeftInArray (): void {
        if (typeof this.arrayPath !== 'string' || !this.arrayPath.endsWith(']')) {
            // TODO: make an ArrayField class
            console.warn('Attempted calling shiftLeftInArray on a non-array field');
            return;
        }

        const restOfPath = this.id.split(this.arrayPath).filter(x => x)[0];
        const newIndex = parseInt(this.arrayPath[this.arrayPath.length - 2]) - 1;
        this.arrayPath = `${this.arrayPath.substring(0, this.arrayPath.length - 3)}[${newIndex}]`;
        this.id = `${this.arrayPath}${restOfPath}`;
    }
}