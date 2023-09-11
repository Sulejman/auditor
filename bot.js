const {Octokit} = require("@octokit/core");
const axios = require("axios");
require('dotenv').config();

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const OPENAI_TOKEN = process.env.OPENAI_TOKEN
const REPO = process.env.REPO;
const OWNER = process.env.OWNER;

const octokit = new Octokit({
    auth: GITHUB_TOKEN
});

async function getPRDescription(prNumber) {
    try {
        const baseURL = 'https://api.github.com';
        const url = `${baseURL}/repos/${OWNER}/${REPO}/pulls/${prNumber}`;

        const response = await axios.get(url, {
            headers: {
                "Authorization": `Bearer ${GITHUB_TOKEN}`,
                "Accept": "application/vnd.github+json",
                'X-GitHub-Api-Version': '2022-11-28'
            }
        })
        console.log("PR DESCRIPTION:", response.data.body)
        return response.data.body || '';  // Return the PR description
    } catch (error) {
        console.error('Error fetching PR description:', error);
        return '';
    }
}


async function getChatGPTReview(code, previousReviews, description) {
    const headers = {
        Authorization: `Bearer ${OPENAI_TOKEN}`,
        'Content-Type': 'application/json',
    };

    console.log("CODE:", code)

    const mainPrompt = `Act as if you are senior developer or team lead. Review the following code segment and suggest improvements, warn about issues or vulnerabilities: \n\`\`\`${code}\n\`\`\`
            Also take into account the following context, which is the PR description: \n\`\`\`${description}\n\`\`\`
            Write review which contains recommendations on how to do these changes better, while quoting code segments for relevant review points? Keep reviews short and concise. \n\`\`\``

    const contextPrompt = `Be mindful that this is continuation of review you are already doing and here is the previous review of last code segment for better context: \n\`\`\`${previousReviews[previousReviews.length]}\n\`\`\``

    let prompt

    if(previousReviews.length > 0) {
        prompt = mainPrompt + contextPrompt
    } else {
        prompt = mainPrompt
    }

    const data = {
        model: "gpt-4",
        messages: [
            {
                role: "user",
                content: prompt
            }
        ],
        temperature: 0.7
    };

    const response = await axios.post('https://api.openai.com/v1/chat/completions', data, {headers});
    console.log("RESPONSE:", response.data.choices[0].message.content)
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

        console.log("DATA FETCHING DIFF FILE:", response.data)
        return  processDiff(response.data);
    } catch (error) {
        console.error('Error fetching diff:', error);
    }
}

async function reviewPullRequest(owner, repo, pullNumber) {
    try {
        const diffContent = await getDiffContent(pullNumber);
        const description = await getPRDescription(pullNumber)
        const reviews = [];

        for (const segment of diffContent) {
            const review = await getChatGPTReview(segment, reviews, description);
            reviews.push(review);
            await postReviewComment(owner, repo, pullNumber, review);
        }
    } catch (error) {
        console.error('Error during review PR:', error);
    }
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
    await octokit.request('POST /repos/{owner}/{repo}/issues/{issue_number}/comments', {
        owner: owner,
        repo: repo,
        issue_number: pullNumber, // PRs are treated as issues in GitHub API for comments
        body: review
    })
    console.log("Review posted successfully!");
}


function segmentByFile(diff) {
    const fileSegments = diff.split('diff --git');
    return fileSegments.slice(1); // Omit the first empty segment
}

function compressSegment(segment) {
    const lines = segment.split('\n');

    // Remove metadata lines
    const compressed = lines.filter(line => {
        return !line.startsWith('index ') &&
            !line.startsWith('new file mode') &&
            !line.startsWith('--- ') &&
            !line.startsWith('+++ ');
    });

    // You can add more compression logic here, such as removing large delete sections
    // or decreasing context lines.

    return compressed.join('\n');
}

function processDiff(diff) {
    const segments = segmentByFile(diff);
    return segments.map(segment => compressSegment(segment));
}
