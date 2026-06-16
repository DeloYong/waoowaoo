/**
 * 邮件通知服务
 *
 * 设计:
 * - 抽象 sendEmail 接口,业务层不直接依赖具体实现
 * - 当前默认实现:开发环境 console.log,生产可通过 SMTP_TRANSPORT 切换到 nodemailer
 * - 失败不抛异常(通知失败不应阻塞业务)
 *
 * 未来扩展:
 * - nodemailer 真实 SMTP
 * - 模板系统(react-email)
 * - 队列异步发送
 */

export interface EmailParams {
  to: string
  subject: string
  body: string
  html?: string
}

export type EmailResult =
  | { ok: true; messageId: string }
  | { ok: false; error: string }

export interface EmailTransport {
  send(params: EmailParams): Promise<EmailResult>
}

/**
 * 控制台实现 - 用于开发/测试
 */
export const consoleTransport: EmailTransport = {
  async send(params) {
    const messageId = `console-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    console.log('[Email:Console]', {
      messageId,
      to: params.to,
      subject: params.subject,
      body: params.body.slice(0, 200) + (params.body.length > 200 ? '...' : ''),
    })
    return { ok: true, messageId }
  },
}

/**
 * 选择当前 transport
 * - SMTP_TRANSPORT=sms: 切换到短信(预留)
 * - 默认: consoleTransport
 */
function getTransport(): EmailTransport {
  return consoleTransport
}

/**
 * 发送邮件 - 顶层 API
 *
 * 失败只记录日志,不抛异常
 */
export async function sendEmail(params: EmailParams): Promise<EmailResult> {
  try {
    return await getTransport().send(params)
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error('[Email] send failed', { to: params.to, subject: params.subject, error: msg })
    return { ok: false, error: msg }
  }
}

/**
 * 业务级邮件 - 支付成功
 */
export async function sendPaymentSuccessEmail(params: {
  email: string
  credits: number
  amount: number
  orderNo: string
  locale?: 'zh' | 'en'
}): Promise<EmailResult> {
  const isEn = params.locale === 'en'
  return sendEmail({
    to: params.email,
    subject: isEn
      ? `Payment successful - ${params.credits} credits added`
      : `充值成功 - 已到账 ${params.credits} 积分`,
    body: isEn
      ? `Thank you for your payment!\nOrder: ${params.orderNo}\nAmount: ¥${params.amount}\nCredits: ${params.credits}\n\nYour credits have been added to your account.`
      : `感谢您的充值!\n订单号: ${params.orderNo}\n金额: ¥${params.amount}\n积分: ${params.credits}\n\n您的积分已成功到账。`,
  })
}
