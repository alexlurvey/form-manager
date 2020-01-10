// converts an object or JSON file describing fields of a form into a flat object
// of field values keyed by its path within the object structure
/*
    {
        'person': {
            'first': {
                'type': 'string',
                'defaultValue': 'Frank'
            },
            'last': {
                'type': 'string',
                'defaultValue': ''
            }
        }
    }
    converts to -> 
    {
        'person.first': 'Frank',
        'person.last': ''
    }
*/

let arrayFields = {}; // track the shapes of fields that were defined within arrays so they can be added later

const isField = obj => obj.hasOwnProperty('type') && obj.hasOwnProperty('defaultValue');

export const buildFieldsForArray = (arrayKey: string, basePath: string = null) => {
    return buildFieldsFromJson(arrayFields[arrayKey], basePath)
}

export const buildFieldsFromJson = (fieldsObj, basePath = null, parentDefaultValues = {}) => {
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