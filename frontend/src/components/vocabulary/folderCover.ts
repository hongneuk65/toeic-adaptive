const covers = [
  { name: 'work', match: /office|business|work|meeting|công sở|văn phòng|nhân sự|hợp đồng/ },
  { name: 'travel', match: /travel|airport|hotel|tour|flight|du lịch|sân bay|khách sạn|vận chuyển/ },
  { name: 'finance', match: /finance|bank|money|account|invoice|tài chính|ngân hàng|kế toán|thương mại/ },
  { name: 'food', match: /food|restaurant|dining|meal|ẩm thực|nhà hàng|ăn uống|món ăn/ },
  { name: 'technology', match: /tech|computer|internet|công nghệ|máy tính|thiết bị/ },
];
export function folderCover(name: string) {
  const text = name.toLocaleLowerCase('vi-VN');
  return `/images/vocabulary-covers/${covers.find(cover => cover.match.test(text))?.name ?? 'study'}.svg`;
}
