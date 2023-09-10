const {Octokit} = require("@octokit/core");
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
            {
                role: "user",
                content: `Review the following code segment and suggest improvements, warn about issues or vulnerabilities: \n\`\`\`${code}\n\`\`\`
            Also take into account the following context, which is the PR description: \n\`\`\`${description}\n\`\`\`
            At the beginning include properly formatted code segment which is up for review. Then, in the next paragraph, write your review. Keep reviews short and concise.
            `
            }
    const response = await axios.post('https://api.openai.com/v1/chat/completions', data, {headers});
        //console.log("DATA FETCHING:", response.data)
        const segmentedData = processDiff(response.data);
        return segmentedData;
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