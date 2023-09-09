const { Octokit } = require("@octokit/core");
const axios = require("axios");
require('dotenv').config();

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const OPENAI_TOKEN = process.env.OPENAI_TOKEN
const REPO = process.env.REPO;
const OWNER = process.env.OWNER;

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
            { role: "user", content: `Review the following code and suggest improvements: \n\`\`\`${code}\n\`\`\`` }
        ],
        temperature: 0.7
    };

    const response = await axios.post('https://api.openai.com/v1/chat/completions', data, { headers });

    return response.data.choices[0].message.content;
}

async function getDiffContent(pullNumber) {
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
    console.log("PULL NUMBER:", pullNumber)
    const diffContent = await getDiffContent(pullNumber);
    console.log("DIFF CONTENT:", diffContent)
    // Review this content using OpenAI
    const review = await getChatGPTReview(diffContent);
    console.log("REVIEW:", review)

    // if(review.data.error) {
    //     console.log(
    //         `Error: ${review.data.error.message} (HTTP status: ${review.data.error.status})`
    //     )
    // } else {
    //     console.log(`Review: ${review}`);
    // }

    await postReviewComment(owner, repo, pullNumber, review);
}

// Check if the script is called directly from the command line
if (require.main === module) {
    const prNumber = process.argv[2]; // Get PR number from the command line argument

    if (prNumber) {
        reviewPullRequest(OWNER, REPO, prNumber).then(() => {
            console.log('Review done!');
            process.exit(0); // Exit the process
        }).catch((error) => {
            console.error('Error during review:', JSON.stringify(error));
            process.exit(1); // Exit with error code
        });
    } else {
        console.error('Please provide a PR number.');
        process.exit(1);
    }
}

async function postReviewComment(owner, repo, pullNumber, review) {
    // try {
        console.log("Posting review...");
        console.log("OWNER:", owner)
        console.log("REPO:", repo)
        console.log("PULL NUMBER:", pullNumber)
        console.log("REVIEW:", review)

        const response = await octokit.request('POST /repos/{owner}/{repo}/issues/{issue_number}/comments', {
            owner: owner,
            repo: repo,
            issue_number: pullNumber, // PRs are treated as issues in GitHub API for comments
            body: review
        })
        console.log("RESPONSE:", response)
        console.log("Review posted successfully!");
    // } catch (error) {
    //     console.error('Error posting review:', error);
    // }
}
