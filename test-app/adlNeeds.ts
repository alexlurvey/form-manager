import { input } from './input';

export const adlNeeds = (data = []) => {
    return ['div', [
        ['span', 'ADL Needs'],
        ...data.map((d, i) => input(`adlNeeds[${i}]`, d, 'checkbox'))
    ]]
}