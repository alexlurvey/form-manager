import { fromDOMEvent, merge, stream, sync, trace, metaStream, Subscription, CloseMode } from '@thi.ng/rstream';
import * as tx from '@thi.ng/transducers';
import { exists, setIn } from '@thi.ng/paths';
import { buildFieldsFromJson, buildFieldsForArray } from './parser';

let fields = {}; // all fields defined in the json file (result of parser's buildFieldsFromJson)
let events = {}; // values from DOM events - streams from calling fromDOMEvent
let manual = {}; // values explicitly set in userland code
let values = {}; // what you see (merge of events & manual)
export const form = metaStream((newFields: object) => {
    return buildStreamsFromFields({ ...fields, ...newFields });
});

const valuesToFormMapper = tx.map(f => {
    return Object.keys(f).reduce((acc, path) => {
        if (path.indexOf('[') !== -1) {
            const arrayPath = path.split('[')[0];
            if (!exists(acc, arrayPath))
                acc[arrayPath] = [];
        }
        let p = path.replace(/\[|\]/g, '.').replace(/(\.\.)/g, '.'); // replace '[', ']', and '..' with '.'
        p = p[p.length-1] === '.' ? p.substring(0, p.length-1) : p; // remove trailing '.'
        return setIn(acc, p, f[path]);
    }, {});
})

const getEventStream = (id, defaultValue) => {
    // wrap the event stream (fromDOMEvent) in a meta stream and return a stream with default value until the element is found
    // arbitrarily retry getting the element every 300ms up to 10 times
    const meta = metaStream((eventStream: Subscription<Event, any>) => {
        if (eventStream.hasOwnProperty('subs')) {
            return eventStream;
        }
        
        return stream(x => x.next(defaultValue))
    })

    let count = 1;
    const intervalId = setInterval(() => {
        if (count === 10 || count == -1) {
            clearInterval(intervalId)
            return;
        }

        let elem = document.getElementById(id);
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
        }

        (elem as HTMLInputElement).value = defaultValue;

        const eventStream = (elem as HTMLInputElement).type === 'checkbox'
            ? fromDOMEvent(elem, 'input').subscribe(tx.map((e: InputEvent) => (e.target as HTMLInputElement).checked))
            : fromDOMEvent(elem, 'input').subscribe(tx.map((e: InputEvent) => (e.target as HTMLInputElement).value));
        meta.next(eventStream)
        count = -1;
    }, 300)

    return meta;
}

const buildStreamsFromFields = (f) => {
    const keys = Object.keys(f);

    for (let i = 0; i < keys.length; i ++) {
        if (values[keys[i]]) {
            continue;
        }

        const m = stream(s => s.next(f[keys[i]]));
        manual[keys[i]] = m;

        const s = getEventStream(keys[i], f[keys[i]]);
        events[keys[i]] = s;

        const v = merge({ src: [ s, m ] });
        values[keys[i]] = v;
    }

    return sync({ src: values, xform: valuesToFormMapper, closeOut: CloseMode.NEVER });
}

export const setValue = (path, value) => {
    manual[path].next(value);
    const elem = document.getElementById(path);
    (elem as HTMLInputElement).value = value;
}

export const addFields = (newFields) => {
    Object.keys(newFields).forEach(path => {
        if (fields[path]) {
            console.warn(`a field with id ${path} already exists, overriding...`);
        }
    });

    fields = { ...fields, ...newFields };
    form.next(newFields);
}

export const removeField = (path: string) => {
    Object.keys(fields).forEach(field => {
        if (field === path || (field.startsWith(path) && path.endsWith(']'))) {
            events[field].done();
            manual[field].done();
            values[field].done();
            delete events[field];
            delete manual[field];
            delete values[field];
            delete fields[field];
        }
    })
    form.next({})
}

export const addArrayField = (path, index) => {
    const newFields = buildFieldsForArray(path, `${path}[${index}]`);
    addFields(newFields)
}

export const buildForm = (fieldsObj, dev = false) => {
    fields = buildFieldsFromJson(fieldsObj);
    form.next(fields);
    if (dev) {
        form.subscribe(trace());
    }
}