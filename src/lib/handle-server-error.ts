import { AxiosError } from 'axios'
import { toast } from 'sonner'
import { readString } from '@/lib/api'

export function handleServerError(error: unknown) {
  if (import.meta.env.DEV) {
    // eslint-disable-next-line no-console
    console.log(error)
  }

  let errMsg = 'Something went wrong!'

  if (
    error &&
    typeof error === 'object' &&
    'status' in error &&
    Number(error.status) === 204
  ) {
    errMsg = 'No content.'
  }

  if (error instanceof AxiosError) {
    const responseData = error.response?.data
    const apiMessage =
      readString(responseData, 'title', 'Title', 'Message', 'message', 'Error', 'error') ??
      undefined

    if (apiMessage && apiMessage.length > 0) {
      errMsg = apiMessage
    }
  }

  toast.error(errMsg)
}
