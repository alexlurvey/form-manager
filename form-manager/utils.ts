import { exists, setIn } from '@thi.ng/paths';
import * as tx from '@thi.ng/transducers';
import { Field } from './field';

export const flattenFields = (f: object) => {
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

export const getPathString = (path: string) => {
    let p = path.replace(/\[|\]/g, '.').replace(/(\.\.)/g, '.'); // replace '[', ']', and '..' with '.'
    p = p[p.length-1] === '.' ? p.substring(0, p.length-1) : p; // remove trailing '.'
    return p;
}

export const valuesToFormMapper = tx.map((f: object)=> {
    return Object.keys(f).reduce((acc, path) => {
        if (path.indexOf('[') !== -1) {
            const arrayPath = path.split('[')[0];
            if (!exists(acc, arrayPath))
                acc[arrayPath] = [];
        }
        return setIn(acc, getPathString(path), f[path]);
    }, {});
})