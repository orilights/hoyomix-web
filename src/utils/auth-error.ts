import { t } from '@/i18n'

export interface AuthError {
  status?: number
  message?: string
  code?: string
}

export function getAuthErrorMessage(error: AuthError | null): string {
  if (!error)
    return t('auth_error.unable_to_complete_the_action_please_try_again_later')
  if (error.message)
    return error.message
  if (error.code === 'INVALID_USERNAME')
    return error.message || t('auth_error.username_does_not_meet_the_requirements')
  const codeMessages: Record<string, string> = {
    get USERNAME_TAKEN() {
      return t('useUserNameValidation.this_username_is_already_taken')
    },
    get INVALID_EMAIL_OR_PASSWORD() {
      return t('auth_error.incorrect_email_or_password')
    },
    get USER_ALREADY_EXISTS() {
      return t('auth_error.this_email_is_already_registered')
    },
    get USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL() {
      return t('auth_error.this_email_is_already_registered')
    },
    get EMAIL_NOT_VERIFIED() {
      return t('auth_error.verify_your_email_before_signing_in_check_your_inbox')
    },
    get USER_NOT_FOUND() {
      return t('auth_error.user_not_found')
    },
    get TOO_MANY_REQUESTS() {
      return t('auth_error.too_many_requests_please_try_again_later')
    },
    get ACCOUNT_NOT_LINKED() {
      return t('auth_error.verify_the_email_on_your_existing_account_before_signing')
    },
    get account_not_linked() {
      return t('auth_error.verify_the_email_on_your_existing_account_before_signing')
    },
  }
  if (error.code && codeMessages[error.code])
    return codeMessages[error.code]!
  const statusMessages: Record<number, string> = {
    get 401() {
      return t('auth_error.incorrect_email_or_password')
    },
    get 403() {
      return t('auth_error.verify_your_email_before_signing_in_check_your_inbox')
    },
    get 429() {
      return t('auth_error.too_many_requests_please_try_again_later')
    },
  }
  return (error.status && statusMessages[error.status]) || error.message || t('auth_error.unable_to_complete_the_action_please_try_again_later')
}
