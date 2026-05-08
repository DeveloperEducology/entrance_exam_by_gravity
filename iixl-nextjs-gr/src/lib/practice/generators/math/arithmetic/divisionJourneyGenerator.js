/**
 * Division Journey Generator (v1)
 * Generates interactive division sharing problems with various themes.
 */

export const generateDivisionJourney = () => {
    const themes = [
        {
            name: 'Space',
            item: 'glowing crystal',
            items: 'glowing crystals',
            group: 'alien vault',
            groups: 'alien vaults',
            imageUrl: 'https://cdn-icons-png.flaticon.com/512/771/771275.png', // Diamond/Crystal
            action: 'store them safely',
            place: 'secure it'
        },
        {
            name: 'Garden',
            item: 'fresh carrot',
            items: 'fresh carrots',
            group: 'wicker basket',
            groups: 'wicker baskets',
            imageUrl: 'https://cdn-icons-png.flaticon.com/512/2909/2909808.png', // Carrot
            action: 'share them equally',
            place: 'place it'
        },
        {
            name: 'Ocean',
            item: 'shiny pearl',
            items: 'shiny pearls',
            group: 'giant shell',
            groups: 'giant shells',
            imageUrl: 'https://cdn-icons-png.flaticon.com/512/2150/2150041.png', // Pearl
            action: 'distribute them',
            place: 'tuck it in'
        },
        {
            name: 'Bakery',
            item: 'sweet cookie',
            items: 'sweet cookies',
            group: 'baking tray',
            groups: 'baking trays',
            imageUrl: 'https://cdn-icons-png.flaticon.com/512/548/548427.png', // Cookie
            action: 'place them',
            place: 'drop it'
        }
    ];

    const theme = themes[Math.floor(Math.random() * themes.length)];

    // Division sets that work well (total, groups, ans)
    const divisionSets = [
        [12, 3, 4], [12, 4, 3], [12, 6, 2], [12, 2, 6],
        [15, 3, 5], [15, 5, 3],
        [18, 3, 6], [18, 6, 3], [18, 9, 2], [18, 2, 9],
        [20, 4, 5], [20, 5, 4], [20, 2, 10], [20, 10, 2],
        [24, 4, 6], [24, 6, 4], [24, 3, 8], [24, 8, 3]
    ];

    const [total, groupCount, ans] = divisionSets[Math.floor(Math.random() * divisionSets.length)];

    return {
        variables: {
            total: String(total),
            groups: String(groupCount),
            ans: String(ans),
            theme_name: theme.name,
            item_name: theme.item,
            items_name: theme.items,
            group_name: theme.group,
            groups_name: theme.groups,
            imageUrl: theme.imageUrl,
            action_verb: theme.action,
            place_verb: theme.place
        }
    };
};
