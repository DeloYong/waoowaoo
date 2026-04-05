/**
 * 邀请码生成工具
 */
import { prisma } from '@/lib/prisma'

const CODE_CHARACTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
const CODE_LENGTH = 6
const MAX_RETRIES = 5

/**
 * 生成随机邀请码
 */
function generateRandomCode(): string {
  let code = ''
  for (let i = 0; i < CODE_LENGTH; i++) {
    code += CODE_CHARACTERS.charAt(Math.floor(Math.random() * CODE_CHARACTERS.length))
  }
  return code
}

/**
 * 生成唯一邀请码（带查重重试）
 */
export async function generateUniqueInviteCode(): Promise<string> {
  for (let i = 0; i < MAX_RETRIES; i++) {
    const code = generateRandomCode()
    const existing = await prisma.user.findFirst({
      where: { inviteCode: code },
      select: { id: true },
    })
    if (!existing) {
      return code
    }
  }
  throw new Error('Failed to generate unique invite code')
}

/**
 * 根据邀请码查找邀请人
 */
export async function getInviterByCode(inviteCode: string) {
  const inviter = await prisma.user.findUnique({
    where: { inviteCode },
    select: { id: true, name: true },
  })
  return inviter
}
