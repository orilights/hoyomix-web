// Keep these validation rules aligned with user-server's user-name.schema.ts.
const disallowedCharacters = /[^\p{L}\p{Nd}\p{Mn}\p{Mc}_]/u
const invisibleCharacters = /\p{Default_Ignorable_Code_Point}/u
const detachedMarks = /(?:^|_)[\p{Mn}\p{Mc}]/u
const reservedName = /^(?:admin|administrator|root|system|support|official|管理员|超级管理员|系统|官方|客服)$/i

export function getUserNameValidationError(name: string): string | null {
  if (!name.length)
    return '用户名不能为空'
  const length = Array.from(name).length
  if (length < 2)
    return '用户名至少需要 2 个字符'
  if (length > 32)
    return '用户名不能超过 32 个字符'
  if (disallowedCharacters.test(name) || invisibleCharacters.test(name))
    return '用户名只能包含常见文字、数字和下划线'
  if (detachedMarks.test(name))
    return '组合附加符号必须跟随文字或数字，不能单独使用'
  if (!/[\p{L}\p{Nd}]/u.test(name))
    return '用户名不能全部为下划线'
  if (reservedName.test(name))
    return '该用户名为系统保留名称，请使用其他用户名'
  return null
}
