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
  STATUS: 7,
  TRANSACTION_ID: 8,
  REMARK: 10,
};
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
        const data = e.target!.result
        const isCSV = file.name.toLowerCase().endsWith('.csv')
        let workbook: XLSX.WorkBook
        if (isCSV) {
          // CSV：直接使用 xlsx 读取文本
          workbook = XLSX.read(data as string, { type: 'string', raw: true })
        } else {
          // Excel：读取二进制数组
          workbook = XLSX.read(new Uint8Array(data as ArrayBuffer), { type: 'array' })
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
          const amount = parseFloat(row[COL.AMOUNT]);
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
    // 根据文件类型选择读取方式
    if (file.name.toLowerCase().endsWith('.csv')) {
      reader.readAsText(file, 'UTF-8')
    } else {
      reader.readAsArrayBuffer(file)
    }
  });
}
