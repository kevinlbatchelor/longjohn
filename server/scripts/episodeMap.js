/*
 * Canonical broadcast-order mapping for the flat Avatar folder.
 *
 * Shared by renameEpisodes.js (disk + db) and renameFiles.js (disk only), so the
 * two can never drift. check: fragment(s) of the CURRENT name, all of which must
 * match before anything is renamed.
 */

const AVATAR = [
    // Book 1 - Water
    { id: 4102, check: 'Avatar Returns', to: 'S01E01-E02 The Boy in the Iceberg and The Avatar Returns' },
    { id: 4109, check: 'Southern Air Temple', to: 'S01E03 The Southern Air Temple' },
    { id: 4112, check: 'Warriors Of Kyoshi', to: 'S01E04 The Warriors of Kyoshi' },
    { id: 4115, check: 'King of Omashu', to: 'S01E05 The King of Omashu' },
    { id: 4116, check: 'Imprisoned', to: 'S01E06 Imprisoned' },
    { id: 4120, check: 'Spirit World', to: 'S01E07 The Spirit World - Winter Solstice Part 1' },
    { id: 4122, check: 'Avatar Roku', to: 'S01E08 Avatar Roku - Winter Solstice Part 2' },
    { id: 4127, check: 'Waterbending Scroll', to: 'S01E09 The Waterbending Scroll' },
    { id: 4129, check: 'Jet', to: 'S01E10 Jet' },
    { id: 4132, check: 'Great Divide', to: 'S01E11 The Great Divide' },
    { id: 4134, check: 'The Storm', to: 'S01E12 The Storm' },
    { id: 4136, check: 'Blue Spirit', to: 'S01E13 The Blue Spirit' },
    { id: 4141, check: 'Fortuneteller', to: 'S01E14 The Fortuneteller' },
    { id: 4142, check: 'Bato Of The Water Tribe', to: 'S01E15 Bato of the Water Tribe' },
    { id: 4146, check: 'The Deserter', to: 'S01E16 The Deserter' },
    { id: 4150, check: 'Northern Air Temple', to: 'S01E17 The Northern Air Temple' },
    { id: 4153, check: 'Waterbending Master', to: 'S01E18 The Waterbending Master' },
    { id: 4155, check: 'Siege of the North', to: 'S01E19-E20 The Siege of the North' },

    // Book 2 - Earth
    { id: 4103, check: 'Avatar State', to: 'S02E01 The Avatar State' },
    { id: 4105, check: 'Cave of Two Lovers', to: 'S02E02 The Cave of Two Lovers' },
    { id: 4107, check: 'Return to Omashu', to: 'S02E03 Return to Omashu' },
    { id: 4111, check: 'The Swamp', to: 'S02E04 The Swamp' },
    { id: 4113, check: 'Avatar Day', to: 'S02E05 Avatar Day' },
    { id: 4118, check: 'Blind Bandit', to: 'S02E06 The Blind Bandit' },
    { id: 4121, check: 'Zuko Alone', to: 'S02E07 Zuko Alone' },
    { id: 4123, check: 'The Chase', to: 'S02E08 The Chase' },
    { id: 4125, check: 'Bitter Work', to: 'S02E09 Bitter Work' },
    { id: 4130, check: 'The Library', to: 'S02E10 The Library' },
    // "The Desert" is also a substring of "The Deserter", so pin the number too.
    { id: 4131, check: [ '11 Avatar', 'The Desert' ], to: 'S02E11 The Desert' },
    { id: 4133, check: "Serpent's Pass", to: "S02E12 The Serpent's Pass" },
    { id: 4137, check: 'The Drill', to: 'S02E13 The Drill' },
    { id: 4139, check: 'City of Walls and Secrets', to: 'S02E14 City of Walls and Secrets' },
    { id: 4143, check: 'Tales of Ba Sing Se', to: 'S02E15 Tales of Ba Sing Se' },
    { id: 4145, check: "Appa's Lost Days", to: "S02E16 Appa's Lost Days" },
    { id: 4148, check: 'Lake Laogai', to: 'S02E17 Lake Laogai' },
    { id: 4152, check: 'Earth King', to: 'S02E18 The Earth King' },
    { id: 4154, check: 'The Guru', to: 'S02E19-E20 The Guru and The Crossroads of Destiny' },

    // Book 3 - Fire
    { id: 4104, check: 'The Awakening', to: 'S03E01 The Awakening' },
    { id: 4106, check: 'The Headband', to: 'S03E02 The Headband' },
    { id: 4108, check: 'Painted Lady', to: 'S03E03 The Painted Lady' },
    { id: 4110, check: "Sokka's Master", to: "S03E04 Sokka's Master" },
    { id: 4114, check: 'The Beach', to: 'S03E05 The Beach' },
    { id: 4117, check: 'Avatar and the Firelord', to: 'S03E06 The Avatar and the Firelord' },
    { id: 4119, check: 'The Runaway', to: 'S03E07 The Runaway' },
    { id: 4124, check: 'Puppetmaster', to: 'S03E08 The Puppetmaster' },
    { id: 4126, check: 'Nightmares and Daydreams', to: 'S03E09 Nightmares and Daydreams' },
    { id: 4128, check: 'Day of Black Sun', to: 'S03E10-E11 The Day of Black Sun' },
    { id: 4135, check: 'Western Air Temple', to: 'S03E12 The Western Air Temple' },
    { id: 4138, check: 'Firebending Masters', to: 'S03E13 The Firebending Masters' },
    { id: 4140, check: [ 'Boiling Rock', 'Part 1' ], to: 'S03E14 The Boiling Rock Part 1' },
    { id: 4144, check: [ 'Boiling Rock', 'Part 2' ], to: 'S03E15 The Boiling Rock Part 2' },
    { id: 4147, check: 'Southern Raiders', to: 'S03E16 The Southern Raiders' },
    { id: 4149, check: 'Ember Island Players', to: 'S03E17 The Ember Island Players' },
    { id: 4151, check: "Sozen's Comet", to: "S03E18-E21 Sozin's Comet" }
];

module.exports = AVATAR;
