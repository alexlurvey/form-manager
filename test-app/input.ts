export const input = (id: string, label: string, type: string = 'text') => {
    return ['div', { class: 'input' }, [
        ['label', { for: id }, label],
        ['input', { id, type }]
    ]]
}