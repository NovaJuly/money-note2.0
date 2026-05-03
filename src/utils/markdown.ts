// 从 Markdown 内容提取纯文本摘要
export const extractPlainText = (markdown: string, maxLength = 30): string => {
  if (!markdown) return ''
  let text = markdown
    .replace(/!\[.*?\]\(.*?\)/g, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/[#*`_~>]/g, '')
    .replace(/\n+/g, ' ')
    .trim()
  return text.length > maxLength ? text.slice(0, maxLength) + '…' : text
}