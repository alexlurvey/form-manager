import { sync, trace, metaStream, CloseMode } from '@thi.ng/rstream';
import * as tx from '@thi.ng/transducers';
import { deleteIn, exists, setIn, getIn, mutIn } from '@thi.ng/paths';
import { buildFields, buildFieldsForArray } from './parser';
import { Field } from './field';

let fields = {};
export const form = metaStream((currentFields: object) => {
    const flattened = flattenFields(currentFields)
    return sync({ src: flattened, xform: valuesToFormMapper, closeOut: CloseMode.NEVER });
});

const flattenFields = (f: object) => {
    let result = {};

    Object.keys(f).forEach(key => {
        const val = f[key];
        if (val instanceof Field) {
            result[val.id] = val.deref();
        } else if (Array.isArray(val)) {
            result = val.reduce((acc, item) => {
                return item instanceof Field
                    ? { ...acc, [item.id]: item.deref() }
                    : { ...acc, ...flattenFields(item) }
            }, result);
        } else if (typeof val === 'object') {
            result = { ...result, ...flattenFields(val) }
        }
    })

    return result;
}

const getPathString = (path: string) => {
    let p = path.replace(/\[|\]/g, '.').replace(/(\.\.)/g, '.'); // replace '[', ']', and '..' with '.'
    p = p[p.length-1] === '.' ? p.substring(0, p.length-1) : p; // remove trailing '.'
    return p;
}

const valuesToFormMapper = tx.map((f: object)=> {
    return Object.keys(f).reduce((acc, path) => {
        if (path.indexOf('[') !== -1) {
            const arrayPath = path.split('[')[0];
            if (!exists(acc, arrayPath))
                acc[arrayPath] = [];
        }
        return setIn(acc, getPathString(path), f[path]);
    }, {});
})

export const setValue = (path: string, value: any) => {
    const f = getIn(fields, getPathString(path))

    if (!(f instanceof Field)) {
        throw Error('No field found at ' + path);
    }

    f.setValue(value)
}

export const addFields = (newFields: object) => {
    Object.keys(newFields).forEach(path => {
        const p = getPathString(path)
        const currentVal = getIn(fields, p);
        if (currentVal instanceof Field) {
            console.warn(`a field with id ${path} already exists, overriding...`);
            currentVal.remove()
        }
        mutIn(fields, p, new Field(path, newFields[path]))
    });

    form.next(fields);
}

export const removeField = (path: string, rootObj: object = fields) => {
    const p = getPathString(path);
    const field = getIn(rootObj, p);
    
    if (field instanceof Field) {
        field.remove();
    } else if (typeof field === 'object') {
        Object.keys(field).forEach(key => {
            if (field[key] instanceof Field)
                removeField(`${path}.${key}`, field)
        })
    }

    deleteIn(rootObj, p)

    if (path.endsWith(']')) {
        const index = parseInt(path[path.length - 2])
        if (!isNaN(index)) {
            const arrayPath = getPathString(path.substring(0, path.length - 3));
            const array = getIn(rootObj, arrayPath);
            const begin = array.slice(0, index);
            const rest = array.slice(index+1, array.length);
            rest.forEach((field: Field | object) => {
                if (field instanceof Field) {
                    field.shiftLeftInArray()
                } else {
                    Object.keys(field).forEach(key => field[key].shiftLeftInArray())
                }
                
            })
            mutIn(rootObj, arrayPath, begin.concat(rest))
        }
    }

    form.next(fields);
}

export const addArrayField = (path: string, index: number) => {
    const valAtPath = getIn(fields, path);
    if (!Array.isArray(valAtPath)) {
        throw Error (`Attempted to call addArrayField at ${path} but type of value is ${typeof valAtPath}`)
    }

    if (valAtPath.length < index) {
        valAtPath.concat(Array(index - valAtPath.length))
    } else if (valAtPath instanceof Field) {
        valAtPath.remove();
    }

    valAtPath[index] = buildFieldsForArray(path, `${path}[${index}]`)
    form.next(fields)
}

export const buildForm = (fieldsObj: object, dev: boolean = false) => {
    fields = buildFields(fieldsObj);
    form.next(fields);
    if (dev) {
        form.subscribe(trace());
    }
}