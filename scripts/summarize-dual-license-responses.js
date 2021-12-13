const fs = require('fs')

const jsonFilePath = 'data/dual-license-responses.json'
const fileContents = fs.readFileSync(jsonFilePath)
const json = JSON.parse(fileContents)

// **********************************************************************************************

json.claimedEmails.responses.forEach( response => {
    if (response.consentNeeded === false && response.notes === undefined) {
        const message = 'All entries where a response is not needed should have a \'notes\' property providing an explanation,'
            + ` but ${response.unassociatedCommitterEmail} has no \'notes\'. Aborting...`
        console.log('\x1b[30m\x1b[41m' + message + '\x1b[0m\n');
        process.exit();
    }
});

const consentResponses = json.gitHubUserContributors.responses.reduce((acc, current) => {
    let node;
    switch (current.consent) {
        case true:
            node = acc.consenting
            break;
        case false:
            node = acc.denying
            break;
        case undefined:
            // We don't need a response from accounts that we do not need consent from
            if (current.consentNeeded === false) {
                node = acc.consentNotNeeded
                if (current.notes === undefined) {
                    const message = 'All entries where consent is not needed should have a \'notes\' property providing an explanation,'
                        + ` but ${current.gitHubLogin} has no \'notes\'. Aborting...`
                    console.log('\x1b[30m\x1b[41m' + message + '\x1b[0m\n');
                    process.exit();
                }
            } else {
              node = acc.noResponse
            }
            break;
    }
    if (node) {
        node.push(current.gitHubLogin)
    }
    return acc
}, {
    consenting: [],
    denying: [],
    noResponse: [],
    consentNotNeeded: []
})

const spaced = (obj) => `${obj}`.replace(/,/g, ', ')

console.log('\n\x1b[30m\x1b[42m'+ 'Consenting users:' + '\x1b[0m\n' + spaced(consentResponses.consenting))
console.log('\n*********\n')
console.log('\n\x1b[30m\x1b[42m' + 'Usernames we do not need consent from:' + '\x1b[0m\n' + spaced(consentResponses.consentNotNeeded))
console.log('\n*********\n')
console.log('\x1b[30m\x1b[41m' + 'NON consenting users:' + '\x1b[0m\n' + spaced(consentResponses.denying))
console.log('\n*********\n')
console.log('\n\x1b[30m\x1b[43m' + 'Users who have not responded:' + '\x1b[0m\n' + spaced(consentResponses.noResponse))

// **********************************************************************************************

console.log('\nConsent Responses')
console.table({
    consenting: {number: consentResponses.consenting.length}, 
    'denying consent': {number: consentResponses.denying.length},
    'no response': {number: consentResponses.noResponse.length}
})

const notClaimed = json.claimedEmails.responses.filter(r => r.comment === undefined).length
const total = json.claimedEmails.responses.length
const claimed = total - notClaimed

console.log('\nUnassociated emails')
console.table({
    'email has been claimed by GitHub user': { number: claimed },
    'email remains unclaimed': { number: notClaimed },
})

// **********************************************************************************************

const statusFileContent = `# Current Status

The contents of this file are generated by [a script](scripts/summarize-dual-license-responses.js)
from the [\`dual-license-responses.json\`](${jsonFilePath}) file.

## Unassociated Emails

| Unassociated Email... | Number |
| --- | --- |
| Has Been Claimed By a GitHub User | ${claimed} |
| Remains Unclaimed | ${notClaimed} |

## Consent to Dual-License

| Contributor Has | Number |
| --- | --- |
| Consented | ${consentResponses.consenting.length} |
| Denied Consent | ${consentResponses.denying.length} |
| No Response | ${consentResponses.noResponse.length} |

### Users Who Have Consented
${spaced(consentResponses.consenting)}

### Usernames We Do Not Need Consent From (check "notes" in [\`dual-license-responses.json\`](${jsonFilePath}))
${spaced(consentResponses.consentNotNeeded)}

### Users Who Have Denied Consent
${spaced(consentResponses.denying)}

### Users Who Have Not Responded Yet
${spaced(consentResponses.noResponse)}
`

const statusFile = 'status.md'
console.log(`Updating ${statusFile} file...`)
fs.writeFileSync(statusFile, statusFileContent)