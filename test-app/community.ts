import { input } from './input';
import { removeField } from '../form-manager';

export const community = (basePath) => {
    return ['div', [
        ['hr'],
        input(`${basePath}.communityId`, 'Community ID'),
        input(`${basePath}.startingPrice`, 'Starting Price'),
        input(`${basePath}.secondPersonFee`, 'Second Person Fee'),
        input(`${basePath}.communityFee`, 'Community Fee'),
        input(`${basePath}.followUpAction`, 'Follow Up Action'),
        ['button', { onclick: () =>  removeField(basePath)},  'Remove']
    ]]
}