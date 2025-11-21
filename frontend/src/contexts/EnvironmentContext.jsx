import { createContext, useContext, useState, useEffect } from 'react'

const EnvironmentContext = createContext(null)

const ENV_CONFIG = {
  'none': {
    label: 'Choose your env',
    baseUrl: ''
  },
  'test': {
    label: 'Test',
    baseUrl: 'https://offers-engine-test.dev.razorpay.in'
  },
  'prod': {
    label: 'Prod',
    baseUrl: 'https://offers-engine-live-statuscake.razorpay.com'
  }
}

export function EnvironmentProvider({ children }) {
  const [environment, setEnvironment] = useState(() => {
    return localStorage.getItem('environment') || 'none'
  })

  useEffect(() => {
    localStorage.setItem('environment', environment)
  }, [environment])

  const getBaseUrl = () => {
    return ENV_CONFIG[environment]?.baseUrl || ''
  }

  const getEnvLabel = () => {
    return ENV_CONFIG[environment]?.label || 'Choose your env'
  }

  const isEnvSelected = () => {
    return environment !== 'none'
  }

  return (
    <EnvironmentContext.Provider value={{ 
      environment, 
      setEnvironment, 
      getBaseUrl, 
      getEnvLabel,
      isEnvSelected,
      ENV_CONFIG 
    }}>
      {children}
    </EnvironmentContext.Provider>
  )
}

export function useEnvironment() {
  const context = useContext(EnvironmentContext)
  if (!context) {
    throw new Error('useEnvironment must be used within EnvironmentProvider')
  }
  return context
}

