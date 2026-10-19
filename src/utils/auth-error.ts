export interface AuthError {
  status?: number
  message?: string
  code?: string
}

export function getAuthErrorMessage(error: AuthError | null): string {
  if (!error)
    return '操作失败，请稍后重试'
  if (error.code === 'INVALID_USERNAME')
    return error.message || '用户名格式不符合要求'
  const codeMessages: Record<string, string> = {
    USERNAME_TAKEN: '用户名已被占用',
    INVALID_EMAIL_OR_PASSWORD: '邮箱或密码错误',
    USER_ALREADY_EXISTS: '该邮箱已被注册',
    USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL: '该邮箱已被注册',
    EMAIL_NOT_VERIFIED: '邮箱尚未验证，请先查收验证邮件',
    USER_NOT_FOUND: '用户不存在',
    TOO_MANY_REQUESTS: '请求过于频繁，请稍后重试',
    ACCOUNT_NOT_LINKED: '请先验证原账号邮箱，再使用 GitHub 登录',
    account_not_linked: '请先验证原账号邮箱，再使用 GitHub 登录',
  }
  if (error.code && codeMessages[error.code])
    return codeMessages[error.code]!
  const statusMessages: Record<number, string> = {
    401: '邮箱或密码错误',
    403: '邮箱尚未验证，请先查收验证邮件',
    429: '请求过于频繁，请稍后重试',
  }
  return (error.status && statusMessages[error.status]) || error.message || '操作失败，请稍后重试'
}
