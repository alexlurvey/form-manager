export const select = (id: string, l: string, options: { label: string, value: any }[]) => {
    return ['div', { class: 'select' }, [
        ['label', { for: id }, l],
        ['select', { id }, options.map(({ value, label }) => {
            return ['option', { value }, label];
        })]
    ]]
}