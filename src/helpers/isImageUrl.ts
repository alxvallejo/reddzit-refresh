export function isImageUrl(text: string): boolean {
  if (/\.(jpg|jpeg|png|gif|webp)(\?.*)?$/i.test(text)) return true;
  try {
    const url = new URL(text);
    if (['preview.redd.it', 'i.redd.it'].includes(url.hostname)) return true;
    // Instagram CDN
    if (/scontent[\w-]*\.cdninstagram\.com/i.test(url.hostname)) return true;
    // Facebook/Instagram shared CDN
    if (/scontent[\w-]*\.xx\.fbcdn\.net/i.test(url.hostname)) return true;
    return false;
  } catch {
    return false;
  }
}
