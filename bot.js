        //console.log("PR DESCRIPTION:", response.data.body)
        //console.error('Error fetching PR description:', error);
    console.log(`%cCODE: ${code}`, 'color: grey');
    console.log(`---------------------------------------------------------------------------------------------`)
    if (previousReviews.length > 0) {
    console.log(`%cREVIEW: ${response.data.choices[0].message.content}`, 'color: green');
    console.log(`---------------------------------------------------------------------------------------------`)

        //console.log("DATA FETCHING DIFF FILE:", response.data)
        return processDiff(response.data);
        //console.error('Error fetching diff:', error);
    const diffContent = await getDiffContent(pullNumber);
    const description = await getPRDescription(pullNumber)
    const reviews = [];
    for (const segment of diffContent) {
        try {
        } catch (error) {
            console.log('Error generating review')
        // await postReviewComment(owner, repo, pullNumber, review);
        })
        //     .catch((error) => {
        //     console.error('Error during review:', JSON.stringify(error));
        //     process.exit(1); // Exit with error code
        // });
    //console.log("Review posted successfully!");