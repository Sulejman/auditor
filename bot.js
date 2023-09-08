const { Octokit } = require("@octokit/core");
const axios = require("axios");
const res = require("express/lib/response");

const GITHUB_TOKEN = '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';
const OPENAI_TOKEN = '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';
const REPO = 'auditor'; 
const OWNER = 'sulejman'

const octokit = new Octokit({
    auth: GITHUB_TOKEN
});

async function getChatGPTReview(code) {
    const headers = {
        Authorization: `Bearer ${OPENAI_TOKEN}`,
        'Content-Type': 'application/json',
    };

    const data = {
        model: "gpt-3.5-turbo",
        messages: [
            { role: "user", content: `Review the following code: \n\`\`\`${code}\n\`\`\`` }
        ],
        temperature: 0.7
    };

    const response = await axios.post('https://api.openai.com/v1/chat/completions', data, { headers });

    return response.data.choices[0].message.content;
}

async function getPRDiff(owner, repo, pullNumber) {
    const prData = await octokit.request('GET /repos/{owner}/{repo}/pulls/{pull_number}', {
        owner: owner,
        repo: repo,
        pull_number: pullNumber,
        headers: {
            'X-GitHub-Api-Version': '2022-11-28'
        }
    });
    console.log(prData)
    return prData.data.diff_url;
}

async function getDiffContent(pullNumber) {
    // const response = await axios.get(diffUrl);
    // return response.data;

    try {
        const response = await octokit.request('GET /repos/{owner}/{repo}/pulls/{pull_number}', {
            owner: OWNER,
            repo: REPO,
            pull_number: pullNumber,
            headers: {
                accept: 'application/vnd.github.v3.diff',
                'X-GitHub-Api-Version': '2022-11-28'
            }
        });

        // If you're not automatically redirected, then use the new URL manually
        if (response.status === 200) {
            console.log("DATA FETCHING:", response.data)
            return response.data;
        } else if (response.headers.location) {
            const newUrl = response.headers.location;
            const rawResponse = await axios.get(newUrl);
            console.log("DATA FETCHING DIFF:", rawResponse.data)
            return rawResponse.data;
        }
    } catch (error) {
        console.error('Error fetching diff:', error);
    }
}

async function reviewPullRequest(owner, repo, pullNumber) {
    //const diffUrl = await getPRDiff(owner, repo, pullNumber);
    const diffContent = await getDiffContent(pullNumber);

    // Review this content using OpenAI
    //const review = await getChatGPTReview(diffContent);

    ///console.log(review);
}


// Check if the script is called directly from the command line
if (require.main === module) {
    const prNumber = process.argv[2]; // Get PR number from the command line argument

    if (prNumber) {
        reviewPullRequest(OWNER, REPO, prNumber).then(() => {
            console.log('Review done!');
            process.exit(0); // Exit the process
        }).catch((error) => {
            console.error('Error during review:', error);
            process.exit(1); // Exit with error code
        });
    } else {
        console.error('Please provide a PR number.');
        process.exit(1);
    }
}
