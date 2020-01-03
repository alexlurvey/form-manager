import { stream, sync } from '@thi.ng/rstream';
import * as tx from '@thi.ng/transducers';
import { updateDOM } from '@thi.ng/transducers-hdom';
import { buildForm, addFields, form, addArrayField } from '../form-manager';
import { input } from './input';
import { select } from './select';
import { adlNeeds } from './adlNeeds';
import { community } from './community';
import fieldsjson from './fields.json';
import './style.css';

const app = (adlNeedsData, formData) => {
    const addCommunity = () => {
        addArrayField('communities', formData.communities.length);
    }

    return ['div', { class: 'app-wrapper' }, [
        input('lead.influencer.firstName', 'First Name'),
        input('lead.influencer.lastName', 'Last Name'),
        input('lead.influencer.phone.number', 'Phone Number'),
        select('lead.influencer.phone.type', 'Phone Type', [
            { label: 'Select...', value: '' },
            { label: 'Home', value: 'Home' },
            { label: 'Cell', value: 'Cell' },
        ]),
        input('lead.influencer.email', 'Email'),
        input('lead.influencer.address.line1', 'Line 1'),
        input('lead.influencer.address.line2', 'Line 2'),
        input('lead.influencer.address.city', 'City'),
        select('lead.influencer.address.state', 'State', [
            { label: 'Select...', value: '' },
            { label: 'Alabama', value: 'AL' },
            { label: 'Arkansas', value: 'AK' },
            { label: 'Wisconsin', value: 'WI' },
        ]),
        input('lead.influencer.address.zip', 'Zip Code'),
        adlNeeds(adlNeedsData),
        ['button', { onclick: addCommunity }, 'Add Community'],
        ...formData.communities.map((_, i) => community(`communities[${i}]`))
    ]]
}

const adlNeedsData = stream(s => s.next([]));
sync({
    src: { adlNeedsData, form },
    xform: tx.comp(
        tx.map(({ adlNeedsData, form }) => app(adlNeedsData, form)),
        updateDOM({ root: document.getElementById('root') })
    )
})
buildForm(fieldsjson, true)

setTimeout(() => {
    const data = [
        'Something 1',
        'Something 2',
        'Something 3',
        'Something 4',
        'Something 5',
    ];
    adlNeedsData.next(data);
    addFields(data.reduce((acc, _, i) => ({ ...acc, [`adlNeeds[${i}]`]: false }), {}));
}, 3000)