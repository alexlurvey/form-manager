import { deleteIn, getIn, mutIn } from '@thi.ng/paths';
import { sync, trace, metaStream, CloseMode } from '@thi.ng/rstream';
import { AddField } from './api';
import { Field } from './field';
import { buildFields, buildFieldsForArray } from './parser';
import { getPathString, flattenFields, valuesToFormMapper } from './utils';

let fields = {};

export const form = metaStream((currentFields: object) => {
    const flattened = flattenFields(currentFields)
    return sync({ src: flattened, xform: valuesToFormMapper, closeOut: CloseMode.NEVER });
});

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

export const addField = (f: AddField) => {
    addFields([f])
}

export const addFields = (newFields: AddField[]) => {
    newFields.forEach(([ path, value ]) => {
        const p = getPathString(path)
        const currentVal = getIn(fields, p);
        if (currentVal instanceof Field) {
            console.warn(`a field with id ${path} already exists, overriding...`);
            currentVal.remove()
        }
        mutIn(fields, p, new Field(path, value))
    });

    form.next(fields);
}

export const removeField = (path: string) => {
    const p = getPathString(path);
    const field = getIn(fields, p);
    
    if (field instanceof Field) {
        field.remove();
    } else if (Array.isArray(field)) {
        field.forEach((f,i) => removeField(`${p}[${i}]`))
    } else if (typeof field === 'object') {
        Object.keys(field).forEach(key => {
            if (field[key] instanceof Field) {
                removeField(`${p}.${key}`)
            }
        })
    }

    if (path.endsWith(']')) {
        const index = parseInt(path[path.length - 2])
        if (!isNaN(index)) {
            const arrayPath = getPathString(path.substring(0, path.length - 3));
            const array = getIn(fields, arrayPath);
            const begin = array.slice(0, index);
            const rest = array.slice(index+1, array.length);
            rest.forEach((field: Field | object) => {
                if (field instanceof Field) {
                    field.shiftLeftInArray()
                } else {
                    Object.keys(field).forEach(key => {
                        // TODO
                        if (field[key] instanceof Field) {
                            field[key].shiftLeftInArray()
                        }
                    })
                }
                
            })
            mutIn(fields, arrayPath, begin.concat(rest))
        }
    } else {
        fields = deleteIn(fields, p)
    }

    form.next(fields);
}

export const setValue = (path: string, value: any) => {
    const f = getIn(fields, getPathString(path))

    if (!(f instanceof Field)) {
        throw Error('No field found at ' + path);
    }

    f.setValue(value)
}

export const buildForm = (fieldsObj: object, dev: boolean = false) => {
    fields = buildFields(fieldsObj);
    form.next(fields);
    if (dev) {
        form.subscribe(trace());
    }
}