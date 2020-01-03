import { input } from './input';

export const community = (basePath) => {
    return ['div', [
        input(`${basePath}.communityId`, 'Community ID'),
        input(`${basePath}.startingPrice`, 'Starting Price'),
        input(`${basePath}.secondPersonFee`, 'Second Person Fee'),
        input(`${basePath}.communityFee`, 'Community Fee'),
        input(`${basePath}.followUpAction`, 'Follow Up Action'),
    ]]
}