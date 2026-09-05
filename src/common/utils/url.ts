export function buildXPostUrl(username: string, postId: string): string {
    const cleanUsername = username.replace(/^@/, "").trim();
    const cleanPostId = postId.trim();
    return `https://x.com/${cleanUsername}/status/${cleanPostId}`;
}

export function buildXProfileUrl(username: string): string {
    const cleanUsername = username.replace(/^@/, "").trim();
    return `https://x.com/${cleanUsername}`;
}
