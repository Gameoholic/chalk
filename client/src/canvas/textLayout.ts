export interface TextLine {
    text: string;
    startIndex: number; // character index in the original string where this line begins
}

/**
 * Breaks a string into visual lines exactly as wrapText draws them,
 * so cursor positioning and rendering always agree.
 */
export function computeLines(
    text: string,
    ctx: CanvasRenderingContext2D,
    maxWidth: number
): TextLine[] {
    const lines: TextLine[] = [];
    const paragraphs = text.split("\n");
    let globalIndex = 0;

    for (const paragraph of paragraphs) {
        if (paragraph === "") {
            lines.push({ text: "", startIndex: globalIndex });
            globalIndex += 1; // account for the \n character
            continue;
        }

        const words = paragraph.split(" ");
        let currentLine = "";
        let lineStartIndex = globalIndex;

        for (const word of words) {
            const testLine = currentLine ? `${currentLine} ${word}` : word;
            const { width } = ctx.measureText(testLine);

            if (width > maxWidth && currentLine !== "") {
                lines.push({ text: currentLine, startIndex: lineStartIndex });
                lineStartIndex = globalIndex;
                currentLine = word;
            } else {
                currentLine = testLine;
            }

            globalIndex += word.length + 1; // +1 for the space
        }

        if (currentLine) {
            lines.push({ text: currentLine, startIndex: lineStartIndex });
        }

        globalIndex -= 1; // remove the last over-counted space
        globalIndex += 1; // account for the \n character
    }

    return lines;
}

/**
 * Given a cursor index in the string, returns which visual line it's on
 * and how many characters into that line it is.
 */
export function getCursorLineAndOffset(
    lines: TextLine[],
    cursorIndex: number
): { lineIndex: number; offsetInLine: number } {
    for (let i = lines.length - 1; i >= 0; i--) {
        if (cursorIndex >= lines[i].startIndex) {
            return {
                lineIndex: i,
                offsetInLine: cursorIndex - lines[i].startIndex,
            };
        }
    }
    return { lineIndex: 0, offsetInLine: 0 };
}
