import { useState, useEffect } from 'react'

export const useIsRTL = () => {
  const [isRTL, setIsRTL] = useState(document.dir === 'rtl')

  useEffect(() => {
    const observer = new MutationObserver(mutations => {
      mutations.forEach(mutation => {
        if (mutation.attributeName === 'dir') {
          setIsRTL(document.dir === 'rtl')
        }
      })
    })

    observer.observe(document.documentElement, { attributes: true })
    return () => observer.disconnect()
  }, [])

  return isRTL
}
