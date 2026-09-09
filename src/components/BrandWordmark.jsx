import labtendLogo from '../assets/LABTEND-logo.png'

function BrandWordmark({ className = '' }) {
  return (
    <div className={`brand-wordmark ${className}`.trim()} aria-label="Logo LABTEND">
      <img src={labtendLogo} alt="LABTEND" className="brand-wordmark-image" />
    </div>
  )
}

export default BrandWordmark
