import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, type RenderResult } from 'vitest-browser-react'
import { type Locator, userEvent } from 'vitest/browser'
import { UserAuthForm } from './user-auth-form'

const FORM_MESSAGES = {
  countryCodeEmpty: 'Please enter your country code.',
  mobileNumberEmpty: 'Please enter your mobile number.',
  passwordEmpty: 'Please enter your password.',
  passwordShort: 'Password must be at least 6 characters long.',
} as const

const navigate = vi.fn()
const setAccessTokenMock = vi.fn()
const loginMock = vi.fn()

const currentUser = {
  userId: 'user-1',
  entityUserId: 10,
  name: 'EduFrais Admin',
  email: 'admin@example.com',
  phoneNumber: '242065123456',
  roles: ['SuperAdmin'],
  schoolIds: [3],
  exp: 1_900_000_000,
}

const useAuthStoreMock = Object.assign(
  () => ({
    auth: {
      setAccessToken: setAccessTokenMock,
      reset: vi.fn(),
    },
  }),
  {
    getState: () => ({
      auth: {
        user: currentUser,
      },
    }),
  }
)

vi.mock('@/stores/auth-store', () => ({
  useAuthStore: useAuthStoreMock,
}))

vi.mock('@/features/auth/api', () => ({
  login: loginMock,
}))

vi.mock('@tanstack/react-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-router')>()
  return {
    ...actual,
    useNavigate: () => navigate,
    Link: ({
      children,
      to,
      className,
      ...rest
    }: {
      children?: React.ReactNode
      to: string
      className?: string
    }) => (
      <a href={to} className={className} {...rest}>
        {children}
      </a>
    ),
  }
})

describe('UserAuthForm', () => {
  describe('Rendering without redirectTo', () => {
    let screen: RenderResult
    let countryCodeInput: Locator
    let mobileNumberInput: Locator
    let passwordInput: Locator
    let signInButton: Locator
    let forgotPasswordLink: Locator

    beforeEach(async () => {
      vi.clearAllMocks()
      loginMock.mockResolvedValue({
        success: true,
        message: 'Success',
        token: 'mock-access-token',
        mustChangePassword: false,
        userId: 'user-1',
      })

      screen = await render(<UserAuthForm />)
      countryCodeInput = screen.getByRole('textbox', { name: /^Country code$/i })
      mobileNumberInput = screen.getByRole('textbox', {
        name: /^Mobile number$/i,
      })
      passwordInput = screen.getByLabelText(/^Password$/i)
      signInButton = screen.getByRole('button', { name: /^Sign in$/i })
      forgotPasswordLink = screen.getByText(/^Forgot password\?$/i)
    })

    it('renders fields, submit button, and forgot password link', async () => {
      await expect.element(countryCodeInput).toBeInTheDocument()
      await expect.element(mobileNumberInput).toBeInTheDocument()
      await expect.element(passwordInput).toBeInTheDocument()
      await expect.element(signInButton).toBeInTheDocument()
      await expect.element(forgotPasswordLink).toBeInTheDocument()
    })

    it('shows validation messages when submitting empty form', async () => {
      await userEvent.clear(countryCodeInput)
      await userEvent.click(signInButton)

      await expect
        .element(screen.getByText(FORM_MESSAGES.countryCodeEmpty))
        .toBeInTheDocument()
      await expect
        .element(screen.getByText(FORM_MESSAGES.mobileNumberEmpty))
        .toBeInTheDocument()
      await expect
        .element(screen.getByText(FORM_MESSAGES.passwordEmpty))
        .toBeInTheDocument()
    })

    it('authenticates and navigates to default route on success', async () => {
      await userEvent.fill(countryCodeInput, '242')
      await userEvent.fill(mobileNumberInput, '065123456')
      await userEvent.fill(passwordInput, '123456')

      await userEvent.click(signInButton)

      await vi.waitFor(() =>
        expect(loginMock).toHaveBeenCalledWith({
          countryCode: '242',
          mobileNumber: '065123456',
          password: '123456',
        })
      )
      expect(setAccessTokenMock).toHaveBeenCalledOnce()
      expect(setAccessTokenMock).toHaveBeenCalledWith('mock-access-token')

      await vi.waitFor(() =>
        expect(navigate).toHaveBeenCalledWith({ to: '/', replace: true })
      )
    })

    it('shows password length validation', async () => {
      await userEvent.fill(passwordInput, '12345')
      await userEvent.click(signInButton)

      await expect
        .element(screen.getByText(FORM_MESSAGES.passwordShort))
        .toBeInTheDocument()
    })
  })

  it('navigates to redirectTo when provided', async () => {
    vi.clearAllMocks()
    loginMock.mockResolvedValue({
      success: true,
      message: 'Success',
      token: 'mock-access-token',
      mustChangePassword: false,
      userId: 'user-1',
    })

    const { getByRole, getByLabelText } = await render(
      <UserAuthForm redirectTo='/settings' />
    )

    await userEvent.clear(getByRole('textbox', { name: /Country code/i }))
    await userEvent.fill(getByRole('textbox', { name: /Country code/i }), '242')
    await userEvent.fill(
      getByRole('textbox', { name: /Mobile number/i }),
      '065123456'
    )
    await userEvent.fill(getByLabelText('Password'), '123456')

    await userEvent.click(getByRole('button', { name: /Sign in/i }))

    await vi.waitFor(() => expect(setAccessTokenMock).toHaveBeenCalledOnce())

    await vi.waitFor(() =>
      expect(navigate).toHaveBeenCalledWith({
        to: '/settings',
        replace: true,
      })
    )
  })
})
