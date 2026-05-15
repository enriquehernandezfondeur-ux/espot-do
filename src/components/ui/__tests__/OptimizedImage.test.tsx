import { render, screen, waitFor } from '@testing-library/react'
import { OptimizedImage } from '@/components/ui/optimized-image'

// Mock de next/image
jest.mock('next/image', () => ({
  __esModule: true,
  default: ({ src, alt, onLoad, onError, ...props }: any) => {
    return (
      <img
        src={src}
        alt={alt}
        onLoad={onLoad}
        onError={onError}
        {...props}
        data-testid="next-image"
      />
    )
  },
}))

describe('OptimizedImage Component', () => {
  const defaultProps = {
    src: '/test-image.jpg',
    alt: 'Test image',
    width: 400,
    height: 300,
  }

  beforeEach(() => {
    // Mock de IntersectionObserver
    global.IntersectionObserver = jest.fn().mockImplementation(() => ({
      observe: jest.fn(),
      unobserve: jest.fn(),
      disconnect: jest.fn(),
    }))
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  it('renders with correct props', () => {
    render(<OptimizedImage {...defaultProps} />)

    const img = screen.getByTestId('next-image')
    expect(img).toBeInTheDocument()
    expect(img).toHaveAttribute('alt', 'Test image')
    expect(img).toHaveAttribute('width', '400')
    expect(img).toHaveAttribute('height', '300')
  })

  it('shows loading skeleton initially', () => {
    render(<OptimizedImage {...defaultProps} />)

    const skeleton = document.querySelector('.animate-pulse')
    expect(skeleton).toBeInTheDocument()
  })

  it('hides skeleton when image loads', async () => {
    render(<OptimizedImage {...defaultProps} />)

    const img = screen.getByTestId('next-image')
    img.dispatchEvent(new Event('load'))

    await waitFor(() => {
      const skeleton = document.querySelector('.animate-pulse')
      expect(skeleton).toHaveClass('opacity-0')
    })
  })

  it('shows error state when image fails to load', () => {
    render(<OptimizedImage {...defaultProps} />)

    const img = screen.getByTestId('next-image')
    img.dispatchEvent(new Event('error'))

    const errorIcon = document.querySelector('svg')
    expect(errorIcon).toBeInTheDocument()
  })

  it('applies custom className', () => {
    render(<OptimizedImage {...defaultProps} className="custom-class" />)

    const container = document.querySelector('.custom-class')
    expect(container).toBeInTheDocument()
  })

  it('handles priority loading', () => {
    render(<OptimizedImage {...defaultProps} priority />)

    const img = screen.getByTestId('next-image')
    expect(img).toHaveAttribute('src', '/test-image.jpg')
  })

  it('supports blur placeholder', () => {
    render(<OptimizedImage {...defaultProps} placeholder="blur" blurDataURL="data:image..." />)

    const img = screen.getByTestId('next-image')
    expect(img).toHaveAttribute('placeholder', 'blur')
  })
})