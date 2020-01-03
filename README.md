# form-manager
Status: Proof of Concept (API not defined & bugs)

Something I decided to try out after being on a project that used the React form library, Formik, and not being too thrilled with it. I wondered, how hard could it be? And I wanted to use [@thi.ng/rstream](https://github.com/thi-ng/umbrella/tree/master/packages/rstream) more.

## Usage
You define your form's fields as an object or JSON file. A field is an object with properties for `type` and `defaultValue`.
```
{
    "name": {
        "type": "string",
        "defaultValue: "Frank"
    },
    "age": {
        "type": "number",
        "defaultValue": 23
    },
    "additionalFields": {
        "fieldOne": {
            "type": "string",
            defaultValue: ""
        }
    },
    "listOfStuff": {
        "type": "array",
        "defaultValue": []
    },
    "listOfFields": [
        {
            "type": {
                "someField": {
                    "type": "string",
                    "defaultValue": ""
                }
            },
            "defaultValue": [
                { "someField": "test" }
            ]
        }
    ]
}
```
The goal is to handle any amount of nesting as well as arrays containing either values or more fields.

When `buildForm` is called this object will be parsed to find each field and create a stream using the [fromDomEvent](https://github.com/thi-ng/umbrella/tree/master/packages/rstream#other-stream-creation-helpers) creation helper from `@thi.ng/rstream`. These streams are stored in a flat object keyed by the full path to the field.
```
{
    "name": stream(),
    "age": stream(),
    "additionalFields.fieldOne": stream(),
    "listOfStuff[0]": stream(),
    "listOfStuff[1]": stream(),
    "listOfFields[0].someField": stream()
}
```

When writing your markup the `id` of the input element must be the full path to the field.

That's everything needed to get started. Call buildForm with true to turn on dev mode and log your form object on each change `buildForm(true)`.

## API

- `setValue(path: string, value: any)` - manually set a fields value.
-  `addField(field: { [path]: any })` - adds a field to the form at the provided path. The field is defined as an object keyed by the path. The value will be the initial value of the field.
- `addFields(fields: { [path]: any }[])` - same as `addField` but accepts an array of fields as an argument.
- `addArrayField(path: string, index: number)` - add an arrya index that was defined to contain additional fields instead of values so DOM event streams can be created for those new fields. 
- `removeField` TODO: Not Implemented
- `buildForm(fields: object, dev = false)` - parses the fields definition object and creates streams for DOM events, manual events, and merging of those streams back into an object of the same shape as the definition object (with the actual field values).

## Implementation Details

In addition to the DOM event streams that are attached to the HTML input fields, there is another (manual) stream created for each input to allow for programatically updating a fields value. These two streams are [merged](https://github.com/thi-ng/umbrella/tree/master/packages/rstream#stream-merging) to create a `values` streams, the resulting value for that field. 

The `form` stream is a [metastream](https://github.com/thi-ng/umbrella/tree/master/packages/rstream#meta-streams). This is how adding and removing fields on the form is accomplished. All the fields and their streams are recreated during this process and a new form stream is created from the `values` streams and run through a transducers to process the paths and build out the correct object shape.
