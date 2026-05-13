import * as XLSX from 'xlsx'
import type { BillRecord } from '@/api/record'

// 封装
export function downloadBlob(content: string, fileName: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = fileName
  a.click()
  URL.revokeObjectURL(a.href)
}
// 导出excel文件
export function exportExcel(records: BillRecord[], fileName: string) {
  const data = records.map(r => ({
    '交易时间': r.date,
    '交易类型': r.category,
    '收支': r.type === 'expense' ? '支出' : '收入',
    '金额': r.amount,
    '备注': r.note||'/',
  }))
  const workbook = XLSX.utils.book_new()
  const worksheet = XLSX.utils.json_to_sheet(data)
  XLSX.utils.book_append_sheet(workbook, worksheet, '账单明细')
  XLSX.writeFile(workbook, `${fileName}.xlsx`)
}

// 导出JSON文件
export function exportJson(records: BillRecord[], fileName: string) {
  const jsonStr = JSON.stringify(records, null, 2)
  downloadBlob(jsonStr, `${fileName}.json`, 'application/json')
}

// 导出CSV文件
export function exportCsv(records: BillRecord[], fileName: string) {
  const headers = ['交易时间', '交易类型', '收支', '金额', '备注']
  const rows = records.map(r => [
    r.date,
    r.category,
    r.type === 'expense' ? '支出' : '收入',
    r.amount,
    r.note||'/',
  ])
  const csvContent = [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n')
  downloadBlob(csvContent, `${fileName}.csv`, 'text/csv')
}