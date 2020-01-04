import { fromDOMEvent, merge, stream, sync, trace, metaStream } from '@thi.ng/rstream';
import * as tx from '@thi.ng/transducers';
import { exists, setIn } from '@thi.ng/paths';

const valuesToFormMapper = tx.map(f => {
    return Object.keys(f).reduce((acc, path) => {
        if (path.indexOf('[') !== -1) {
            const arrayPath = path.split('[')[0];
            if (!exists(acc, arrayPath))
                acc[arrayPath] = [];
        }
        let p = path.replace(/\[|\]/g, '.').replace(/(\.\.)/g, '.');
        p = p[p.length-1] === '.' ? p.substring(0, p.length-1) : p;
        return setIn(acc, p, f[path]);
    }, {});
})

let fields = {}; // all fields defined in the json file
let arrayFields = {}; // track the shapes of fields that were defined within arrays so they can be added later
let events = {}; // values from DOM events
let manual = {}; // values explicitly set in userland code
let values = {}; // what you see (merge of events & manual)
export const form = metaStream((newFields: { INIT?: boolean }) => {
    if (newFields.INIT) {
        return stream(s => s.next(newFields)).transform(valuesToFormMapper)
    }
    
    return buildStreamsFromFields({ ...fields, ...newFields });
});

const isField = obj => obj.hasOwnProperty('type') && obj.hasOwnProperty('defaultValue');

const buildFieldsFromJson = (fieldsObj, basePath = null, parentDefaultValues = {}) => {
    return Object.keys(fieldsObj).reduce((acc, key) => {
        const current = fieldsObj[key];
        const path = basePath ? `${basePath}.${key}` : key;
        if (isField(current)) {
            return { ...acc, [path]: parentDefaultValues[key] || current.defaultValue };
        } else if (Array.isArray(current)) {
            if (current.length !== 1)
                throw Error('Array requires an object definition of the fields within the array');
            if (!Array.isArray(current[0].defaultValue))
                throw Error('Array definition specifies a default value that is not of type array');
            
            const { type, defaultValue } = current[0];
            if (Array.isArray(type))
                throw Error('Invalid array field definition. Must be an object with "type" attribute specifying the array\'s values type or an object with fields.');

            const arrayDefaults = parentDefaultValues[key] && parentDefaultValues[key].length ? parentDefaultValues[key] : defaultValue;
            if (arrayDefaults.length > 0) {
                if (typeof type === 'object') {
                    let arrayPaths = {};
                    for (let i = 0; i < arrayDefaults.length; i++) {
                        const p = `${path}[${i}]`;
                        arrayPaths = { ...arrayPaths, ...buildFieldsFromJson(type, p, arrayDefaults[i]) };
                    }
                    arrayFields[path] = type;
                    return { ...acc, ...arrayPaths };
                } else {
                    return { ...acc, [path]: defaultValue };
                }
                
            } else {
                if (typeof type === 'object') {
                    arrayFields[path] = type;
                    return acc;
                }
                return { ...acc, [path]: defaultValue };
            }
        } else {
            return { ...acc, ...buildFieldsFromJson(current, path) }
        }
    }, {});
}

const buildStreamsFromFields = (fields) => {
    const keys = Object.keys(fields);
    for (let i = 0; i < keys.length; i ++) {
        const m = stream(s => s.next(fields[keys[i]]));
        manual[keys[i]] = m;

        let elem = document.getElementById(keys[i]);
        if (!elem) {
            values[keys[i]] = m;
            continue;
        }

        if (elem.nodeName !== 'INPUT' && elem.nodeName !== 'SELECT') // TODO: handle all: https://www.w3schools.com/html/html_form_elements.asp
            elem = elem.querySelector('input') || elem.querySelector('select');

        if (!elem) {
            values[keys[i]] = m;
            continue;
        }

        (elem as HTMLInputElement).value = fields[keys[i]]; // TODO: move this & refine initial load

        const s = (elem as HTMLInputElement).type === 'checkbox'
            ? fromDOMEvent(elem, 'input').subscribe(tx.map((e: InputEvent) => (e.target as HTMLInputElement).checked))
            : fromDOMEvent(elem, 'input').subscribe(tx.map((e: InputEvent) => (e.target as HTMLInputElement).value));

        events[keys[i]] = s;
        const v = merge({ src: [ s, m ] });
        values[keys[i]] = v;
    }

    return sync({ src: values, xform: valuesToFormMapper });
}

export const setValue = (path, value) => {
    manual[path].next(value);
}

export const addField = (path) => addFields([path]);
export const addFields = (newFields) => {
    Object.keys(newFields).forEach(path => {
        if (fields[path]) {
            console.warn(`a field with id ${path} already exists, overriding...`);
        }
    });

    fields = { ...fields, ...newFields }; // Look into: making fields, events, manual, values all be metastreams
    form.next(newFields);
}

export const addArrayField = (path, index) => {
    const newFields = buildFieldsFromJson(arrayFields[path], `${path}[${index}]`);
    fields = { ...fields, ...newFields };
    form.next(newFields);
}

export const buildForm = (fieldsObj, dev = false) => {
    fields = buildFieldsFromJson(fieldsObj);
    // load fields with default values and cause a render so streams from DOM events can be wired up in next call
    form.next({ INIT: true, ...fields })
    form.next(fields);
    if (dev) {
        form.subscribe(trace());
    }
}