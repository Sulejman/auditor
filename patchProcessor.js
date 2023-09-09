const fs = require('fs');
const diffContent = fs.readFileSync("diff", {encoding: 'utf8'});

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

const compressedSegments = processDiff(diffContent);
console.log(compressedSegments, compressedSegments.length);

