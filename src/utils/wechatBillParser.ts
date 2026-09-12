import * as XLSX from "xlsx";
import dayjs from "dayjs";
// 解析后的账单格式
export interface WechatBill {
  type: "expense" | "income";
  amount: number;
  category: string;
  date: string;
  note: string;
}
/** 微信账单明细的列索引（基于 0）
 * 0: 交易时间
 * 1: 交易类型
 * 2: 交易对方
 * 3: 商品
 * 4: 收/支
 * 5: 金额(元)
 * 6: 支付方式
 * 7: 当前状态
 * 8: 交易单号
 * 9: 商户单号
 * 10: 备注
 */
const COL = {
  TIME: 0,
  TRADE_TYPE: 1,
  COUNTERPARTY: 2,
  PRODUCT: 3,
  DIRECTION: 4,
  AMOUNT: 5,
  REMARK: 10,
};

/**
 * 解码文件内容。
 * 微信支付导出的 CSV 在部分版本是 GBK/GB18030，一律按 UTF-8 解会得到乱码，
 * 进而导致表头"交易时间"匹配不上，报"未找到账单明细表头"。
 */
function decodeText(buffer: ArrayBuffer): string {
  const utf8 = new TextDecoder("utf-8").decode(buffer);
  // 没有替换字符，说明 UTF-8 解对了
  if (!utf8.includes("�")) return utf8;
  try {
    const gbk = new TextDecoder("gbk").decode(buffer);
    return gbk.includes("�") ? utf8 : gbk;
  } catch {
    // 少数环境不支持 gbk 编码，退回 UTF-8
    return utf8;
  }
}

/**
 * 金额单元格可能带货币符号或千分位，直接 parseFloat 会得到 NaN，
 * 结果就是这一行被静默跳过、用户毫不知情
 */
function parseAmount(value: unknown): number {
  if (typeof value === "number") return value;
  const cleaned = String(value ?? "")
    .replace(/[¥￥$,，\s]/g, "")
    .trim();
  return cleaned ? parseFloat(cleaned) : NaN;
}
// 根据交易类型推断记账分类
export const inferCategory = (
  tradeType: string,
  counterparty: string,
  product: string,
  direction: string,
): string => {
  if (
    direction === "收入" &&
    (tradeType.includes("退款") ||
      counterparty.includes("退款") ||
      product.includes("退款"))
  ) {
    return "退款";
  } else if (
    tradeType.includes("拼多多") ||
    counterparty.includes("淘宝") ||
    product.includes("京东")
  ) {
    return "购物";
  } else if (
    tradeType.includes("转账") ||
    counterparty.includes("转账") ||
    product.includes("转账")
  ) {
    return "转账";
  }
  // 待完善其他分类规则
  if (direction === "支出") {
    return "消费";
  } else if (direction === "收入") {
    return "其他";
  }
  return "其他";
};
/**
 * 解析微信支付账单 Excel 文件，返回可用于导入的记录数组
 * @param file 用户选择的文件对象
 */
export function parseWechatBill(file: File): Promise<WechatBill[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target!.result as ArrayBuffer
        const isCSV = file.name.toLowerCase().endsWith('.csv')
        let workbook: XLSX.WorkBook
        if (isCSV) {
          // CSV：解码成文本后交给 xlsx（编码处理见 decodeText）
          workbook = XLSX.read(decodeText(data), { type: 'string', raw: true })
        } else {
          // Excel：读取二进制数组
          workbook = XLSX.read(new Uint8Array(data), { type: 'array' })
        }

        const sheetName = workbook.SheetNames[0]!;
        const worksheet = workbook.Sheets[sheetName]!;
        // 转换为二维数组，header:1 表示不生成对象，直接用数组行
        const rows: any[][] = XLSX.utils.sheet_to_json(worksheet, {
          header: 1,
          defval: "",
        }) as any[][];

        // 找到明细表头行：包含“交易时间”的行
        const headerIndex = rows.findIndex((row) => row[0] === "交易时间");
        if (headerIndex === -1) {
          reject(new Error("未找到账单明细表头，请确认是微信支付导出的账单"));
          return;
        }
        const records: WechatBill[] = [];
        // 遍历明细行，从第二行开始（跳过表头）
        for (let i = headerIndex + 1; i < rows.length; i++) {
          const row = rows[i];
          if (!row || row.length < 6) continue; // 跳过无效行

          // 只处理“支出”或“收入”，忽略中性交易
          const direction = String(row[COL.DIRECTION] || "").trim();
          if (direction !== "支出" && direction !== "收入") continue;
          // 解析金额，忽略无效金额
          const amount = parseAmount(row[COL.AMOUNT]);
          if (isNaN(amount) || amount <= 0) continue;

          const tradeType = String(row[COL.TRADE_TYPE] || "").trim();
          const counterparty = String(row[COL.COUNTERPARTY] || "").trim();
          const product = String(row[COL.PRODUCT] || "").trim();
          const rawTime = row[COL.TIME];
          let datetime: string;
          if (typeof rawTime === "number") {
            const dateCode = XLSX.SSF.parse_date_code(rawTime);
            if (dateCode && typeof dateCode.y === "number") {
              // dateCode 结构：{ y: 2026, m: 3, d: 31, H: 6, M: 52, S: 1 }
              datetime =
                `${dateCode.y}-${String(dateCode.m).padStart(2, "0")}-${String(dateCode.d).padStart(2, "0")} ` +
                `${String(dateCode.H).padStart(2, "0")}:${String(dateCode.M).padStart(2, "0")}:${String(dateCode.S).padStart(2, "0")}`;
            } else {
              datetime = String(rawTime || "").trim();
            }
          } else {
            datetime = String(rawTime || "").trim();
          }

          const remark = String(row[COL.REMARK] || "").trim();

          const type = direction === "支出" ? "expense" : "income";
          const date = dayjs(datetime).format("YYYY-MM-DD HH:mm:ss"); 
          const category = inferCategory(
            tradeType,
            counterparty,
            product,
            direction,
          );

          let note = "";
          if (counterparty && counterparty !== "/") {
            note = counterparty;
          }
          if (product && product !== "/") {
            note = note ? `${note}, ${product}` : product;
          }
          if (remark && remark !== "/") {
            note = note ? `${note}, ${remark}` : remark;
          }
          note = note.substring(0, 30);
          records.push({
            date,
            category,
            type,
            amount: Math.round(amount * 100) / 100, // 保留两位小数
            note,
          });
        }

        resolve(records);
      } catch (e) {
        reject(e);
      }
    };
    reader.onerror = (e) => {
      reject(new Error("文件读取失败"));
    };
    // 统一按 ArrayBuffer 读取，这样才能在发现编码不对时换一种编码重新解码
    reader.readAsArrayBuffer(file)
  });
}
