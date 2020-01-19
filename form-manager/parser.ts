import { Field } from './field';

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

const validateArrayType = (defaultValue: any, key: string) => {
    if (!Array.isArray(defaultValue)) {
        throw Error('Invalid schema. Array field at ' + key + ' does not have a default value of type array');
    }
}

export const buildFieldsForArray = (arrayKey: string, basePath: string = null) => {
    return buildFields(arrayFields[arrayKey], basePath);
}

export const buildFields = (fieldsObj: object, basePath: string = null, parentDefaultValues = {}) => {
    const result = {};

    Object.keys(fieldsObj).forEach((key: string) => {
        const path = basePath ? `${basePath}.${key}` : key;
        const arrayPath = basePath && basePath.endsWith(']') ? basePath : null;

        if (Array.isArray(fieldsObj[key])) {
            if (!fieldsObj[key].length) {
                result[key] = [];
            } else if (typeof fieldsObj[key][0] !== 'object' || typeof fieldsObj[key][0].type !== 'object') {
                throw new Error('Invalid array of fields schema. Must be an array with an object with a type parameter defining the fields.')
            } else {
                const arrayValue = [];
                const { type, defaultValue } = fieldsObj[key][0];
                validateArrayType(defaultValue, key);
                arrayFields[key] = type;
                
                if (defaultValue && defaultValue.length) {
                    defaultValue.forEach((fields, i) => {
                        if (typeof fields !== 'object') {
                            console.log('fields', fields)
                            throw new Error('Invalid default value for array of fields at ' + key + '. Elements must be object of fields')
                        }
                        arrayValue.push(buildFields(type, `${path}[${i}]`, fields));
                    })
                }
                result[key] = arrayValue;
            }
        } else if (isField(fieldsObj[key])) {
            const value = parentDefaultValues[key] || fieldsObj[key].defaultValue;
            result[key] = fieldsObj[key].type === 'array'
                ? []
                :  new Field(path, value, arrayPath);
        } else if (typeof fieldsObj[key] === 'object') {
            if (fieldsObj[key].type === 'array') {
                validateArrayType(fieldsObj[key].defaultValue, key);
                result[key] = fieldsObj[key].defaultValue || [];
            } else {
                const nestedValues = buildFields(fieldsObj[key], path, fieldsObj[key].defaultValue);
                result[key] = nestedValues
            }
        }
    })

    return result;
}