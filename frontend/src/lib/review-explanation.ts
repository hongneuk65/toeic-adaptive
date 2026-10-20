export function formatReviewExplanation(raw:string):string {
  return raw.split(/Nguồn\/mapping\s*:/i)[0]
    .replace(/\[(?:santa-ednet:[^\]]+|admin-question)\]\s*/g,'')
    .replace(/(?:^|\s)(Diễn giải|Phân tích đáp án sai)\s*/g,'\n\n### $1\n\n')
    .replace(/([.!?])\s+([1-9]\d?)\.\s+/g,'$1\n\n$2. ')
    .replace(/(### Phân tích đáp án sai\n\n)([\s\S]*)/,(_,heading:string,body:string)=>heading+body.replace(/\s*(\([A-D]\))\s*/g,'\n\n**$1** '))
    .trim();
}
