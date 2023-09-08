const express = require('express');
const axios = require('axios');
const bodyParser = require('body-parser');

const app = express();
const port = 3000;

const GITHUB_TOKEN = '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';
const OPENAI_TOKEN = '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';
const REPO_NAME = 'sulejman/auditor';  // change this to your repo

app.use(bodyParser.json());

app.post('/webhook', async (req, res) => {
    const data = req.body;
    if (data.action === 'opened') {
        const prNumber = data.number;
        await reviewCodeWithChatGPT(prNumber);
    }
    res.json({ status: 'ok' });
});

async function reviewCodeWithChatGPT(prNumber) {
    const headers = {
        Authorization: `token ${GITHUB_TOKEN}`,
        Accept: 'application/vnd.github.v3+json',
    };

    const prData = await axios.get(`https://api.github.com/repos/${REPO_NAME}/pulls/${prNumber}`, { headers });
    const code = prData.data.body;

    const review = await getChatGPTReview(code);

    const commentData = {
        body: review,
    };
    await axios.post(`https://api.github.com/repos/${REPO_NAME}/issues/${prNumber}/comments`, commentData, { headers });
}

async function getChatGPTReview(code) {
    const headers = {
        Authorization: `Bearer ${OPENAI_TOKEN}`,
        'Content-Type': 'application/json',
    };
    const data = {
        prompt: `Review the following code: \n\`\`\`${code}\n\`\`\``,
        max_tokens: 200,
    };
    const response = await axios.post('https://api.openai.com/v1/engines/davinci-completion', data, { headers });
    return response.data.choices[0].text.trim();
}

app.listen(port, () => {
    console.log(`Bot running at http://localhost:${port}`);
});

