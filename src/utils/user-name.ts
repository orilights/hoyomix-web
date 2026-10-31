import { t } from '@/i18n'
// Keep these validation rules aligned with user-server's user-name.schema.ts.
const disallowedCharacters = /[^\p{L}\p{Nd}\p{Mn}\p{Mc}_]/u
const invisibleCharacters = /\p{Default_Ignorable_Code_Point}/u
const detachedMarks = /(?:^|_)[\p{Mn}\p{Mc}]/u
const reservedName = /^(?:admin|administrator|root|system|support|official|管理员|超级管理员|系统|官方|客服)$/i

export function getUserNameValidationError(name: string): string | null {
  if (!name.length)
    return t('user_name.username_is_required')
  const length = Array.from(name).length
  if (length < 2)
    return t('user_name.username_must_contain_at_least_2_characters')
  if (length > 32)
    return t('user_name.username_cannot_exceed_32_characters')
  if (disallowedCharacters.test(name) || invisibleCharacters.test(name))
    return t('user_name.username_can_only_contain_letters_numbers_and_underscores')
  if (detachedMarks.test(name))
    return t('user_name.combining_marks_must_follow_a_letter_or_number')
  if (!/[\p{L}\p{Nd}]/u.test(name))
    return t('user_name.username_cannot_consist_only_of_underscores')
  if (reservedName.test(name))
    return t('user_name.this_username_is_reserved_please_choose_another')
  return null
}
